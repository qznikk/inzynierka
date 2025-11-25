import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = express.Router();

// Helper: generate JWT
function createToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "4h",
  });
}

// REGISTER
router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;
  const role = "CLIENT"; // wymuszamy tylko rejestrację klientów

  if (!email || !password || !name) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);

    const result = await pool.query(
      "INSERT INTO users (email, password, name, role) VALUES ($1,$2,$3,$4) RETURNING id, email, role",
      [email, hashed, name, role]
    );

    const user = result.rows[0];
    const token = createToken(user);

    res.json({ user, token });
  } catch (err) {
    console.log(err);
    res.status(400).json({ error: "User already exists or invalid data" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email=$1", [
      email,
    ]);

    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = createToken(user);

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
