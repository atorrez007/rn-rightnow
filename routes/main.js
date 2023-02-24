const { json } = require("body-parser");
const mongoose = require("mongoose");
const fs = require("fs");
const router = require("express").Router();
const Hospital = require("../models/hospitalModel");
const Review = require("../models/reviewModel");

const rawHospitalData = fs.readFileSync("test-hospital-data.json", "utf-8");
const hospitalObj = JSON.parse(rawHospitalData);

// create an endpoint to generate data and import into MongoDB via Mongoose.
router.get("/load-data", (req, res) => {
  const hospitalforDatabase = Object.values(hospitalObj);
  for (let i = 0; i < hospitalforDatabase.length; i++) {
    const item = hospitalforDatabase[i];

    let hospital = new Hospital({
      hospitalId: item["Facility ID"],
      name: item["Facility Name"],
      address: item.Address,
      city: item.City,
      state: item.State,
      zipCode: item["ZIP Code"],
      county: item["County Name"],
      phoneNumber: item["Phone Number"],
      reviews: [],
    });

    let review = new Review({
      hospital: hospital._id,
      text: "I love this hospital!",
    });

    hospital.reviews.push(review._id);

    review.save((err) => {
      if (err) throw err;
    });

    hospital.save((err) => {
      if (err) throw err;
    });
  }
  res.send("Generated!");
});
// create hospital id router param
router.param("hospital", function (req, res, next, id) {
  Hospital.findById({ _id: `${id}` }).exec((err, hospital) => {
    if (err) {
      return next(err);
    } else {
      req.hospital = hospital;
      next();
    }
  });
});

router.get("/hospitals", async (req, res) => {
  Hospital.find().exec((err, data) => {
    if (err) {
      res.status(500).send("Internal Server Error");
      return;
    } else {
      res.send(data);
    }
  });
});

router.get("/hospitals/:hospital", (req, res) => {
  const hospital = req.hospital;
  if (!hospital) {
    return res.status(404).json("Hospital not found");
  }
  res.send(hospital);
});

router.get("/reviews", (req, res) => {
  Review.find({}).exec((err, reviews) => {
    if (err) {
      throw err;
    }
    res.send(reviews);
  });
});

router.get("/hospitals/:hospital/reviews", (req, res) => {
  const hospital = req.hospital;
  if (!hospital) {
    return res.status(404).json("Hospital not found");
  }
  Hospital.find({ _id: req.hospital._id })
    .populate({
      path: "reviews",
    })
    .exec((err, review) => {
      if (err) {
        throw err;
      }
      res.send(review);
    });
});

module.exports = router;
