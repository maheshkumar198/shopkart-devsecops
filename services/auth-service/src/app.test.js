process.env.NODE_ENV = "test";
const request = require("supertest");
const { app } = require("./app");

describe("auth service", () => {
  test("registers a user", async () => {
    const res = await request(app).post("/auth/register").send({
      name: "Test User", email: "test@example.com", password: "secret1"
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.token).toBeTruthy();
  });

  test("rejects invalid login", async () => {
    const res = await request(app).post("/auth/login").send({
      email: "bad@example.com", password: "wrong"
    });
    expect(res.statusCode).toBe(401);
  });
});
