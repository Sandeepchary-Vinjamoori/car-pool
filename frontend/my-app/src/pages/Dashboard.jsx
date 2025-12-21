import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Auto fit map to route
function FitRoute({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length) map.fitBounds(coords);
  }, [coords, map]);
  return null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  const [userData, setUserData] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
  });

  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [dateTime, setDateTime] = useState("");

  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords, setDropCoords] = useState(null);

  const [routeCoords, setRouteCoords] = useState([]);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [rideType, setRideType] = useState(null); // "poolCar" or "findCar"
  const [pendingRides, setPendingRides] = useState([]);

  // Auth
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");

    axios
      .get("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUserData(res.data));

    fetchStats();
    fetchPendingRides();
  }, [navigate]);

  const fetchStats = async () => {
    const token = localStorage.getItem("token");
    const res = await axios.get("/api/rides/stats", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setStats(res.data);
  };

  const fetchPendingRides = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/rides/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Filter only pending rides and sort by most recent
      const pending = res.data
        .filter((ride) => ride.status === "pending")
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setPendingRides(pending);
    } catch (err) {
      console.error("Error fetching pending rides:", err);
    }
  };

  // Geocoding
  const getCoordinates = async (address, setter) => {
    if (!address || address.length < 3) return;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address
        )}`
      );

      if (!res.ok) {
        console.error("Geocoding HTTP error:", res.status, res.statusText);
        return;
      }

      const data = await res.json();

      if (data.length) {
        setter({
          lat: Number(data[0].lat),
          lng: Number(data[0].lon),
        });
      }
    } catch (err) {
      console.error("Geocoding request failed:", err);
    }
  };

  // ROUTE (via backend)
  const fetchRoute = async (start, end) => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.post(
        "/api/rides/route",
        { start, end },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const route = res.data;

      setRouteCoords(
        route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
      );
      setDistance((route.distance / 1000).toFixed(2));
      setDuration(Math.round(route.duration / 60));
    } catch (err) {
      console.error("Route fetch error:", err.response?.data || err.message);
      // Don't show error to user, just log it - route will simply not be displayed
    }
  };

  useEffect(() => {
    if (pickupCoords && dropCoords) {
      fetchRoute(pickupCoords, dropCoords);
    }
  }, [pickupCoords, dropCoords]);

  // Handle booking
  const handleBooking = async (type) => {
    if (!pickup || !drop || !dateTime) {
      alert("Please fill in all fields");
      return;
    }

    if (!pickupCoords || !dropCoords) {
      alert("Please wait for the addresses to be resolved on the map");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "/api/rides/book",
        {
          pickup,
          drop,
          dateTime,
          type,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert(type === "poolCar" ? "Ride pooled successfully!" : "Looking for a car - ride booked!");
      
      // Reset form
      setPickup("");
      setDrop("");
      setDateTime("");
      setPickupCoords(null);
      setDropCoords(null);
      setRouteCoords([]);
      setDistance(null);
      setDuration(null);
      setRideType(null);

      // Refresh stats and pending rides
      fetchStats();
      fetchPendingRides();
    } catch (err) {
      console.error("Booking error:", err);
      alert(err.response?.data?.message || "Failed to book ride");
    }
  };

  // Handle ending a ride
  const handleEndRide = async (rideId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `/api/rides/${rideId}/complete`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("Ride completed successfully!");
      
      // Refresh stats and pending rides
      fetchStats();
      fetchPendingRides();
    } catch (err) {
      console.error("End ride error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to complete ride";
      alert(`Failed to end ride: ${errorMessage}`);
    }
  };

  return (
    <div className="flex min-h-screen bg-blue-50">
      {/* SIDEBAR */}
      <aside
        className={`${
          isOpen ? "w-72" : "w-20"
        } bg-blue-800 text-white p-6`}
      >
        <button onClick={() => setIsOpen(!isOpen)}>☰</button>
        <ul className="mt-10 space-y-6">
          <li>🚗 {isOpen && "Book Ride"}</li>
          <li onClick={() => navigate("/my-rides")}>
            🗓 {isOpen && "My Rides"}
          </li>
        </ul>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-10 space-y-6">
        <h1 className="text-3xl font-bold">Welcome {userData?.name}</h1>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-600 text-white p-4 rounded">
            Total {stats.total}
          </div>
          <div className="bg-yellow-500 text-white p-4 rounded">
            Pending {stats.pending}
          </div>
          <div className="bg-green-600 text-white p-4 rounded">
            Completed {stats.completed}
          </div>
        </div>

        {/* End Ride Button - Show if there are pending rides */}
        {pendingRides.length > 0 && (
          <div className="bg-white p-6 rounded shadow-lg border-2 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">
                  Active Ride
                </h2>
                <p className="text-gray-600">
                  <strong>From:</strong> {pendingRides[0].pickup}
                </p>
                <p className="text-gray-600">
                  <strong>To:</strong> {pendingRides[0].drop}
                </p>
                <p className="text-gray-600">
                  <strong>Date:</strong>{" "}
                  {new Date(pendingRides[0].dateTime).toLocaleString()}
                </p>
                <span className={`inline-block mt-2 px-3 py-1 rounded text-sm font-semibold ${
                  pendingRides[0].type === "poolCar"
                    ? "bg-green-100 text-green-800"
                    : "bg-purple-100 text-purple-800"
                }`}>
                  {pendingRides[0].type === "poolCar" ? "🚗 Pooling Car" : "🔍 Finding Car"}
                </span>
              </div>
              <button
                onClick={() => handleEndRide(pendingRides[0]._id)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg shadow-md transition"
              >
                End Ride
              </button>
            </div>
          </div>
        )}

        {distance && duration && (
          <div className="bg-white p-4 rounded shadow flex items-center gap-3">
            <span className="text-lg">🧭 Trip summary:</span>
            <span className="font-semibold">📏 {distance} km</span>
            <span className="font-semibold">⏱ {duration} mins</span>
          </div>
        )}

        <div className="flex gap-6">
          <div className="flex-1 h-[420px] bg-white rounded shadow">
            <MapContainer
              center={{ lat: 20.5937, lng: 78.9629 }}
              zoom={6}
              style={{ height: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {pickupCoords && <Marker position={pickupCoords} />}
              {dropCoords && <Marker position={dropCoords} />}
              {routeCoords.length > 0 && (
                <>
                  <Polyline
                    positions={routeCoords}
                    pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.9 }}
                  />
                  <FitRoute coords={routeCoords} />
                </>
              )}
            </MapContainer>
          </div>

          <div className="w-96 bg-white p-6 rounded shadow space-y-4">
            <input
              placeholder="Pickup"
              className="border p-2 w-full"
              value={pickup}
              onChange={(e) => {
                setPickup(e.target.value);
                getCoordinates(e.target.value, setPickupCoords);
              }}
            />
            <input
              placeholder="Drop"
              className="border p-2 w-full"
              value={drop}
              onChange={(e) => {
                setDrop(e.target.value);
                getCoordinates(e.target.value, setDropCoords);
              }}
            />
            <input
              type="datetime-local"
              className="border p-2 w-full rounded"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
            />
            <div className="space-y-3">
              <button
                onClick={() => handleBooking("poolCar")}
                className={`w-full py-3 rounded font-semibold transition ${
                  rideType === "poolCar"
                    ? "bg-green-600 text-white"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
                onMouseEnter={() => setRideType("poolCar")}
                onMouseLeave={() => setRideType(null)}
              >
                🚗 Pool My Car
              </button>
              <button
                onClick={() => handleBooking("findCar")}
                className={`w-full py-3 rounded font-semibold transition ${
                  rideType === "findCar"
                    ? "bg-purple-600 text-white"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
                onMouseEnter={() => setRideType("findCar")}
                onMouseLeave={() => setRideType(null)}
              >
                🔍 Find a Car
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
