const { json } = require("body-parser");
const fs = require("fs");
const router = require("express").Router();

const rawHospitalData = fs.readFileSync("test-hospital-data.json", "utf-8");
const hospitalObj = JSON.parse(rawHospitalData);

// create an endpoint to generate data and import into MongoDB via Mongoose.

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
