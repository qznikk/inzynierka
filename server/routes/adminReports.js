// server/routes/adminReports.js
import express from "express";
import path from "path";
import fs from "fs";
import { pool } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";

const router = express.Router();

function safeParseJson(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return [];
  }
}

router.get("/", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const q = `
      SELECT r.id, r.job_id, r.technician_id, r.description, r.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', p.id,
              'file_path', p.file_path,
              'original_name', p.original_name
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) as photos,
        u.id as technician_id,
        u.name as technician_name,
        u.email as technician_email,
        j.external_number as job_external_number,
        j.title as job_title
      FROM reports r
      LEFT JOIN report_photos p ON p.report_id = r.id
      LEFT JOIN users u ON u.id = r.technician_id
      LEFT JOIN jobs j ON j.id = r.job_id
      GROUP BY r.id, u.id, u.name, u.email, j.external_number, j.title
      ORDER BY r.created_at DESC
    `;
    const { rows } = await pool.query(q);

    const mapped = (rows || []).map((r) => {
      const photosArr = safeParseJson(r.photos);
      const photos = (photosArr || []).map((p) => ({
        ...p,
        url: `${req.protocol}://${req.get("host")}/uploads/${p.file_path}`,
      }));
      return {
        id: r.id,
        job_id: r.job_id,
        technician_id: r.technician_id,
        technician_name: r.technician_name,
        technician_email: r.technician_email,
        description: r.description,
        created_at: r.created_at,
        job_external_number: r.job_external_number,
        job_title: r.job_title,
        photos,
      };
    });

    return res.json({ reports: mapped });
  } catch (err) {
    console.error("GET /api/admin/reports error:", err?.stack || err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
