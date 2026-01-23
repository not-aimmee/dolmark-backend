// backend/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import multer from "multer";
import cloudinary from "cloudinary";
import fs from "fs";

const app = express();
const upload = multer({ dest: "uploads/" });

// ✅ Cloudinary ESM fix
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());

// ---------------- TEST ROUTE ----------------
app.get("/test", (_req, res) => {
  res.json({ message: "Backend is working!" });
});

// ---------------- EMAIL ROUTE ----------------
app.post("/send-email", async (req, res) => {
  const { from_name, from_email, message, cv_link } = req.body;

  try {
    const response = await fetch(
      "https://api.emailjs.com/api/v1.0/email/send",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: process.env.EMAILJS_SERVICE_ID,
          template_id: process.env.EMAILJS_TEMPLATE_ID,
          user_id: process.env.EMAILJS_PUBLIC_KEY,
          template_params: { from_name, from_email, message, cv_link },
        }),
      }
    );

    // ❗ EmailJS returns TEXT, not JSON
    const text = await response.text();
    console.log("EmailJS response:", text);

    if (!response.ok) {
      return res.status(500).json({ error: text });
    }

    res.json({ message: "Email sent successfully" });
  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
});

// ---------------- CV UPLOAD ROUTE ----------------
app.post("/upload-cv", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const result = await cloudinary.v2.uploader.upload(req.file.path, {
      resource_type: "auto",
      folder: "cv_uploads",
    });

    fs.unlinkSync(req.file.path);

    res.json({ secure_url: result.secure_url });
  } catch (err) {
    console.error("Cloudinary error:", err);
    res.status(500).json({ error: "CV upload failed" });
  }
});

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Server running on port ${PORT}`)
);
