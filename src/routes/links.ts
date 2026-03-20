import { Router, Request, Response } from "express";
import { nanoid } from "nanoid";
import pool from "../db/pool";
import { requireAuth, optionalAuth } from "../middleware/auth";

const router = Router();

const FREE_LINK_LIMIT = 2;

// POST /links — create a short link (authenticated or anonymous)
router.post("/", optionalAuth, async (req: Request, res: Response) => {
  let { url } = req.body;

  if (!url || !url.trim()) {
    res.status(400).json({ error: "url is required" });
    return;
  }

  url = url.trim();

  // Auto-prepend https:// if no protocol is provided
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  // Basic URL validation
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes(".")) throw new Error("no TLD");
  } catch {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  const userId = req.user?.userId ?? null;
  const ip = req.ip;

  // Idempotency: if this user (or IP) already shortened this URL, return it
  if (userId) {
    const { rows } = await pool.query(
      "SELECT id, short_code, original_url, created_at FROM links WHERE user_id = $1 AND original_url = $2",
      [userId, url]
    );
    if (rows.length > 0) {
      res.json({ link: rows[0], existing: true });
      return;
    }
  } else {
    // Anonymous user — check by IP
    const { rows } = await pool.query(
      "SELECT id, short_code, original_url, created_at FROM links WHERE user_id IS NULL AND ip_address = $1 AND original_url = $2",
      [ip, url]
    );
    if (rows.length > 0) {
      res.json({ link: rows[0], existing: true });
      return;
    }

    // Enforce free link limit for anonymous users
    const { rows: countRows } = await pool.query(
      "SELECT COUNT(*) FROM links WHERE user_id IS NULL AND ip_address = $1",
      [ip]
    );
    if (parseInt(countRows[0].count) >= FREE_LINK_LIMIT) {
      res.status(403).json({ error: `Anonymous users are limited to ${FREE_LINK_LIMIT} links. Register for unlimited links.` });
      return;
    }
  }

  const shortCode = nanoid(7);

  const { rows } = await pool.query(
    "INSERT INTO links (short_code, original_url, user_id, ip_address) VALUES ($1, $2, $3, $4) RETURNING id, short_code, original_url, created_at",
    [shortCode, url, userId, ip]
  );

  res.status(201).json({ link: rows[0], existing: false });
});

// GET /links — list your own links (authenticated only)
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT l.id, l.short_code, l.original_url, l.created_at, COUNT(c.id)::int AS click_count
     FROM links l
     LEFT JOIN clicks c ON c.link_id = l.id
     WHERE l.user_id = $1
     GROUP BY l.id
     ORDER BY l.created_at DESC`,
    [req.user!.userId]
  );

  res.json({ links: rows });
});

// DELETE /links/:id — delete a link you own
router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const linkId = parseInt(req.params.id as string);

  // Only delete if the link belongs to this user
  const { rowCount } = await pool.query(
    "DELETE FROM links WHERE id = $1 AND user_id = $2",
    [linkId, req.user!.userId]
  );

  if (rowCount === 0) {
    res.status(404).json({ error: "Link not found" });
    return;
  }

  res.json({ deleted: true });
});

export default router;
