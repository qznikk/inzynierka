// routes/invoices.js
import express from "express";
import { pool } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";

const router = express.Router();

function generateInvoiceNumber() {
  const y = new Date().getFullYear();
  return `FV/${y}/${Math.floor(Math.random() * 9000 + 1000)}`;
}

/**
 * GET /api/admin/invoices
 */
router.get("/", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { client_id, status, job_id, q, page = 1, limit = 50 } = req.query;
    const where = [];
    const vals = [];
    let idx = 1;
    if (client_id) {
      where.push(`client_id = $${idx++}`);
      vals.push(client_id);
    }
    if (status) {
      where.push(`status = $${idx++}`);
      vals.push(status);
    }
    if (job_id) {
      where.push(`job_id = $${idx++}`);
      vals.push(job_id);
    }
    if (q) {
      where.push(
        `(external_number ILIKE $${idx} OR description ILIKE $${idx})`
      );
      vals.push(`%${q}%`);
      idx++;
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const offset = (Math.max(parseInt(page, 10), 1) - 1) * limit;
    vals.push(limit, offset);

    const sql = `
      SELECT i.*, u.name as client_name, u.email as client_email
      FROM invoices i
      LEFT JOIN users u on i.client_id = u.id
      ${whereSql}
      ORDER BY i.issued_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    const { rows } = await pool.query(sql, vals);

    const countSql = `SELECT COUNT(*) as total FROM invoices i ${whereSql}`;
    const { rows: cr } = await pool.query(
      countSql,
      vals.slice(0, vals.length - 2)
    );

    res.json({
      meta: {
        total: Number(cr[0].total),
        page: Number(page),
        limit: Number(limit),
      },
      invoices: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/admin/invoices
 */
router.post("/", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const {
      external_number,
      client_id,
      job_id = null,
      amount,
      currency = "PLN",
      description = "",
      status = "ISSUED",
      due_date = null,
    } = req.body;
    if (!client_id || !amount)
      return res.status(400).json({ error: "client_id and amount required" });

    const number = external_number || generateInvoiceNumber();
    const q = `
      INSERT INTO invoices (external_number, client_id, job_id, amount, currency, description, status, due_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `;
    const vals = [
      number,
      client_id,
      job_id,
      amount,
      currency,
      description,
      status,
      due_date,
    ];
    const { rows } = await pool.query(q, vals);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /api/admin/invoices error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/invoices/client
 */
router.get("/client", auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const q = `SELECT * FROM invoices WHERE client_id = $1 ORDER BY issued_at DESC`;
    const { rows } = await pool.query(q, [userId]);
    return res.json({ invoices: rows });
  } catch (err) {
    console.error("GET /api/invoices/client error:", err?.stack || err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/invoices/:id
 * OR GET /api/admin/invoices/:id
 */
router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const q = `
      SELECT i.*, u.name as client_name, u.email as client_email
      FROM invoices i
      LEFT JOIN users u ON u.id = i.client_id
      WHERE i.id = $1
    `;
    const { rows } = await pool.query(q, [id]);
    if (!rows[0]) return res.status(404).json({ error: "Invoice not found" });
    const inv = rows[0];
    if (req.user.role !== "ADMIN" && req.user.id !== inv.client_id)
      return res.status(403).json({ error: "Brak dostępu" });
    res.json(inv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/invoices/:id/pay
 */
router.post("/:id/pay", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const invRes = await pool.query("SELECT * FROM invoices WHERE id=$1", [id]);
    const inv = invRes.rows[0];
    if (!inv) return res.status(404).json({ error: "Not found" });
    if (req.user.role !== "ADMIN" && req.user.id !== inv.client_id)
      return res.status(403).json({ error: "Brak dostępu" });

    const { rows } = await pool.query(
      "UPDATE invoices SET status='PAID', updated_at=NOW() WHERE id=$1 RETURNING *",
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
