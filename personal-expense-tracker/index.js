const express = require("express");
const bodyParser = require("body-parser");
const db = require("./database");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = "your_secret_key"; // Change this in production!

app.use(cors());
app.use(bodyParser.json());

// Middleware to authenticate JWT
const authenticateJWT = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.sendStatus(403);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user; // Attach user info to the request
    next();
  });
};

// Utility function for checking required fields
const checkRequiredFields = (fields, reqBody) => {
  for (const field of fields) {
    if (!reqBody[field]) {
      return `Missing required field: ${field}`;
    }
  }
  return null;
};

// Register a user
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const missingField = checkRequiredFields(["username", "password"], req.body);
  if (missingField) return res.status(400).json({ error: missingField });

  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(
    `INSERT INTO users (username, password) VALUES (?, ?)`,
    [username, hashedPassword],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Login a user
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const missingField = checkRequiredFields(["username", "password"], req.body);
  if (missingField) return res.status(400).json({ error: missingField });

  db.get(
    `SELECT * FROM users WHERE username = ?`,
    [username],
    async (err, user) => {
      if (err || !user)
        return res.status(401).json({ error: "Invalid credentials" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(401).json({ error: "Invalid credentials" });

      const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: "1h" });
      res.json({ token });
    }
  );
});

// Protect transaction routes
app.post("/transactions", authenticateJWT, (req, res) => {
  const { type, category, amount, date, description } = req.body;

  const missingField = checkRequiredFields(
    ["type", "category", "amount", "date"],
    req.body
  );
  if (missingField) return res.status(400).json({ error: missingField });

  if (typeof amount !== "number") {
    return res
      .status(400)
      .json({ error: "Invalid input type: amount must be a number." });
  }

  db.run(
    `INSERT INTO transactions (type, category, amount, date, description, user_id) VALUES (?, ?, ?, ?, ?, ?)`,
    [type, category, amount, date, description, req.user.id],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.status(201).json({ id: this.lastID });
    }
  );
});

// Get all transactions for a user
app.get("/transactions", authenticateJWT, (req, res) => {
  db.all(
    `SELECT * FROM transactions WHERE user_id = ?`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Get transaction by ID
app.get("/transactions/:id", authenticateJWT, (req, res) => {
  const { id } = req.params;

  db.get(
    `SELECT * FROM transactions WHERE id = ? AND user_id = ?`,
    [id, req.user.id],
    (err, row) => {
      if (err) return res.status(400).json({ error: err.message });
      if (!row) return res.status(404).json({ error: "Transaction not found" });
      res.json(row);
    }
  );
});

// Update a transaction
app.put("/transactions/:id", authenticateJWT, (req, res) => {
  const { id } = req.params;
  const { type, category, amount, date, description } = req.body;

  const missingField = checkRequiredFields(
    ["type", "category", "amount", "date"],
    req.body
  );
  if (missingField) return res.status(400).json({ error: missingField });

  if (typeof amount !== "number") {
    return res
      .status(400)
      .json({ error: "Invalid input type: amount must be a number." });
  }

  db.run(
    `UPDATE transactions SET type = ?, category = ?, amount = ?, date = ?, description = ? WHERE id = ? AND user_id = ?`,
    [type, category, amount, date, description, id, req.user.id],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      if (this.changes === 0)
        return res
          .status(404)
          .json({ error: "Transaction not found or not authorized" });
      res.json({ updated: this.changes });
    }
  );
});

// Delete a transaction
app.delete("/transactions/:id", authenticateJWT, (req, res) => {
  const { id } = req.params;

  db.run(
    `DELETE FROM transactions WHERE id = ? AND user_id = ?`,
    [id, req.user.id],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      if (this.changes === 0)
        return res
          .status(404)
          .json({ error: "Transaction not found or not authorized" });
      res.json({ deleted: this.changes });
    }
  );
});

// Get summary of transactions
app.get("/summary", authenticateJWT, (req, res) => {
  db.all(
    `SELECT type, SUM(amount) as total FROM transactions WHERE user_id = ? GROUP BY type`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json(rows);
    }
  );
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
