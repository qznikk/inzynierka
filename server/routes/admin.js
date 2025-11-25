// routes/admin.js
import express from "express";
import bcrypt from "bcrypt";
import { pool } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";

const router = express.Router();

// GET /api/admin/technicians  -> lista techników
router.get("/technicians", auth, requireRole("ADMIN"), async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role FROM users WHERE role = $1 ORDER BY id DESC",
      ["TECHNICIAN"]
    );
    res.json({ technicians: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/admin/create-technician -> tworzy technika (ADMIN only)
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
        "INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4) RETURNING id, name, email, role",
        [name, email, hashed, "TECHNICIAN"]
      );
      res.json({ user: result.rows[0] });
    } catch (err) {
      console.error(err);
      res
        .status(400)
        .json({
          error: "Could not create technician (maybe email already exists)",
        });
    }
  }
);

export default router;
