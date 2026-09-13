process.env.NODE_ENV = "test";
const jwt = require("jsonwebtoken");
const request = require("supertest");
const { app } = require("./app");

const token = jwt.sign({ sub: "1", email: "test@example.com", name: "Test User" }, process.env.JWT_SECRET || "dev-secret-change-me");

describe("order service", () => {
  test("reads the authenticated user's cart", async () => {
    const res = await request(app).get("/cart").set("Authorization", `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  test("creates an order from cart items", async () => {
    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ productId: 1, quantity: 2 }] });

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe("CONFIRMED");
    expect(res.body.total).toBe(200);
  });
});
