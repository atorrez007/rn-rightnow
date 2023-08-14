const dotenv = require("dotenv"); // Add this line

// (default to development environment, switch to "production" for production environment)
process.env.NODE_ENV = "development";

// Load environment variables based on NODE_ENV
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: envFile });

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const jwt = require("express-jwt");
const jwks = require("jwks-rsa");
const axios = require("axios");

const unprotected = [
  "/home",
  "/testing",
  "/hospitals",
  // "/hospitals/:hospital",
  // "/reviews",
  // "/hospitals/:hospital/reviews",
  // "/search/:hospitalId",
];

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

const port = process.env.PORT || 8000;
const mongodbURI = process.env.MONGODB_URI;

const dbURI =
  process.env.USE_ATLAS === "true"
    ? process.env.ATLAS_DB_URI
    : process.env.LOCAL_DB_URI;

mongoose.connect(dbURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

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

console.log(`Current environment: ${process.env.NODE_ENV}.`);
console.log(`Your mongoURI is ${dbURI}.`);

app.listen(port, () => {
  console.log(`This is port ${port}. I'm listening...`);
});
