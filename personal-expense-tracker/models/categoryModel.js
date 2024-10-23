const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["income", "expense"], required: true },
});

const Category = mongoose.model("Category", categorySchema);
module.exports = Category;
