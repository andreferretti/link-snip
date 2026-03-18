import { Router, Request, Response } from "express";
import pool from "../db/pool";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /stats/top — top links by click count for the logged-in user
router.get("/top", requireAuth, async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT
       l.id,
       l.short_code,
       l.original_url,
       l.created_at,
       COUNT(c.id)::int AS click_count
     FROM links l
     LEFT JOIN clicks c ON c.link_id = l.id
     WHERE l.user_id = $1
     GROUP BY l.id
     ORDER BY click_count DESC
     LIMIT 10`,
    [req.user!.userId]
  );

  res.json({ links: rows });
});

// GET /stats/link/:id — detailed click stats for a single link
router.get("/link/:id", requireAuth, async (req: Request, res: Response) => {
  const linkId = parseInt(req.params.id as string);

  // Verify the link belongs to this user
  const { rows: linkRows } = await pool.query(
    "SELECT id, short_code, original_url, created_at FROM links WHERE id = $1 AND user_id = $2",
    [linkId, req.user!.userId]
  );

  if (linkRows.length === 0) {
    res.status(404).json({ error: "Link not found" });
    return;
  }

  // Get click breakdown by day
  const { rows: dailyClicks } = await pool.query(
    `SELECT
       DATE(clicked_at) AS date,
       COUNT(*)::int AS clicks
     FROM clicks
     WHERE link_id = $1
     GROUP BY DATE(clicked_at)
     ORDER BY date DESC
     LIMIT 30`,
    [linkId]
  );

  // Get top referers
  const { rows: topReferers } = await pool.query(
    `SELECT
       COALESCE(referer, 'Direct') AS referer,
       COUNT(*)::int AS clicks
     FROM clicks
     WHERE link_id = $1
     GROUP BY referer
     ORDER BY clicks DESC
     LIMIT 10`,
    [linkId]
  );

  res.json({
    link: linkRows[0],
    daily_clicks: dailyClicks,
    top_referers: topReferers,
  });
});

export default router;
