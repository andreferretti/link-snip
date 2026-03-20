import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import pool from "../db/pool";

vi.mock("../db/pool", () => ({
  default: { query: vi.fn() },
}));

const mockQuery = pool.query as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockQuery.mockReset();
});

describe("GET /:code (redirect)", () => {
  it("redirects to the original URL with 302", async () => {
    // 1st query: look up the short code
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, original_url: "https://example.com/page" }],
    });
    // 2nd query: INSERT INTO clicks (fire-and-forget)
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/abc1234");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("https://example.com/page");

    // Verify a click was logged
    const clickInsert = mockQuery.mock.calls[1];
    expect(clickInsert[0]).toContain("INSERT INTO clicks");
    expect(clickInsert[1][0]).toBe(1); // link_id
  });

  it("returns 404 for unknown code", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get("/nope123");

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});
