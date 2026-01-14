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

    // 📍 STORE PICKUP LOCATION COORDINATES FOR MAP & MATCHING
    pickupCoords: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
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
      default: false, // false = immediate booking, true = scheduled for later
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ride", RideSchema);
