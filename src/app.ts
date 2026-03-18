import express from "express";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

import authRoutes from "./routes/auth";
import linkRoutes from "./routes/links";
import statsRoutes from "./routes/stats";
import redirectRoutes from "./routes/redirect";

const app = express();

app.use(express.json());

// Serve the landing page and static files (CSS, JS)
app.use(express.static(path.join(__dirname, "../public")));

// Trust proxy so req.ip returns the real client IP (needed behind Nginx later)
app.set("trust proxy", 1);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Auth routes
app.use("/auth", authRoutes);

// Link routes
app.use("/links", linkRoutes);

// Stats routes
app.use("/stats", statsRoutes);

// Redirect — MUST be last (/:code is a catch-all)
app.use("/", redirectRoutes);

export default app;
