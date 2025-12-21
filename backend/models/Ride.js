const mongoose = require("mongoose");

const RideSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pickup: {
      type: String,
      required: true,
    },
    drop: {
      type: String,
      required: true,
    },
    dateTime: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    type: {
      type: String,
      enum: ["poolCar", "findCar"], // poolCar = offering a ride, findCar = looking for a ride
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ride", RideSchema);
