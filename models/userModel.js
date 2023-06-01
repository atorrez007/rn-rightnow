const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Review = require("./reviewModel");

const userSchema = new Schema({
  auth0sub: { type: String },
  nickname: { type: String },
  email: { type: String },
  reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],
});

const User = mongoose.model("User", userSchema);

module.exports = User;
