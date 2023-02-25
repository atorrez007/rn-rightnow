const { json } = require("body-parser");
const { requiresAuth } = require("express-openid-connect");

const fs = require("fs");
const router = require("express").Router();
const Hospital = require("../models/hospitalModel");
const Review = require("../models/reviewModel");
const User = require("../models/userModel");

const rawHospitalData = fs.readFileSync("test-hospital-data.json", "utf-8");
const hospitalObj = JSON.parse(rawHospitalData);

// create an endpoint to generate data and import into MongoDB via Mongoose.
router.get("/load-data", (req, res) => {
  let user = new User({
    userName: "JohnnyAppleseed1",
    email: "JohnnyApple@gmail.com",
    reviews: [],
  });
  user.save((err) => {
    if (err) throw err;
  });
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
      shift: ["3/12 hour shifts"],
      specialty: "Medsurg",
      nurseRatio: "1:4 patients",
      text: "I love this hospital!",
      chartingSoftware: "Epic",
      accessibility: "8",
      dinning: ["on-site cafeteria", "vending machines"],
      scrubColor: "gray",
      housing: "Hotel",
      safety: "7",
      parking: "Paid/Reimbursed",
      overallScore: 8,
      user: "",
    });

    // reference in the hospital.reviews
    hospital.reviews.push(review._id);

    // reference the review in the user.reviews array.
    user.reviews.push(review._id);
    // referencing the user in the reviews object.
    review.user = user._id;

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

router.param("review", function (req, res, next, id) {
  Review.findById({ _id: id }).exec((err, review) => {
    if (err) {
      return next(err);
    } else {
      req.review = review;
      next();
    }
  });
});

// Authentication route

// router.get("/", (req, res) => {
//   res.send("Logged out");
// });

router.get("/", (req, res) => {
  res.send(
    req.oidc.isAuthenticated()
      ? res.redirect("/home")
      : res.redirect("/prehome")
  );
});

router.get("/profile", requiresAuth(), (req, res) => {
  res.send(JSON.stringify(req.oidc.user));
});

router.get("/prehome", (req, res) => {
  res.send("You're here but not logged in.");
});
router.get("/home", requiresAuth(), (req, res) => {
  res.send("Welcome to the homepage!");
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
    return res.status(404).json("Hospital not found.");
  }
  res.send(hospital);
});

// Not for user-access.
router.get("/reviews", requiresAuth(), (req, res) => {
  Review.find({}).exec((err, reviews) => {
    if (err) {
      throw err;
    }
    res.send(reviews);
  });
});

router.get("/hospitals/score/:hospital", (req, res) => {
  const hospital = req.hospital;
  Review.aggregate([
    { $match: { hospital: hospital._id } },
    { $group: { _id: null, averageScore: { $avg: "$overallScore" } } },
  ]).then((result) => {
    const averageScore = result[0].averageScore;
    res.json({ averageScore: averageScore });
  });
});

router.get("/reviews/:review", requiresAuth(), (req, res) => {
  const review = req.review;
  if (!review) {
    return res.status(404).json("Review not found.");
  }
  res.send(review);
});

router.get("/hospitals/:hospital/reviews", requiresAuth(), (req, res) => {
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

router.post("/hospitals/:hospital/reviews", (req, res) => {
  const hospital = req.hospital;
  if (!hospital) {
    res.status(404).json("Cannot leave a review. No hospital found.");
  }
  const review = new Review(req.body);

  // The link between hospital and review
  review.hospital = req.hospital._id;

  review.save((err) => {
    if (err) {
      throw err;
    }
    Hospital.findById({ _id: req.hospital._id }, (err, hospital) => {
      if (err) {
        throw err;
      }
      hospital.reviews.push(review._id);

      hospital.save((err) => {
        if (err) {
          throw err;
        }
        res.json("Review added to Hospital!");
      });
    });
  });
});

module.exports = router;
