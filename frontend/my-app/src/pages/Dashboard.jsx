<<<<<<< HEAD
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
=======
import { useEffect, useState } from "react";
>>>>>>> dc083728057d8cf1ec533791be534b3ec8a73d4c
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

<<<<<<< HEAD
// Custom icons for pickup and drop
const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const dropIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Fix marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
=======
// ---------------- MAP MARKERS ----------------
const redIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
  iconSize: [32, 32],
>>>>>>> dc083728057d8cf1ec533791be534b3ec8a73d4c
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

// Location Autocomplete Component
function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  className
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (value && value.length >= 2) {
        searchPlaces(value);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  const searchPlaces = async (query) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5&addressdetails=1&countrycodes=in`
      );

      if (response.ok) {
        const data = await response.json();
        const formattedSuggestions = data.map(item => ({
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          address: item.address
        }));
        setSuggestions(formattedSuggestions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    onChange(suggestion.display_name);
    onSelect({
      lat: suggestion.lat,
      lng: suggestion.lng,
      address: suggestion.display_name
    });
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${className} ${isLoading ? 'pr-8' : ''}`}
        onFocus={() => {
          if (suggestions.length > 0) {
            setShowSuggestions(true);
          }
        }}
      />

      {isLoading && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900 text-sm">
                {suggestion.address?.road || suggestion.address?.suburb || 'Location'}
              </div>
              <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                {suggestion.display_name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
<<<<<<< HEAD
  const [dateTime, setDateTime] = useState("");
  const [isScheduled, setIsScheduled] = useState(false); // Toggle for immediate vs scheduled
=======
  const [pickupList, setPickupList] = useState([]);
  const [dropList, setDropList] = useState([]);
>>>>>>> dc083728057d8cf1ec533791be534b3ec8a73d4c

  // COORDS
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords, setDropCoords] = useState(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropAddress, setDropAddress] = useState("");

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

<<<<<<< HEAD
  // Enhanced route fetching with better visualization
  const fetchRoute = async (start, end) => {
    try {
      const token = localStorage.getItem("token");

      // Try backend route first
      try {
        const res = await axios.post(
          "/api/rides/route",
          { start, end },
          { headers: { Authorization: `Bearer ${token}` } }
        );
=======
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
>>>>>>> dc083728057d8cf1ec533791be534b3ec8a73d4c

        const route = res.data;
        setRouteCoords(
          route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
        );
        setDistance((route.distance / 1000).toFixed(2));
        setDuration(Math.round(route.duration / 60));
        return;
      } catch (backendError) {
        console.log("Backend route failed, trying OSRM...");
      }

<<<<<<< HEAD
      // Fallback to OSRM for route visualization
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

      const response = await fetch(osrmUrl);
      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          setRouteCoords(
            route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
          );
          setDistance((route.distance / 1000).toFixed(2));
          setDuration(Math.round(route.duration / 60));
        }
      }
    } catch (err) {
      console.error("Route fetch error:", err);
      // Fallback: draw straight line
      setRouteCoords([[start.lat, start.lng], [end.lat, end.lng]]);

      // Calculate approximate distance using Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = (end.lat - start.lat) * Math.PI / 180;
      const dLng = (end.lng - start.lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(start.lat * Math.PI / 180) * Math.cos(end.lat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      setDistance(distance.toFixed(2));
      setDuration(Math.round(distance * 2)); // Rough estimate: 30 km/h average
=======
      setRouteCoords(
        route.geometry.coordinates.map(([lng, lat]) => [lat, lng])
      );
      setDistance((route.distance / 1000).toFixed(2));
      setDuration(Math.round(route.duration / 60));
    } catch {
      alert("Could not fetch route");
>>>>>>> dc083728057d8cf1ec533791be534b3ec8a73d4c
    }
  };

  useEffect(() => {
    if (pickupCoords && dropCoords) fetchRoute();
  }, [pickupCoords, dropCoords]);

<<<<<<< HEAD
  // Handle pickup location selection
  const handlePickupSelect = (locationData) => {
    setPickupCoords({
      lat: locationData.lat,
      lng: locationData.lng
    });
    setPickupAddress(locationData.address);
  };

  // Handle drop location selection  
  const handleDropSelect = (locationData) => {
    setDropCoords({
      lat: locationData.lat,
      lng: locationData.lng
    });
    setDropAddress(locationData.address);
  };

  // Handle booking
  const handleBooking = async (type) => {
    if (!pickup || !drop) {
      alert("Please fill in pickup and drop locations");
      return;
    }

    if (!pickupCoords || !dropCoords) {
      alert("Please wait for the addresses to be resolved on the map");
      return;
    }
=======
  // ---------------- BOOK RIDE ----------------
  const bookRide = async (type) => {
    if (!pickup || !drop || !dateTime) return alert("Fill all fields");
    if (!pickupCoords || !dropCoords)
      return alert("Coordinates missing");
>>>>>>> dc083728057d8cf1ec533791be534b3ec8a73d4c

    // For scheduled rides, validate date/time
    if (isScheduled) {
      if (!dateTime) {
        alert("Please select a date and time for your scheduled ride");
        return;
      }

      const selectedDateTime = new Date(dateTime);
      const now = new Date();

      if (selectedDateTime <= now) {
        alert("Please select a future date and time for scheduling");
        return;
      }
    }

    try {
      const token = localStorage.getItem("token");

<<<<<<< HEAD
      // Use current time for immediate booking, selected time for scheduled
      const rideDateTime = isScheduled ? dateTime : new Date().toISOString();

      await axios.post(
        "/api/rides/book",
        {
          pickup,
          drop,
          dateTime: rideDateTime,
          type,
          isScheduled, // Add this flag to help backend understand booking type
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const message = isScheduled
        ? `Ride scheduled successfully for ${new Date(dateTime).toLocaleString()}!`
        : type === "poolCar"
          ? "Ride pooled successfully! Starting now."
          : "Looking for a car - ride booked! Starting now.";

      alert(message);

      // Reset form
      setPickup("");
      setDrop("");
      setDateTime("");
      setIsScheduled(false);
      setPickupCoords(null);
      setDropCoords(null);
      setPickupAddress("");
      setDropAddress("");
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
=======
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
>>>>>>> dc083728057d8cf1ec533791be534b3ec8a73d4c
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

<<<<<<< HEAD
      alert("Ride completed successfully!");

      // Refresh stats and pending rides
      fetchStats();
      fetchPendingRides();
    } catch (err) {
      console.error("End ride error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to complete ride";
      alert(`Failed to end ride: ${errorMessage}`);
=======
      alert("Ride completed");
      loadStats();
      loadRides();
    } catch {
      alert("Failed to complete ride");
>>>>>>> dc083728057d8cf1ec533791be534b3ec8a73d4c
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
<<<<<<< HEAD
      <aside
        className={`${isOpen ? "w-72" : "w-20"
          } bg-blue-800 text-white p-6`}
      >
        <button onClick={() => setIsOpen(!isOpen)}>☰</button>
        <ul className="mt-10 space-y-6">
          <li>🚗 {isOpen && "Book Ride"}</li>
          <li onClick={() => navigate("/my-rides")}>
            🗓 {isOpen && "My Rides"}
=======
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
>>>>>>> dc083728057d8cf1ec533791be534b3ec8a73d4c
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

<<<<<<< HEAD
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
                <span className={`inline-block mt-2 px-3 py-1 rounded text-sm font-semibold ${pendingRides[0].type === "poolCar"
                    ? "bg-green-100 text-green-800"
                    : "bg-purple-100 text-purple-800"
                  }`}>
                  {pendingRides[0].type === "poolCar" ? "🚗 Pooling Car" : "🔍 Finding Car"}
                </span>
              </div>
=======
        {/* ACTIVE RIDE */}
        {activeRide && (
          <div className="bg-white p-6 rounded shadow border">
            <h2 className="text-xl font-bold">Active Ride</h2>
            <p><b>Pickup:</b> {activeRide.pickup}</p>
            <p><b>Drop:</b> {activeRide.drop}</p>
            <p><b>Date:</b> {new Date(activeRide.dateTime).toLocaleString()}</p>

            <div className="mt-4 flex gap-4">
>>>>>>> dc083728057d8cf1ec533791be534b3ec8a73d4c
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

<<<<<<< HEAD
        <div className="flex gap-6">
          <div className="flex-1 h-[420px] bg-white rounded shadow">
=======
        {/* MAP + FORM */}
        <div className="grid grid-cols-3 gap-6">
          {/* MAP */}
          <div className="col-span-2 bg-white rounded shadow p-4">
>>>>>>> dc083728057d8cf1ec533791be534b3ec8a73d4c
            <MapContainer
              center={[20.59, 78.96]}
              zoom={5}
              style={{ height: "500px", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
<<<<<<< HEAD
              {pickupCoords && (
                <Marker
                  position={pickupCoords}
                  icon={pickupIcon}
                />
              )}
              {dropCoords && (
                <Marker
                  position={dropCoords}
                  icon={dropIcon}
                />
              )}
              {routeCoords.length > 0 && (
                <>
                  <Polyline
                    positions={routeCoords}
                    pathOptions={{
                      color: "#2563eb",
                      weight: 4,
                      opacity: 0.8,
                      dashArray: "5, 10"
                    }}
                  />
=======

              {pickupCoords && (
                <Marker position={pickupCoords} icon={redIcon} />
              )}
              {dropCoords && (
                <Marker position={dropCoords} icon={blueIcon} />
              )}
              {routeCoords.length > 0 && (
                <>
                  <Polyline positions={routeCoords} color="blue" />
>>>>>>> dc083728057d8cf1ec533791be534b3ec8a73d4c
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

<<<<<<< HEAD
          <div className="w-96 bg-white p-6 rounded shadow space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                📍 Pickup Location
              </label>
              <LocationAutocomplete
                value={pickup}
                onChange={setPickup}
                onSelect={handlePickupSelect}
                placeholder="Enter pickup location..."
                className="border border-gray-300 p-3 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                🎯 Drop Location
              </label>
              <LocationAutocomplete
                value={drop}
                onChange={setDrop}
                onSelect={handleDropSelect}
                placeholder="Enter drop location..."
                className="border border-gray-300 p-3 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                🕒 Booking Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsScheduled(false)}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition ${!isScheduled
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                >
                  Book Now
                </button>
                <button
                  onClick={() => setIsScheduled(true)}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition ${isScheduled
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                >
                  Schedule Later
                </button>
              </div>
            </div>

            {isScheduled && (
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  📅 Select Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="border border-gray-300 p-3 w-full rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  min={new Date(Date.now() + 60000).toISOString().slice(0, 16)} // Minimum 1 minute from now
                />
                <p className="text-xs text-gray-500 mt-1">
                  Select a future date and time for your ride
                </p>
              </div>
            )}

            {/* Route Info */}
            {distance && duration && (
              <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    📏 <strong>{distance} km</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    ⏱ <strong>{duration} mins</strong>
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button
                onClick={() => handleBooking("poolCar")}
                disabled={!pickup || !drop || !pickupCoords || !dropCoords}
                className={`w-full py-3 rounded-md font-semibold transition ${!pickup || !drop || !pickupCoords || !dropCoords
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : rideType === "poolCar"
                      ? "bg-green-600 text-white"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                onMouseEnter={() => setRideType("poolCar")}
                onMouseLeave={() => setRideType(null)}
              >
                🚗 {isScheduled ? "Schedule Pool" : "Pool Now"}
              </button>
              <button
                onClick={() => handleBooking("findCar")}
                disabled={!pickup || !drop || !pickupCoords || !dropCoords}
                className={`w-full py-3 rounded-md font-semibold transition ${!pickup || !drop || !pickupCoords || !dropCoords
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : rideType === "findCar"
                      ? "bg-purple-600 text-white"
                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                onMouseEnter={() => setRideType("findCar")}
                onMouseLeave={() => setRideType(null)}
              >
                🔍 {isScheduled ? "Schedule Ride" : "Find Car Now"}
              </button>

              {!isScheduled && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3 mt-2">
                  <p className="text-sm text-green-700 text-center">
                    ⚡ Instant booking - Your ride will start immediately
                  </p>
                </div>
              )}

              {isScheduled && dateTime && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-2">
                  <p className="text-sm text-blue-700 text-center">
                    📅 Scheduled for: {new Date(dateTime).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
=======
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
>>>>>>> dc083728057d8cf1ec533791be534b3ec8a73d4c
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
