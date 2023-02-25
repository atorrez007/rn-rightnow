const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Hospital = require("./hospitalModel");
const User = require("./userModel");

const reviewSchema = new Schema({
  hospital: { type: Schema.Types.ObjectId, ref: "Hospital" },
  specialty: [],
  shift: [],
  nurseRatio: { type: String },
  text: { type: String },
  chartingSoftware: { type: String },
  accessibility: { type: String },
  dinning: [],
  scrubColor: { type: String },
  housing: [],
  safety: { type: String },
  parking: { type: String },
  overallScore: { type: Number },
  user: { type: Schema.Types.ObjectId, ref: "User" },
  date: { type: String, required: true, default: new Date() },
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
