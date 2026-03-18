import { Router, Request, Response } from "express";
import pool from "../db/pool";

const router = Router();

// GET /:code — redirect to original URL and log the click
router.get("/:code", async (req: Request, res: Response) => {
  const { code } = req.params;

  const { rows } = await pool.query(
    "SELECT id, original_url FROM links WHERE short_code = $1",
    [code]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: "Short link not found" });
    return;
  }

  const link = rows[0];

  // Log the click (fire-and-forget — don't make the user wait for this)
  pool.query(
    "INSERT INTO clicks (link_id, ip_address, user_agent, referer) VALUES ($1, $2, $3, $4)",
    [link.id, req.ip, req.headers["user-agent"] || null, req.headers["referer"] || null]
  );

  // 302 (temporary), not 301 — a 301 makes browsers cache the redirect,
  // so repeat clicks skip the server and never get logged.
  res.redirect(302, link.original_url);
});

export default router;
