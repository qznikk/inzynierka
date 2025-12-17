// routes/clientInvoices.js
import express from "express";
import { pool } from "../db.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/invoices/client
 */
router.get("/client", auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(
      Math.min(parseInt(req.query.limit, 10) || 50, 500),
      1
    );
    const offset = (page - 1) * limit;

    const q = `
      SELECT i.*, u.name as client_name, u.email as client_email
      FROM invoices i
      LEFT JOIN users u ON u.id = i.client_id
      WHERE i.client_id = $1
      ORDER BY i.issued_at DESC
      LIMIT $2 OFFSET $3
    `;
    const params = [userId, limit, offset];

    try {
      const { rows } = await pool.query(q, params);
      return res.json({
        meta: { page, limit, count: rows.length },
        invoices: rows,
      });
    } catch (dbErr) {
      console.error(
        "DB query error GET /api/invoices/client:",
        dbErr?.stack || dbErr,
        { userId, page, limit }
      );
      return res.status(500).json({ error: "Server error" });
    }
  } catch (err) {
    console.error("GET /api/invoices/client error:", err?.stack || err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/invoices/:id
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
    console.error("GET /api/invoices/:id error:", err?.stack || err);
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

    if (inv.status === "PAID") {
      return res.json(inv);
    }

    const { rows } = await pool.query(
      `UPDATE invoices
         SET status = 'PENDING_CONFIRMATION',
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
      [id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("POST /api/invoices/:id/pay error:", err?.stack || err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
