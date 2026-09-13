process.env.NODE_ENV = "test";
const request = require("supertest");
const { app } = require("./app");

describe("catalog service", () => {
  test("lists seeded products", async () => {
    const res = await request(app).get("/products");
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  test("returns a product by id", async () => {
    const res = await request(app).get("/products/1");
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe("Wireless Mouse");
  });
});
