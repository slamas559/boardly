import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { getToken, isLogout } from "../utils/auth";
import {
  FaChalkboard,
  FaUser,
  FaChartLine,
  FaCalendar,
  FaFilePdf,
  FaPenNib,
  FaSignOutAlt,
  FaCog,
  FaBell,
  FaPlus,
  FaGraduationCap,
  FaUsers,
  FaClock,
  FaArrowRight
} from "react-icons/fa";
import api from '../utils/api';

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [stats, setStats] = useState({
    totalRooms: 0,
    activeRooms: 0,
    totalStudents: 0,
    totalHours: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = getToken();
        
        // Fetch user data
        const userRes = await api.get("/auth/profile");
        setUserData(userRes.data);
        // console.log("User Data:", userRes.data);

        // Fetch rooms
        const roomsRes = await api.get("/rooms",
          {
            headers: { Authorization: `Bearer ${token}` }
          });
        setRooms(roomsRes.data);

        const statsResponse = await api.get("/auth/stats",
        {
            headers: { Authorization: `Bearer ${token}` }
        });
        setStats(statsResponse.data);
        // console.log("Stats Data:", statsResponse.data);

        // Calculate stats (you can replace this with actual API calls)
        const totalRooms = roomsRes.data.length;
        const activeRooms = roomsRes.data.filter(room => 
          room.lastActivity && (Date.now() - new Date(room.lastActivity).getTime()) < 24 * 60 * 60 * 1000
        ).length;
        
        setStats({
          totalRooms,
          activeRooms,
          totalStudents: totalRooms * 15, // Mock data - replace with actual
          totalHours: totalRooms * 8.5    // Mock data - replace with actual
        });

      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleLogout = () => {
    isLogout();
    navigate('/login');
  };

  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <FaGraduationCap className="h-8 w-8 text-blue-600" />
              <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Boardly
              </span>
            </Link>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <FaBell className="w-5 h-5" />
              </button>
              <Link
                to="/profile"
                className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                <FaUser className="w-5 h-5" />
                 
                </Link>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                title="Logout"
              >
                <FaSignOutAlt className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                Welcome back, {userData?.name}!
              </h1>
              <p className="text-blue-100">
                Ready to create your next amazing learning experience?
              </p>
            </div>
            <Link
              to="/create"
              className="mt-4 md:mt-0 inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-gray-100 transition-colors font-semibold"
            >
              <FaPlus className="w-4 h-4" />
              New Room
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Rooms */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rooms</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalRooms)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <FaChalkboard className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Active Rooms */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Rooms</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.activeRooms)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <FaUsers className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Total Students */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalStudents)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <FaUser className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Teaching Hours */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Teaching Hours</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalHours)}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <FaClock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Rooms */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Recent Rooms</h2>
                <Link
                  to="/lobby"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                >
                  View all
                  <FaArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="space-y-4">
                {rooms.slice(0, 5).map((room) => (
                  <div key={room._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <FaChalkboard className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{room.topic}</h3>
                        <p className="text-sm text-gray-500">Code: {room.code}</p>
                      </div>
                    </div>
                    <Link
                      to={`/room/${room.code}`}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Join
                    </Link>
                  </div>
                ))}
              </div>

              {rooms.length === 0 && (
                <div className="text-center py-8">
                  <FaChalkboard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">No rooms created yet</p>
                  <Link
                    to="/create"
                    className="inline-block mt-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Create your first room
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions & Profile */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  to="/create"
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <FaPlus className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="font-medium">Create New Room</span>
                </Link>
                
                <Link
                  to="/lobby"
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <FaChalkboard className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="font-medium">Manage Rooms</span>
                </Link>

                <Link
                  to="/profile"
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <FaUser className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="font-medium">Profile Settings</span>
                </Link>
              </div>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Profile</h2>
              <div className="flex items-center gap-4 mb-4">
                {userData?.avatar ? (
                    <img
                    src={userData.avatar}
                    alt="avatar"
                    className="w-16 h-16 rounded-full border-2 border-white shadow-sm object-cover"
                    />
                ):(
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        {userData?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">{userData?.name}</h3>
                  <p className="text-sm text-gray-500">{userData?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Role:</span>
                  <p className="font-medium">Educator</p>
                </div>
                <div>
                  <span className="text-gray-600">Member since:</span>
                  <p className="font-medium">
                    {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;