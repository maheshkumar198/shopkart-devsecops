CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  total NUMERIC(12,2) NOT NULL CHECK (total > 0),
  status VARCHAR(30) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0)
);

INSERT INTO products (name, price, stock)
SELECT 'Wireless Mouse', 799, 25
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name='Wireless Mouse');

INSERT INTO products (name, price, stock)
SELECT 'Mechanical Keyboard', 2499, 15
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name='Mechanical Keyboard');

INSERT INTO products (name, price, stock)
SELECT 'USB-C Hub', 1499, 20
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name='USB-C Hub');
