import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
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
  FaArrowRight,
  FaReceipt,
  FaMoneyBillWave,
  FaCheckCircle,
  FaTimesCircle,
  FaSearch,
  FaFilter,
  FaEye,
  FaDownload,
  FaChevronDown,
  FaChevronRight,
  FaCalendarAlt,
  FaUniversity,
  FaCheck
} from "react-icons/fa";
import { isLogout } from '../utils/auth';
import boardlyIcon from '../assets/boardly-icon.svg';
import api from '../utils/api';

const Dashboard = () => {
  const [userData, setUserData] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentStats, setPaymentStats] = useState(null);
  const [stats, setStats] = useState({
    totalRooms: 0,
    activeRooms: 0,
    totalStudents: 0,
    totalHours: 0
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedPayment, setExpandedPayment] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        
        const userRes = await api.get("/auth/profile");
        setUserData(userRes.data);

        {userRes.data.role === "student" && (setActiveTab("payments"))}
        
        const roomsRes = await api.get("/rooms");
        setRooms(roomsRes.data);

        const statsResponse = await api.get("/auth/stats");
        setStats(statsResponse.data);

        await fetchPayments();
        await fetchPaymentStats();

        const totalRooms = roomsRes.data.length;
        const activeRooms = roomsRes.data.filter(room => 
          room.lastActivity && (Date.now() - new Date(room.lastActivity).getTime()) < 24 * 60 * 60 * 1000
        ).length;
        
        setStats(prev => ({
          ...prev,
          totalRooms,
          activeRooms,
          totalStudents: totalRooms * 15,
          totalHours: totalRooms * 8.5
        }));

      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
        setError('Failed to load dashboard data try logout and login again');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await api.get("/payments");
      
      if (res.data.success) {
        setPayments(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching payments:', err);
    }
  };

  const fetchPaymentStats = async () => {
    try {
      const res = await api.get("/payments/stats");
      
      if (res.data.success) {
        setPaymentStats(res.data.stats);
      }
    } catch (err) {
      console.error('Error fetching payment stats:', err);
    }
  };

  const fetchReceipt = async (reference) => {
    try {
      const res = await api.get(`/payments/receipt/${reference}`);
      
      if (res.data.success) {
        setSelectedReceipt(res.data.receipt);
        setShowReceiptModal(true);
      }
    } catch (err) {
      console.error('Error fetching receipt:', err);
      setError('Failed to load receipt details');
    }
  };

  const handleLogout = async () => {
    try {
      // Call the logout endpoint to clear the HTTP-Only cookie
      await api.post('/auth/logout');
      // Redirect to login
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if logout fails
      navigate('/login');
    }
  };

  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const formatCurrency = (amount, currency = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <FaCheckCircle className="w-4 h-4 text-gray-600" />;
      case 'pending':
        return <FaClock className="w-4 h-4 text-gray-600" />;
      case 'failed':
        return <FaTimesCircle className="w-4 h-4 text-gray-600" />;
      default:
        return <FaClock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'pending':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'failed':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getUserRole = () => {
    return paymentStats?.userRole || 'student';
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.room?.topic?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const TabButton = ({ tabId, icon: Icon, label, count }) => (
    <button
      onClick={() => setActiveTab(tabId)}
      className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors rounded-md ${
        activeTab === tabId 
          ? 'bg-gray-900 text-white' 
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
              {/* <FaGraduationCap className="h-6 w-6 sm:h-7 sm:w-7 text-gray-900" /> */}
              <img src={boardlyIcon} alt="Boardly" className="h-7 w-7" />
              <span className="font-semibold text-lg sm:text-xl text-gray-900">
                Boardly
              </span>
            </Link>
            <div className="flex items-center space-x-2 sm:space-x-6">
              {/* Mobile Tab Selector */}
              { getUserRole() == "tutor" ? (
                <>
                <div className="sm:hidden">
                  <select
                    value={activeTab}
                    onChange={(e) => setActiveTab(e.target.value)}
                    className="px-3 py-2 bg-gray-100 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    <option value="overview">Overview</option>
                    <option value="payments">Transactions ({payments.length})</option>
                  </select>
                </div>

                {/* Desktop Tab Buttons */}
                <div className="hidden sm:flex items-center gap-2">
                  <TabButton tabId="overview" icon={FaChartLine} label="Overview" />
                  <TabButton tabId="payments" icon={FaReceipt} label="Transactions" count={payments.length} />
                </div>
                </>
              ):(
                <div className='text-sm font-medium px-3 py-2 bg-gray-100 rounded-lg'>
                  Student
                </div>
              )}
              
              <Link to="/profile" className="text-gray-600 hover:text-gray-900 transition-colors p-2">
                <FaUser className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                title="Logout"
              >
                <FaSignOutAlt className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gray-900 p-6 md:p-8 text-white mb-8 rounded-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                Welcome back, {userData?.name}
              </h1>
              <p className="text-gray-300">
                {activeTab === 'overview' 
                  ? 'Manage your teaching sessions and track your progress'
                  : `Monitor your ${getUserRole() === 'tutor' ? 'earnings' : 'payments'} and transaction history`
                }
              </p>
            </div>
            {activeTab === 'overview' && (
              <Link
                to="/create"
                className="mt-4 md:mt-0 inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-md hover:bg-gray-100 transition-colors font-semibold"
              >
                <FaPlus className="w-4 h-4" />
                New Session
              </Link>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white shadow-sm p-6 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                    <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.totalRooms)}</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
                    <FaChalkboard className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white shadow-sm p-6 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                    <p className="text-3xl font-bold text-gray-900">{formatNumber(stats.activeRooms)}</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
                    <FaUsers className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              {paymentStats && (
                <>
                  <div className="bg-white shadow-sm p-6 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                        <p className="text-3xl font-bold text-gray-900">{paymentStats.totalTransactions}</p>
                      </div>
                      <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
                        <FaReceipt className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white shadow-sm p-6 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          {getUserRole() === 'tutor' ? 'Total Earnings' : 'Total Spent'}
                        </p>
                        <p className="text-3xl font-bold text-gray-900">
                          {formatCurrency(paymentStats.totalAmount)}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
                        <FaMoneyBillWave className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Sessions */}
              <div className="lg:col-span-2">
                <div className="bg-white shadow-sm p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Recent Sessions</h2>
                    <Link
                      to="/lobby"
                      className="text-gray-600 hover:text-gray-900 text-sm font-medium flex items-center gap-1 px-3 py-1 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      View all
                      <FaArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  <div className="space-y-4">
                    {rooms.slice(0, 5).map((room) => (
                      <div key={room._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
                            <FaChalkboard className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm text-gray-900">{room.topic}</h3>
                            <p className="text-sm text-gray-500 text-sm">Code: {room.code}</p>
                          </div>
                        </div>
                        <Link
                          to={`/room/${room.code}`}
                          className="px-4 py-2 bg-gray-900 text-white text-xs rounded-md hover:bg-gray-800 transition-colors font-medium"
                        >
                          Open
                        </Link>
                      </div>
                    ))}
                  </div>

                  {rooms.length === 0 && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <FaChalkboard className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-600 mb-2">No sessions created yet</p>
                      <Link
                        to="/create"
                        className="inline-block text-gray-900 hover:text-gray-700 font-medium"
                      >
                        Create your first session
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="bg-white shadow-sm p-4 border border-gray-200 rounded-lg">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                  <div className="space-y-3">
                    <Link
                      to="/create"
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                        <FaPlus className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-medium text-sm text-gray-900">Create New Session</span>
                    </Link>
                    
                    <Link
                      to="/lobby"
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                        <FaChalkboard className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-medium text-sm text-gray-900">Manage Sessions</span>
                    </Link>

                    <Link
                      to="/profile"
                      className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                        <FaUser className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-medium text-sm text-gray-900">Profile Settings</span>
                    </Link>
                  </div>
                </div>

                {/* Profile Card */}
                <div className="bg-white shadow-sm p-4 border border-gray-200 rounded-lg">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Profile Information</h2>
                  <div className="flex items-center gap-4 mb-4">
                    {userData?.avatar ? (
                      <img
                        src={userData.avatar}
                        alt="avatar"
                        className="w-16 h-16 rounded-full border-2 border-gray-200 object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        {userData?.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-gray-900">{userData?.name}</h3>
                      <p className="text-sm text-gray-500">{userData?.email}</p>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Role:</span>
                      <span className="font-medium capitalize text-gray-900">
                        {getUserRole() === 'tutor' ? 'Instructor' : 'Student'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-600">Member since:</span>
                      <span className="font-medium text-gray-900">
                        {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Transactions Tab Content */
          <>
            {/* Payment Stats Overview */}
            {paymentStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white shadow-sm p-6 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                      <p className="text-3xl font-bold text-gray-900">{paymentStats.totalTransactions}</p>
                    </div>
                    <FaReceipt className="w-8 h-8 text-gray-600" />
                  </div>
                </div>
                
                <div className="bg-white shadow-sm p-6 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {getUserRole() === 'tutor' ? 'Total Earnings' : 'Total Spent'}
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {formatCurrency(paymentStats.totalAmount)}
                      </p>
                    </div>
                    <FaMoneyBillWave className="w-8 h-8 text-gray-600" />
                  </div>
                </div>
                
                <div className="bg-white shadow-sm p-6 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Successful</p>
                      <p className="text-3xl font-bold text-gray-900">{paymentStats.successfulTransactions}</p>
                    </div>
                    <FaCheckCircle className="w-8 h-8 text-gray-600" />
                  </div>
                </div>
                
                <div className="bg-white shadow-sm p-6 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending</p>
                      <p className="text-3xl font-bold text-gray-900">{paymentStats.pendingTransactions}</p>
                    </div>
                    <FaClock className="w-8 h-8 text-gray-600" />
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white shadow-sm p-6 mb-8 border border-gray-200 rounded-lg">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search by reference, session topic..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors"
                    />
                  </div>
                </div>
                
                <div className="lg:w-48">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors"
                  >
                    <option value="all">All Status</option>
                    <option value="success">Successful</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Transaction Records */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  Transaction History
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {filteredPayments.length} record{filteredPayments.length !== 1 ? 's' : ''} found
                </p>
              </div>
              
              {filteredPayments.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <FaReceipt className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No transactions found
                  </h3>
                  <p className="text-gray-600">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filters'
                      : getUserRole() === 'tutor' 
                        ? 'You haven\'t received any payments yet'
                        : 'You haven\'t made any payments yet'
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredPayments.map((payment) => (
                    <div key={payment._id} className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gray-900 rounded-lg">
                            {getUserRole() === 'tutor' ? (
                              <FaMoneyBillWave className="w-5 h-5 text-white" />
                            ) : (
                              <FaReceipt className="w-5 h-5 text-white" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-gray-900 font-bold text-sm">{payment.description}</h3>
                            <div className="flex items-center mt-2">
                              <span className='text-xs text-gray-500'>{formatDate(payment.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                              {formatCurrency(payment.displayAmount)}
                            </p>
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}>
                              {getStatusIcon(payment.status)}
                              <span className="capitalize">{payment.status}</span>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => setExpandedPayment(expandedPayment === payment._id ? null : payment._id)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {expandedPayment === payment._id ? (
                              <FaChevronDown className="w-4 h-4" />
                            ) : (
                              <FaChevronRight className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {/* Expanded Details */}
                      {expandedPayment === payment._id && (
                        <div className="mt-4 pt-4 border-t border-gray-200 bg-gray-50 -mx-6 px-6 pb-6 rounded-b-lg">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Session Details */}
                            {payment.room && (
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-3">Session Details</h4>
                                <div className="space-y-2 text-sm text-gray-600">
                                  <div className="flex justify-between">
                                    <span>Topic:</span>
                                    <span className="font-medium text-gray-900">{payment.room.topic}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Room Code:</span>
                                    <span className="font-mono text-gray-900">{payment.room.code}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Created:</span>
                                    <span className="text-gray-900">{formatDate(payment.room.createdAt)}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Payment Details */}
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-3">Payment Details</h4>
                              <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex justify-between">
                                  <span>Currency:</span>
                                  <span className="font-medium text-gray-900">{payment.currency}</span>
                                </div>
                                {getUserRole() === 'tutor' && payment.splitAmounts && (
                                  <>
                                    <div className="flex justify-between">
                                      <span>Total Payment:</span>
                                      <span className="font-medium text-gray-900">{formatCurrency(payment.totalAmount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Your Share ({payment.splitAmounts.tutorPercentage}%):</span>
                                      <span className="font-medium text-gray-900">{formatCurrency(payment.splitAmounts.tutorAmount)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>Platform Fee ({payment.splitAmounts.platformPercentage}%):</span>
                                      <span className="font-medium text-gray-600">{formatCurrency(payment.splitAmounts.platformAmount)}</span>
                                    </div>
                                  </>
                                )}
                                {payment.settlement && (
                                  <div className="flex justify-between">
                                    <span>Settlement Status:</span>
                                    <span className={`font-medium ${payment.settlement.tutorSettled ? 'text-gray-900' : 'text-gray-600'}`}>
                                      {payment.settlement.tutorSettled ? 'Settled' : 'Pending'}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span>Reference:</span>
                                  <span className="font-medium text-gray-900">{payment.reference}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Date:</span>
                                  <span>{formatDate(payment.createdAt)}</span>
                                </div>
                                
                                {getUserRole() === 'tutor' && payment.payer && (
                                  <div className="flex justify-between">
                                    <span>Payer:</span>
                                    <span>{payment.payer}</span>
                                  </div>
                                )}
                                
                                {getUserRole() === 'student' && payment.recipient && (
                                  <div className="flex justify-between">
                                    <span>Recipient:</span>
                                    <span>{payment.recipient}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="mt-6">
                            <button
                              onClick={() => fetchReceipt(payment.reference)}
                              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium py-2 px-3 rounded-md hover:bg-gray-100 transition-colors text-sm"
                            >
                              <FaEye className="w-4 h-4" />
                              View Receipt Details
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Receipt Modal */}
        {showReceiptModal && selectedReceipt && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl rounded-lg">
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Transaction Receipt</h2>
                  <button
                    onClick={() => setShowReceiptModal(false)}
                    className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <FaTimesCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="text-center mb-8">
                  <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-lg font-bold border ${getStatusColor(selectedReceipt.status)}`}>
                    {getStatusIcon(selectedReceipt.status)}
                    <span className="capitalize">{selectedReceipt.status}</span>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mt-4">
                    {formatCurrency(selectedReceipt.amount)}
                  </h3>
                  <p className="text-gray-600 text-lg">{selectedReceipt.description}</p>
                </div>
                
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-bold text-gray-900 mb-4">Transaction Details</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-600">Reference:</span>
                          <span className="font-mono text-gray-900">{selectedReceipt.reference}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-600">Date:</span>
                          <span className="text-gray-900">{formatDate(selectedReceipt.createdAt)}</span>
                        </div>
                        <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-gray-600">Currency:</span>
                          <span className="text-gray-900">{selectedReceipt.currency}</span>
                        </div>
                        {getUserRole() === 'tutor' && selectedReceipt.splitAmounts && (
                          <>
                            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-600">Total Payment:</span>
                              <span className="text-gray-900">{formatCurrency(selectedReceipt.totalAmount)}</span>
                            </div>
                            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-600">Platform Fee:</span>
                              <span className="text-gray-900">{formatCurrency(selectedReceipt.platformAmount)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-bold text-gray-900 mb-4">
                        {getUserRole() === 'tutor' ? 'Student' : 'Instructor'} Details
                      </h4>
                      <div className="space-y-3 text-sm">
                        {getUserRole() === 'tutor' && selectedReceipt.student && (
                          <>
                            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-600">Name:</span>
                              <span className="text-gray-900">{selectedReceipt.student.name}</span>
                            </div>
                            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-600">Email:</span>
                              <span className="text-gray-900">{selectedReceipt.student.email}</span>
                            </div>
                          </>
                        )}
                        
                        {getUserRole() === 'student' && selectedReceipt.tutor && (
                          <>
                            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-600">Name:</span>
                              <span className="text-gray-900">{selectedReceipt.tutor.name}</span>
                            </div>
                            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="text-gray-600">Email:</span>
                              <span className="text-gray-900">{selectedReceipt.tutor.email}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {selectedReceipt.room && (
                    <div>
                      <h4 className="font-bold text-gray-900 mb-4">Session Details</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Topic:</span>
                            <span className="text-gray-900 font-semibold">{selectedReceipt.room.topic}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Room Code:</span>
                            <span className="text-gray-900 font-mono">{selectedReceipt.room.code}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Session Price:</span>
                            <span className="text-gray-900 font-semibold">{formatCurrency(selectedReceipt.room.price)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Created:</span>
                            <span className="text-gray-900">{formatDate(selectedReceipt.room.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {getUserRole() === 'tutor' && selectedReceipt.splitAmounts && (
                    <div>
                      <h4 className="font-bold text-gray-900 mb-4">Earnings Breakdown</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Your Share ({selectedReceipt.splitAmounts.tutorPercentage}%):</span>
                            <span className="text-gray-900 font-bold">{formatCurrency(selectedReceipt.splitAmounts.tutorAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Platform Fee ({selectedReceipt.splitAmounts.platformPercentage}%):</span>
                            <span className="text-gray-600">{formatCurrency(selectedReceipt.splitAmounts.platformAmount)}</span>
                          </div>
                          <div className="pt-3 border-t border-gray-200">
                            <div className="flex justify-between">
                              <span className="text-gray-900 font-semibold">Total Payment:</span>
                              <span className="text-gray-900 font-bold">{formatCurrency(selectedReceipt.totalAmount)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {selectedReceipt.settlement && (
                    <div>
                      <h4 className="font-bold text-gray-900 mb-4">Settlement Status</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-sm">
                          {selectedReceipt.settlement.tutorSettled ? (
                            <>
                              <FaCheckCircle className="w-4 h-4 text-gray-600" />
                              <span className="text-gray-900 font-medium">Settled</span>
                              {selectedReceipt.settlement.settlementDate && (
                                <span className="text-gray-600 ml-2">
                                  on {formatDate(selectedReceipt.settlement.settlementDate)}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <FaClock className="w-4 h-4 text-gray-600" />
                              <span className="text-gray-900 font-medium">Pending Settlement</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 pt-8 border-t border-gray-200 mt-8">
                  <button
                    onClick={() => window.print()}
                    className="flex-1 bg-gray-900 text-white py-3 px-6 rounded-md hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 font-medium"
                  >
                    <FaDownload className="w-4 h-4" />
                    Download Receipt
                  </button>
                  <button
                    onClick={() => setShowReceiptModal(false)}
                    className="px-8 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;