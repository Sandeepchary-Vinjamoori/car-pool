const express = require("express");
const router = express.Router();
const Ride = require("../models/Ride");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const mongoose = require("mongoose");

// ---------------- AUTH MIDDLEWARE ----------------
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ msg: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.id; // store the user id
    next();
  } catch {
    return res.status(401).json({ msg: "Invalid token" });
  }
};

// ----------------------------------------------------------
// POLYLINE DECODER
// ----------------------------------------------------------
function decodePolyline(encoded) {
  let index = 0,
    lat = 0,
    lng = 0,
    coordinates = [];

  while (index < encoded.length) {
    let b,
      shift = 0,
      result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push([lat / 1e5, lng / 1e5]);
  }

  return coordinates;
}

// ----------------------------------------------------------
// ROUTE FETCH (GOOGLE → OSRM fallback)
// ----------------------------------------------------------
router.post("/route", auth, async (req, res) => {
  try {
    const { start, end } = req.body;

    if (!start || !end) {
      return res.status(400).json({ msg: "Missing coordinates" });
    }

    // ---------------- GOOGLE ROUTES ----------------
    try {
      const googleRes = await axios.post(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        {
          origin: { location: { latLng: start } },
          destination: { location: { latLng: end } },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API,
            "X-Goog-FieldMask":
              "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline",
          },
        }
      );

      const route = googleRes.data.routes[0];
      const decoded = decodePolyline(route.polyline.encodedPolyline);

      return res.json({
        geometry: {
          coordinates: decoded.map((p) => [p[1], p[0]]), // lng, lat
        },
        distance: route.distanceMeters,
        duration: parseInt(route.duration.replace("s", "")),
      });
    } catch (e) {
      console.log("Google Maps failed → Using OSRM");
    }

    // ---------------- OSRM FALLBACK ----------------
    const osrm = await axios.get(
      `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
    );

    const r = osrm.data.routes[0];

    return res.json({
      geometry: { coordinates: r.geometry.coordinates },
      distance: r.distance,
      duration: r.duration,
    });
  } catch (err) {
    console.log("Route API error:", err);
    return res.status(500).json({ msg: "Route fetch failed" });
  }
});

// ----------------------------------------------------------
// BOOK RIDE (POOL / FIND)
// ----------------------------------------------------------
router.post("/book", auth, async (req, res) => {
  try {
    const { pickup, drop, dateTime, type, isScheduled, pickupCoords } = req.body;

    if (!pickup || !drop || !dateTime || !type) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (!["poolCar", "findCar"].includes(type)) {
      return res
        .status(400)
        .json({ message: "Type must be 'poolCar' or 'findCar'" });
    }

    // Validate scheduled rides have future date/time
    if (isScheduled) {
      const selectedDateTime = new Date(dateTime);
      const now = new Date();

      if (selectedDateTime <= now) {
        return res.status(400).json({
          message: "Scheduled rides must be set for a future date and time",
        });
      }
    }

    const ride = await Ride.create({
      user: req.user,
      pickup,
      drop,
      dateTime,
      type,
      status: "pending",
      isScheduled: isScheduled || false,
      pickupCoords: pickupCoords || null, // ⭐ IMPORTANT FOR MAP MATCHING
    });

    const message = isScheduled
      ? `Ride scheduled successfully for ${new Date(dateTime).toLocaleString()}`
      : "Ride booked and starting now";

    res.json({ message, ride });
  } catch (err) {
    console.log("Booking error:", err);
    res.status(400).json({ msg: "Booking failed" });
  }
});

// ----------------------------------------------------------
// GET MY RIDES
// ----------------------------------------------------------
router.get("/my", auth, async (req, res) => {
  const rides = await Ride.find({ user: req.user }).sort({ dateTime: -1 });
  res.json(rides);
});

// ----------------------------------------------------------
// STATS
// ----------------------------------------------------------
router.get("/stats", auth, async (req, res) => {
  const rides = await Ride.find({ user: req.user });

  res.json({
    total: rides.length,
    pending: rides.filter((r) => r.status === "pending").length,
    completed: rides.filter((r) => r.status === "completed").length,
  });
});

// ----------------------------------------------------------
// COMPLETE A RIDE
// ----------------------------------------------------------
router.put("/:id/complete", auth, async (req, res) => {
  try {
    const updated = await Ride.findOneAndUpdate(
      { _id: req.params.id, user: req.user },
      { status: "completed" },
      { new: true }
    );

    if (!updated)
      return res.status(404).json({ msg: "Ride not found" });

    res.json({ msg: "Ride completed" });
  } catch (err) {
    res.status(400).json({ msg: "Failed to complete ride" });
  }
});

// ----------------------------------------------------------
// CANCEL A RIDE
// ----------------------------------------------------------
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ msg: "Invalid ride ID" });
    }

    const ride = await Ride.findById(id);
    if (!ride) {
      return res.status(404).json({ msg: "Ride not found" });
    }

    if (ride.user.toString() !== req.user) {
      return res.status(403).json({ msg: "Not authorized to cancel this ride" });
    }

    await Ride.findByIdAndDelete(id);
    res.json({ msg: "Ride cancelled successfully" });
  } catch (err) {
    console.log("Cancel error:", err);
    res.status(500).json({ msg: "Failed to cancel ride" });
  }
});

// ----------------------------------------------------------
// FIND NEARBY RIDES (FOR MAP)
// ----------------------------------------------------------
router.post("/find", auth, async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ msg: "Location required" });
    }

    // Find only pending rides from other users
    const rides = await Ride.find({
      status: "pending",
      user: { $ne: req.user },
      pickupCoords: { $ne: null },
    });

    console.log("ALL OTHER PENDING RIDES:", rides);

    // TEMP: Relax distance filter for testing
    const nearby = rides.filter((ride) => {
      const dLat = ride.pickupCoords.lat - lat;
      const dLng = ride.pickupCoords.lng - lng;
      const distance = Math.sqrt(dLat * dLat + dLng * dLng);

      return distance <= 1; // 🔧 ~100km radius for testing
    });

    console.log("NEARBY RIDES:", nearby);

    res.json(nearby);
  } catch (err) {
    console.error("Find rides error:", err);
    res.status(500).json({ msg: "Failed to find nearby rides" });
  }
});


module.exports = router;
