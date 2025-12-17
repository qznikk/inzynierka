// server/routes/profile.js
import express from "express";
import { auth } from "../middleware/auth.js";
import { pool } from "../db.js";

const router = express.Router();

// GET /api/profile
router.get("/profile", auth, async (req, res) => {
  try {
    const q = `
      SELECT id, email, name, role,
             COALESCE(address, '') AS address,
             COALESCE(city, '') AS city,
             COALESCE(postal_code, '') AS postal_code,
             COALESCE(country, '') AS country,
             COALESCE(phone, '') AS phone,
             COALESCE(avatar_url, '') AS avatar_url,
             COALESCE(updated_at, now()) AS updated_at
      FROM users
      WHERE id = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(q, [req.user.id]);
    if (!rows[0])
      return res.status(404).json({ error: "Użytkownik nie znaleziony" });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error("GET /api/profile error:", err);
    res.status(500).json({ error: "Błąd serwera podczas pobierania profilu" });
  }
});

// PUT /api/profile
router.put("/profile", auth, async (req, res) => {
  try {
    const { name, address, city, postal_code, country, phone } = req.body;

    if (
      (name !== undefined && typeof name !== "string") ||
      (address !== undefined && typeof address !== "string")
    ) {
      return res.status(400).json({ error: "Niepoprawne dane w body" });
    }

    const q = `
      UPDATE users
      SET
        name = COALESCE($1, name),
        address = COALESCE($2, address),
        city = COALESCE($3, city),
        postal_code = COALESCE($4, postal_code),
        country = COALESCE($5, country),
        phone = COALESCE($6, phone),
        updated_at = NOW()
      WHERE id = $7
      RETURNING id, email, name, role,
                COALESCE(address, '') AS address,
                COALESCE(city, '') AS city,
                COALESCE(postal_code, '') AS postal_code,
                COALESCE(country, '') AS country,
                COALESCE(phone, '') AS phone,
                COALESCE(avatar_url, '') AS avatar_url,
                updated_at;
    `;

    const params = [
      name ?? null,
      address ?? null,
      city ?? null,
      postal_code ?? null,
      country ?? null,
      phone ?? null,
      req.user.id,
    ];

    const { rows } = await pool.query(q, params);
    if (!rows[0])
      return res.status(404).json({ error: "Użytkownik nie znaleziony" });
    res.json({ user: rows[0] });
  } catch (err) {
    console.error("PUT /api/profile error:", err);
    res
      .status(500)
      .json({ error: "Błąd serwera podczas aktualizacji profilu" });
  }
});

export default router;
