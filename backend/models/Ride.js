const mongoose = require("mongoose");

const RideSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    pickup: { type: String, required: true },
    drop: { type: String, required: true },

    dateTime: { type: Date, required: true },

    // 📍 Pickup location
    pickupCoords: {
      lat: { type: Number },
      lng: { type: Number },
    },

    // 🎯 Drop location (NEW)
    dropCoords: {
      lat: { type: Number },
      lng: { type: Number },
    },

    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },

    type: {
      type: String,
      enum: ["poolCar", "findCar"],
      required: true,
    },

    isScheduled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ride", RideSchema);
