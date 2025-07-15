import { useState } from "react";
import axios from "axios";
import { getToken } from "../utils/auth";
import { useNavigate } from "react-router-dom";

const CreateRoom = () => {
  const [topic, setTopic] = useState("");
  const navigate = useNavigate();

  const handleCreate = async () => {
  if (!topic) return alert("Fill in all fields");

  try {
    const token = getToken();
    const res = await axios.post(
      "http://localhost:5000/rooms",
      { topic },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    navigate(`/room/${res.data.room.code}`);
    } catch (err) {
      console.error("Error creating room:", err);
      alert("Failed to create room. Are you logged in?");
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="bg-white shadow-xl rounded-xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-6 text-primary">Create a Tutoring Room</h1>

        <input
          type="text"
          placeholder="Topic (e.g., Algebra Basics)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full mb-6 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-primary"
        />

        <button
          onClick={handleCreate}
          className="w-full bg-primary text-white font-medium py-2 rounded hover:bg-accent transition"
        >
          Create Room
        </button>
      </div>
    </div>
  );
};

export default CreateRoom;
