import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaChalkboard, FaArrowLeft, FaPlus, FaLightbulb, FaCheck } from "react-icons/fa";
import { getToken } from "../utils/auth";
import api from "../utils/api";

const CreateRoom = () => {
  const [topic, setTopic] = useState("");
  const [price, setPrice] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isRoomType, setIsRoomType] = useState("Regular");
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!topic.trim()) {
      alert("Please enter a topic for your room");
      return;
    }

    if (isRoomType === "Paid" && (!price || price <= 0)) {
      alert("Please set a valid price for your paid room");
      return;
    }

    setIsCreating(true);
    try {
      const token = getToken();

      const payload = {
        topic: topic.trim(),
        isPaid: isRoomType === "Paid",
        price: isRoomType === "Paid" ? Number(price) : 0,
        currency: "NGN",
      };

      await api.post("/rooms", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      navigate("/lobby");
    } catch (err) {
      console.error("Error creating room:", err);
      alert("Failed to create room. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const topicExamples = [
    "Mathematics Fundamentals",
    "Science Laboratory",
    "English Literature",
    "History Discussion",
    "Programming Workshop",
    "Art & Design Studio",
    "Music Theory Class",
    "Physics Concepts",
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="w-full max-w-2xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate("/lobby")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-8 font-medium"
        >
          <FaArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Create New Room
          </h1>
          <p className="text-xl text-gray-600">
            Set up your professional teaching environment with advanced collaboration tools
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Room Type Selector */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-900 mb-4">
              Room Type
            </label>
            <div className="flex rounded-lg border border-gray-300 p-1">
              <button
                className={`flex-1 px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  isRoomType === "Regular"
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:text-gray-900"
                }`}
                onClick={() => {
                  setIsRoomType("Regular");
                  setPrice("");
                }}
              >
                Free Session
              </button>
              <button
                className={`flex-1 px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  isRoomType === "Paid"
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:text-gray-900"
                }`}
                onClick={() => setIsRoomType("Paid")}
              >
                Premium Session
              </button>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {/* Topic Input */}
            <div>
              <label htmlFor="topic" className="block text-sm font-semibold text-gray-900 mb-3">
                Session Topic <span className="text-red-500">*</span>
              </label>
              <input
                id="topic"
                type="text"
                placeholder="Enter your session topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleCreate()}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all placeholder-gray-500"
                disabled={isCreating}
              />
              
              {/* Topic Suggestions */}
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                  <FaLightbulb className="w-4 h-4" />
                  Suggested Topics
                </p>
                <div className="flex flex-wrap gap-2">
                  {topicExamples.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setTopic(example)}
                      className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md transition-colors border border-gray-200"
                      disabled={isCreating}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Price Input (for Paid rooms only) */}
            {isRoomType === "Paid" && (
              <div>
                <label htmlFor="price" className="block text-sm font-semibold text-gray-900 mb-3">
                  Session Price (NGN) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₦</span>
                  <input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all placeholder-gray-500"
                    disabled={isCreating}
                    min="0"
                    step="0.01"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Set your per-student session fee
                </p>
              </div>
            )}

            {/* Create Button */}
            <div className="pt-6">
              <button
                onClick={handleCreate}
                disabled={!topic.trim() || (isRoomType === "Paid" && (!price || price <= 0)) || isCreating}
                className="w-full bg-gray-900 text-white text-lg font-semibold py-4 rounded-md hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isCreating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating Session...
                  </>
                ) : (
                  <>
                    <FaPlus className="w-5 h-5" />
                    Create {isRoomType === "Paid" ? "Premium" : "Free"} Session
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-10">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            {isRoomType === "Paid" ? "Premium Session Features" : "Session Features"}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Standard Features */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Core Tools</h4>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center gap-3">
                  <FaCheck className="w-4 h-4 text-gray-400" />
                  Interactive whiteboard with real-time sync
                </li>
                <li className="flex items-center gap-3">
                  <FaCheck className="w-4 h-4 text-gray-400" />
                  PDF upload and annotation capabilities
                </li>
                <li className="flex items-center gap-3">
                  <FaCheck className="w-4 h-4 text-gray-400" />
                  Multi-participant collaboration
                </li>
                <li className="flex items-center gap-3">
                  <FaCheck className="w-4 h-4 text-gray-400" />
                  Auto-save and session persistence
                </li>
              </ul>
            </div>

            {/* Premium Features or Access Control */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="font-semibold text-gray-900 mb-4">
                {isRoomType === "Paid" ? "Premium Benefits" : "Access Control"}
              </h4>
              <ul className="space-y-3 text-gray-600">
                {isRoomType === "Paid" ? (
                  <>
                    <li className="flex items-center gap-3">
                      <FaCheck className="w-4 h-4 text-gray-400" />
                      Secure payment integration
                    </li>
                    <li className="flex items-center gap-3">
                      <FaCheck className="w-4 h-4 text-gray-400" />
                      Individual student access codes
                    </li>
                    <li className="flex items-center gap-3">
                      <FaCheck className="w-4 h-4 text-gray-400" />
                      Revenue tracking and analytics
                    </li>
                    <li className="flex items-center gap-3">
                      <FaCheck className="w-4 h-4 text-gray-400" />
                      Extended session duration
                    </li>
                  </>
                ) : (
                  <>
                    <li className="flex items-center gap-3">
                      <FaCheck className="w-4 h-4 text-gray-400" />
                      Unique room access code
                    </li>
                    <li className="flex items-center gap-3">
                      <FaCheck className="w-4 h-4 text-gray-400" />
                      Unlimited student participants
                    </li>
                    <li className="flex items-center gap-3">
                      <FaCheck className="w-4 h-4 text-gray-400" />
                      Session management controls
                    </li>
                    <li className="flex items-center gap-3">
                      <FaCheck className="w-4 h-4 text-gray-400" />
                      Instant session activation
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-gray-500 mt-8">
          You can modify session settings and manage participants from your dashboard after creation.
        </p>
      </div>
    </div>
  );
};

export default CreateRoom;