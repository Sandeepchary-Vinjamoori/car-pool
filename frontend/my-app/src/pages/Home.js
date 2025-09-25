import { useNavigate } from "react-router-dom";

function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Welcome to Carpooling System 🚗</h1>
      <p>Join us to book or offer rides easily!</p>

      <div style={{ marginTop: "30px" }}>
        <button
          style={{ marginRight: "10px", padding: "10px 20px" }}
          onClick={() => navigate("/Login")}
        >
          Login
        </button>

        <button
          style={{ padding: "10px 20px" }}
          onClick={() => navigate("/Register")}
        >
          Register
        </button>
      </div>
    </div>
  );
}

export default Home;
