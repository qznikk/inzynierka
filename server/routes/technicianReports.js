// server/routes/technicianReports.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { pool } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// UPLOAD DIR
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "reports");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safe = file.originalname
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_\.-]/g, "");
    cb(
      null,
      `${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${safe}${ext}`
    );
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

function safeParseJson(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return [];
  }
}

/**
 * GET /api/technician/reports
 * returns all reports created by the logged-in technician, with job info and photos
 */
router.get("/reports", auth, requireRole("TECHNICIAN"), async (req, res) => {
  try {
    const techId = req.user?.id;
    if (!techId) return res.status(401).json({ error: "Invalid user" });

    const q = `
      SELECT r.id, r.job_id, r.technician_id, r.description, r.created_at,
        COALESCE(json_agg(json_build_object('id', p.id, 'file_path', p.file_path, 'original_name', p.original_name)) FILTER (WHERE p.id IS NOT NULL), '[]') as photos,
        j.external_number as job_external_number, j.status as job_status, j.title as job_title
      FROM reports r
      LEFT JOIN report_photos p ON p.report_id = r.id
      LEFT JOIN jobs j ON j.id = r.job_id
      WHERE r.technician_id = $1
      GROUP BY r.id, j.external_number, j.status, j.title
      ORDER BY r.created_at DESC
    `;
    const { rows } = await pool.query(q, [techId]);

    const mapped = (rows || []).map((r) => {
      const photosArr = safeParseJson(r.photos);
      const photos = (photosArr || []).map((p) => ({
        ...p,
        url: `${req.protocol}://${req.get("host")}/uploads/${p.file_path}`,
      }));
      return { ...r, photos };
    });

    return res.json({ reports: mapped });
  } catch (err) {
    console.error("GET /api/technician/reports error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/technician/reports/:jobId
 * returns reports for a given job (if the report's technician is the logged-in tech)
 */
router.get(
  "/reports/:jobId",
  auth,
  requireRole("TECHNICIAN"),
  async (req, res) => {
    try {
      const techId = req.user?.id;
      const { jobId } = req.params;

      const chk = await pool.query(
        "SELECT technician_id FROM jobs WHERE id = $1",
        [jobId]
      );
      if (!chk.rows[0]) return res.status(404).json({ error: "Job not found" });
      if (String(chk.rows[0].technician_id) !== String(techId)) {
        return res
          .status(403)
          .json({ error: "Not allowed to view reports for this job" });
      }

      const q = `
        SELECT r.id, r.job_id, r.technician_id, r.description, r.created_at,
          COALESCE(json_agg(json_build_object('id', p.id, 'file_path', p.file_path, 'original_name', p.original_name)) FILTER (WHERE p.id IS NOT NULL), '[]') as photos
        FROM reports r
        LEFT JOIN report_photos p ON p.report_id = r.id
        WHERE r.job_id = $1
        GROUP BY r.id
        ORDER BY r.created_at DESC
      `;
      const { rows } = await pool.query(q, [jobId]);

      const mapped = (rows || []).map((r) => {
        const photosArr = safeParseJson(r.photos);
        const photos = (photosArr || []).map((p) => ({
          ...p,
          url: `${req.protocol}://${req.get("host")}/uploads/${p.file_path}`,
        }));
        return { ...r, photos };
      });

      return res.json({ reports: mapped });
    } catch (err) {
      console.error("GET /api/technician/reports/:jobId error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * POST /api/technician/jobs/:jobId/reports
 * create report for a job
 */
router.post(
  "/jobs/:jobId/reports",
  auth,
  requireRole("TECHNICIAN"),
  upload.array("photos", 6),
  async (req, res) => {
    try {
      const techId = req.user?.id;
      const { jobId } = req.params;

      const jobQ = await pool.query(
        "SELECT technician_id FROM jobs WHERE id = $1",
        [jobId]
      );
      if (!jobQ.rows[0])
        return res.status(404).json({ error: "Job not found" });
      if (String(jobQ.rows[0].technician_id) !== String(techId)) {
        return res
          .status(403)
          .json({ error: "Not allowed to add report to this job" });
      }

      const description = req.body.description || null;

      const ins = await pool.query(
        `INSERT INTO reports (job_id, technician_id, description) VALUES ($1,$2,$3) RETURNING *`,
        [jobId, techId, description]
      );
      const report = ins.rows[0];

      const photos = req.files || [];
      for (const f of photos) {
        const relativePath = path.join("reports", path.basename(f.path));
        await pool.query(
          `INSERT INTO report_photos (report_id, file_path, original_name) VALUES ($1,$2,$3)`,
          [report.id, relativePath, f.originalname]
        );
      }

      // fetch with photos
      const rpt = await pool.query(
        `SELECT r.*,
          COALESCE(json_agg(json_build_object('id', p.id, 'file_path', p.file_path, 'original_name', p.original_name)) FILTER (WHERE p.id IS NOT NULL), '[]') as photos
         FROM reports r
         LEFT JOIN report_photos p ON p.report_id = r.id
         WHERE r.id = $1
         GROUP BY r.id`,
        [report.id]
      );

      const row = rpt.rows[0] || {};
      const photosArr = safeParseJson(row.photos);
      const photosWithUrl = (photosArr || []).map((p) => ({
        ...p,
        url: `${req.protocol}://${req.get("host")}/uploads/${p.file_path}`,
      }));

      return res
        .status(201)
        .json({ report: { ...row, photos: photosWithUrl } });
    } catch (err) {
      console.error("POST /api/technician/jobs/:jobId/reports error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * PUT /api/technician/reports/:reportId
 * update report description (only owner technician)
 */
router.put(
  "/reports/:reportId",
  auth,
  requireRole("TECHNICIAN"),
  express.json(),
  async (req, res) => {
    try {
      const techId = req.user?.id;
      const { reportId } = req.params;
      const { description } = req.body;

      // check ownership
      const chk = await pool.query(
        "SELECT technician_id FROM reports WHERE id = $1",
        [reportId]
      );
      if (!chk.rows[0])
        return res.status(404).json({ error: "Report not found" });
      if (String(chk.rows[0].technician_id) !== String(techId)) {
        return res
          .status(403)
          .json({ error: "Not allowed to edit this report" });
      }

      const { rows } = await pool.query(
        "UPDATE reports SET description = $1, updated_at = now() WHERE id = $2 RETURNING *",
        [description || null, reportId]
      );
      return res.json({ report: rows[0] });
    } catch (err) {
      console.error("PUT /api/technician/reports/:reportId error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * POST /api/technician/reports/:reportId/photos
 * add photos to existing report
 */
router.post(
  "/reports/:reportId/photos",
  auth,
  requireRole("TECHNICIAN"),
  upload.array("photos", 6),
  async (req, res) => {
    try {
      const techId = req.user?.id;
      const { reportId } = req.params;

      const chk = await pool.query(
        "SELECT technician_id FROM reports WHERE id = $1",
        [reportId]
      );
      if (!chk.rows[0])
        return res.status(404).json({ error: "Report not found" });
      if (String(chk.rows[0].technician_id) !== String(techId)) {
        return res
          .status(403)
          .json({ error: "Not allowed to modify this report" });
      }

      const photos = req.files || [];
      for (const f of photos) {
        const relativePath = path.join("reports", path.basename(f.path));
        await pool.query(
          `INSERT INTO report_photos (report_id, file_path, original_name) VALUES ($1,$2,$3)`,
          [reportId, relativePath, f.originalname]
        );
      }

      // return updated photos
      const rp = await pool.query(
        `SELECT COALESCE(json_agg(json_build_object('id', p.id, 'file_path', p.file_path, 'original_name', p.original_name)) FILTER (WHERE p.id IS NOT NULL), '[]') as photos
           FROM report_photos p
           WHERE p.report_id = $1`,
        [reportId]
      );
      const photosArr = safeParseJson(rp.rows[0].photos);
      const photosWithUrl = photosArr.map((p) => ({
        ...p,
        url: `${req.protocol}://${req.get("host")}/uploads/${p.file_path}`,
      }));
      return res.status(201).json({ photos: photosWithUrl });
    } catch (err) {
      console.error(
        "POST /api/technician/reports/:reportId/photos error:",
        err
      );
      return res.status(500).json({ error: "Server error" });
    }
  }
);

/**
 * DELETE /api/technician/reports/photos/:photoId
 * delete photo (file + db) if belongs to technician's report
 */
router.delete(
  "/reports/photos/:photoId",
  auth,
  requireRole("TECHNICIAN"),
  async (req, res) => {
    try {
      const techId = req.user?.id;
      const { photoId } = req.params;

      // get photo + report
      const q = `
          SELECT p.id as photo_id, p.file_path, p.report_id, r.technician_id
          FROM report_photos p
          JOIN reports r ON r.id = p.report_id
          WHERE p.id = $1
        `;
      const { rows } = await pool.query(q, [photoId]);
      if (!rows[0]) return res.status(404).json({ error: "Photo not found" });
      const row = rows[0];
      if (String(row.technician_id) !== String(techId)) {
        return res
          .status(403)
          .json({ error: "Not allowed to delete this photo" });
      }

      // delete file from disk if exists
      try {
        const abs = path.join(process.cwd(), "uploads", row.file_path);
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
      } catch (e) {
        console.warn("Failed to remove file:", e);
      }

      // delete db row
      await pool.query("DELETE FROM report_photos WHERE id = $1", [photoId]);

      return res.json({ success: true });
    } catch (err) {
      console.error(
        "DELETE /api/technician/reports/photos/:photoId error:",
        err
      );
      return res.status(500).json({ error: "Server error" });
    }
  }
);

router.get(
  "/reports/:reportId",
  auth,
  requireRole("TECHNICIAN"),
  async (req, res) => {
    try {
      const techId = req.user?.id;
      const { reportId } = req.params;

      const q = `
          SELECT r.id, r.job_id, r.technician_id, r.description, r.created_at, r.updated_at,
            COALESCE(json_agg(json_build_object('id', p.id, 'file_path', p.file_path, 'original_name', p.original_name)) FILTER (WHERE p.id IS NOT NULL), '[]') as photos,
            j.external_number as job_external_number, j.status as job_status, j.title as job_title
          FROM reports r
          LEFT JOIN report_photos p ON p.report_id = r.id
          LEFT JOIN jobs j ON j.id = r.job_id
          WHERE r.id = $1
          GROUP BY r.id, j.external_number, j.status, j.title
          LIMIT 1
        `;
      const { rows } = await pool.query(q, [reportId]);
      if (!rows[0]) return res.status(404).json({ error: "Report not found" });

      const row = rows[0];
      if (String(row.technician_id) !== String(techId)) {
        return res
          .status(403)
          .json({ error: "Not allowed to view this report" });
      }

      const photos = (row.photos || []).map((p) => ({
        ...p,
        url: `${req.protocol}://${req.get("host")}/uploads/${p.file_path}`,
      }));

      return res.json({
        report: {
          id: row.id,
          job_id: row.job_id,
          technician_id: row.technician_id,
          description: row.description,
          created_at: row.created_at,
          updated_at: row.updated_at,
          job_external_number: row.job_external_number,
          job_status: row.job_status,
          job_title: row.job_title,
          photos,
        },
      });
    } catch (err) {
      console.error("GET /api/technician/reports/:reportId error:", err);
      return res.status(500).json({ error: "Server error" });
    }
  }
);

export default router;
