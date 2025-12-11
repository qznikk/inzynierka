// index.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";

import authRoutes from "./routes/auth.js";
import { auth } from "./middleware/auth.js";

// admin
import adminRoutes from "./routes/admin.js";
import adminJobsRouter from "./routes/adminJobs.js";
import invoiceRoutes from "./routes/invoices.js";
import adminInvoices from "./routes/adminInvoices.js";
import adminReports from "./routes/adminReports.js";

// client
import clientJobsRouter from "./routes/clientJobs.js";
import clientInvoices from "./routes/clientInvoices.js";

// tech
import technicianJobs from "./routes/technicianJobs.js";
import technicianReports from "./routes/technicianReports.js";

// ...

//all
import profileRoutes from "./routes/profile.js";
import uploadAvatar from "./routes/uploadAvatar.js";

// ...

dotenv.config();
const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
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

// admin
app.use("/api/admin", adminRoutes);
app.use("/api/admin/jobs", adminJobsRouter);
app.use("/api/admin/reports", adminReports);

// client
app.use("/api/client/jobs", clientJobsRouter);
// Invoices: admin & client separated
app.use("/api/admin/invoices", adminInvoices); // admin endpoints
app.use("/api/invoices", clientInvoices); // client + shared endpoints

// tech
// Jobs router stays mounted at /api/technician/jobs
app.use("/api/technician/jobs", technicianJobs);

// serve uploads (keep before report routes so static files are served correctly)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

//all
app.use("/api", profileRoutes); // -> GET /api/profile , PUT /api/profile
app.use("/api/upload", uploadAvatar);

// Mount technicianReports at /api/technician so routes inside the router
// map to:
//  - GET  /api/technician/           (if router.get("/") is used)
//  - GET  /api/technician/reports    (if router.get("/reports") is used)
//  - GET  /api/technician/:jobId     (if router.get("/:jobId") is used)
//  - POST /api/technician/jobs/:jobId/reports  (router.post("/jobs/:jobId/reports"))
app.use("/api/technician", technicianReports);

// Start server
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
