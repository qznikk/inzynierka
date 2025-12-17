import express from "express";
import { pool } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";
import { HVAC_SERVICES } from "../constants/hvacServices.js";

const router = express.Router();

/**
 * UPDATE
 */
const ALLOWED_UPDATE_FIELDS = [
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
 */
router.get("/", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const {
      status,
      technician_id,
      client_id,
      q,
      page = 1,
      limit = 50,
      sort = "created_at",
      order = "desc",
    } = req.query;

    const where = [];
    const values = [];
    let i = 1;

    if (status) {
      where.push(`j.status = $${i++}`);
      values.push(status);
    }
    if (technician_id) {
      where.push(`j.technician_id = $${i++}`);
      values.push(technician_id);
    }
    if (client_id) {
      where.push(`j.client_id = $${i++}`);
      values.push(client_id);
    }
    if (q) {
      where.push(`(j.external_number ILIKE $${i} OR j.title ILIKE $${i})`);
      values.push(`%${q}%`);
      i++;
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const pageNum = Math.max(Number(page) || 1, 1);
    const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const offset = (pageNum - 1) * lim;

    const allowedSort = ["created_at", "scheduled_date", "priority", "id"];
    const sortCol = allowedSort.includes(sort) ? sort : "created_at";
    const sortOrder = order === "asc" ? "ASC" : "DESC";

    const jobsQuery = `
      SELECT j.*,
        c.name AS client_name, c.email AS client_email,
        t.name AS tech_name, t.email AS tech_email
      FROM jobs j
      LEFT JOIN users c ON j.client_id = c.id
      LEFT JOIN users t ON j.technician_id = t.id
      ${whereSql}
      ORDER BY j.${sortCol} ${sortOrder}
      LIMIT $${i} OFFSET $${i + 1}
    `;
    values.push(lim, offset);

    const { rows } = await pool.query(jobsQuery, values);

    const countQuery = `SELECT COUNT(*) FROM jobs j ${whereSql}`;
    const { rows: countRows } = await pool.query(
      countQuery,
      values.slice(0, values.length - 2)
    );

    res.json({
      meta: {
        total: Number(countRows[0].count),
        page: pageNum,
        limit: lim,
      },
      jobs: rows,
    });
  } catch (err) {
    console.error("GET /api/admin/jobs error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/admin/jobs/:id
 */
router.get("/:id", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT j.*,
        c.name AS client_name, c.email AS client_email,
        t.name AS tech_name, t.email AS tech_email
      FROM jobs j
      LEFT JOIN users c ON j.client_id = c.id
      LEFT JOIN users t ON j.technician_id = t.id
      WHERE j.id = $1
      `,
      [req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ error: "Job not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/admin/jobs
 */
router.post("/", auth, requireRole("ADMIN"), async (req, res) => {
  const {
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

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const insertRes = await client.query(
      `
      INSERT INTO jobs
        (client_id, technician_id, title, description, status, priority, scheduled_date, address)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
      `,
      [
        client_id,
        technician_id,
        title || null,
        description || null,
        status,
        priority,
        scheduled_date,
        address,
      ]
    );

    const job = insertRes.rows[0];

    const year = new Date().getFullYear();
    const externalNumber = `ZL-${year}-${String(job.id).padStart(3, "0")}`;

    const updateRes = await client.query(
      `
      UPDATE jobs
      SET external_number = $1
      WHERE id = $2
      RETURNING *
      `,
      [externalNumber, job.id]
    );

    await client.query("COMMIT");

    // 4️⃣ ZWRACAMY GOTOWY REKORD
    res.status(201).json(updateRes.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/admin/jobs error:", err);
    res.status(500).json({ error: "Server error" });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/admin/jobs/:id
 */
router.put("/:id", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const fields = req.body;
    const sets = [];
    const values = [];
    let i = 1;

    for (const key of ALLOWED_UPDATE_FIELDS) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = $${i++}`);
        values.push(fields[key]);
      }
    }

    if (!sets.length) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    values.push(req.params.id);

    const { rows } = await pool.query(
      `
      UPDATE jobs
      SET ${sets.join(", ")}, updated_at = now()
      WHERE id = $${i}
      RETURNING *
      `,
      values
    );

    if (!rows[0]) return res.status(404).json({ error: "Job not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * DELETE /api/admin/jobs/:id
 */
router.delete("/:id", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { rowCount } = await pool.query("DELETE FROM jobs WHERE id = $1", [
      req.params.id,
    ]);
    if (!rowCount) return res.status(404).json({ error: "Job not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/admin/jobs/:id/assign
 */
router.post("/:id/assign", auth, requireRole("ADMIN"), async (req, res) => {
  const { technician_id } = req.body;
  if (!technician_id)
    return res.status(400).json({ error: "technician_id required" });

  try {
    const { rows } = await pool.query(
      `
      UPDATE jobs
      SET technician_id = $1, status = 'ASSIGNED', updated_at = now()
      WHERE id = $2
      RETURNING *
      `,
      [technician_id, req.params.id]
    );

    if (!rows[0]) return res.status(404).json({ error: "Job not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
