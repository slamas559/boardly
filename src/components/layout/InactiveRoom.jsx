// components/InactiveRoom.jsx
import React from 'react';
import { FaClock, FaChalkboardTeacher } from 'react-icons/fa';

const InactiveRoom = ({ room, isTutor, onNavigateToLobby, onActivateRoom }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <FaClock className="w-10 h-10 text-gray-400" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Session Ended</h1>
        
        <p className="text-gray-600 mb-6">
          This session has ended. The room is not active at the moment for real-time collaboration.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Session Details</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span>Topic:</span>
              <span className="font-medium">{room.topic}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Host:</span>
              <span className="font-medium">{room.creator?.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Room Code:</span>
              <span className="font-mono font-medium">{room.code}</span>
            </div>
            {room.lastActivity && (
              <div className="flex items-center justify-between">
                <span>Last Active:</span>
                <span className="font-medium">
                  {new Date(room.lastActivity).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {isTutor && (
          <div className="space-y-3">
            <button
              onClick={onNavigateToLobby}
              className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <FaChalkboardTeacher className="w-4 h-4" />
              Back to My Rooms
            </button>
            
            <button
              onClick={onActivateRoom}
              className="w-full border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Activate Room Again
            </button>
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Need help? Contact support if you believe this is an error.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InactiveRoom;