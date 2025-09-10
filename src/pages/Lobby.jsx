import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getToken } from "../utils/auth";
import {
  FaPlus,
  FaTrash,
  FaPlay,
  FaClock,
  FaUser,
  FaChalkboard,
  FaFilePdf,
  FaSearch,
  FaTimes,
  FaArrowLeft,
} from "react-icons/fa";

const Lobby = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await axios.get("http://localhost:5000/rooms", {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        setRooms(res.data);
      } catch (err) {
        console.error("Failed to fetch rooms", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  const handleDeleteRoom = async (roomId) => {
    try {
      await axios.delete(`http://localhost:5000/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setRooms(rooms.filter(room => room._id !== roomId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Failed to delete room", err);
    }
  };

  const handleCreateRoom = async () => {
    navigate('/create');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const filteredRooms = rooms.filter(room =>
    room.topic.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-6 font-medium"
        >
          <FaArrowLeft className="w-4 h-4" />
          Back to DashBoard
        </button>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Class Rooms</h1>
          <p className="text-gray-600">Manage your teaching sessions and continue where you left off</p>
        </div>

        {/* Actions Bar */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search rooms..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <FaTimes className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            <button
              onClick={handleCreateRoom}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <FaPlus className="w-4 h-4" />
              New Room
            </button>
          </div>
        </div>

        {/* Rooms Grid */}
        {filteredRooms.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            {searchTerm ? (
              <>
                <FaSearch className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms found</h3>
                <p className="text-gray-600">No rooms match your search criteria</p>
              </>
            ) : (
              <>
                <FaChalkboard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms yet</h3>
                <p className="text-gray-600 mb-6">Create your first room to start teaching</p>
                <button
                  onClick={handleCreateRoom}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <FaPlus className="w-4 h-4" />
                  Create Room
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRooms.map((room) => (
              <div key={room._id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6">
                {/* Room Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1 line-clamp-2">
                      {room.topic}
                    </h3>
                    <p className="text-sm text-gray-500">Code: {room.code}</p>
                  </div>
                  
                  {/* Delete Button */}
                  <button
                    onClick={() => setDeleteConfirm(room._id)}
                    className="ml-2 p-2 text-gray-400 hover:text-red-500 transition-colors"
                    title="Delete room"
                  >
                    <FaTrash className="w-4 h-4" />
                  </button>
                </div>

                {/* Room Details */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm text-gray-600">
                    <FaClock className="w-4 h-4 mr-2" />
                    Created {formatDate(room.createdAt)}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <FaUser className="w-4 h-4 mr-2" />
                    {room.creator?.name || "Unknown"}
                  </div>

                  {/* Content Status */}
                  <div className="flex items-center gap-4 text-sm">
                    {room.pdf?.url && (
                      <span className="inline-flex items-center text-blue-600">
                        <FaFilePdf className="w-4 h-4 mr-1" />
                        PDF
                      </span>
                    )}
                    {room.whiteboardImage && (
                      <span className="inline-flex items-center text-green-600">
                        <FaChalkboard className="w-4 h-4 mr-1" />
                        Whiteboard
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(`/room/${room.code}`)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                  >
                    <FaPlay className="w-3 h-3" />
                    Continue
                  </button>
                </div>

                {/* Delete Confirmation Modal */}
                {deleteConfirm === room._id && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 max-w-sm mx-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Delete Room
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Are you sure you want to delete "{room.topic}"? This action cannot be undone.
                      </p>
                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room._id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Stats Footer */}
        {rooms.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-500">
            {filteredRooms.length} of {rooms.length} rooms shown
          </div>
        )}
      </div>
    </div>
  );
};

export default Lobby;