const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// Define Transaction model
const Transaction = mongoose.model(
  "Transaction",
  new mongoose.Schema({
    type: { type: String, enum: ["income", "expense"], required: true },
    category: { type: String },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    description: { type: String },
  })
);

// POST /transactions
router.post("/", async (req, res) => {
  try {
    const { type, category, amount, date, description } = req.body;
    const transaction = new Transaction({
      type,
      category,
      amount,
      date,
      description,
    });
    await transaction.save();
    res.status(201).json(transaction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /transactions
router.get("/", async (req, res) => {
  try {
    const transactions = await Transaction.find();
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /transactions/:id
router.get("/:id", async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction)
      return res.status(404).json({ error: "Transaction not found" });
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /transactions/:id
router.put("/:id", async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!transaction)
      return res.status(404).json({ error: "Transaction not found" });
    res.json(transaction);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /transactions/:id
router.delete("/:id", async (req, res) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id);
    if (!transaction)
      return res.status(404).json({ error: "Transaction not found" });
    res.json({ message: "Transaction deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /summary
router.get("/summary", async (req, res) => {
  try {
    const totalIncome = await Transaction.aggregate([
      { $match: { type: "income" } },
      { $group: { _id: null, totalIncome: { $sum: "$amount" } } },
    ]);

    const totalExpenses = await Transaction.aggregate([
      { $match: { type: "expense" } },
      { $group: { _id: null, totalExpenses: { $sum: "$amount" } } },
    ]);

    const income = totalIncome[0] ? totalIncome[0].totalIncome : 0;
    const expenses = totalExpenses[0] ? totalExpenses[0].totalExpenses : 0;
    const balance = income - expenses;

    res.json({ totalIncome: income, totalExpenses: expenses, balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
