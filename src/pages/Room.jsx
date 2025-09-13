// Room.jsx - Replace your current Room component
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { getToken } from "../utils/auth";
import WhiteboardLayout from "../components/WhiteboardLayout";
import PDFViewer from "../components/PDFViewer";

const Room = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [isTutor, setIsTutor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get room data
        const res = await axios.get(
          // `http://localhost:5000/rooms/${code}`
          `https://boardly-api.onrender.com/rooms/${code}`
        );
        
        // Check if user is tutor
        const token = getToken();
        const payload = token ? JSON.parse(atob(token.split(".")[1])) : null;
        
        setRoom(res.data);
        // console.log("Room data:", res.data);
        setIsTutor(res.data.creator._id === payload?.id);
        
      } catch (err) {
        console.error("Error fetching room:", err);
        setError(err.response?.data?.message || "Room not found");
      } finally {
        setLoading(false);
      }
    };

    if (code) {
      fetchRoom();
    }
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Room Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          
          <button
            onClick={() => navigate('/lobby')}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  return room ? (
    <WhiteboardLayout room={room} isTutor={isTutor} token={getToken()} />
    // <PDFViewer room={room} isTutor={isTutor} token={getToken()} />
  ) : null;
};

export default Room;