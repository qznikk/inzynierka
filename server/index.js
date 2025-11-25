import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import { auth } from "./middleware/auth.js";

import adminRoutes from "./routes/admin.js";

dotenv.config();
const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.json({ message: "API OK" });
});

// AUTH ROUTES
app.use("/api/auth", authRoutes);

// Protected example
app.get("/api/me", auth, (req, res) => {
  res.json({ id: req.user.id, role: req.user.role });
});

// Start server
app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);

app.use("/api/admin", adminRoutes);
