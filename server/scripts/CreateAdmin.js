// scripts/createAdmin.js
import bcrypt from "bcrypt";
import { pool } from "../db.js";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const email = "admin@example.com";
  const name = "Administrator";
  //tech@example.com C5G80adESb6)
  const password = "SuperSecretAdmin123!";
  const hashed = await bcrypt.hash(password, 10);
  const role = "ADMIN";

  try {
    const q =
      "INSERT INTO users (email, password, name, role) VALUES ($1,$2,$3,$4) RETURNING id";
    const result = await pool.query(q, [email, hashed, name, role]);
    console.log("Admin created, id:", result.rows[0].id);
    console.log("Email:", email, "Password:", password);
    process.exit(0);
  } catch (err) {
    console.error("Error creating admin:", err);
    process.exit(1);
  }
}

main();
