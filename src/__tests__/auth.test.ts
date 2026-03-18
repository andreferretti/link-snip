import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import pool from "../db/pool";
import bcrypt from "bcryptjs";

// Replace the real pool with a fake — every call to pool.query() is now a mock
vi.mock("../db/pool", () => ({
  default: { query: vi.fn() },
}));

// Cast so TypeScript knows .query is a mock function
const mockQuery = pool.query as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockQuery.mockReset();
});

// ---------- POST /auth/register ----------

describe("POST /auth/register", () => {
  it("creates a user and returns a token", async () => {
    // When the route does INSERT INTO users, return this fake row:
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: "alice@example.com" }],
    });

    const res = await request(app)
      .post("/auth/register")
      .send({ email: "alice@example.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("alice@example.com");
    expect(res.body.token).toBeDefined();

    // Verify pool.query was called with the INSERT
    expect(mockQuery).toHaveBeenCalledOnce();
    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("INSERT INTO users");
    expect(params[0]).toBe("alice@example.com");
    // params[1] is the bcrypt hash — just check it's a string
    expect(typeof params[1]).toBe("string");
  });

  it("returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email/i);
  });

  it("returns 400 when password is too short", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "alice@example.com", password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8 characters/);
  });

  it("returns 409 when email is already taken", async () => {
    // Postgres unique violation error
    const err = new Error("duplicate key") as any;
    err.code = "23505";
    mockQuery.mockRejectedValueOnce(err);

    const res = await request(app)
      .post("/auth/register")
      .send({ email: "alice@example.com", password: "password123" });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });
});

// ---------- POST /auth/login ----------

describe("POST /auth/login", () => {
  it("returns a token for valid credentials", async () => {
    // The route does SELECT ... WHERE email = $1, so return a fake user row.
    // We need a real bcrypt hash here so bcrypt.compare() passes inside the route.
    const hash = await bcrypt.hash("password123", 1); // rounds=1 for speed

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: "alice@example.com", password_hash: hash }],
    });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "alice@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("alice@example.com");
    expect(res.body.token).toBeDefined();
  });

  it("returns 401 for wrong password", async () => {
    const hash = await bcrypt.hash("correctpassword", 1);

    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 1, email: "alice@example.com", password_hash: hash }],
    });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "alice@example.com", password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("returns 401 for non-existent email", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@example.com", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("returns 400 when fields are missing", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });
});
