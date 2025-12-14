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
  }, [navigate]);

  const fetchStats = async () => {
    const token = localStorage.getItem("token");
    const res = await axios.get("/api/rides/stats", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setStats(res.data);
  };

  // Geocoding
  const getCoordinates = async (address, setter) => {
    if (!address || address.length < 3) return;

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        address
      )}`
    );
    const data = await res.json();

    if (data.length) {
      setter({
        lat: Number(data[0].lat),
        lng: Number(data[0].lon),
      });
    }
  };

  // ROUTE (via backend)
  const fetchRoute = async (start, end) => {
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
  };

  useEffect(() => {
    if (pickupCoords && dropCoords) {
      fetchRoute(pickupCoords, dropCoords);
    }
  }, [pickupCoords, dropCoords]);

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

        {distance && duration && (
          <div className="bg-white p-4 rounded shadow">
            📏 {distance} km | ⏱ {duration} mins
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
                  <Polyline positions={routeCoords} color="blue" />
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
              className="border p-2 w-full"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
            />
            <button className="bg-blue-600 text-white py-2 w-full rounded">
              Confirm Booking
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
