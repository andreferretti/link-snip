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
    res.status(404).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>404 — Link Not Found</title>
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="container" style="text-align:center; margin-top:4rem;">
    <h1>404</h1>
    <p style="margin-bottom:1.5rem;">This short link doesn't exist.</p>
    <a href="/" style="color:#0066cc;">Go to homepage</a>
  </div>
</body>
</html>`);
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
