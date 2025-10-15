// Room.jsx - Updated for split payment system
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import WhiteboardLayout from "../components/WhiteboardLayout";
import api from "../utils/api";
import { isLoggedIn } from "../utils/auth";

const Room = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [isTutor, setIsTutor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessGranted, setAccessGranted] = useState(false);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [paymentSetupWarning, setPaymentSetupWarning] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);


  useEffect(() => {
    const fetchRoom = async () => {
      let authenticated = false;
      try {
        const res = await api.get('/auth/check-auth');
        // console.log("Auth check response:", res);
        authenticated = true;
        setIsAuthenticated(true);
      } catch (err) {
        authenticated = false;
        setIsAuthenticated(false);
      }

      try {
        setLoading(true);
        setError(null);
        
        // First, try to get basic room info (no auth needed for free rooms)
        let res;
        try {
          if (authenticated) {
            // If user is logged in, get full room data with payment status
            res = await api.get(`/rooms/${code}`);
          } else {
            // If no token, get basic room info
            res = await api.get(`/rooms/${code}/public`);
          }
        } catch (err) {
          if (err.response?.status === 401 && !authenticated) {
            // Try public endpoint if auth fails and no token
            res = await api.get(`/rooms/${code}/public`);
          } else {
            throw err;
          }
        }

        const roomData = res.data;
        setRoom(roomData);
        // console.log(roomData)
        setIsTutor(roomData.isTutor || false);
        // console.log("Fetched room data:", roomData);
        // Check if tutor has payment setup for paid rooms
        if (roomData.isPaid && roomData.isTutor && !roomData.creator?.hasPaymentSetup) {
          setPaymentSetupWarning(true);
        }

        // Access control logic
        if (roomData.isTutor) {
          // Tutors always get access
          setAccessGranted(true);
          setPaymentRequired(false);
        } else if (!roomData.isPaid) {
          // Free rooms - grant access to everyone (no login required)
          setAccessGranted(true);
          setPaymentRequired(false);
        } else if (roomData.isPaid) {
          if (!authenticated) {
            // Paid room but user not logged in - redirect to login
            navigate(`/login?redirect=/room/${code}`);
            return;
          } else if (roomData.hasPaid) {
            // Paid room and user has paid
            setAccessGranted(true);
            setPaymentRequired(false);
          } else {
            // Paid room and user hasn't paid
            setAccessGranted(false);
            setPaymentRequired(true);
          }
        }

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
  }, [code, navigate]);

  // Handle SplitisAPayment
  const handlePayment = async () => {
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      navigate(`/login?redirect=/room/${code}`);
      return;
    }

    try {
      const res = await api.post(
        `/payments/initiate`,
        { roomId: room._id }
      );
      
      if (res.data.free) {
        // Room became free, refresh page
        window.location.reload();
      } else if (res.data.authorization_url) {
        // Redirect to Paystack split payment checkout
        window.location.href = res.data.authorization_url;
      } else {
        alert("Unable to initiate payment. Please try again.");
      }
    } catch (err) {
      console.error("Payment error:", err);
      const errorMessage = err.response?.data?.message || "Payment initiation failed";
      alert(errorMessage);
    }
  };

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
            <svg
              className="w-10 h-10 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Room Not Found
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>

          <button
            onClick={() => navigate("/lobby")}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // Show payment screen for students who need to pay
  if (paymentRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Payment Required
          </h1>
          <p className="text-gray-600 mb-2">
            This is a premium session with automatic payment splitting.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Topic: <span className="font-medium">{room?.topic}</span>
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-2xl font-bold text-green-600">
              ₦{room?.price?.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">One-time payment</p>
          </div>

          {/* Payment Split Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-semibold text-blue-800 mb-2">Payment Distribution</p>
            <div className="text-xs text-blue-600 space-y-1">
              <div className="flex justify-between">
                <span>Tutor (70%):</span>
                <span>₦{Math.round(room?.price * 0.7).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform (30%):</span>
                <span>₦{Math.round(room?.price * 0.3).toLocaleString()}</span>
              </div>
            </div>
            <p className="text-xs text-blue-500 mt-2">
              Your payment supports both the tutor and platform development
            </p>
          </div>

          <button
            onClick={handlePayment}
            className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl hover:bg-green-700 transition-colors mb-4"
          >
            Pay & Join Session
          </button>

          <button
            onClick={() => navigate("/lobby")}
            className="w-full bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-300 transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // Show payment setup warning for tutors
  if (paymentSetupWarning) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-orange-600 mb-4">
            Payment Setup Required
          </h1>
          <p className="text-gray-600 mb-6">
            You need to setup your bank account to receive payments from this paid session. 
            Students can't pay until your payment account is configured.
          </p>

          <button
            onClick={() => navigate("/profile")}
            className="w-full bg-orange-600 text-white font-semibold py-3 rounded-xl hover:bg-orange-700 transition-colors mb-4"
          >
            Setup Payment Account
          </button>

          <button
            onClick={() => navigate("/lobby")}
            className="w-full bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-300 transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  // Render the whiteboard if access is granted
  return room && accessGranted ? (
    <div>
      {/* {!getToken() && !room.isPaid && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
          <p className="text-sm text-blue-800">
            <span className="font-medium">Guest Mode:</span> You're viewing this free session as a guest
          </p>
        </div>
      )}
      {isTutor && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-2">
          <p className="text-sm text-green-800">
            <span className="font-medium">Tutor Mode:</span> You have full access to this room
            {room.isPaid && (
              <span className="ml-2 text-xs bg-green-200 px-2 py-1 rounded">
                Split Payment: 70% to you, 30% platform
              </span>
            )}
          </p>
        </div>
      )} */}
      <WhiteboardLayout room={room} isTutor={isTutor} />
    </div>
  ) : null;
};

export default Room;