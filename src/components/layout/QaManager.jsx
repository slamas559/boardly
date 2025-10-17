// Fixed QaManager.js
import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "../../context/SocketContext";
import { useNavigate } from "react-router-dom";
import {
  FaPencilAlt,
  FaEraser,
  FaTrash,
  FaLink,
  FaBars,
  FaTimes,
  FaFilePdf,
  FaPalette,
  FaSlidersH,
  FaArrowLeft,
  FaClock,
  FaUsers,
  FaStop,
  FaChalkboardTeacher,
  FaBrush,
  FaQuestionCircle,
  FaCheckSquare,
  FaSquare,
  FaComments,
  FaToggleOn,
  FaToggleOff
} from "react-icons/fa";
import PDFViewer from "../PDFViewer";
import axios from "axios";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from "../../utils/api";

// Extracted Q&A Popup Component
export const QaPopup = ({ showQaPopup, onClose }) => {
  if (!showQaPopup) return null;

  return (
    <div className="fixed top-4 right-4 bg-white text-gray-800 p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <FaComments className="mr-2" />
          <span>Q&A is now enabled! You can ask questions.</span>
        </div>
        <button 
          onClick={onClose}
          className="ml-4 text-white hover:text-green-200"
        >
          <FaTimes />
        </button>
      </div>
    </div>
  );
};

// Updated Q&A Panel Component - receives all props from parent
export const QaPanel = ({ 
  qaPanelOpen, 
  onClose, 
  room, 
  isTutor, 
  qaEnabled,
  socket,
  studentQuestions, // Received from parent
  onSubmitQuestion, // Function from parent
  onMarkQuestionAnswered // Function from parent
}) => {
  const [newQuestion, setNewQuestion] = useState("");

  // Submit a new question - call parent function
  const submitQuestion = async () => {
    if (!newQuestion.trim()) return;
    
    const success = await onSubmitQuestion(newQuestion);
    if (success) {
      setNewQuestion("");
    }
  };

  if (!qaPanelOpen) return null;

  return (
    <div className="fixed right-4 bottom-4 w-80 bg-white rounded-lg shadow-xl z-40 border border-gray-200 flex flex-col max-h-96">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800">Questions & Answers</h3>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <FaTimes />
        </button>
      </div>
      
      {/* Questions List - Scrollable area */}
      <div className="flex-1 overflow-y-auto p-4">
        {isTutor ? (
          // Tutor view - with checkboxes
          <div className="space-y-3">
            {studentQuestions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No questions yet</p>
            ) : (
              studentQuestions.map((question) => (
                <div key={question._id} className="flex items-start p-3 bg-gray-50 rounded-lg">
                  <button
                    onClick={() => onMarkQuestionAnswered(question._id)}
                    className="mt-1 mr-3 text-blue-500 hover:text-blue-700 cursor-pointer"
                  >
                    {question.answered ? (
                      <FaCheckSquare className="text-green-500"/>
                    ) : (
                      <FaSquare className="text-gray-400"/>
                    )}
                  </button>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{question.text}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      From: {question.studentName} • {new Date(question.createdAt).toLocaleTimeString()}
                    </p>
                    {question.answered && (
                      <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Answered
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // Student view - Answered questions list
          <div className="space-y-3">
            {studentQuestions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No questions yet</p>
            ) : (
              studentQuestions.map((question) => (
                <div key={question._id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-800">{question.text}</p>
                  <div className="flex items-center mt-2">
                    {question.answered ? (
                      <>
                        <FaCheckSquare className="text-green-500 mr-1" />
                        <span className="text-xs text-green-600">Answered</span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-600">Unanswered</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Input Area - Fixed at bottom */}
      {!isTutor && qaEnabled && (
        <div className="p-4 border-t border-gray-200 bg-white">
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Type your question here..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            rows="2"
          />
          <button
            onClick={submitQuestion}
            disabled={!newQuestion.trim()}
            className="mt-2 w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Submit Question
          </button>
        </div>
      )}
    </div>
  );
};

// Extracted Q&A Controls Component - same as before
export const QaControls = ({ 
  qaEnabled, 
  onToggleQa, 
  qaLoading, 
  studentQuestions, 
  onOpenPanel, 
  isTutor 
}) => {
  if (isTutor) {
    return (
      <>
        {/* Q&A Toggle in Sidebar */}
        <div className="pt-2 border-gray-200">
          <div className="">
            <button
              title={qaEnabled ? "Disable Q&A" : "Enable Q&A"}
              disabled={qaLoading}
              aria-pressed={qaEnabled}
              aria-label="Toggle Q&A"
              onClick={onToggleQa}
              className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer ${
                qaEnabled ? 'bg-green-500' : 'bg-gray-200'
              }`}
            >
              <span className="sr-only">Enable Q&A</span>
              <span
                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                  qaEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Questions Counter */}
        {qaEnabled && studentQuestions.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center justify-between">
              <button
                onClick={onOpenPanel}
                className="w-full bg-gray-200 text-sm flex items-center justify-between text-xs gap-1 p-2 px-3 rounded-lg text-blue-600 hover:text-blue-800"
              >
                Q&A
                {studentQuestions.filter(q => !q.answered).length > 0 && (
                  <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {studentQuestions.filter(q => !q.answered).length}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Student header controls
  return (
    <>
      <button
        onClick={onToggleQa}
        disabled={qaLoading}
        className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
        title={qaEnabled ? "Disable Q&A" : "Enable Q&A"}
      >
        {qaLoading ? (
          <span className="animate-spin">⟳</span>
        ) : qaEnabled ? (
          <FaToggleOn className="text-green-500" />
        ) : (
          <FaToggleOff />
        )}
        <span>Q&A {qaLoading ? '...' : ''}</span>
      </button>
    </>
  );
};

// Updated Q&A Manager Hook with centralized question management
export const useQaManager = (room, socket, isTutor) => {
  const [qaEnabled, setQaEnabled] = useState(room?.qaEnabled || false);
  const [showQaPopup, setShowQaPopup] = useState(false);
  const [qaLoading, setQaLoading] = useState(false);
  const [qaPanelOpen, setQaPanelOpen] = useState(false);
  const [studentQuestions, setStudentQuestions] = useState([]);

  // Fetch Q&A status from backend
  const fetchQaStatus = useCallback(async () => {
    try {
      const res = await api.get(`/rooms/${room._id}/qa-status`);
      if (res.data && typeof res.data.qaEnabled === 'boolean') {
        setQaEnabled(res.data.qaEnabled);
        
        // If user is student and Q&A is enabled, show popup
        if (res.data.qaEnabled && !isTutor) {
          setShowQaPopup(true);
          setTimeout(() => setShowQaPopup(false), 5000);
          toast.success("Q&A is now enabled! You can ask questions.");
        }
      }
    } catch (err) {
      console.error("Failed to fetch Q&A status:", err);
    }
  }, [room._id, isTutor]);

  // Fetch questions from backend
  const fetchQuestions = useCallback(async () => {
    try {
      const res = await api.get(`/rooms/${room._id}/questions`);
      setStudentQuestions(res.data.questions);
    } catch (err) {
      console.error("Failed to fetch questions:", err);
    }
  }, [room._id]);

  // Submit a new question - centralized function
  const submitQuestion = useCallback(async (questionText) => {
    if (!questionText.trim()) return false;
    
    try {
      const res = await api.post(
        `/rooms/${room._id}/questions`,
        { text: questionText },
      );
      
      // Update local state immediately
      const newQuestion = res.data.question;
      setStudentQuestions(prev => [...prev, newQuestion]);
      
      // Emit socket event
      socket.emit("new-question", {
        roomId: room._id,
        question: newQuestion
      });
      
      toast.success("Question submitted!");
      return true;
    } catch (err) {
      console.error("Failed to submit question:", err);
      toast.error("Failed to submit question");
      return false;
    }
  }, [room._id, socket]);

  // Mark question as answered - centralized function
  const markQuestionAnswered = useCallback(async (questionId) => {
    try {
      await api.put(`/rooms/${room._id}/questions/${questionId}`, 
        { answered: true }
      );
      
      // Update local state immediately
      setStudentQuestions(prev => 
        prev.map(q => q._id === questionId ? { ...q, answered: true } : q)
      );
      
      // Emit socket event
      socket.emit("question-answered", {
        roomId: room._id,
        questionId
      });
      
      toast.success("Question marked as answered!");
    } catch (err) {
      console.error("Failed to mark question as answered:", err);
      toast.error("Failed to update question");
    }
  }, [room._id, socket]);

  // Toggle Q&A enabled status
  const toggleQaEnabled = useCallback(async () => {
    setQaLoading(true);
    try {
      const newStatus = !qaEnabled;
      // Update localStorage immediately for better UX
      localStorage.setItem(`qaStatus-${room._id}`, newStatus.toString());
      setQaEnabled(newStatus);
      
      await api.put(`/rooms/${room._id}/qa-status`, 
        { qaEnabled: newStatus }
      );
      
      socket.emit("qa-status-change", { 
        roomId: room._id, 
        enabled: newStatus 
      });
      
      toast.success(`Q&A ${newStatus ? 'enabled' : 'disabled'}`);
    } catch (err) {
      // Revert on error
      const revertStatus = !newStatus;
      localStorage.setItem(`qaStatus-${room._id}`, revertStatus.toString());
      setQaEnabled(revertStatus);
      
      console.error("Failed to update Q&A status:", err);
      toast.error("Failed to update Q&A status");
    } finally {
      setQaLoading(false);
    }
  }, [qaEnabled, room._id, socket]);

  // Socket event handlers for Q&A
  useEffect(() => {
    const savedQaStatus = localStorage.getItem(`qaStatus-${room._id}`);
    if (savedQaStatus !== null) {
      setQaEnabled(savedQaStatus === 'true');
    }

    const handleQaStatusChange = ({ enabled }) => {
      setQaEnabled(enabled);
      if (enabled && !isTutor) {
        toast.success("Q&A is now enabled! You can ask questions.");
      } else if (!enabled && !isTutor) {
        toast.info("Q&A has been disabled");
      }
    };

    const handleNewQuestion = (question) => {
      setStudentQuestions(prev => [...prev, question]);
    };

    const handleQuestionAnswered = ({ questionId }) => {
      setStudentQuestions(prev => {
        const updated = prev.map(q =>
          String(q._id) === String(questionId)
            ? { ...q, answered: true }
            : q
        );
        return updated;
      });
    };

    socket.on("qa-status-changed", handleQaStatusChange);
    socket.on("new-question", handleNewQuestion);
    socket.on("question-answered", handleQuestionAnswered);

    // Load initial Q&A status and questions
    fetchQaStatus();
    fetchQuestions();

    return () => {
      socket.off("qa-status-changed", handleQaStatusChange);
      socket.off("new-question", handleNewQuestion);
      socket.off("question-answered", handleQuestionAnswered);
    };
  }, [room._id, socket, isTutor, fetchQaStatus, fetchQuestions]);

  return {
    qaEnabled,
    showQaPopup,
    setShowQaPopup,
    qaLoading,
    qaPanelOpen,
    setQaPanelOpen,
    studentQuestions,
    toggleQaEnabled,
    submitQuestion,
    markQuestionAnswered
  };
};