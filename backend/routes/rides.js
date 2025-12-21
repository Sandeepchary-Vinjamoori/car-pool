const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Ride = require("../models/Ride");
const jwt = require("jsonwebtoken");

// -------------------- GOOGLE MAPS HELPERS --------------------
// Decode an encoded polyline string from Google Directions API into [lng, lat] pairs
function decodePolyline(encoded) {
  if (!encoded) return [];

  let index = 0;
  const len = encoded.length;
  const coordinates = [];
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;

    // Google encodes coordinates in 1e-5 degrees
    coordinates.push([lng / 1e5, lat / 1e5]); // [lng, lat]
  }

  return coordinates;
}

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
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  try {
    const { start, end } = req.body;

    if (!start || !end) {
      return res.status(400).json({ message: "Start & end required" });
    }

    // Try Google Maps API first if key is available
    if (apiKey) {
      try {
        const origin = `${start.lat},${start.lng}`;
        const destination = `${end.lat},${end.lng}`;

        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
          origin
        )}&destination=${encodeURIComponent(
          destination
        )}&mode=driving&key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.status === "OK" && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const leg = route.legs && route.legs[0];

          if (leg && route.overview_polyline) {
            const coordinates = decodePolyline(route.overview_polyline.points);

            return res.json({
              distance: leg.distance.value, // meters
              duration: leg.duration.value, // seconds
              geometry: {
                coordinates, // [lng, lat] pairs
              },
            });
          }
        }
        console.log("Google Maps API failed, falling back to OSRM");
      } catch (googleErr) {
        console.log("Google Maps API error, falling back to OSRM:", googleErr.message);
      }
    } else {
      console.log("No Google Maps API key, using OSRM");
    }

    // Fallback to OSRM (free routing service)
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

    const response = await fetch(osrmUrl);
    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      return res.status(404).json({ message: "No route found" });
    }

    const route = data.routes[0];
    
    res.json({
      distance: route.distance, // meters
      duration: route.duration, // seconds
      geometry: {
        coordinates: route.geometry.coordinates, // [lng, lat] pairs
      },
    });
  } catch (err) {
    console.error("Route API error:", err);
    res.status(500).json({ message: "Route fetch failed: " + err.message });
  }
});

// -------------------- BOOK --------------------
router.post("/book", auth, async (req, res) => {
  const { pickup, drop, dateTime, type } = req.body;

  if (!pickup || !drop || !dateTime || !type) {
    return res.status(400).json({ message: "All fields required" });
  }

  if (!["poolCar", "findCar"].includes(type)) {
    return res.status(400).json({ message: "Type must be 'poolCar' or 'findCar'" });
  }

  const ride = new Ride({
    user: req.user.id,
    pickup,
    drop,
    dateTime,
    type,
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

// -------------------- COMPLETE RIDE --------------------
router.put("/:id/complete", auth, async (req, res) => {
  try {
    const rideId = req.params.id;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(rideId)) {
      return res.status(400).json({ message: "Invalid ride ID format" });
    }

    // Find and update in one operation
    const ride = await Ride.findOneAndUpdate(
      { _id: rideId, user: req.user.id, status: "pending" },
      { status: "completed" },
      { new: true, runValidators: true }
    );
    
    if (!ride) {
      // Check if ride exists but belongs to different user or is already completed
      const existingRide = await Ride.findById(rideId);
      if (!existingRide) {
        return res.status(404).json({ message: "Ride not found" });
      }
      if (existingRide.user.toString() !== req.user.id) {
        return res.status(403).json({ message: "You don't have permission to complete this ride" });
      }
      if (existingRide.status === "completed") {
        return res.status(400).json({ message: "Ride already completed" });
      }
      return res.status(400).json({ message: "Cannot complete ride" });
    }

    res.json({ message: "Ride marked as completed", ride });
  } catch (err) {
    console.error("Complete ride error:", err);
    res.status(500).json({ message: "Failed to complete ride: " + err.message });
  }
});

module.exports = router;
