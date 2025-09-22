// src/components/payment/PaymentSuccess.jsx - Updated for split payments
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../utils/api";

const PaymentSuccess = () => {
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("Please wait, verifying your payment...");
  const [roomData, setRoomData] = useState(null);
  const [splitInfo, setSplitInfo] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const reference = searchParams.get("reference");
    if (!reference) {
      setStatus("error");
      setMessage("No payment reference provided.");
      return;
    }

    const verifyPayment = async () => {
      try {
        const res = await api.get(`/payments/verify?reference=${reference}`);
        if (res.data.success) {
          setStatus("success");
          setMessage("Split payment verified successfully!");
          
          // Get room data if available in response
          if (res.data.roomData) {
            setRoomData(res.data.roomData);
          }
          
          // Get split payment information
          if (res.data.splitInfo) {
            setSplitInfo(res.data.splitInfo);
          }
        } else {
          setStatus("error");
          setMessage("Payment verification failed. Please try again.");
        }
      } catch (err) {
        setStatus("error");
        setMessage("Error verifying payment. Try again later.");
        console.error("Payment verification error:", err);
      }
    };

    verifyPayment();
  }, [searchParams]);

  const handleJoinRoom = () => {
    if (roomData?.code) {
      navigate(`/room/${roomData.code}`);
    } else {
      navigate("/lobby");
    }
  };

  const handleBackToLobby = () => {
    navigate("/lobby");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white shadow-xl rounded-2xl p-8 max-w-md w-full text-center">
        {/* Status Icons */}
        <div className="mb-6">
          {status === "verifying" && (
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}
          
          {status === "success" && (
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
          )}
          
          {status === "error" && (
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
          )}
        </div>

        {/* Status Messages */}
        <div className="mb-6">
          {status === "verifying" && (
            <div>
              <h1 className="text-xl font-semibold text-gray-800 mb-2">Verifying Payment</h1>
              <p className="text-gray-600">{message}</p>
            </div>
          )}
          
          {status === "success" && (
            <div>
              <h1 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h1>
              <p className="text-gray-600 mb-4">{message}</p>
              
              {roomData && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-1">You now have access to:</p>
                  <p className="font-semibold text-gray-800">{roomData.topic}</p>
                  <p className="text-xs text-gray-500">Room Code: {roomData.code}</p>
                </div>
              )}
              
              {/* Split Payment Information */}
              {splitInfo && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-blue-800 mb-2">Payment Distribution</p>
                  <div className="text-xs text-blue-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Tutor ({splitInfo.tutorPercentage}%):</span>
                      <span>₦{(splitInfo.tutorAmount / 100).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform (30%):</span>
                      <span>₦{(splitInfo.platformAmount / 100).toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-xs text-blue-500 mt-2">
                    Your payment helps support both the tutor and platform development
                  </p>
                </div>
              )}
            </div>
          )}
          
          {status === "error" && (
            <div>
              <h1 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h1>
              <p className="text-gray-600">{message}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {status === "success" && (
            <>
              <button
                onClick={handleJoinRoom}
                className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl hover:bg-green-700 transition-colors"
              >
                {roomData ? `Join "${roomData.topic}"` : "Join Room"}
              </button>
              <button
                onClick={handleBackToLobby}
                className="w-full bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-300 transition-colors"
              >
                Back to Lobby
              </button>
            </>
          )}
          
          {status === "error" && (
            <>
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors mb-2"
              >
                Try Again
              </button>
              <button
                onClick={handleBackToLobby}
                className="w-full bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-300 transition-colors"
              >
                Back to Lobby
              </button>
            </>
          )}
          
          {status === "verifying" && (
            <div className="flex items-center justify-center space-x-2 text-gray-500">
              <div className="animate-pulse w-2 h-2 bg-gray-400 rounded-full"></div>
              <div className="animate-pulse w-2 h-2 bg-gray-400 rounded-full" style={{animationDelay: '0.2s'}}></div>
              <div className="animate-pulse w-2 h-2 bg-gray-400 rounded-full" style={{animationDelay: '0.4s'}}></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;