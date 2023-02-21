const { json } = require("body-parser");
const fs = require("fs");
const router = require("express").Router();

const rawHospitalData = fs.readFileSync("test-hospital-data.json", "utf-8");
const hospitalObj = JSON.parse(rawHospitalData);

router.get("/home", (req, res) => {
  // console.log(hospitalObj.length);
  res.send(hospitalObj);
});

module.exports = router;
