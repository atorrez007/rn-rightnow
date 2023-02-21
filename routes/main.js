const router = require("express").Router();

router.get("/home", (req, res) => {
  res.send("Welcome!");
});

module.exports = router;
