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
    req.user = decoded.id;
    next();
  } catch {
    return res.status(401).json({ msg: "Invalid token" });
  }
};

// ----------------------------------------------------------
// ROUTE FETCH (GOOGLE → OSRM fallback)
// ----------------------------------------------------------
router.post("/route", auth, async (req, res) => {
  try {
    const { start, end } = req.body;

    if (!start || !end) {
      return res.status(400).json({ msg: "Missing coordinates" });
    }

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

      return res.json({
        geometry: {
          coordinates: route.polyline.encodedPolyline,
        },
        distance: route.distanceMeters,
        duration: parseInt(route.duration.replace("s", "")),
      });
    } catch (e) {
      console.log("Google Maps failed → Using OSRM");
    }

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
    const { pickup, drop, pickupCoords, dropCoords, dateTime, type, isScheduled } = req.body;

    if (!pickup || !drop || !dateTime || !type) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (!pickupCoords || !pickupCoords.lat || !pickupCoords.lng) {
      return res.status(400).json({
        message: "Pickup coordinates are required for map & matching",
      });
    }

    // ADD DROP COORDS VALIDATION
    if (!dropCoords || !dropCoords.lat || !dropCoords.lng) {
      return res.status(400).json({
        message: "Drop coordinates are required for map & matching",
      });
    }

    if (!["poolCar", "findCar"].includes(type)) {
      return res
        .status(400)
        .json({ message: "Type must be 'poolCar' or 'findCar'" });
    }

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
      pickupCoords: {
        lat: pickupCoords.lat,
        lng: pickupCoords.lng,
      },
      // ADD DROP COORDS TO DATABASE
      dropCoords: {
        lat: dropCoords.lat,
        lng: dropCoords.lng,
      },
    });

    res.json({
      message: "Ride booked successfully",
      ride,
    });
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
// FIND NEARBY RIDES (FOR MAP) - UPDATED WITH PICKUP + DROP MATCHING
// ----------------------------------------------------------
router.post("/find", auth, async (req, res) => {
  try {
    const { lat, lng, drop } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ msg: "Location required" });
    }

    // Find all pending rides from other users with coordinates
    const rides = await Ride.find({
      status: "pending",
      user: { $ne: req.user },
      pickupCoords: { $exists: true },
      type: "poolCar" // Only show rides offering pools
    }).populate('user', 'name email'); // Include user details

    console.log("ALL POOL CAR RIDES:", rides.length);

    // Calculate distance and filter nearby rides
    const nearby = rides.filter((ride) => {
      const dLat = ride.pickupCoords.lat - lat;
      const dLng = ride.pickupCoords.lng - lng;
      const distance = Math.sqrt(dLat * dLat + dLng * dLng);

      return distance <= 0.5; // Within ~50km radius (more realistic)
    });

    console.log("NEARBY RIDES:", nearby.length);

    res.json(nearby);
  } catch (err) {
    console.error("Find rides error:", err);
    res.status(500).json({ msg: "Failed to find nearby rides" });
  }
});

module.exports = router;

    if (!rideId || !message) {
      return res.status(400).json({ msg: "Ride ID and message required" });
    }

    // Find the ride
    const ride = await Ride.findById(rideId).populate('user', 'name email');
    
    if (!ride) {
      return res.status(404).json({ msg: "Ride not found" });
    }

    if (ride.user._id.toString() === req.user) {
      return res.status(400).json({ msg: "Cannot connect to your own ride" });
    }

    // Get current user details
    const User = require("../models/User");
    const currentUser = await User.findById(req.user).select('name email');

    // Here you would typically:
    // 1. Create a connection/request record in database
    // 2. Send notification to ride owner
    // 3. Send email/SMS to both parties
    
    // For now, we'll simulate successful connection
    console.log(`Connection request from ${currentUser.name} to ${ride.user.name}`);
    console.log(`Message: ${message}`);

    // In a real app, you'd store this connection request
    // const connection = await Connection.create({
    //   requester: req.user,
    //   rideOwner: ride.user._id,
    //   ride: rideId,
    //   message,
    //   status: 'pending'
    // });

    res.json({
      message: "Connection request sent successfully",
      rideOwner: {
        name: ride.user.name,
        email: ride.user.email // In production, only share after acceptance
      },
      requester: {
        name: currentUser.name,
        email: currentUser.email
      }
    });

  } catch (err) {
    console.error("Connect error:", err);
    res.status(500).json({ msg: "Failed to connect to ride" });
  }
});