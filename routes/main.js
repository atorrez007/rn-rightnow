const { auth, requiresAuth } = require("express-openid-connect");
const fs = require("fs");
const router = require("express").Router();
const Hospital = require("../models/hospitalModel");
const Review = require("../models/reviewModel");
const User = require("../models/userModel");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const rawHospitalData = fs.readFileSync("test-hospital-data.json", "utf-8");
const hospitalObj = JSON.parse(rawHospitalData);
const offSetParams = [
  0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5300,
];
// Query endpoint for CMS Hospital List found.
// Raw data has been saved to hospital-data-query.json

router.get("/api", (req, res) => {
  fetch(process.env.CMS_API)
    .then((res) => res.json())
    .then((data) => res.send(data.results));
});

// router.get("/test", (req, res) => {
//   for (let i = 0; i < offSetParams.length; i++) {
//     const index = offSetParams[i];
//     console.log(
//       `https://data.cms.gov/provider-data/api/1/datastore/query/c9888e32-7acc-59ad-9915-fbdb8128d611?offset=${index}&count=true&results=true&schema=true&keys=true&format=json&rowIds=false`
//     );
//   }
// });

// create an endpoint to generate data and import into MongoDB via Mongoose.
router.get("/load-data", async (req, res) => {
  let user = new User({
    userName: "JohnnyAppleseed1",
    email: "JohnnyApple@gmail.com",
    reviews: [],
  });
  user.save((err) => {
    if (err) throw err;
  });

  // const hospitalforDatabase = Object.values(hospitalObj);
  try {
    const response = await fetch(
      `https://data.cms.gov/provider-data/api/1/datastore/query/c9888e32-7acc-59ad-9915-fbdb8128d611?offset=0&count=true&results=true&schema=true&keys=true&format=json&rowIds=false`
    );

    const hospitalData = await response.json();

    for (let i = 0; i < hospitalData.results.length; i++) {
      const item = hospitalData.results[i];

      const existingHospital = await Hospital.findOne({
        hospitalId: item.facility_id,
      });

      if (existingHospital) {
        continue;
      }

      let hospital = new Hospital({
        hospitalId: item.facility_id,
        name: item.facility_name,
        address: item.address,
        city: item.city,
        state: item.state,
        zipCode: item.zip_code,
        county: item.county_name,
        phoneNumber: item.phone_number,
        img: "https://lungdoctors.com/assets/images/hospitals/baptist-hospital-in-miami.jpg",
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
  } catch (err) {
    console.log(err);
    res.send("Error Generating Data.");
  }
});

//   const hospitalforDatabase = Object.values(hospitalObj);
//   for (let i = 0; i < hospitalforDatabase.length; i++) {
//     const item = hospitalforDatabase[i];

//     const existingHospital = await Hospital.findOne({
//       hospitalId: item["Facility ID"],
//     });

//     if (existingHospital) {
//       continue;
//     }

//     let hospital = new Hospital({
//       hospitalId: item["Facility ID"],
//       name: item["Facility Name"],
//       address: item.Address,
//       city: item.City,
//       state: item.State,
//       zipCode: item["ZIP Code"],
//       county: item["County Name"],
//       phoneNumber: item["Phone Number"],
//       reviews: [],
//     });

//     let review = new Review({
//       hospital: hospital._id,
//       shift: ["3/12 hour shifts"],
//       specialty: "Medsurg",
//       nurseRatio: "1:4 patients",
//       text: "I love this hospital!",
//       chartingSoftware: "Epic",
//       accessibility: "8",
//       dinning: ["on-site cafeteria", "vending machines"],
//       scrubColor: "gray",
//       housing: "Hotel",
//       safety: "7",
//       parking: "Paid/Reimbursed",
//       overallScore: 8,
//       user: "",
//     });

//     // reference in the hospital.reviews
//     hospital.reviews.push(review._id);

//     // reference the review in the user.reviews array.
//     user.reviews.push(review._id);
//     // referencing the user in the reviews object.
//     review.user = user._id;

//     review.save((err) => {
//       if (err) throw err;
//     });

//     hospital.save((err) => {
//       if (err) throw err;
//     });
//   }
//   res.send("Generated!");
// });

// middleware
const checkUser = async (req, res, next) => {
  if (req.oidc.user) {
    const { sub } = req.oidc.user;
    const user = await User.findOne({ auth0Id: sub });
    if (user) {
      req.user = user;
      next();
    } else {
      const { name, email } = req.oidc.user;
      const newUser = new User({
        auth0Id: sub,
        userName: name,
        email: email,
        reviews: [],
      });
      await newUser.save();
      req.user = newUser;
      next();
    }
  } else {
    res.redirect("/");
  }
};

// bare function
const checkUserFunc = async (req, res) => {
  if (req.oidc.user) {
    const { sub } = req.oidc.user;
    const user = await User.findOne({ auth0Id: sub });
    if (user) {
      req.user = user;
    } else {
      const { name, email } = req.oidc.user;
      const newUser = new User({
        auth0Id: sub,
        userName: name,
        email: email,
        reviews: [],
      });
      await newUser.save();
      req.user = newUser;
    }
  } else {
    res.redirect("/");
    // will want to redirect to login if no profile found.
  }
};

// create hospital id router param
router.param("hospital", function (req, res, next, id) {
  Hospital.findOne({ hospitalId: `${id}` }).exec((err, hospital) => {
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

router.get("/", async (req, res) => {
  res.render("index", {
    title: "Express Demo",
    isAuthenticated: req.oidc.isAuthenticated(),
    user: req.oidc.user,
  });
});

router.get("/post-review", async (req, res) => {
  res.render("review");
});

router.get("/home", (req, res) => {
  res.send("Homepage. You should be redirected here when you logout.");
});

router.get("/hospitals", async (req, res) => {
  const perPage = 12;
  page = req.query.page ? parseInt(req.query.page) : 1;
  state = req.query.state || "";

  // This criteria will be used to filter through MongoDB's Hospital.countDocuments method.
  let filterCriteria = {};

  Hospital.find()
    .skip((page - 1) * perPage)
    .limit(perPage)
    .exec((err, data) => {
      if (err) {
        res.status(500).send("Internal Server Error");
        return;
      } else {
        res.send(data);
      }
    });
});

router.get("/profile", requiresAuth(), async (req, res) => {
  try {
    await checkUserFunc(req);
    res.send(req.oidc.user);
  } catch (err) {
    res.status(500).send("Internal Server Error");
    console.log(err);
  }
});

router.get("/hospitals/:hospital", (req, res) => {
  const hospital = req.hospital;
  if (!hospital) {
    return res.status(404).json("Hospital not found.");
  }
  res.send(hospital);
});

router.get("/reviews", requiresAuth(), async (req, res) => {
  try {
    await checkUserFunc(req);
    try {
      const reviews = await Review.find({}).exec();
      res.send(reviews);
    } catch (err) {
      console.log(err);
      res.status(500).send("error retrieving reviews");
    }
  } catch (err) {
    res.redirect("/");
  }
});

// Change overall score to 5 and possibly update the hospital schema to either pull the overall score directly or reference the review schema.
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

// requiresAuth removed for testing on front end.
router.get("/reviews/:review", (req, res) => {
  const review = req.review;
  if (!review) {
    return res.status(404).json("Review not found.");
  }
  res.send(review);
});
// requiresAuth removed for testing on front end.
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

// Will be protected and checked for user in db.
router.post("/hospitals/:hospital/reviews", (req, res) => {
  const hospital = req.hospital;
  // console.log(req.user);
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

// Admin endpoints. Requires privelege.
router.param("user", function (req, res, next, id) {
  User.findById({ _id: `${id}` }).exec((err, user) => {
    if (err) {
      return next(err);
    } else {
      req.user = user;
      next();
    }
  });
});

router.get("/users", (req, res) => {
  User.find({}).exec((err, users) => {
    if (err) throw err;
    else {
      res.send(users);
    }
  });
});

router.get("/users/:user", (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(404).json("User not found.");
  }
  res.send(user);
});

router.delete("/reviews/:review", (req, res) => {
  res.send("this endpoint would delete a specific hospital review.");
});

module.exports = router;
