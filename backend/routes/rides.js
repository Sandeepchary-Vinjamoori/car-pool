const express = require("express");
const router = express.Router();
const Ride = require("../models/Ride");
const jwt = require("jsonwebtoken");

// -------------------- AUTH --------------------
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

// -------------------- ROUTE API (FIXED) --------------------
router.post("/route", auth, async (req, res) => {
  try {
    const { start, end } = req.body;

    if (!start || !end) {
      return res.status(400).json({ message: "Start & end required" });
    }

    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      return res.status(404).json({ message: "No route found" });
    }

    res.json(data.routes[0]);
  } catch (err) {
    console.error("Route API error:", err);
    res.status(500).json({ message: "Route fetch failed" });
  }
});

// -------------------- BOOK --------------------
router.post("/book", auth, async (req, res) => {
  const { pickup, drop, dateTime } = req.body;

  if (!pickup || !drop || !dateTime) {
    return res.status(400).json({ message: "All fields required" });
  }

  const ride = new Ride({
    user: req.user.id,
    pickup,
    drop,
    dateTime,
    status: "pending",
  });

  await ride.save();
  res.json({ message: "Ride booked", ride });
});

// -------------------- STATS --------------------
router.get("/stats", auth, async (req, res) => {
  const total = await Ride.countDocuments({ user: req.user.id });
  const pending = await Ride.countDocuments({
    user: req.user.id,
    status: "pending",
  });
  const completed = await Ride.countDocuments({
    user: req.user.id,
    status: "completed",
  });

  res.json({ total, pending, completed });
});

// -------------------- MY RIDES --------------------
router.get("/my", auth, async (req, res) => {
  const rides = await Ride.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json(rides);
});

module.exports = router;
