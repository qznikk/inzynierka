import express from "express";
import PDFDocument from "pdfkit";
import { pool } from "../db.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

/* ===================== COMPANY DATA ===================== */

const COMPANY = {
  name: "HVACapp Ltd.",
  address: "10 Example Street, 00-000 Warsaw, Poland",
  vat: "PL1234567890",
  email: "office@hvac-solutions.com",
};

/* ===================== ROUTE ===================== */
/**
 * GET /api/invoices/:id/pdf
 * Access: ADMIN + CLIENT (invoice owner)
 */
router.get("/:id/pdf", auth, async (req, res) => {
  try {
    const invoiceId = req.params.id;
    const { id: userId, role } = req.user;

    const { rows } = await pool.query(
      `
      SELECT 
        i.*,
        u.name  AS client_name,
        u.email AS client_email
      FROM invoices i
      JOIN users u ON u.id = i.client_id
      WHERE i.id = $1
      `,
      [invoiceId]
    );

    const invoice = rows[0];
    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    if (role === "CLIENT" && invoice.client_id !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    /* ===================== PDF SETUP ===================== */

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="invoice-${invoice.external_number || invoice.id}.pdf"`
    );

    doc.pipe(res);

    /* ===================== HEADER ===================== */

    doc
      .fontSize(20)
      .text(COMPANY.name, 50, 50)
      .fontSize(12)
      .text("INVOICE", 420, 55);

    doc
      .fontSize(10)
      .text(COMPANY.address, 50, 80)
      .text(`VAT ID: ${COMPANY.vat}`)
      .text(`Email: ${COMPANY.email}`);

    doc
      .fontSize(10)
      .text(`Invoice No: ${invoice.external_number || invoice.id}`, 420, 90)
      .text(
        `Issue Date: ${new Date(invoice.issued_at).toLocaleDateString(
          "en-GB"
        )}`,
        420,
        105
      )
      .text(
        `Due Date: ${
          invoice.due_date
            ? new Date(invoice.due_date).toLocaleDateString("en-GB")
            : "-"
        }`,
        420,
        120
      );

    doc.moveDown(4);

    /* ===================== BUYER ===================== */

    doc.fontSize(12).text("Bill To:", 50);
    doc
      .fontSize(10)
      .text(invoice.client_name || "-", 50, doc.y + 5)
      .text(invoice.client_email || "-");

    doc.moveDown(2);

    /* ===================== TABLE HEADER ===================== */

    const tableTop = doc.y + 20;

    doc
      .fontSize(10)
      .text("Description", 50, tableTop)
      .text("Qty", 300, tableTop)
      .text("Unit Price", 360, tableTop)
      .text("Total", 440, tableTop);

    doc
      .moveTo(50, tableTop + 15)
      .lineTo(550, tableTop + 15)
      .stroke();

    /* ===================== TABLE ROW ===================== */

    const rowY = tableTop + 25;
    const amount = Number(invoice.amount || 0).toFixed(2);

    doc
      .fontSize(10)
      .text(invoice.description || "Service work", 50, rowY)
      .text("1", 300, rowY)
      .text(`${amount} ${invoice.currency || "PLN"}`, 360, rowY)
      .text(`${amount} ${invoice.currency || "PLN"}`, 440, rowY);

    doc
      .moveTo(50, rowY + 15)
      .lineTo(550, rowY + 15)
      .stroke();

    /* ===================== SUMMARY ===================== */

    const summaryY = rowY + 40;

    doc
      .fontSize(12)
      .text(
        `Total Due: ${amount} ${invoice.currency || "PLN"}`,
        350,
        summaryY,
        { align: "right" }
      );

    doc.fontSize(10).text(`Status: ${invoice.status}`, 350, summaryY + 20, {
      align: "right",
    });

    /* ===================== FOOTER ===================== */

    doc
      .fontSize(8)
      .fillColor("gray")
      .text(
        "This document was generated electronically and does not require a signature.",
        50,
        750,
        { align: "center", width: 500 }
      );

    doc.end();
  } catch (err) {
    console.error("PDF ERROR:", err);
    res.status(500).json({ error: "PDF generation failed" });
  }
});

export default router;
