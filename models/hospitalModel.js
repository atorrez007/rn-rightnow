const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./reviewModel");

const hospitalSchema = new Schema({
  hospitalId: { type: String },
  name: { type: String },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  zipCode: { type: String },
  county: { type: String },
  phoneNumber: { type: String },
  reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],
});

const Hospital = mongoose.model("Hospital", hospitalSchema);

module.exports = Hospital;
