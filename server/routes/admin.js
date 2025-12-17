// routes/admin.js
import express from "express";
import bcrypt from "bcrypt";
import { pool } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/admin/technicians
 */
router.get("/technicians", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const q = `
      SELECT
        id,
        email,
        name,
        role,
        COALESCE(address, '') AS address,
        COALESCE(city, '') AS city,
        COALESCE(postal_code, '') AS postal_code,
        COALESCE(country, '') AS country,
        COALESCE(phone, '') AS phone,
        COALESCE(avatar_url, '') AS avatar_url,
        COALESCE(created_at, now()) AS created_at,
        COALESCE(updated_at, now()) AS updated_at
      FROM users
      WHERE role = $1
      ORDER BY id DESC
      LIMIT 1000
    `;
    const result = await pool.query(q, ["TECHNICIAN"]);
    res.json({ technicians: result.rows });
  } catch (err) {
    console.error("GET /api/admin/technicians error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/admin/technicians/:id
 */
router.get("/technicians/:id", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const id = req.params.id;
    const q = `
      SELECT
        id,
        email,
        name,
        role,
        COALESCE(address, '') AS address,
        COALESCE(city, '') AS city,
        COALESCE(postal_code, '') AS postal_code,
        COALESCE(country, '') AS country,
        COALESCE(phone, '') AS phone,
        COALESCE(avatar_url, '') AS avatar_url,
        COALESCE(created_at, now()) AS created_at,
        COALESCE(updated_at, now()) AS updated_at
      FROM users
      WHERE id = $1 AND role = 'TECHNICIAN'
      LIMIT 1
    `;
    const { rows } = await pool.query(q, [id]);
    if (!rows[0])
      return res.status(404).json({ error: "Technician not found" });
    res.json({ technician: rows[0] });
  } catch (err) {
    console.error("GET /api/admin/technicians/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/admin/clients
 */
router.get("/clients", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const q = `
      SELECT
        id,
        email,
        name,
        role,
        COALESCE(address, '') AS address,
        COALESCE(city, '') AS city,
        COALESCE(postal_code, '') AS postal_code,
        COALESCE(country, '') AS country,
        COALESCE(phone, '') AS phone,
        COALESCE(avatar_url, '') AS avatar_url,
        COALESCE(created_at, now()) AS created_at
      FROM users
      WHERE role = $1
      ORDER BY id DESC
      LIMIT 1000
    `;
    const result = await pool.query(q, ["CLIENT"]);
    res.json({ clients: result.rows });
  } catch (err) {
    console.error("GET /api/admin/clients error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/admin/clients/:id
 */
router.get("/clients/:id", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const id = req.params.id;
    const q = `
      SELECT
        id,
        email,
        name,
        role,
        COALESCE(address, '') AS address,
        COALESCE(city, '') AS city,
        COALESCE(postal_code, '') AS postal_code,
        COALESCE(country, '') AS country,
        COALESCE(phone, '') AS phone,
        COALESCE(avatar_url, '') AS avatar_url,
        COALESCE(created_at, now()) AS created_at,
        COALESCE(updated_at, now()) AS updated_at
      FROM users
      WHERE id = $1 AND role = 'CLIENT'
      LIMIT 1
    `;
    const { rows } = await pool.query(q, [id]);
    if (!rows[0]) return res.status(404).json({ error: "Client not found" });
    res.json({ client: rows[0] });
  } catch (err) {
    console.error("GET /api/admin/clients/:id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/admin/create-technician
 */
router.post(
  "/create-technician",
  auth,
  requireRole("ADMIN"),
  async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Missing fields" });

    try {
      const hashed = await bcrypt.hash(password, 10);
      const result = await pool.query(
        `INSERT INTO users (name, email, password, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, role, avatar_url, created_at`,
        [name, email, hashed, "TECHNICIAN"]
      );
      res.json({ user: result.rows[0] });
    } catch (err) {
      console.error("POST /api/admin/create-technician error:", err);
      res.status(400).json({
        error: "Could not create technician (maybe email already exists)",
      });
    }
  }
);

export default router;
