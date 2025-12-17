import express from "express";
import { pool } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";

const router = express.Router();

function safeParseJson(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    return JSON.parse(val);
  } catch {
    return [];
  }
}

/**
 * POST /api/client/jobs
 */
router.post("/jobs", auth, requireRole("CLIENT"), async (req, res) => {
  try {
    const clientId = req.user.id;
    const {
      title = null,
      description = null,
      address = null,
      scheduled_date = null,
      priority = 2,
    } = req.body;

    const ins = await pool.query(
      `
      INSERT INTO jobs (client_id, title, description, address, scheduled_date, priority, status)
      VALUES ($1,$2,$3,$4,$5,$6,'TO_ASSIGN')
      RETURNING *
    `,
      [clientId, title, description, address, scheduled_date, priority]
    );

    const year = new Date().getFullYear();
    const ext = `ZL-${year}-${String(ins.rows[0].id).padStart(3, "0")}`;

    const upd = await pool.query(
      "UPDATE jobs SET external_number = $1 WHERE id = $2 RETURNING *",
      [ext, ins.rows[0].id]
    );

    res.status(201).json(upd.rows[0]);
  } catch (err) {
    console.error("POST /api/client/jobs error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/client/jobs
 */
router.get("/jobs", auth, requireRole("CLIENT"), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT j.*,
             t.id   AS tech_id,
             t.name AS tech_name,
             t.email AS tech_email
      FROM jobs j
      LEFT JOIN users t ON t.id = j.technician_id
      WHERE j.client_id = $1
      ORDER BY j.created_at DESC
    `,
      [req.user.id]
    );

    res.json({ jobs: rows });
  } catch (err) {
    console.error("GET /api/client/jobs error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/client/jobs/:jobId/reports
 * READ-ONLY
 */
router.get(
  "/jobs/:jobId/reports",
  auth,
  requireRole("CLIENT"),
  async (req, res) => {
    try {
      const { jobId } = req.params;

      const chk = await pool.query(
        "SELECT id FROM jobs WHERE id = $1 AND client_id = $2",
        [jobId, req.user.id]
      );
      if (!chk.rows[0]) {
        return res.status(404).json({ error: "Job not found or not allowed" });
      }

      const q = `
        SELECT r.id,
               r.job_id,
               r.description,
               r.created_at,
               r.updated_at,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', p.id,
                     'file_path', p.file_path,
                     'original_name', p.original_name
                   )
                 ) FILTER (WHERE p.id IS NOT NULL),
                 '[]'
               ) AS photos
        FROM reports r
        LEFT JOIN report_photos p ON p.report_id = r.id
        WHERE r.job_id = $1
        GROUP BY r.id
        ORDER BY r.created_at DESC
      `;

      const { rows } = await pool.query(q, [jobId]);

      const mapped = rows.map((r) => ({
        ...r,
        photos: safeParseJson(r.photos).map((p) => ({
          ...p,
          url: `${req.protocol}://${req.get("host")}/uploads/${p.file_path}`,
        })),
      }));

      res.json({ reports: mapped });
    } catch (err) {
      console.error("GET /api/client/jobs/:jobId/reports error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

export default router;
