const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ["income", "expense"], required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  amount: { type: Number, required: true },
  date: { type: String, required: true },
  description: { type: String },
});

const Transaction = mongoose.model("Transaction", transactionSchema);
module.exports = Transaction;
