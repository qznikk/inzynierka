// routes/technicianJobs.js
import express from "express";
import { pool } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/technician/jobs
 * returns jobs assigned to logged-in technician
 */
router.get("/", auth, requireRole("TECHNICIAN"), async (req, res) => {
  try {
    const techId = req.user?.id;
    if (!techId) return res.status(401).json({ error: "Invalid user" });

    const q = `
      SELECT j.*,
        -- canonical address field (exists in your migration)
        j.address as address,
        -- job-address alias so frontend can try several names
        j.address as job_address,
        -- client's basic info (assumes users table has id,name,email)
        c.id as client_id,
        c.name as client_name,
        c.email as client_email
      FROM jobs j
      LEFT JOIN users c ON j.client_id = c.id
      WHERE j.technician_id = $1
      ORDER BY j.scheduled_date NULLS LAST, j.created_at DESC
    `;
    const { rows } = await pool.query(q, [techId]);
    // return as { jobs: [...] } to match your frontend expectation
    res.json({ jobs: rows });
  } catch (err) {
    console.error("GET /api/technician/jobs error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/technician/jobs/:id
 * returns job details if it belongs to logged-in technician
 */
router.get("/:id", auth, requireRole("TECHNICIAN"), async (req, res) => {
  try {
    const techId = req.user?.id;
    const { id } = req.params;

    const q = `
      SELECT j.*,
        j.address as address,
        j.address as job_address,
        c.id as client_id,
        c.name as client_name,
        c.email as client_email
      FROM jobs j
      LEFT JOIN users c ON j.client_id = c.id
      WHERE j.id = $1
    `;
    const { rows } = await pool.query(q, [id]);
    if (!rows[0]) return res.status(404).json({ error: "Job not found" });

    if (String(rows[0].technician_id) !== String(techId)) {
      return res.status(403).json({ error: "Not allowed to view this job" });
    }

    // return wrapped with { job: ... } like your technician modal expects
    res.json({ job: rows[0] });
  } catch (err) {
    console.error("GET /api/technician/jobs/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * PUT /api/technician/jobs/:id
 * allow technician to update limited fields (status, maybe completed_at)
 */
router.put("/:id", auth, requireRole("TECHNICIAN"), async (req, res) => {
  try {
    const techId = req.user?.id;
    const { id } = req.params;
    const { status, completed_at } = req.body;

    const allowedStatuses = ["IN_PROGRESS", "DONE", "CANCELLED"];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const check = await pool.query(
      "SELECT technician_id FROM jobs WHERE id = $1",
      [id]
    );
    if (!check.rows[0]) return res.status(404).json({ error: "Job not found" });
    if (String(check.rows[0].technician_id) !== String(techId)) {
      return res.status(403).json({ error: "Not allowed to modify this job" });
    }

    const setParts = [];
    const vals = [];
    let idx = 1;
    if (status) {
      setParts.push(`status = $${idx++}`);
      vals.push(status);
    }
    if (typeof completed_at !== "undefined") {
      setParts.push(`completed_at = $${idx++}`);
      vals.push(completed_at);
    }

    if (setParts.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    vals.push(id);
    const q = `UPDATE jobs SET ${setParts.join(
      ", "
    )}, updated_at = now() WHERE id = $${idx} RETURNING *`;
    const { rows } = await pool.query(q, vals);
    if (!rows[0]) return res.status(404).json({ error: "Job not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("PUT /api/technician/jobs/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
