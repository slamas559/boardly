import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { saveToken } from "../utils/auth";

const Register = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "", bio: "" });
  const [avatar, setAvatar] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    const data = new FormData();
    Object.entries(form).forEach(([key, val]) => data.append(key, val));
    if (avatar) data.append("avatar", avatar);

    const res = await axios.post("http://localhost:5000/auth/register", data);
    saveToken(res.data.token);
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-primary">Register</h2>

        <input
          className="w-full border p-2 rounded mb-3"
          placeholder="Full Name"
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="w-full border p-2 rounded mb-3"
          placeholder="Email"
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="w-full border p-2 rounded mb-3"
          type="password"
          placeholder="Password"
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <textarea
          className="w-full border p-2 rounded mb-3"
          placeholder="Short Bio"
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
        />
        <input
          type="file"
          accept="image/*"
          className="mb-4 bg-blue-200 p-2 rounded"
          onChange={(e) => setAvatar(e.target.files[0])}
        />

        <button
          className="w-full bg-primary text-white py-2 rounded hover:bg-accent"
          onClick={handleSubmit}
        >
          Register
        </button>
      </div>
    </div>
  );
};

export default Register;
