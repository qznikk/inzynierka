import express from "express";
import multer from "multer";
import path from "path";
import { auth } from "../middleware/auth.js";
import { pool } from "../db.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/avatars");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `avatar_${req.user.id}_${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({ storage });

router.post("/avatar", auth, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Brak pliku" });

    const filePath = `/uploads/avatars/${req.file.filename}`;

    const { rows } = await pool.query(
      `UPDATE users
       SET avatar_url = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING avatar_url`,
      [filePath, req.user.id]
    );

    res.json({
      success: true,
      avatar_url: rows[0].avatar_url,
    });
  } catch (err) {
    console.error("Upload avatar error:", err);
    res.status(500).json({ error: "Błąd uploadu zdjęcia" });
  }
});

export default router;
