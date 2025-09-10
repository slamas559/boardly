import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "../context/SocketContext";
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
  FaToggleOff,
  FaChevronUp,
  FaChevronDown,
  FaPaintBrush,
} from "react-icons/fa";
// import { toast } from "react-hot-toast";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PDFViewer from "./PDFViewer";
import { getToken } from "../utils/auth";
import axios from "axios";
import { QaPanel, QaControls, QaPopup, useQaManager } from "./QaManager";
import VoiceBroadcast from "./voiceBroadcast";


const WhiteboardLayout = ({ room, isTutor, token }) => {
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const ctxRef = useRef(null);
  const { socket } = useSocket();
  const navigate = useNavigate();

  // Virtual canvas dimensions - fixed reference size for all devices
  const VIRTUAL_CANVAS_WIDTH = 1920;
  const VIRTUAL_CANVAS_HEIGHT = 1080;

  const [drawing, setDrawing] = useState(false);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(2);
  const [view, setView] = useState("whiteboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [text, setText] = useState("");
  const [isTextMode, setIsTextMode] = useState(false);
  const [textPosition, setTextPosition] = useState(null);
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [textInputPosition, setTextInputPosition] = useState(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  // Add state for tutor cursor tracking
  const [tutorCursor, setTutorCursor] = useState(null);
  const cursorTimeoutRef = useRef(null);

  const [user, setUser] = useState({
    id: localStorage.getItem('user_id') || 'unknown', // You'll need to set this from your auth system
    name: localStorage.getItem('user_name') || 'User', // You'll need to set this from your auth system
    isTutor: isTutor
  });

  // Use the extracted Q&A manager hook
  const {
    qaEnabled,
    showQaPopup,
    setShowQaPopup,
    qaLoading,
    qaPanelOpen,
    setQaPanelOpen,
    studentQuestions,
    toggleQaEnabled
  } = useQaManager(room, socket, isTutor);

  // Check if room is active (assuming room.status is a string)
  const isRoomActive = room.status === 'active';

  // Enhanced coordinate normalization for better text handling
  const normalizeCoordinates = useCallback((x, y) => {
    if (!canvasSize.width || !canvasSize.height) return { x: 0, y: 0 };
    
    // Convert device coordinates to normalized coordinates (0-1 range)
    const normalizedX = Math.max(0, Math.min(1, x / canvasSize.width));
    const normalizedY = Math.max(0, Math.min(1, y / canvasSize.height));
    
    return { x: normalizedX, y: normalizedY };
  }, [canvasSize]);

  const denormalizeCoordinates = useCallback((normalizedX, normalizedY) => {
    if (!canvasSize.width || !canvasSize.height) return { x: 0, y: 0 };
    
    // Convert normalized coordinates back to device coordinates
    const deviceX = Math.max(0, Math.min(canvasSize.width, normalizedX * canvasSize.width));
    const deviceY = Math.max(0, Math.min(canvasSize.height, normalizedY * canvasSize.height));
    
    return { x: deviceX, y: deviceY };
  }, [canvasSize]);

  const normalizeLineWidth = useCallback((width) => {
    // Use a fixed base line width for consistent scaling
    const referenceLineWidth = 2; // Base line width for normalization
    return width / referenceLineWidth;
  }, []);

  const denormalizeLineWidth = useCallback((normalizedWidth) => {
    // Convert normalized line width back to device-specific width
    // Scale based on canvas size to maintain proportional appearance
    const referenceLineWidth = 2;
    const scaleFactor = Math.min(canvasSize.width, canvasSize.height) / Math.min(VIRTUAL_CANVAS_WIDTH, VIRTUAL_CANVAS_HEIGHT);
    return (normalizedWidth * referenceLineWidth) * scaleFactor;
  }, [canvasSize]);

  // Enhanced font size normalization for better cross-device consistency
  const normalizeFontSize = useCallback((size) => {
    // Base font size relative to canvas size for better scaling
    const referenceFontSize = 16;
    const canvasScale = Math.min(canvasSize.width, canvasSize.height) / Math.min(VIRTUAL_CANVAS_WIDTH, VIRTUAL_CANVAS_HEIGHT);
    const adjustedSize = size / canvasScale; // Adjust for current canvas scale
    return adjustedSize / referenceFontSize;
  }, [canvasSize]);

  const denormalizeFontSize = useCallback((normalizedSize) => {
    const referenceFontSize = 16;
    const canvasScale = Math.min(canvasSize.width, canvasSize.height) / Math.min(VIRTUAL_CANVAS_WIDTH, VIRTUAL_CANVAS_HEIGHT);
    const scaledSize = normalizedSize * referenceFontSize * canvasScale;
    
    // Ensure minimum readable size and maximum reasonable size
    return Math.max(8, Math.min(72, scaledSize));
  }, [canvasSize]);

  // Update canvas size on resize (reverted to reload image state)
  const updateCanvasSize = useCallback(() => {
    if (canvasContainerRef.current && canvasRef.current) {
      const container = canvasContainerRef.current;
      const width = container.clientWidth - 40; // Padding
      const height = container.clientHeight - 40; // Padding
      
      setCanvasSize({ width, height });
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      
      // Redraw existing content if any
      if (ctxRef.current) {
        loadBoardState();
      }
    }
  }, []);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  /** Save board vector data to backend */
  const saveBoardState = async () => {
    if (!canvasRef.current) return;
    try {
      await fetch(`http://localhost:5000/board/${room._id}/whiteboard`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("tutor_token")}`,
        },
        body: JSON.stringify({ 
          imageData: canvasRef.current.toDataURL("image/png")
        }),
      });
    } catch (err) {
      console.error("Failed to save board:", err);
    }
  };

  /** Load saved board from backend */
  const loadBoardState = async () => {
    try {
      const res = await fetch(`http://localhost:5000/board/${room._id}/whiteboard`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("tutor_token")}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      
      if (data?.imageData) {
        // Fallback for old raster data - convert to vector
        const img = new Image();
        img.onload = () => {
          if (ctxRef.current && canvasRef.current) {
            ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctxRef.current.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        };
        img.src = data.imageData;
      } else {
        // If no saved data, clear the canvas
        if (ctxRef.current && canvasRef.current) {
          ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    } catch (err) {
      console.error("Failed to load board:", err);
    }
  };

  const drawLine = useCallback((x0, y0, x1, y1, color, lineWidth, emit = true) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    // Convert normalized coordinates to device coordinates for drawing
    const deviceCoords0 = denormalizeCoordinates(x0, y0);
    const deviceCoords1 = denormalizeCoordinates(x1, y1);
    const deviceLineWidth = denormalizeLineWidth(lineWidth);

    ctx.strokeStyle = color;
    ctx.lineWidth = deviceLineWidth;
    ctx.beginPath();
    ctx.moveTo(deviceCoords0.x, deviceCoords0.y);
    ctx.lineTo(deviceCoords1.x, deviceCoords1.y);
    ctx.stroke();
    ctx.closePath();

    if (emit && isRoomActive) {
      // Emit normalized coordinates for cross-device consistency
      socket.emit("whiteboard-draw", {
        room: room._id,
        x0, // normalized coordinates
        y0,
        x1,
        y1,
        color,
        lineWidth, // normalized line width
      });
    }
  }, [socket, room._id, isRoomActive, denormalizeCoordinates, denormalizeLineWidth]);
  
  useEffect(() => {
    if (!isRoomActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;

    socket.emit("join-room", room._id);

    // Socket event handlers
    const handleDraw = ({ x0, y0, x1, y1, color, lineWidth }) => {
      // x0, y0, x1, y1, lineWidth are already normalized from the sender
      drawLine(x0, y0, x1, y1, color, lineWidth, false);
    };

    const handleClearBoard = () => {
      if (ctxRef.current && canvasRef.current) {
        ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    };

    const handleChangeView = (newView) => {
      setView(newView);
    };

    // Updated handler for text with normalized coordinates
    const handleText = ({ text, x, y, color, fontSize, fontFamily }) => {
      if (ctxRef.current) {
        const ctx = ctxRef.current;
        const deviceCoords = denormalizeCoordinates(x, y);
        const deviceFontSize = denormalizeFontSize(fontSize);
        ctx.font = `${deviceFontSize}px ${fontFamily}`;
        ctx.fillStyle = color;
        ctx.fillText(text, deviceCoords.x, deviceCoords.y);
      }
    };

    // Add handler for tutor cursor updates
    const handleTutorCursor = (cursorData) => {
      // Convert normalized cursor coordinates to device coordinates for display
      const deviceCoords = denormalizeCoordinates(cursorData.x, cursorData.y);
      setTutorCursor({
        ...cursorData,
        x: deviceCoords.x,
        y: deviceCoords.y
      });
      
      // Clear previous timeout
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
      
      // Hide cursor after 1 second of inactivity
      cursorTimeoutRef.current = setTimeout(() => {
        setTutorCursor(null);
      }, 1000);
    };

    socket.on("whiteboard-text", handleText);
    socket.on("whiteboard-draw", handleDraw);
    socket.on("whiteboard-clear", handleClearBoard);
    socket.on("change-view", handleChangeView);
    socket.on("tutor-cursor-move", handleTutorCursor);

    // Load initial board state
    loadBoardState();

    return () => {
      socket.off("whiteboard-text", handleText);
      socket.off("whiteboard-draw", handleDraw);
      socket.off("whiteboard-clear", handleClearBoard);
      socket.off("change-view", handleChangeView);
      socket.off("tutor-cursor-move", handleTutorCursor);
      
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
    };
  }, [room._id, socket, drawLine, isRoomActive, denormalizeCoordinates, denormalizeFontSize]);

  // Track and emit tutor cursor movements
  const handleCanvasMouseMove = useCallback((e) => {
    if (!isTutor || !isRoomActive || view !== "whiteboard") return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Only emit if coordinates are within canvas bounds
    if (x >= 0 && x <= canvasSize.width && y >= 0 && y <= canvasSize.height) {
      // Normalize coordinates for cross-device consistency
      const normalizedCoords = normalizeCoordinates(x, y);
      
      const cursorData = {
        x: normalizedCoords.x, // normalized coordinates
        y: normalizedCoords.y,
        tool,
        room: room._id,
        timestamp: Date.now()
      };
      
      // Emit cursor position to other users
      socket.emit("tutor-cursor-move", cursorData);
    }
  }, [socket, room._id, isTutor, isRoomActive, view, tool, canvasSize, normalizeCoordinates]);

  // FIXED: Drawing functions using raw coordinates for immediate drawing
  const startDraw = ({ nativeEvent }) => {
    if (view !== "whiteboard" || !isTutor || !isRoomActive) return;
    const { offsetX, offsetY } = nativeEvent;
    
    setDrawing(true);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(offsetX, offsetY);
    ctxRef.current.strokeStyle = tool === "pen" ? color : "#ffffff";
    ctxRef.current.lineWidth = tool === "pen" ? lineWidth : 10;
    
    // Store raw coordinates for immediate drawing
    ctxRef.current.lastX = offsetX;
    ctxRef.current.lastY = offsetY;
  };

  const draw = ({ nativeEvent }) => {
    if (!drawing || view !== "whiteboard" || !isTutor || !isRoomActive) return;
    const { offsetX, offsetY } = nativeEvent;
    
    const ctx = ctxRef.current;
    
    // Draw immediately on canvas using raw coordinates
    ctx.beginPath();
    ctx.moveTo(ctxRef.current.lastX, ctxRef.current.lastY);
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
    
    // Emit normalized coordinates for network sync
    if (isRoomActive) {
      const normalizedStart = normalizeCoordinates(ctxRef.current.lastX, ctxRef.current.lastY);
      const normalizedEnd = normalizeCoordinates(offsetX, offsetY);
      const normalizedWidth = normalizeLineWidth(tool === "pen" ? lineWidth : 10);
      
      socket.emit("whiteboard-draw", {
        room: room._id,
        x0: normalizedStart.x,
        y0: normalizedStart.y,
        x1: normalizedEnd.x,
        y1: normalizedEnd.y,
        color: tool === "pen" ? color : "#ffffff",
        lineWidth: normalizedWidth,
      });
    }
    
    ctxRef.current.lastX = offsetX;
    ctxRef.current.lastY = offsetY;
  };

  const endDraw = () => {
    if (view !== "whiteboard" || !isRoomActive) return;
    setDrawing(false);
    ctxRef.current.closePath();
    if (isTutor) saveBoardState();
  };

  const clearBoard = () => {
    if (!canvasRef.current || !ctxRef.current || !isRoomActive) return;
    ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    socket.emit("whiteboard-clear", room._id);
    if (isTutor) saveBoardState();
  };

  // Updated handleCanvasClick to use normalized coordinates
  const handleCanvasClick = (e) => {
    if (tool === "text" && isTutor && isRoomActive) {
      const rect = canvasRef.current.getBoundingClientRect();
      const deviceX = e.clientX - rect.left;
      const deviceY = e.clientY - rect.top;
      
      // Convert to normalized coordinates for consistent positioning
      const normalizedCoords = normalizeCoordinates(deviceX, deviceY);
      
      // Store normalized coordinates for consistent positioning
      setTextPosition({ 
        x: normalizedCoords.x, // Normalized coordinates for consistent positioning
        y: normalizedCoords.y
      });
      
      setTextInputPosition({ x: deviceX, y: deviceY }); // Keep device coordinates for UI positioning
      setShowTextInput(true);
      setText(""); // Clear previous text
    }
  };

  // Updated addTextToCanvas to use normalized coordinates for consistent positioning
  const addTextToCanvas = () => {
    if (!text || !textPosition || !ctxRef.current) return;

    const ctx = ctxRef.current;
    
    // Convert normalized coordinates back to device coordinates for consistent positioning
    const deviceCoords = denormalizeCoordinates(textPosition.x, textPosition.y);
    const normalizedFontSize = normalizeFontSize(fontSize);
    const deviceFontSize = denormalizeFontSize(normalizedFontSize);
    
    ctx.font = `${deviceFontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.fillText(text, deviceCoords.x, deviceCoords.y);
    
    // Emit text to other users with normalized data
    if (isRoomActive) {
      socket.emit("whiteboard-text", {
        room: room._id,
        text,
        x: textPosition.x, // normalized coordinates
        y: textPosition.y,
        color,
        fontSize: normalizedFontSize, // normalized font size
        fontFamily
      });
    }
    
    // Save state
    if (isTutor) saveBoardState();
    
    // Reset text state
    setText("");
    setTextPosition(null);
    setTextInputPosition(null);
    setShowTextInput(false);
    setIsTextMode(false);
  };

  const cancelText = () => {
    setText("");
    setTextPosition(null);
    setTextInputPosition(null);
    setShowTextInput(false);
    setIsTextMode(false);
    setTool("pen");
  };

  const handleViewChange = (newView) => {
    if (isTutor && isRoomActive) {
      setView(newView);

      axios.put(`http://localhost:5000/rooms/${room._id}/view`, { view: newView }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      socket.emit("change-view", { roomId: room._id, view: newView });
    }
    setSidebarOpen(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${room.code}`);
    toast.success("Link copied");
  };

  const handleRoomStatus = async (mode) => {
    try {
      const token = getToken();
      const res = await axios.put(
        `http://localhost:5000/rooms/end-room/${room._id}`,
        {mode},
        {
          headers: { 
            Authorization: `Bearer ${token}` 
          }
        }
      );
      if (mode === "inactive") {
        navigate('/lobby');
      } else {
        navigate('/room/' + room.code);
        window.location.reload()
      }
    } catch (err) {
      console.log("Error ending room:", err);
      alert(err.response?.data?.message || "Failed to end room. Please try again.");
    }
  };

  // Enhanced TextInputComponent with better positioning
  const TextInputComponent = () => {
    if (!showTextInput || !textInputPosition) return null;

    const handleTextSubmit = () => {
      if (text.trim()) {
        addTextToCanvas();
      } else {
        setShowTextInput(false);
        setTextPosition(null);
        setTextInputPosition(null);
      }
    };

    const handleTextCancel = () => {
      setShowTextInput(false);
      setText("");
      setTextPosition(null);
      setTextInputPosition(null);
    };

    // Improved position calculation with better viewport awareness
    const getInputPosition = () => {
      if (!canvasContainerRef.current || !canvasRef.current) return { left: 0, top: 0 };
      
      const containerRect = canvasContainerRef.current.getBoundingClientRect();
      const canvasRect = canvasRef.current.getBoundingClientRect();
      
      // Input dimensions
      const inputWidth = 250;
      const inputHeight = 120;
      
      // Calculate position relative to canvas
      let left = textInputPosition.x + 10;
      let top = textInputPosition.y + 10;
      
      // Ensure input stays within canvas bounds
      if (left + inputWidth > canvasSize.width) {
        left = canvasSize.width - inputWidth - 10;
      }
      if (top + inputHeight > canvasSize.height) {
        top = canvasSize.height - inputHeight - 10;
      }
      
      // Ensure minimum distance from edges
      left = Math.max(10, left);
      top = Math.max(10, top);
      
      return { left, top };
    };

    const position = getInputPosition();

    return (
      <div
        className="absolute bg-white border border-gray-300 rounded-lg shadow-xl p-3 z-50 text-input-container"
        style={{
          left: position.left,
          top: position.top,
          minWidth: '250px',
          maxWidth: '300px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}
      >
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your text..."
            className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm focus:outline-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleTextSubmit();
              }
              if (e.key === 'Escape') {
                handleTextCancel();
              }
            }}
          />
          
          <div className="flex items-center gap-2">
            <select
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
            >
              <option value="10">10px</option>
              <option value="12">12px</option>
              <option value="14">14px</option>
              <option value="16">16px</option>
              <option value="18">18px</option>
              <option value="20">20px</option>
              <option value="24">24px</option>
              <option value="28">28px</option>
              <option value="32">32px</option>
              <option value="36">36px</option>
              <option value="40">40px</option>
            </select>
            
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm flex-1"
            >
              <option value="Arial" style={{ fontFamily: "Arial" }}>Arial</option>
              <option value="Times New Roman" style={{ fontFamily: "Times New Roman" }}>Times New Roman</option>
              <option value="Courier New" style={{ fontFamily: "Courier New" }}>Courier</option>
              <option value="Georgia" style={{ fontFamily: "Georgia" }}>Georgia</option>
              <option value="Verdana" style={{ fontFamily: "Verdana" }}>Verdana</option>
              <option value="Impact" style={{ fontFamily: "Impact" }}>Impact</option>
              <option value="Comic Sans MS" style={{ fontFamily: "Comic Sans MS" }}>Comic Sans MS</option>
              <option value="Trebuchet MS" style={{ fontFamily: "Trebuchet MS" }}>Trebuchet MS</option>
            </select>
          </div>
          
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleTextSubmit}
              className="flex-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm transition-colors"
            >
              Add Text
            </button>
            <button
              onClick={handleTextCancel}
              className="flex-1 px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Tutor Cursor Component
  const TutorCursor = ({ cursor }) => {
    if (!cursor) return null;
    
    return (
      <div 
        className="absolute z-40 pointer-events-none transition-transform duration-100"
        style={{
          left: cursor.x,
          top: cursor.y,
          transform: 'translate(-50%, -50%)'
        }}
      >
        <div className="flex flex-col items-center">
          <div className="bg-blue-500 text-white rounded-full w-3 h-3 whitespace-nowrap">
          </div>
        </div>
      </div>
    );
  };

  // If room is not active, show inactive state
  if (!isRoomActive) {
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
                onClick={() => navigate('/lobby')}
                className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <FaChalkboardTeacher className="w-4 h-4" />
                Back to My Rooms
              </button>
              
              <button
                onClick={() => handleRoomStatus("active")}
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
  }

  // Room is active - show normal interface
  return (
    <div className="flex flex-col w-full h-screen bg-gray-50">
      {/* Q&A Popup for Students */}
      {!isTutor && (
        <QaPopup 
          showQaPopup={showQaPopup} 
          onClose={() => setShowQaPopup(false)} 
        />
      )}
      
      {/* Q&A Panel */}
      <QaPanel 
        qaPanelOpen={qaPanelOpen}
        onClose={() => setQaPanelOpen(false)}
        room={room}
        isTutor={isTutor}
        qaEnabled={qaEnabled}
        socket={socket}
      />
      
      {/* Header */}
      <div className="flex justify-between items-center bg-white px-2 py-2 border-b border-gray-200 shadow-sm">
        <button
          onClick={() => navigate('/lobby')}
          className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <FaArrowLeft className="w-4 h-4" />
        </button>
        
        <div className="flex items-center gap-3 min-w-0">
          {room.creator?.avatar && (
            <img
              src={room.creator.avatar}
              alt="avatar"
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
            />
          )}
          <div className="truncate">
            <h1 className="font-semibold text-gray-800 text-base sm:text-lg truncate">
              {room.topic}
            </h1>
            <p className="text-xs text-gray-600 truncate">
              Hosted by: {room.creator?.name}
            </p>
          </div>
        </div>

        <VoiceBroadcast room={room} socket={socket} isTutor={isTutor} />
        <ToastContainer/>
        <div className="flex items-center gap-3">
          {/* Q&A Controls in Header */}
          {isTutor ? (
            <button
              onClick={toggleQaEnabled}
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
          ) : (
            <button
              onClick={() => setQaPanelOpen(!qaPanelOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
            >
              <FaQuestionCircle />
              <span>Ask Question</span>
            </button>
          )}
          
          <button
            onClick={handleCopy}
            className="hidden sm:flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
          >
            <FaLink className="text-sm" /> Copy Link
          </button>
          {isTutor && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="sm:hidden flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors shadow-sm"
            >
              {sidebarOpen ? <FaTimes /> : <FaBars />}
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 flex flex-col bg-gray-50 relative">
          {/* Floating Toolbar Toggle Button (Mobile Only) */}
          {isTutor && view === "whiteboard" && (
            <button
              onClick={() => setToolbarOpen(!toolbarOpen)}
              className="sm:hidden absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              {toolbarOpen ? <FaTimes /> : <FaPaintBrush />}
            </button>
          )}

          {/* Toolbar for Desktop */}
          {isTutor && view === "whiteboard" && (
            <div className="hidden sm:flex items-center gap-4 bg-white px-4 py-3 border-b border-gray-200 shadow-sm">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTool("pen")}
                  className={`p-2 rounded-lg transition-all ${
                    tool === "pen" 
                      ? "bg-blue-500 text-white shadow-md" 
                      : "bg-white text-gray-600 hover:bg-gray-100 border"
                  }`}
                  title="Pen"
                >
                  <FaBrush size={16} />
                </button>
                <button
                  onClick={() => {
                    setTool("text");
                    setIsTextMode(true);
                  }}
                  className={`p-2 rounded-lg transition-all ${
                    tool === "text" 
                      ? "bg-green-500 text-white shadow-md" 
                      : "bg-white text-gray-600 hover:bg-gray-100 border"
                  }`}
                  title="Text"
                >
                  <FaPencilAlt size={16} />
                </button>
                <button
                  onClick={() => setTool("eraser")}
                  className={`p-2 rounded-lg transition-all ${
                    tool === "eraser" 
                      ? "bg-red-500 text-white shadow-md" 
                      : "bg-white text-gray-600 hover:bg-gray-100 border"
                  }`}
                  title="Eraser"
                >
                  <FaEraser size={16} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative group">
                  <button className="p-2 rounded-lg bg-white border text-gray-600 hover:bg-gray-100 transition-colors">
                    <FaPalette size={16} />
                  </button>
                  <div className="absolute top-full left-0 mt-2 p-2 bg-white rounded-lg shadow-lg border z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-8 h-8 border-0 rounded cursor-pointer"
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border">
                  <FaSlidersH size={12} className="text-gray-500" />
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={lineWidth}
                    onChange={(e) => setLineWidth(e.target.value)}
                    className="w-16 accent-blue-500"
                    title="Line Width"
                  />
                  <span className="text-xs text-gray-600 w-4">{lineWidth}</span>
                </div>
              </div>
              
              <button
                onClick={clearBoard}
                className="ml-auto px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <FaTrash size={14} /> Clear
              </button>
            </div>
          )}

          {/* Floating Toolbar for Mobile */}
          {isTutor && view === "whiteboard" && toolbarOpen && (
            <div className="sm:hidden absolute top-16 left-4 z-10 bg-white rounded-xl shadow-lg p-3 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setTool("pen")}
                  className={`p-2 rounded-lg transition-all ${
                    tool === "pen" 
                      ? "bg-blue-500 text-white shadow-inner" 
                      : "bg-white text-gray-600 hover:bg-gray-100 border"
                  }`}
                  title="Pen"
                >
                  <FaBrush size={16} />
                </button>
                <button
                  onClick={() => {
                    setTool("text");
                    setIsTextMode(true);
                  }}
                  className={`p-2 rounded-lg transition-all ${
                    tool === "text" 
                      ? "bg-green-500 text-white shadow-inner" 
                      : "bg-white text-gray-600 hover:bg-gray-100 border"
                  }`}
                  title="Text"
                >
                  <FaPencilAlt size={16} />
                </button>
                <button
                  onClick={() => setTool("eraser")}
                  className={`p-2 rounded-lg transition-all ${
                    tool === "eraser" 
                      ? "bg-red-500 text-white shadow-inner" 
                      : "bg-white text-gray-600 hover:bg-gray-100 border"
                  }`}
                  title="Eraser"
                >
                  <FaEraser size={16} />
                </button>
              </div>

              <div className="border-t pt-2 flex flex-col gap-2">
                <div className="relative">
                  <button className="p-2 rounded-lg bg-white border text-gray-600 hover:bg-gray-100 transition-colors w-full">
                    <FaPalette size={16} />
                  </button>
                  <div className="absolute top-0 left-full ml-2 p-2 bg-white rounded-lg shadow-lg border z-10">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-8 h-8 border-0 rounded cursor-pointer"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col items-center gap-1 bg-white px-2 py-2 rounded-lg border">
                  <FaSlidersH size={12} className="text-gray-500" />
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={lineWidth}
                    onChange={(e) => setLineWidth(e.target.value)}
                    className="w-12 accent-blue-500"
                    title="Line Width"
                  />
                  <span className="text-xs text-gray-600">{lineWidth}</span>
                </div>
              </div>
              
              <div className="border-t pt-2">
                <button
                  onClick={clearBoard}
                  className="p-2 w-full bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center"
                  title="Clear Canvas"
                >
                  <FaTrash size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Canvas Container */}
          <div 
            ref={canvasContainerRef}
            className="flex-1 overflow-auto"
          >
            {/* Whiteboard View */}
            <div className={`w-full h-full ${view === "whiteboard" ? 'block' : 'hidden'}`}>
              <div className="bg-white shadow-sm border border-gray-200 h-full flex items-center justify-center relative">
                <canvas
                  ref={canvasRef}
                  className={`${
                    tool === "pen"
                      ? "cursor-crosshair"
                      : tool === "eraser"
                      ? "cursor-cell"
                      : tool === "text"
                      ? "cursor-text"
                      : "cursor-default"
                  } bg-white rounded-lg`}
                  onMouseDown={tool === "text" ? handleCanvasClick : startDraw}
                  onMouseMove={(e) => {
                    // Handle drawing if in drawing mode
                    if (drawing) {
                      draw(e);
                    }
                    // Always track cursor movement for tutor
                    handleCanvasMouseMove(e);
                  }}
                  onTouchMove={(e) => {
                    // Handle touch drawing
                    if (drawing) {
                      draw(e);
                    }
                  }}
                  onTouchStart={tool === "text" ? handleCanvasClick : startDraw}
                  onTouchEnd={endDraw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  width={canvasSize.width}
                  height={canvasSize.height}
                />
                {/* Show tutor cursor for students */}
                {!isTutor && tutorCursor && (
                  <TutorCursor cursor={tutorCursor} />
                )}
              </div>
              <TextInputComponent />
            </div>

            {/* PDF View */}
            <div className={`w-full h-full ${view === "pdf" ? 'block' : 'hidden'}`}>
              <PDFViewer isTutor={isTutor} room={room} token={token} />
            </div>
          </div>
        </div>

        {/* Sidebar Desktop */}
        <div className="p-4 bg-white border-l border-gray-200 pt-17 shadow-sm hidden sm:block">
          {isTutor ? (
            <div className="space-y-2 relative">
              <button
                title="Whiteboard"
                onClick={() => handleViewChange("whiteboard")}
                className={`w-12 h-12 rounded-lg ${view === "whiteboard" ? "bg-blue-500" : "bg-blue-300"} flex items-center justify-center cursor-pointer`}
              >
                  <FaPencilAlt className="text-white" />
              </button>
              
              <button
                title="PDF Viewer"
                onClick={() => handleViewChange("pdf")}
                className={`w-12 h-12 rounded-lg ${view === "pdf" ? "bg-red-500" : "bg-red-300"} flex items-center justify-center cursor-pointer`}
              >
                  <FaFilePdf className="text-white" />
              </button>

              <QaControls 
                qaEnabled={qaEnabled}
                onToggleQa={toggleQaEnabled}
                qaLoading={qaLoading}
                studentQuestions={studentQuestions}
                onOpenPanel={() => setQaPanelOpen(true)}
                isTutor={isTutor}
              />

              {/* Redesigned End Room Button */}
              <button
                title="End Session"
                onClick={() => {
                  if (window.confirm("Are you sure you want to end the room? This will disconnect all students.")) {
                    handleRoomStatus("inactive");
                  }
                }}
                className="mt-17 w-12 h-12 rounded-lg bg-red-600 flex items-center justify-center cursor-pointer"
              >
                  <FaStop className="text-white"/>
              </button>

              {/* Q&A Controls in Sidebar */}
              
            </div>
          ) : (
            <div className="">
              
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 sm:hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-white shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-800 text-lg">Display Options</h3>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <FaTimes />
              </button>
            </div>
            
            {isTutor ? (
              <div className="space-y-3">
                <button
                  onClick={() => handleViewChange("whiteboard")}
                  className={`w-full px-4 py-3 rounded-xl transition-all flex items-center gap-3 text-left ${
                    view === "whiteboard" 
                      ? "bg-blue-500 text-white shadow-md" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FaPencilAlt className={view === "whiteboard" ? "text-white" : "text-blue-500"} />
                  </div>
                  <span className="font-medium">Whiteboard</span>
                </button>
                
                <button
                  onClick={() => handleViewChange("pdf")}
                  className={`w-full px-4 py-3 rounded-xl transition-all flex items-center gap-3 text-left ${
                    view === "pdf" 
                      ? "bg-red-500 text-white shadow-md" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <FaFilePdf className={view === "pdf" ? "text-white" : "text-red-500"} />
                  </div>
                  <span className="font-medium">PDF Viewer</span>
                </button>

                <button
                  onClick={() => {
                    if (window.confirm("Are you sure you want to end the room? This will disconnect all students.")) {
                      handleRoomStatus("inactive");
                    }
                  }}
                  className="w-full px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors flex items-center gap-3 shadow-md"
                >
                  <div className="w-8 h-8 rounded-lg bg-red-300 flex items-center justify-center">
                    <FaStop className="text-white"/>
                  </div>
                  <span className="font-medium">End Session</span>
                </button>

                {/* Q&A Controls in Sidebar */}
                <QaControls 
                  qaEnabled={qaEnabled}
                  onToggleQa={toggleQaEnabled}
                  qaLoading={qaLoading}
                  studentQuestions={studentQuestions}
                  onOpenPanel={() => setQaPanelOpen(true)}
                  isTutor={isTutor}
                />
              </div>
            ) : (
              <div className="">
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WhiteboardLayout;