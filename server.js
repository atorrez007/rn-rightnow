const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const { expressjwt: jwt } = require("express-jwt");
const jwks = require("jwks-rsa");
const axios = require("axios");
require("dotenv").config();
// const { auth } = require("express-oauth2-jwt-bearer");

const app = express();

app.set("views", "views");
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  next();
});

mongoose.connect("mongodb://localhost/rn-data", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const jwtCheck = jwt({
  secret: jwks.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: "https://dev-rbgs3itcq1lp4l2d.us.auth0.com/.well-known/jwks.json",
  }),
  algorithms: ["RS256"],
  audience: "RN site identifier ",
  issuer: "https://dev-rbgs3itcq1lp4l2d.us.auth0.com/",
  tokenSigningAlg: ["RS256"],
});

// enforce on all endpoints
app.use(jwtCheck);

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

const mainRoutes = require("./routes/main");
app.use(mainRoutes);

app.get("/testing", (req, res) => {
  res.send({ message: "test" });
});

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`This is port ${port}. I'm listening...`);
});
