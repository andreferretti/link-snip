import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import pool from "../db/pool";
import { signToken } from "../middleware/auth";

vi.mock("../db/pool", () => ({
  default: { query: vi.fn() },
}));

const mockQuery = pool.query as ReturnType<typeof vi.fn>;

// A valid token we can attach to requests that need auth
const token = signToken({ userId: 1, email: "alice@example.com" });

beforeEach(() => {
  mockQuery.mockReset();
});

// ---------- POST /links (authenticated) ----------

describe("POST /links (authenticated)", () => {
  it("creates a new short link", async () => {
    // 1st query: idempotency check — no existing link found
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // 2nd query: INSERT the new link
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, short_code: "abc1234", original_url: "https://example.com", created_at: "2026-01-01" }],
    });

    const res = await request(app)
      .post("/links")
      .set("Authorization", `Bearer ${token}`)
      .send({ url: "https://example.com" });

    expect(res.status).toBe(201);
    expect(res.body.link.short_code).toBe("abc1234");
    expect(res.body.existing).toBe(false);
  });

  it("returns existing link for duplicate URL (idempotency)", async () => {
    // Idempotency check finds an existing row
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, short_code: "abc1234", original_url: "https://example.com", created_at: "2026-01-01" }],
    });

    const res = await request(app)
      .post("/links")
      .set("Authorization", `Bearer ${token}`)
      .send({ url: "https://example.com" });

    expect(res.status).toBe(200);
    expect(res.body.existing).toBe(true);
    // Only 1 query (the idempotency check) — no INSERT needed
    expect(mockQuery).toHaveBeenCalledOnce();
  });

  it("returns 400 for missing url", async () => {
    const res = await request(app)
      .post("/links")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/url/i);
  });

  it("returns 400 for invalid url", async () => {
    const res = await request(app)
      .post("/links")
      .set("Authorization", `Bearer ${token}`)
      .send({ url: "not-a-url" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });
});

// ---------- POST /links (anonymous) ----------

describe("POST /links (anonymous)", () => {
  it("creates a link for anonymous user", async () => {
    // 1st query: idempotency check by IP — not found
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // 2nd query: count existing anonymous links — under limit
    mockQuery.mockResolvedValueOnce({ rows: [{ count: "0" }] });
    // 3rd query: INSERT
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, short_code: "xyz7890", original_url: "https://example.com", created_at: "2026-01-01" }],
    });

    const res = await request(app)
      .post("/links")
      .send({ url: "https://example.com" });

    expect(res.status).toBe(201);
    expect(res.body.link.short_code).toBe("xyz7890");
  });

  it("returns 403 when anonymous user hits free link limit", async () => {
    // Idempotency check — not found
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // Count check — already at limit
    mockQuery.mockResolvedValueOnce({ rows: [{ count: "2" }] });

    const res = await request(app)
      .post("/links")
      .send({ url: "https://example.com" });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/limited/i);
  });
});

// ---------- GET /links (list own links) ----------

describe("GET /links", () => {
  it("returns the user's links with click counts", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 1, short_code: "abc1234", original_url: "https://example.com", created_at: "2026-01-01", click_count: 5 },
        { id: 2, short_code: "def5678", original_url: "https://other.com", created_at: "2026-01-02", click_count: 0 },
      ],
    });

    const res = await request(app)
      .get("/links")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.links).toHaveLength(2);
    expect(res.body.links[0].click_count).toBe(5);
  });

  it("returns 401 without auth", async () => {
    const res = await request(app).get("/links");

    expect(res.status).toBe(401);
  });
});
