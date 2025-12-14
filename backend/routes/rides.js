const express = require("express");
const router = express.Router();
const Ride = require("../models/Ride");
const jwt = require("jsonwebtoken");

// -------------------- AUTH MIDDLEWARE --------------------
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// -------------------- BOOK A RIDE --------------------
router.post("/book", auth, async (req, res) => {
  const { pickup, drop, dateTime } = req.body;

  if (!pickup || !drop || !dateTime) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (pickup.trim().toLowerCase() === drop.trim().toLowerCase()) {
    return res.status(400).json({
      message: "Pickup and drop locations cannot be the same",
    });
  }

  const rideDate = new Date(dateTime);
  if (isNaN(rideDate)) {
    return res.status(400).json({ message: "Invalid date and time" });
  }

  if (rideDate < new Date()) {
    return res.status(400).json({
      message: "Ride date and time must be in the future",
    });
  }

  try {
    const ride = new Ride({
      user: req.user.id,
      pickup,
      drop,
      dateTime: rideDate,
      status: "pending",
    });

    await ride.save();
    res.json({ message: "Ride booked successfully", ride });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Booking failed" });
  }
});

// -------------------- GET USER RIDE STATS --------------------
router.get("/stats", auth, async (req, res) => {
  try {
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// -------------------- GET USER RIDES (NEW) --------------------
router.get("/my", auth, async (req, res) => {
  try {
    const rides = await Ride.find({ user: req.user.id })
      .sort({ createdAt: -1 });

    res.json(rides);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch rides" });
  }
});
// -------------------- MARK RIDE AS COMPLETED --------------------
router.put("/:id/complete", auth, async (req, res) => {
  try {
    const ride = await Ride.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    ride.status = "completed";
    await ride.save();

    res.json({ message: "Ride marked as completed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update ride" });
  }
});
// -------------------- CANCEL RIDE --------------------
router.delete("/:id", auth, async (req, res) => {
  try {
    const ride = await Ride.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    await ride.deleteOne();
    res.json({ message: "Ride cancelled successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to cancel ride" });
  }
});


module.exports = router;
