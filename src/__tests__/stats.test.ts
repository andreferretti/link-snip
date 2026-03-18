import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import pool from "../db/pool";
import { signToken } from "../middleware/auth";

vi.mock("../db/pool", () => ({
  default: { query: vi.fn() },
}));

const mockQuery = pool.query as ReturnType<typeof vi.fn>;
const token = signToken({ userId: 1, email: "alice@example.com" });

beforeEach(() => {
  mockQuery.mockReset();
});

// ---------- GET /stats/top ----------

describe("GET /stats/top", () => {
  it("returns top links sorted by click count", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, short_code: "top1aaa", original_url: "https://popular.com", created_at: "2026-01-01", click_count: 42 },
        { id: 2, short_code: "top2bbb", original_url: "https://less.com", created_at: "2026-01-02", click_count: 7 },
      ],
    });

    const res = await request(app)
      .get("/stats/top")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.links).toHaveLength(2);
    expect(res.body.links[0].click_count).toBe(42);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/stats/top");
    expect(res.status).toBe(401);
  });
});

// ---------- GET /stats/link/:id ----------

describe("GET /stats/link/:id", () => {
  it("returns daily clicks and top referers for own link", async () => {
    // 1st query: verify link belongs to user
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, short_code: "abc1234", original_url: "https://example.com", created_at: "2026-01-01" }],
    });
    // 2nd query: daily clicks
    mockQuery.mockResolvedValueOnce({
      rows: [
        { date: "2026-01-15", clicks: 10 },
        { date: "2026-01-14", clicks: 5 },
      ],
    });
    // 3rd query: top referers
    mockQuery.mockResolvedValueOnce({
      rows: [
        { referer: "https://twitter.com", clicks: 8 },
        { referer: "Direct", clicks: 7 },
      ],
    });

    const res = await request(app)
      .get("/stats/link/1")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.link.short_code).toBe("abc1234");
    expect(res.body.daily_clicks).toHaveLength(2);
    expect(res.body.top_referers).toHaveLength(2);
    expect(res.body.top_referers[0].referer).toBe("https://twitter.com");
  });

  it("returns 404 for link owned by another user", async () => {
    // Ownership check returns no rows
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/stats/link/999")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/stats/link/1");
    expect(res.status).toBe(401);
  });
});
