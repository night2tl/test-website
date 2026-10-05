const express = require("express");

const app = express();
app.use(express.json());

const products = [
  { id: "p1", name: "Starter plan", priceCents: 900, category: "plans" },
  { id: "p2", name: "Pro plan", priceCents: 2900, category: "plans" },
  { id: "p3", name: "Onboarding workshop", priceCents: 49900, category: "services" },
];
const orders = [{ id: "o1", productId: "p2", userId: "u1", status: "paid" }];
const users = [{ id: "u1", name: "Ada Lovelace", email: "ada@example.com", phone: "555-0100" }];

function requireApiKey(req, res, next) {
  if (req.header("x-api-key") !== process.env.API_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

// Public catalog: safe reads, no auth.
app.get("/api/products", (req, res) => {
  const { category } = req.query;
  res.json(category ? products.filter((p) => p.category === category) : products);
});

app.get("/api/products/:id", (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: "not found" });
  res.json(product);
});

app.get("/api/search", (req, res) => {
  const q = String(req.query.q || "").toLowerCase();
  res.json(products.filter((p) => p.name.toLowerCase().includes(q)));
});

// Authenticated reads.
app.get("/api/orders/:id", requireApiKey, (req, res) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "not found" });
  res.json(order);
});

// Personal data: should never be preselected.
app.get("/api/users/:id", requireApiKey, (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: "not found" });
  res.json(user);
});

// Writes: should never be preselected.
app.post("/api/orders", requireApiKey, (req, res) => {
  const order = { id: `o${orders.length + 1}`, status: "pending", ...req.body };
  orders.push(order);
  res.status(201).json(order);
});

app.delete("/api/orders/:id", requireApiKey, (req, res) => {
  const index = orders.findIndex((o) => o.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "not found" });
  orders.splice(index, 1);
  res.status(204).end();
});

// Credentials-ish: should be flagged and never preselected.
app.post("/api/auth/token", (req, res) => {
  res.json({ token: "demo-token" });
});

// Not worth exposing: health check.
app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(process.env.PORT || 4000);
