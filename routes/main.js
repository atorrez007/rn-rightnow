const { json } = require("body-parser");
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
      id: item["Facility ID"],
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
router.param("hospital", function (req, res, next, ID) {
  const hospitalArray = Object.values(hospitalObj);

  req.hospitals = hospitalArray;

  req.hospital = req.hospitals.find(
    (hospital) => hospital["Facility ID"] === ID
  );

  next();
});

router.get("/hospitals", (req, res) => {
  // console.log(hospitalObj.length);
  res.send(hospitalObj);
});

router.get("/hospitals/:hospital", (req, res) => {
  if (req.hospital) {
    res.send(req.hospital);
  } else {
    res.send("Hospital not found.");
  }
});

module.exports = router;
