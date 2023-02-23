const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Hospital = require("./hospitalModel");

const reviewSchema = new Schema({
  hospital: { type: Schema.Types.ObjectId, ref: "Hospital" },
  text: { type: String },
  date: { type: String, required: true, default: new Date() },
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
