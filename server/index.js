import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";

import authRoutes from "./routes/auth.js";
import { auth } from "./middleware/auth.js";

// admin
import adminRoutes from "./routes/admin.js";
import adminJobsRouter from "./routes/adminJobs.js";
import adminInvoices from "./routes/adminInvoices.js";
import adminReports from "./routes/adminReports.js";

// client
import clientJobsRouter from "./routes/clientJobs.js";
import clientInvoices from "./routes/clientInvoices.js";

// tech
import technicianJobs from "./routes/technicianJobs.js";
import technicianReports from "./routes/technicianReports.js";

// all
import profileRoutes from "./routes/profile.js";
import uploadAvatar from "./routes/uploadAvatar.js";
import invoicePdf from "./routes/invoicePdf.js";

dotenv.config();
const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// ================== BASIC ==================
app.get("/", (req, res) => {
  res.json({ message: "API OK" });
});

// ================== AUTH ==================
app.use("/api/auth", authRoutes);

app.get("/api/me", auth, (req, res) => {
  res.json({ id: req.user.id, role: req.user.role });
});

// ================== ADMIN ==================
app.use("/api/admin", adminRoutes);
app.use("/api/admin/jobs", adminJobsRouter);
app.use("/api/admin/reports", adminReports);
app.use("/api/admin/invoices", adminInvoices);

// ================== CLIENT ==================
app.use("/api/client", clientJobsRouter);
app.use("/api/invoices", clientInvoices);

// ================== TECHNICIAN ==================
app.use("/api/technician/jobs", technicianJobs);
app.use("/api/technician", technicianReports);

// ================== STATIC ==================
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ================== COMMON ==================
app.use("/api", profileRoutes);
app.use("/api/upload", uploadAvatar);
app.use("/api/invoices", invoicePdf);

// ================== START ==================
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
