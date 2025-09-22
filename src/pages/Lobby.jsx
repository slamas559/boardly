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
  FaCheck,
  FaEye
} from "react-icons/fa";
import api from '../utils/api';

const Lobby = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await api.get("/rooms", {
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
      await api.delete(`/rooms/${roomId}`);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-8 font-medium"
        >
          <FaArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Session Management</h1>
          <p className="text-xl text-gray-600">Manage your teaching sessions and continue where you left off</p>
        </div>

        {/* Actions Bar */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="flex-1 relative max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors"
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
              className="flex justify-center items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-semibold"
            >
              <FaPlus className="w-4 h-4" />
              New Session
            </button>
          </div>
        </div>

        {/* Sessions Grid */}
        {filteredRooms.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-16 text-center">
            {searchTerm ? (
              <>
                <FaSearch className="mx-auto h-16 w-16 text-gray-300 mb-6" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No sessions found</h3>
                <p className="text-gray-600 text-lg">No sessions match your search criteria</p>
              </>
            ) : (
              <>
                <FaChalkboard className="mx-auto h-16 w-16 text-gray-300 mb-6" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No sessions yet</h3>
                <p className="text-gray-600 mb-8 text-lg">Create your first session to start teaching</p>
                <button
                  onClick={handleCreateRoom}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-semibold text-lg"
                >
                  <FaPlus className="w-5 h-5" />
                  Create Session
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredRooms.map((room) => (
              <div key={room._id} className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-all p-6">
                {/* Session Header */}
                <div className='flex flex-col h-full justify-between'>
                  <div className=''>
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 text-xl mb-2 line-clamp-2">
                        {room.topic}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {room.code}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          room.isPaid 
                            ? 'bg-gray-100 text-gray-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {room.isPaid ? 'Premium' : 'Free'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Delete Button */}
                    <button
                      onClick={() => setDeleteConfirm(room._id)}
                      className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Delete session"
                    >
                      <FaTrash className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Session Details */}
                  <div className="space-y-4 mb-6">
                    <div className="flex items-center text-sm text-gray-600">
                      <FaClock className="w-4 h-4 mr-3" />
                      Created {formatDate(room.createdAt)}
                    </div>

                    {/* Content Indicators */}
                    <div className="flex items-center gap-6 text-sm">
                      {room.pdf?.url && (
                        <div className="flex items-center text-gray-600">
                          <FaFilePdf className="w-4 h-4 mr-2" />
                          <span>PDF Content</span>
                        </div>
                      )}
                      {room.whiteboardImage && (
                        <div className="flex items-center text-gray-600">
                          <FaChalkboard className="w-4 h-4 mr-2" />
                          <span>Whiteboard</span>
                        </div>
                      )}
                      {!room.pdf?.url && !room.whiteboardImage && (
                        <div className="flex items-center text-gray-400">
                          <FaChalkboard className="w-4 h-4 mr-2" />
                          <span>Empty Session</span>
                        </div>
                      )}
                    </div>

                    {/* Price Display for Paid Sessions */}
                    {room.isPaid && room.price && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600">Session Price:</span>
                        <span className="font-semibold text-gray-900">
                          ₦{room.price.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  </div>
                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => navigate(`/room/${room.code}`)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors font-semibold"
                    >
                      <FaEye className="w-4 h-4" />
                      Open Session
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation Modal */}
                {deleteConfirm === room._id && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">
                        Delete Session
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Are you sure you want to delete "<strong>{room.topic}</strong>"? 
                        This action cannot be undone and all session data will be permanently lost.
                      </p>
                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room._id)}
                          className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors font-medium"
                        >
                          Delete Session
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Results Summary */}
        {rooms.length > 0 && (
          <div className="mt-12">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-gray-900 font-semibold">
                    {filteredRooms.length} of {rooms.length} sessions
                  </p>
                  <p className="text-gray-600 text-sm">
                    {searchTerm ? `Filtered by "${searchTerm}"` : 'All your teaching sessions'}
                  </p>
                </div>
                
                {/* Session Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-900 rounded-full"></div>
                    <span className="text-gray-600">
                      {rooms.filter(room => room.isPaid).length} Premium
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="text-gray-600">
                      {rooms.filter(room => !room.isPaid).length} Free
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Lobby;