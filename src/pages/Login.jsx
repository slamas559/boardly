import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { saveToken } from "../utils/auth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    const res = await axios.post("http://localhost:5000/auth/login", { email, password });
    saveToken(res.data.token);
    navigate("/create");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-primary">Login</h2>

        <input
          className="w-full border p-2 rounded mb-3"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded mb-4"
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className="w-full bg-primary text-white py-2 rounded hover:bg-accent"
          onClick={handleLogin}
        >
          Login
        </button>
      </div>
    </div>
  );
};

export default Login;
