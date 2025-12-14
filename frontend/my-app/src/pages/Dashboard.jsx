import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Dashboard() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [isOpen, setIsOpen] = useState(true);

  // 🚗 Booking states
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [dateTime, setDateTime] = useState("");

  // 📊 Stats state
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await axios.get("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserData(res.data);
      } catch (err) {
        localStorage.removeItem("token");
        navigate("/login");
      }
    };

    fetchUser();
    fetchStats();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  // 📊 Fetch stats
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/rides/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data);
    } catch (err) {
      console.log("Failed to fetch stats", err);
    }
  };

  // ✅ Booking function
  const handleBooking = async () => {
    if (!pickup || !drop || !dateTime) {
      alert("Please fill all fields");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      await axios.post(
        "/api/rides/book",
        { pickup, drop, dateTime },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("🚗 Ride booked successfully!");
      setPickup("");
      setDrop("");
      setDateTime("");
      fetchStats(); // 🔥 refresh stats
    } catch (err) {
      console.log(err);
      alert("Booking failed");
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Sidebar */}
      <aside
        className={`${
          isOpen ? "w-72" : "w-20"
        } bg-gradient-to-b from-blue-700 to-blue-900 text-white shadow-2xl p-6 flex flex-col rounded-r-3xl transition-all duration-300`}
      >
        <h2 className="text-2xl font-extrabold mb-10 tracking-wide text-center">
          {isOpen ? "Drive Buddy" : "🚗"}
        </h2>

        <ul className="flex flex-col gap-6 text-lg font-medium">
          <li className="flex items-center gap-3 cursor-pointer hover:text-yellow-300 transition">
            🚗 {isOpen && "Book a Ride"}
          </li>
          <li className="flex items-center gap-3 cursor-pointer hover:text-yellow-300 transition">
            🧍 {isOpen && "Request a Ride"}
          </li>
          <li
  className="flex items-center gap-3 cursor-pointer hover:text-yellow-300 transition"
  onClick={() => navigate("/my-rides")}
>
  🗓 {isOpen && "My Rides"}
</li>

        </ul>

        <div className="mt-auto">
          <button
            onClick={handleLogout}
            className="w-full bg-red-500 hover:bg-red-600 mt-10 py-2 rounded-lg text-white font-semibold transition"
          >
            {isOpen ? "Logout" : "⏻"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 flex flex-col gap-10">
        {/* Header */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-3xl font-bold text-blue-700"
          >
            ☰
          </button>

          <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">
            Welcome,{" "}
            <span className="text-blue-700">
              {userData ? userData.name : "Loading..."}
            </span>{" "}
            👋
          </h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 shadow-xl p-6 rounded-2xl text-white flex flex-col items-center justify-center hover:scale-105 transition">
            <h3 className="text-lg font-semibold opacity-90">Total Rides</h3>
            <p className="text-4xl font-bold mt-2">{stats.total}</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 shadow-xl p-6 rounded-2xl text-white flex flex-col items-center justify-center hover:scale-105 transition">
            <h3 className="text-lg font-semibold opacity-90">
              Pending Requests
            </h3>
            <p className="text-4xl font-bold mt-2">{stats.pending}</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 shadow-xl p-6 rounded-2xl text-white flex flex-col items-center justify-center hover:scale-105 transition">
            <h3 className="text-lg font-semibold opacity-90">
              Completed Rides
            </h3>
            <p className="text-4xl font-bold mt-2">{stats.completed}</p>
          </div>
        </div>

        {/* Map + Booking */}
        <div className="flex gap-10 flex-1">
          <div className="flex-1 bg-white rounded-3xl shadow-xl h-[420px] flex items-center justify-center border border-gray-200">
            <p className="text-gray-500 font-medium">🗺 Map will go here</p>
          </div>

          <div className="w-96 bg-white shadow-xl rounded-3xl p-6 flex flex-col gap-5 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-700 mb-2">
              Book a Ride
            </h2>

            <input
              type="text"
              placeholder="📍 Pickup Location"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="text"
              placeholder="🏁 Drop-off Location"
              value={drop}
              onChange={(e) => setDrop(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={handleBooking}
              className="bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Confirm Booking
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
