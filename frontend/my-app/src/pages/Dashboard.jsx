import { useEffect, useState } from "react";
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
import { useNavigate } from "react-router-dom";

// ---------------- MAP MARKERS ----------------
const redIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
  iconSize: [32, 32],
});

const blueIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
  iconSize: [32, 32],
});

// Fit map to route
function FitRoute({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length) map.fitBounds(coords);
  }, [coords]);
  return null;
}

export default function Dashboard() {
  const navigate = useNavigate();

  // STATS
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
  });

  // ACTIVE RIDE
  const [activeRide, setActiveRide] = useState(null);

  // AUTOCOMPLETE
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [pickupList, setPickupList] = useState([]);
  const [dropList, setDropList] = useState([]);

  // COORDS
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords, setDropCoords] = useState(null);

  // ROUTE
  const [routeCoords, setRouteCoords] = useState([]);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);

  const [dateTime, setDateTime] = useState("");

  // ---------------- FETCH USER / STATS / RIDES ----------------
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return navigate("/login");

    loadStats();
    loadRides();
  }, []);

  const loadStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/rides/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data);
    } catch {}
  };

  const loadRides = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/rides/my", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const pending = res.data.filter((r) => r.status === "pending");
      setActiveRide(pending[0] || null);
    } catch {}
  };

  // ---------------- AUTOCOMPLETE FETCH ----------------
  const fetchSuggestions = async (text, setter) => {
    if (text.length < 3) return setter([]);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        text
      )}&addressdetails=1&limit=5`
    );
    const data = await res.json();

    setter(
      data.map((p) => ({
        label: p.display_name,
        lat: Number(p.lat),
        lon: Number(p.lon),
      }))
    );
  };

  // ---------------- ROUTE FETCH ----------------
  const fetchRoute = async () => {
    if (!pickupCoords || !dropCoords) return;

    try {
      const token = localStorage.getItem("token");

      const res = await axios.post(
        "/api/rides/route",
        {
          start: pickupCoords,
          end: dropCoords,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const route = res.data;

      setRouteCoords(
        route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
      );
      setDistance((route.distance / 1000).toFixed(2));
      setDuration(Math.round(route.duration / 60));
    } catch {
      alert("Could not fetch route");
    }
  };

  useEffect(() => {
    if (pickupCoords && dropCoords) fetchRoute();
  }, [pickupCoords, dropCoords]);

  // ---------------- BOOK RIDE ----------------
  const bookRide = async (type) => {
    if (!pickup || !drop || !dateTime) return alert("Fill all fields");
    if (!pickupCoords || !dropCoords)
      return alert("Coordinates missing");

    try {
      const token = localStorage.getItem("token");

      await axios.post(
        "/api/rides/book",
        { pickup, drop, dateTime, type },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Ride booked!");
      loadStats();
      loadRides();
    } catch {
      alert("Booking failed");
    }
  };

  // ---------------- END RIDE ----------------
  const endRide = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `/api/rides/${id}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Ride completed");
      loadStats();
      loadRides();
    } catch {
      alert("Failed to complete ride");
    }
  };

  // ---------------- CANCEL RIDE ----------------
  const cancelRide = async (id) => {
    if (!window.confirm("Cancel this ride?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/rides/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("Ride canceled");
      loadStats();
      loadRides();
    } catch {
      alert("Failed to cancel ride");
    }
  };

  // ---------------- UI ----------------
  return (
    <div className="flex bg-blue-50 min-h-screen">
      {/* SIDEBAR */}
      <aside className="w-72 bg-blue-800 text-white p-6">
        <button className="text-2xl mb-6">☰</button>

        <ul className="space-y-6 mt-6">
          <li
            onClick={() => navigate("/dashboard")}
            className="cursor-pointer hover:text-yellow-300"
          >
            🚗 Dashboard
          </li>
          <li
            onClick={() => navigate("/my-rides")}
            className="cursor-pointer hover:text-yellow-300"
          >
            📅 My Rides
          </li>
        </ul>
      </aside>

      {/* MAIN */}
      <main className="flex-1 p-10 space-y-6">

        {/* STATS */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-600 text-white p-4 rounded-lg text-center">
            Total: {stats.total}
          </div>
          <div className="bg-yellow-500 text-white p-4 rounded-lg text-center">
            Pending: {stats.pending}
          </div>
          <div className="bg-green-600 text-white p-4 rounded-lg text-center">
            Completed: {stats.completed}
          </div>
        </div>

        {/* ACTIVE RIDE */}
        {activeRide && (
          <div className="bg-white p-6 rounded shadow border">
            <h2 className="text-xl font-bold">Active Ride</h2>
            <p><b>Pickup:</b> {activeRide.pickup}</p>
            <p><b>Drop:</b> {activeRide.drop}</p>
            <p><b>Date:</b> {new Date(activeRide.dateTime).toLocaleString()}</p>

            <div className="mt-4 flex gap-4">
              <button
                onClick={() => endRide(activeRide._id)}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                End
              </button>
              <button
                onClick={() => cancelRide(activeRide._id)}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* MAP + FORM */}
        <div className="grid grid-cols-3 gap-6">
          {/* MAP */}
          <div className="col-span-2 bg-white rounded shadow p-4">
            <MapContainer
              center={[20.59, 78.96]}
              zoom={5}
              style={{ height: "500px", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

              {pickupCoords && (
                <Marker position={pickupCoords} icon={redIcon} />
              )}
              {dropCoords && (
                <Marker position={dropCoords} icon={blueIcon} />
              )}
              {routeCoords.length > 0 && (
                <>
                  <Polyline positions={routeCoords} color="blue" />
                  <FitRoute coords={routeCoords} />
                </>
              )}
            </MapContainer>

            {distance && duration && (
              <div className="mt-3 p-3 bg-gray-100 rounded">
                📏 {distance} km ⏱ {duration} mins
              </div>
            )}
          </div>

          {/* FORM */}
          <div className="bg-white p-6 rounded shadow space-y-4">
            {/* Pickup */}
            <div className="relative">
              <input
                value={pickup}
                onChange={(e) => {
                  setPickup(e.target.value);
                  fetchSuggestions(e.target.value, setPickupList);
                }}
                placeholder="Pickup"
                className="border p-2 w-full rounded"
              />

              {pickupList.length > 0 && (
                <div className="absolute w-full bg-white border rounded shadow max-h-40 overflow-y-auto">
                  {pickupList.map((s, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setPickup(s.label);
                        setPickupCoords({ lat: s.lat, lng: s.lon });
                        setPickupList([]);
                      }}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                    >
                      {s.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Drop */}
            <div className="relative">
              <input
                value={drop}
                onChange={(e) => {
                  setDrop(e.target.value);
                  fetchSuggestions(e.target.value, setDropList);
                }}
                placeholder="Drop"
                className="border p-2 w-full rounded"
              />

              {dropList.length > 0 && (
                <div className="absolute w-full bg-white border rounded shadow max-h-40 overflow-y-auto">
                  {dropList.map((s, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setDrop(s.label);
                        setDropCoords({ lat: s.lat, lng: s.lon });
                        setDropList([]);
                      }}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                    >
                      {s.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Date */}
            <input
              type="datetime-local"
              className="border p-2 w-full rounded"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
            />

            {/* Buttons */}
            <button
              onClick={() => bookRide("poolCar")}
              className="w-full bg-green-600 text-white py-3 rounded font-bold"
            >
              🚗 Pool My Car
            </button>

            <button
              onClick={() => bookRide("findCar")}
              className="w-full bg-purple-600 text-white py-3 rounded font-bold"
            >
              🔍 Find a Car
            </button>
          </div>
        </div>

        {/* NEARBY RIDES */}
        <div className="bg-white p-6 rounded shadow">
          <h2 className="text-xl font-bold mb-2">Nearby Rides</h2>
          <p>No nearby rides available.</p>
        </div>
      </main>
    </div>
  );
}
