// const { auth, requiresAuth } = require("express-openid-connect");
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
  0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5300, 5400,
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

  // create a for loop with all offSetParam values.

  try {
    for (const offset of offSetParams) {
      console.log(`Loading data with offset ${offset}`);

      const response = await fetch(
        `https://data.cms.gov/provider-data/api/1/datastore/query/xubh-q36u/0?offset=${offset}&count=true&results=true&schema=true&keys=true&format=json&rowIds=false`
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
          city: item.citytown,
          state: item.state,
          zipCode: item.zip_code,
          county: item.countyparish,
          phoneNumber: item.phone_number,
          img: "https://lungdoctors.com/assets/images/hospitals/baptist-hospital-in-miami.jpg",
          reviews: [],
        });

        let review = new Review({
          hospital: hospital._id,
          shift: ["3/12 hour shifts"],
          specialty: ["Medsurg"],
          nurseRatio: "1:4 patients",
          text: "I love this hospital!",
          chartingSoftware: "Epic",
          accessibility: "8",
          diningOptions: ["on-site cafeteria", "vending machines"],
          scrubColor: "gray",
          accommodations: "Hotel",
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
    }
    res.send("Generated!");
  } catch (err) {
    console.log(err);
    res.send("Error Generating Data.");
  }
});

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
  Review.findById({ _id: `${id}` }).exec((err, review) => {
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

router.get("/gethospitals", (req, res) => {
  res.send({ message: "Get Hospitals called." });
});

router.get("/post-review", async (req, res) => {
  res.render("review");
});

router.get("/home", (req, res) => {
  res.send({ message: "This is home!" });
});

router.get("/hospitals", async (req, res) => {
  const capitalize = (string) => {
    if (string) {
      string = string.toUpperCase();
      return string;
    }
  };
  const perPage = 12;
  const page = req.query.page ? parseInt(req.query.page) : 1;
  const state = req.query.state || "";
  const city = req.query.city || "";
  const query = req.query.query;

  // const search = capitalize(query);

  const allHospitals =
    req.query.allHospitals && req.query.allHospitals === "true";

  const createFilterCriteria = (state, city, query) => {
    const filterCriteria = {};
    if (state) {
      filterCriteria.state = state;
    }
    if (state && city) {
      filterCriteria.state = state;
      filterCriteria.city = city;
    }

    if (state && city && query) {
      const search = query.toUpperCase();
      filterCriteria.state = state;
      filterCriteria.city = city;
      filterCriteria.name = { $regex: search, $options: "i" };
    }

    if (query) {
      const search = query.toUpperCase();
      filterCriteria.$or = [
        { name: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } },
      ];
    }
    return filterCriteria;
  };

  // let filterCriteria = {};

  const filterCriteria = createFilterCriteria(state, city, query);

  // if (state && city) {
  //   filterCriteria = {
  //     state: state,
  //     city: city,
  //   };
  // } else if (state && city && search) {
  //   filterCriteria = {
  //     state: state,
  //     city: city,
  //     name: { $regex: search, $options: "i" },
  //   };
  // } else if (state && search) {
  //   filterCriteria = {
  //     state: state,
  //     name: { $regex: search, $options: "i" },
  //   };
  // } else if (search) {
  //   filterCriteria = {
  //     name: { $regex: search, $options: "i" },
  //   };
  // } else {
  //   filterCriteria = {
  //     state: state,
  //   };
  // }
  // This sort criteria will be used to sort the hospitals in each city and state according to rating.
  let sortCriteria = {};

  if (allHospitals) {
    Hospital.countDocuments().exec((err, count) => {
      if (err) {
        res.status(400).send(err);
      } else {
        Hospital.find().exec((err, data) => {
          if (err) {
            res.status(500).send("Internal Server Error");
            return;
          } else {
            res.send({ data, count });
          }
        });
      }
    });
  } else {
    Hospital.countDocuments(filterCriteria).exec((err, count) => {
      if (err) {
        res.send(err);
      } else {
        Hospital.find(filterCriteria)
          .skip((page - 1) * perPage)
          .limit(perPage)
          .exec((err, data) => {
            if (err) {
              res.status(500).send("Internal Server Error");
              return;
            } else {
              res.status(200).send({ data, count });
            }
          });
      }
    });
  }
});

router.get("/profile", async (req, res) => {
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

router.get("/reviews", async (req, res) => {
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

router.get("/new", (req, res) => {
  res.send({ message: "new endpoint for auth check." });
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
// Add review to users reviews
// router.post("/hospitals/:hospital/reviews", async (req, res) => {
//   const hospital = req.hospital;
//   const userSub = req.body.user.sub;

//   // console.log(req.user);

//   // review.user = user._id;
//   // Find user in the db.
//   if (!userSub) {
//     res.status(500).json({ message: "user is not logged in!" });
//   } else {
//     User.findOne({ auth0sub: userSub }).exec((err, user) => {
//       if (err) {
//         throw err;
//       }
//       // creation of a new review
//       const review = new Review(req.body.values);

//       // The link between hospital and review
//       review.hospital = req.hospital._id;

//       // The link between user and review
//       review.user = user._id;

//       // The link between review and user
//       user.reviews.push(review._id);
//       user.save((err) => {
//         if (err) {
//           throw err;
//         }
//       });
//       review.save((err) => {
//         if (err) {
//           throw err;
//         }

//         Hospital.findById({ _id: req.hospital._id }, (err, hospital) => {
//           if (!hospital) {
//             res.status(404).json("Cannot leave a review. No hospital found.");
//           }
//           if (err) {
//             throw err;
//           }
//           hospital.reviews.push(review._id);

//           hospital.save((err) => {
//             if (err) {
//               throw err;
//             }
//             res.json("Review added to Hospital!");
//           });
//         });
//       });
//     });
//   }
// });

router.post("/hospitals/:hospital/reviews", async (req, res) => {
  const hospital = req.hospital;
  const userSub = req.body.user.sub;

  // console.log(req.user);

  // review.user = user._id;
  // Find user in the db.
  if (!userSub) {
    res.status(500).json({ message: "user is not logged in!" });
  } else {
    User.findOne({ auth0sub: userSub }).exec((err, user) => {
      if (err) {
        throw err;
      }
      // creation of a new review
      const review = new Review(req.body.values);

      // The link between hospital and review
      review.hospital = req.hospital._id;

      // The link between user and review
      review.user = user._id;

      // The link between review and user
      user.reviews.push(review._id);
      user.save((err) => {
        if (err) {
          throw err;
        }
      });
      review.save((err) => {
        if (err) {
          throw err;
        }

        Hospital.findById(req.hospital._id).exec((err, hospital) => {
          if (!hospital) {
            res.status(404).json("Cannot leave a review. No hospital found.");
          }
          if (err) {
            throw err;
          }
          hospital.reviews.push(review._id);

          hospital.save((err) => {
            if (err) {
              throw err;
            }

            // Calculate the overall score for the hospital
            Review.aggregate([
              { $match: { hospital: hospital._id } },
              {
                $group: {
                  _id: null,
                  averageScore: { $avg: "$overallScore" },
                },
              },
            ]).exec((err, result) => {
              if (err) {
                throw err;
              }
              if (result.length > 0) {
                const averageScore = result[0].averageScore;
                hospital.overallScore = averageScore;
                hospital.save((err) => {
                  if (err) {
                    throw err;
                  }
                  res.json("Review added to Hospital!");
                });
              } else {
                res.status(404).json("Cannot calculate overall score.");
              }
            });
          });
        });
      });
    });
  }
});

// Admin endpoints. Requires privelege.
router.param("user", function (req, res, next, id) {
  const auth0sub = id;
  User.findOne({ auth0sub }).exec((err, user) => {
    if (err) {
      return next(err);
    } else {
      req.user = user;
      next();
    }
  });
});

// verify database existence or create entry
router.post("/signup", async (req, res) => {
  const { auth0sub, nickname, email } = req.body;
  try {
    let user = await User.findOne({
      auth0sub,
    });
    if (user) {
      return res.send("Welcome back, User.");
    } else {
      user = new User({
        auth0sub: auth0sub,
        nickname: nickname,
        email: email,
        reviews: [],
      });
      user.save((err) => {
        if (err) {
          throw err;
        }
      });
    }
  } catch (error) {
    console.log(error);
  }
});

router.get("/users", (req, res) => {
  User.find({}).exec((err, users) => {
    if (err) throw err;
    else {
      res.send(users);
    }
  });
});

router.get("/users/:user", async (req, res) => {
  const user = req.user;
  if (!user) {
    return res.status(404).json("User not found.");
  }
  await user.populate({
    path: "reviews",
  });
  await user.populate({ path: "reviews.hospital" });
  res.send(user);
});

router.delete("/reviews/:review", (req, res) => {
  res.send("this endpoint would delete a specific hospital review.");
});

module.exports = router;
