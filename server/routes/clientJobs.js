// routes/clientJobs.js
import express from "express";
import { pool } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * POST /api/client/jobs
 * - auth required
 * - requireRole('CLIENT')
 * Body: { title, description, address, scheduled_date, priority }
 * Creates job with client_id = req.user.id
 * Generates external_number after insert: ZL-YYYY-<id padded>
 */
router.post("/", auth, requireRole("CLIENT"), async (req, res) => {
  try {
    const clientId = req.user?.id;
    if (!clientId) return res.status(401).json({ error: "Invalid user" });

    const {
      title = null,
      description = null,
      address = null,
      scheduled_date = null,
      priority = 2,
    } = req.body;

    // Insert without external_number, then generate it using returned id
    const insertQ = `
      INSERT INTO jobs (client_id, title, description, address, scheduled_date, priority, status)
      VALUES ($1,$2,$3,$4,$5,$6,'TO_ASSIGN')
      RETURNING id, client_id, title, description, address, scheduled_date, priority, status, created_at
    `;
    const vals = [
      clientId,
      title,
      description,
      address,
      scheduled_date,
      priority,
    ];
    const { rows } = await pool.query(insertQ, vals);
    const job = rows[0];

    // generate external number like ZL-2025-015
    const year = new Date().getFullYear();
    const ext = `ZL-${year}-${String(job.id).padStart(3, "0")}`;

    const upd = await pool.query(
      "UPDATE jobs SET external_number = $1 WHERE id = $2 RETURNING *",
      [ext, job.id]
    );
    const created = upd.rows[0];

    // Optionally return joined client and tech info (tech null)
    res.status(201).json(created);
  } catch (err) {
    console.error("POST /api/client/jobs error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/client/jobs
 * Returns jobs of logged-in client
 */
router.get("/", auth, requireRole("CLIENT"), async (req, res) => {
  try {
    const clientId = req.user?.id;
    const q = `
      SELECT j.*,
             t.id as tech_id, t.name as tech_name, t.email as tech_email
      FROM jobs j
      LEFT JOIN users t ON j.technician_id = t.id
      WHERE j.client_id = $1
      ORDER BY j.created_at DESC
    `;
    const { rows } = await pool.query(q, [clientId]);
    res.json({ jobs: rows });
  } catch (err) {
    console.error("GET /api/client/jobs error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
