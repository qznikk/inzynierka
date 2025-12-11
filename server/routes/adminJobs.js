// routes/adminJobs.js
// ES modules style — importuj jako: import adminJobsRouter from './routes/adminJobs.js';
// Podłącz: app.use('/api/admin/jobs', adminJobsRouter);

// ----- OPTIONAL: migration SQL (uruchom w psql) -----
// -- create type and jobs table
// CREATE TYPE job_status AS ENUM ('WAITING','TO_ASSIGN','ASSIGNED','IN_PROGRESS','DONE','CANCELLED');
// CREATE TABLE jobs (
//   id SERIAL PRIMARY KEY,
//   external_number VARCHAR(50) UNIQUE,
//   client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
//   technician_id INTEGER REFERENCES users(id),
//   title VARCHAR(255),
//   description TEXT,
//   status job_status NOT NULL DEFAULT 'WAITING',
//   priority SMALLINT DEFAULT 2,
//   scheduled_date DATE,
//   address TEXT,
//   created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
//   updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
//   completed_at TIMESTAMP WITH TIME ZONE
// );
// ----------------------------------------------------

import express from "express";
import { pool } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * Helper: map allowed update fields -> used in PUT
 */
const ALLOWED_UPDATE_FIELDS = [
  "external_number",
  "client_id",
  "technician_id",
  "title",
  "description",
  "status",
  "priority",
  "scheduled_date",
  "address",
  "completed_at",
];

/**
 * GET /api/admin/jobs
 * Admin: list all jobs with joins (client, technician).
 * Supports query params: status, technician_id, client_id, page, limit, q (search external_number/title)
 */
router.get("/", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const {
      status,
      technician_id,
      client_id,
      q, // search
      page = 1,
      limit = 50,
      sort = "created_at",
      order = "desc",
    } = req.query;

    const whereParts = [];
    const values = [];
    let idx = 1;

    if (status) {
      whereParts.push(`j.status = $${idx++}`);
      values.push(status);
    }
    if (technician_id) {
      whereParts.push(`j.technician_id = $${idx++}`);
      values.push(technician_id);
    }
    if (client_id) {
      whereParts.push(`j.client_id = $${idx++}`);
      values.push(client_id);
    }
    if (q) {
      whereParts.push(
        `(j.external_number ILIKE $${idx} OR j.title ILIKE $${idx})`
      );
      values.push(`%${q}%`);
      idx++;
    }

    const whereSql = whereParts.length
      ? `WHERE ${whereParts.join(" AND ")}`
      : "";

    // pagination
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const lim = Math.max(Math.min(parseInt(limit, 10) || 50, 200), 1);
    const offset = (pageNum - 1) * lim;

    // safe column names for sort (whitelist)
    const allowedSort = ["created_at", "scheduled_date", "priority", "id"];
    const sortCol = allowedSort.includes(sort) ? sort : "created_at";
    const sortOrder = order && order.toLowerCase() === "asc" ? "ASC" : "DESC";

    const baseQuery = `
      SELECT j.*,
        c.id as client_id, c.name as client_name, c.email as client_email,
        t.id as tech_id, t.name as tech_name, t.email as tech_email
      FROM jobs j
      LEFT JOIN users c ON j.client_id = c.id
      LEFT JOIN users t ON j.technician_id = t.id
      ${whereSql}
      ORDER BY j.${sortCol} ${sortOrder}
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    values.push(lim, offset);

    const { rows } = await pool.query(baseQuery, values);

    // total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM jobs j ${whereSql}`;
    const { rows: countRows } = await pool.query(
      countQuery,
      values.slice(0, values.length - 2)
    ); // exclude limit/offset
    const total = parseInt(countRows[0]?.total || 0, 10);

    res.json({
      meta: { total, page: pageNum, limit: lim },
      jobs: rows,
    });
  } catch (err) {
    console.error("GET /api/admin/jobs error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/admin/jobs/:id
 * Admin: get single job (with client and tech info)
 */
router.get("/:id", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;
    const q = `
      SELECT j.*,
        c.id as client_id, c.name as client_name, c.email as client_email,
        t.id as tech_id, t.name as tech_name, t.email as tech_email
      FROM jobs j
      LEFT JOIN users c ON j.client_id = c.id
      LEFT JOIN users t ON j.technician_id = t.id
      WHERE j.id = $1
    `;
    const { rows } = await pool.query(q, [id]);
    if (!rows[0]) return res.status(404).json({ error: "Job not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /api/admin/jobs/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/admin/jobs
 * Admin: create new job
 */
router.post("/", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const {
      external_number,
      client_id,
      technician_id = null,
      title,
      description,
      status = "WAITING",
      priority = 2,
      scheduled_date = null,
      address = null,
    } = req.body;

    if (!client_id) {
      return res.status(400).json({ error: "client_id is required" });
    }

    // optionally validate technician exists and has TECHNICIAN role
    if (technician_id) {
      const techCheck = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [technician_id]
      );
      if (!techCheck.rows[0])
        return res.status(400).json({ error: "technician_id not found" });
      if (techCheck.rows[0].role !== "TECHNICIAN")
        return res.status(400).json({ error: "User is not a technician" });
    }

    const q = `
      INSERT INTO jobs (external_number, client_id, technician_id, title, description, status, priority, scheduled_date, address)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `;
    const vals = [
      external_number || null,
      client_id,
      technician_id,
      title || null,
      description || null,
      status,
      priority,
      scheduled_date,
      address,
    ];

    const { rows } = await pool.query(q, vals);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /api/admin/jobs error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * PUT /api/admin/jobs/:id
 * Admin: update allowed fields
 */
router.put("/:id", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body || {};

    // build update
    const setParts = [];
    const vals = [];
    let idx = 1;
    for (const key of ALLOWED_UPDATE_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(fields, key)) {
        setParts.push(`${key} = $${idx}`);
        vals.push(fields[key]);
        idx++;
      }
    }
    if (setParts.length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    // If technician_id included - validate role
    if (
      Object.prototype.hasOwnProperty.call(fields, "technician_id") &&
      fields.technician_id
    ) {
      const techCheck = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [fields.technician_id]
      );
      if (!techCheck.rows[0])
        return res.status(400).json({ error: "technician_id not found" });
      if (techCheck.rows[0].role !== "TECHNICIAN")
        return res.status(400).json({ error: "User is not a technician" });
    }

    vals.push(id);
    const q = `UPDATE jobs SET ${setParts.join(
      ", "
    )}, updated_at = now() WHERE id = $${idx} RETURNING *`;
    const { rows } = await pool.query(q, vals);
    if (!rows[0]) return res.status(404).json({ error: "Job not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("PUT /api/admin/jobs/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * DELETE /api/admin/jobs/:id
 * Admin: delete job
 */
router.delete("/:id", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query("DELETE FROM jobs WHERE id = $1", [
      id,
    ]);
    if (rowCount === 0) return res.status(404).json({ error: "Job not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/admin/jobs/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/admin/jobs/:id/assign
 * Admin: assign technician to a job (body: { technician_id })
 * - validates technician exists and is TECHNICIAN
 * - sets status = 'ASSIGNED'
 */
router.post("/:id/assign", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;
    const { technician_id } = req.body;
    if (!technician_id)
      return res.status(400).json({ error: "technician_id required" });

    const techRes = await pool.query(
      "SELECT id, role FROM users WHERE id = $1",
      [technician_id]
    );
    if (!techRes.rows[0])
      return res.status(400).json({ error: "technician not found" });
    if (techRes.rows[0].role !== "TECHNICIAN")
      return res.status(400).json({ error: "User is not a technician" });

    const q = `UPDATE jobs SET technician_id = $1, status = 'ASSIGNED', updated_at = now() WHERE id = $2 RETURNING *`;
    const { rows } = await pool.query(q, [technician_id, id]);
    if (!rows[0]) return res.status(404).json({ error: "Job not found" });

    res.json(rows[0]);
  } catch (err) {
    console.error("POST /api/admin/jobs/:id/assign error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * TECHNICIAN endpoints (optional)
 * GET /api/technician/jobs -> returns jobs assigned to logged-in technician
 */
router.get(
  "/../technician/jobs",
  auth,
  requireRole("TECHNICIAN"),
  async (req, res) => {
    // Note: This route path is written so that when you mount this router at /api/admin/jobs
    // you should probably mount a separate router for technician routes.
    // If you prefer, create routes/technicianJobs.js instead and mount at /api/technician/jobs.
    try {
      const techId = req.user?.id;
      if (!techId) return res.status(400).json({ error: "Invalid user" });

      const q = `
      SELECT j.*,
        c.id as client_id, c.name as client_name, c.email as client_email
      FROM jobs j
      LEFT JOIN users c ON j.client_id = c.id
      WHERE j.technician_id = $1
      ORDER BY j.scheduled_date NULLS LAST, j.created_at DESC
    `;
      const { rows } = await pool.query(q, [techId]);
      res.json({ jobs: rows });
    } catch (err) {
      console.error("GET /api/technician/jobs error:", err);
      res.status(500).json({ error: "Server error" });
    }
  }
);

export default router;
