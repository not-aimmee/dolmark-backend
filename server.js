// backend/server.js
import "dotenv/config.js";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import cloudinary from "cloudinary";
import fs from "fs";

const upload = multer({ dest: "uploads/" });

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors({
  origin: "*",
  credentials: true,
}));
app.use(express.json());

// Serve static files from the dolmark-landing dist folder
app.use(express.static(path.join(__dirname, '../dolmark-landing/dist')));

// Test endpoint
app.get("/test", (req, res) => {
  res.json({ message: "Backend is working!" });
});

app.post("/send-email", async (req, res) => {
   const { from_name, from_email, message, cv_link } = req.body;

  const emailjsServiceID = process.env.EMAILJS_SERVICE_ID;
  const emailjsTemplateID = process.env.EMAILJS_TEMPLATE_ID;
  const emailjsUserID = process.env.EMAILJS_PUBLIC_KEY;

  console.log("Sending email with:", { emailjsServiceID, emailjsTemplateID, emailjsUserID });
  console.log("Request body:", { from_name, from_email, message, cv_link });

  try {
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: emailjsServiceID,
        template_id: emailjsTemplateID,
        user_id: emailjsUserID,
        template_params: { from_name, from_email, message, cv_link },
      }),
    });

    const responseText = await response.text();
    console.log("EmailJS raw response:", responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseErr) {
      console.error("Failed to parse JSON response:", parseErr.message);
      console.error("Response was:", responseText);
      return res.status(500).json({ error: `Invalid response from EmailJS: ${responseText.substring(0, 200)}` });
    }

    console.log("EmailJS response:", responseData);

    if (!response.ok) {
      throw new Error(`EmailJS error: ${response.status} - ${JSON.stringify(responseData)}`);
    }

    res.status(200).json({ message: "Email sent successfully" });
  } catch (err) {
    console.error("Error sending email:", err);
    res.status(500).json({ error: err.message || "Failed to send email" });
  }
});
app.post("/upload-cv", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const result = await cloudinary.v2.uploader.upload(req.file.path, {
      resource_type: "raw",
      folder: "cv_uploads",
    });

    fs.unlinkSync(req.file.path);

    res.json({ url: result.secure_url });
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    res.status(500).json({ error: "CV upload failed" });
  }
});


// Fallback to index.html for client-side routing (must be after API routes)
app.get(/^(?!\/test|\/send-email).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../dolmark-landing/dist/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
