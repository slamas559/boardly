import { useState } from "react";
import axios from "axios";
import { getToken } from "../utils/auth";
import { useNavigate } from "react-router-dom";
import { FaChalkboard, FaArrowLeft, FaPlus, FaLightbulb } from "react-icons/fa";

const CreateRoom = () => {
  const [topic, setTopic] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!topic.trim()) {
      alert("Please enter a topic for your room");
      return;
    }

    setIsCreating(true);
    try {
      const token = getToken();
      const res = await axios.post(
        "http://localhost:5000/rooms",
        { topic: topic.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      navigate('/lobby');
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
    "Physics Concepts"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={() => navigate('/lobby')}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-6 font-medium"
        >
          <FaArrowLeft className="w-4 h-4" />
          Back to Lobby
        </button>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FaChalkboard className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create New Room
            </h1>
            <p className="text-gray-600">
              Set up your virtual classroom and start teaching
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6">
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
                Room Topic *
              </label>
              <input
                id="topic"
                type="text"
                placeholder="e.g., Advanced Calculus Workshop"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400"
                disabled={isCreating}
              />
              
              {/* Topic Suggestions */}
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                  <FaLightbulb className="w-3 h-3" />
                  Quick ideas:
                </p>
                <div className="flex flex-wrap gap-2">
                  {topicExamples.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setTopic(example)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded-lg transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={!topic.trim() || isCreating}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                <>
                  <FaPlus className="w-4 h-4" />
                  Create Room
                </>
              )}
            </button>
          </div>

          {/* Features List */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">What you'll get:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Interactive whiteboard with real-time collaboration
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                PDF upload and annotation tools
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Unique room code for student access
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Session persistence and auto-save
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-gray-500 mt-6">
          You can always edit room settings later from your lobby
        </p>
      </div>
    </div>
  );
};

export default CreateRoom;