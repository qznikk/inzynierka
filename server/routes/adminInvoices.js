// routes/adminInvoices.js
import express from "express";
import { pool } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// simple generator function
function generateInvoiceNumber() {
  const y = new Date().getFullYear();
  return `FV/${y}/${Math.floor(Math.random() * 9000 + 1000)}`;
}

/**
 * ADMIN – lista faktur
 * GET /api/admin/invoices
 */
router.get("/", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { client_id, status, job_id, q, page = 1, limit = 50 } = req.query;
    const where = [];
    const vals = [];
    let idx = 1;

    if (client_id) {
      where.push(`i.client_id = $${idx++}`);
      vals.push(client_id);
    }
    if (status) {
      where.push(`i.status = $${idx++}`);
      vals.push(status);
    }
    if (job_id) {
      where.push(`i.job_id = $${idx++}`);
      vals.push(job_id);
    }
    if (q) {
      where.push(
        `(i.external_number ILIKE $${idx} OR i.description ILIKE $${idx})`
      );
      vals.push(`%${q}%`);
      idx++;
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const lim = Math.max(Math.min(parseInt(limit, 10) || 50, 500), 1);
    const offset = (pageNum - 1) * lim;

    vals.push(lim, offset);
    const limIdx = idx;
    const offIdx = idx + 1;

    const sql = `
      SELECT i.*, u.name as client_name, u.email as client_email
      FROM invoices i
      LEFT JOIN users u on i.client_id = u.id
      ${whereSql}
      ORDER BY i.issued_at DESC
      LIMIT $${limIdx} OFFSET $${offIdx}
    `;

    const { rows } = await pool.query(sql, vals);

    const countSql = `SELECT COUNT(*) as total FROM invoices i ${whereSql}`;
    const countVals = vals.slice(0, vals.length - 2);
    const { rows: cr } = await pool.query(countSql, countVals);

    res.json({
      meta: { total: Number(cr[0].total), page: pageNum, limit: lim },
      invoices: rows,
    });
  } catch (err) {
    console.error("GET /api/admin/invoices error:", err?.stack || err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * ADMIN – utworzenie faktury
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

    if (!client_id || amount == null) {
      return res.status(400).json({ error: "client_id and amount required" });
    }

    const number = external_number || generateInvoiceNumber();
    const q = `
      INSERT INTO invoices
        (external_number, client_id, job_id, amount, currency, description, status, due_date)
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
    console.error("POST /api/admin/invoices error:", err?.stack || err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * ADMIN – get single invoice
 * GET /api/admin/invoices/:id
 */
router.get("/:id", auth, requireRole("ADMIN"), async (req, res) => {
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
    res.json(rows[0]);
  } catch (err) {
    console.error("GET /api/admin/invoices/:id error:", err?.stack || err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * ADMIN — edycja faktury (częściowa)
 * PATCH /api/admin/invoices/:id
 */
router.patch("/:id", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = [
      "external_number",
      "client_id",
      "job_id",
      "amount",
      "currency",
      "description",
      "status",
      "due_date",
    ];
    const updates = [];
    const vals = [];
    let idx = 1;
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates.push(`${key} = $${idx++}`);
        vals.push(req.body[key]);
      }
    }
    if (updates.length === 0)
      return res.status(400).json({ error: "No fields to update" });

    vals.push(id);
    const sql = `
      UPDATE invoices
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $${idx}
      RETURNING *
    `;
    const { rows } = await pool.query(sql, vals);
    res.json(rows[0]);
  } catch (err) {
    console.error("PATCH /api/admin/invoices/:id error:", err?.stack || err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * ADMIN — usuń fakturę
 * DELETE /api/admin/invoices/:id
 */
router.delete("/:id", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      "DELETE FROM invoices WHERE id=$1 RETURNING id",
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Invoice not found" });
    res.json({ id: rows[0].id, deleted: true });
  } catch (err) {
    console.error("DELETE /api/admin/invoices/:id error:", err?.stack || err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/admin/invoices/:id/confirm-pay
 */
router.post(
  "/:id/confirm-pay",
  auth,
  requireRole("ADMIN"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const invRes = await pool.query("SELECT * FROM invoices WHERE id=$1", [
        id,
      ]);
      const inv = invRes.rows[0];
      if (!inv) return res.status(404).json({ error: "Not found" });

      if (inv.status === "PAID") {
        return res.json(inv);
      }

      const { rows } = await pool.query(
        `UPDATE invoices
       SET status='PAID', paid_at = NOW(), updated_at = NOW()
       WHERE id=$1
       RETURNING *`,
        [id]
      );

      res.json(rows[0]);
    } catch (err) {
      console.error(
        "POST /api/admin/invoices/:id/confirm-pay error:",
        err?.stack || err
      );
      res.status(500).json({ error: "Server error" });
    }
  }
);

export default router;
