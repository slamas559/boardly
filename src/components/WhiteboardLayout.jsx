// WhiteboardLayout.jsx
import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "../context/SocketContext";
import { useNavigate } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PDFViewer from "./PDFViewer";
import { getToken } from "../utils/auth";
import axios from "axios";
import { QaPanel, QaPopup, useQaManager } from "./layout/QaManager";

// Import new components
import Header from "./layout/Header";
import { MobileFloatingToolbar, DesktopToolbar, MobileToolbarToggle } from "./whiteboard/ToolBar";
import { WhiteboardCanvas, TextInputComponent } from "./whiteboard/Canvas";
import { DesktopSidebar, MobileSidebarOverlay } from "./layout/SideBar";
import InactiveRoom from "./layout/InactiveRoom";

const WhiteboardLayout = ({ room, isTutor, token }) => {
  const canvasRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const ctxRef = useRef(null);
  const { socket } = useSocket();
  const navigate = useNavigate();
  const cursorTimeoutRef = useRef(null);

  // Virtual canvas dimensions - fixed reference size for all devices
  const VIRTUAL_CANVAS_WIDTH = 1920;
  const VIRTUAL_CANVAS_HEIGHT = 1080;

  // State management
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
  const [tutorCursor, setTutorCursor] = useState(null);

  const [user, setUser] = useState({
    id: localStorage.getItem('user_id') || 'unknown',
    name: localStorage.getItem('user_name') || 'User',
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

  // Check if room is active
  const isRoomActive = room.status === 'active';

  // Coordinate normalization functions
  const normalizeCoordinates = useCallback((x, y) => {
    if (!canvasSize.width || !canvasSize.height) return { x: 0, y: 0 };
    const normalizedX = Math.max(0, Math.min(1, x / canvasSize.width));
    const normalizedY = Math.max(0, Math.min(1, y / canvasSize.height));
    return { x: normalizedX, y: normalizedY };
  }, [canvasSize]);

  const denormalizeCoordinates = useCallback((normalizedX, normalizedY) => {
    if (!canvasSize.width || !canvasSize.height) return { x: 0, y: 0 };
    const deviceX = Math.max(0, Math.min(canvasSize.width, normalizedX * canvasSize.width));
    const deviceY = Math.max(0, Math.min(canvasSize.height, normalizedY * canvasSize.height));
    return { x: deviceX, y: deviceY };
  }, [canvasSize]);

  const normalizeLineWidth = useCallback((width) => {
    const referenceLineWidth = 2;
    return width / referenceLineWidth;
  }, []);

  const denormalizeLineWidth = useCallback((normalizedWidth) => {
    const referenceLineWidth = 2;
    const scaleFactor = Math.min(canvasSize.width, canvasSize.height) / Math.min(VIRTUAL_CANVAS_WIDTH, VIRTUAL_CANVAS_HEIGHT);
    return (normalizedWidth * referenceLineWidth) * scaleFactor;
  }, [canvasSize]);

  const normalizeFontSize = useCallback((size) => {
    const referenceFontSize = 16;
    const canvasScale = Math.min(canvasSize.width, canvasSize.height) / Math.min(VIRTUAL_CANVAS_WIDTH, VIRTUAL_CANVAS_HEIGHT);
    const adjustedSize = size / canvasScale;
    return adjustedSize / referenceFontSize;
  }, [canvasSize]);

  const denormalizeFontSize = useCallback((normalizedSize) => {
    const referenceFontSize = 16;
    const canvasScale = Math.min(canvasSize.width, canvasSize.height) / Math.min(VIRTUAL_CANVAS_WIDTH, VIRTUAL_CANVAS_HEIGHT);
    const scaledSize = normalizedSize * referenceFontSize * canvasScale;
    return Math.max(8, Math.min(72, scaledSize));
  }, [canvasSize]);

  // Canvas size management
  const updateCanvasSize = useCallback(() => {
    if (canvasContainerRef.current && canvasRef.current) {
      const container = canvasContainerRef.current;
      const width = container.clientWidth - 40;
      const height = container.clientHeight - 40;
      
      setCanvasSize({ width, height });
      canvasRef.current.width = width;
      canvasRef.current.height = height;
      
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

  // Board state management
  const saveBoardState = async () => {
    if (!canvasRef.current) return;
    try {
      await fetch(
        // `http://localhost:5000/board/${room._id}/whiteboard`,
        `https://boardly-api.onrender.com/board/${room._id}/whiteboard`,
         {
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

  const loadBoardState = async () => {
    try {
      const res = await fetch(
        // `http://localhost:5000/board/${room._id}/whiteboard`,
        `https://boardly-api.onrender.com/board/${room._id}/whiteboard`,
         {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("tutor_token")}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      
      if (data?.imageData) {
        const img = new Image();
        img.onload = () => {
          if (ctxRef.current && canvasRef.current) {
            ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctxRef.current.drawImage(img, 0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        };
        img.src = data.imageData;
      } else {
        if (ctxRef.current && canvasRef.current) {
          ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    } catch (err) {
      console.error("Failed to load board:", err);
    }
  };

  // Drawing functions
  const drawLine = useCallback((x0, y0, x1, y1, color, lineWidth, emit = true) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

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
      socket.emit("whiteboard-draw", {
        room: room._id,
        x0, y0, x1, y1, color, lineWidth,
      });
    }
  }, [socket, room._id, isRoomActive, denormalizeCoordinates, denormalizeLineWidth]);

  // Socket event setup
  useEffect(() => {
    if (!isRoomActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;

    socket.emit("join-room", room._id);

    const handleDraw = ({ x0, y0, x1, y1, color, lineWidth }) => {
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

    const handleTutorCursor = (cursorData) => {
      const deviceCoords = denormalizeCoordinates(cursorData.x, cursorData.y);
      setTutorCursor({
        ...cursorData,
        x: deviceCoords.x,
        y: deviceCoords.y
      });
      
      if (cursorTimeoutRef.current) {
        clearTimeout(cursorTimeoutRef.current);
      }
      
      cursorTimeoutRef.current = setTimeout(() => {
        setTutorCursor(null);
      }, 1000);
    };

    socket.on("whiteboard-text", handleText);
    socket.on("whiteboard-draw", handleDraw);
    socket.on("whiteboard-clear", handleClearBoard);
    socket.on("change-view", handleChangeView);
    socket.on("tutor-cursor-move", handleTutorCursor);

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

  // Mouse and drawing event handlers
  const handleCanvasMouseMove = useCallback((e) => {
    if (!isTutor || !isRoomActive || view !== "whiteboard") return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (x >= 0 && x <= canvasSize.width && y >= 0 && y <= canvasSize.height) {
      const normalizedCoords = normalizeCoordinates(x, y);
      
      const cursorData = {
        x: normalizedCoords.x,
        y: normalizedCoords.y,
        tool,
        room: room._id,
        timestamp: Date.now()
      };
      
      socket.emit("tutor-cursor-move", cursorData);
    }
  }, [socket, room._id, isTutor, isRoomActive, view, tool, canvasSize, normalizeCoordinates]);

  const startDraw = ({ nativeEvent }) => {
    if (view !== "whiteboard" || !isTutor || !isRoomActive) return;
    const { offsetX, offsetY } = nativeEvent;
    
    setDrawing(true);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(offsetX, offsetY);
    ctxRef.current.strokeStyle = tool === "pen" ? color : "#ffffff";
    ctxRef.current.lineWidth = tool === "pen" ? lineWidth : 10;
    
    ctxRef.current.lastX = offsetX;
    ctxRef.current.lastY = offsetY;
  };

  const draw = ({ nativeEvent }) => {
    if (!drawing || view !== "whiteboard" || !isTutor || !isRoomActive) return;
    const { offsetX, offsetY } = nativeEvent;
    
    const ctx = ctxRef.current;
    
    ctx.beginPath();
    ctx.moveTo(ctxRef.current.lastX, ctxRef.current.lastY);
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
    
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

  // Text handling
  const handleCanvasClick = (e) => {
    if (tool === "text" && isTutor && isRoomActive) {
      const rect = canvasRef.current.getBoundingClientRect();
      const deviceX = e.clientX - rect.left;
      const deviceY = e.clientY - rect.top;
      
      const normalizedCoords = normalizeCoordinates(deviceX, deviceY);
      
      setTextPosition({ 
        x: normalizedCoords.x,
        y: normalizedCoords.y
      });
      
      setTextInputPosition({ x: deviceX, y: deviceY });
      setShowTextInput(true);
      setText("");
    }
  };

  const addTextToCanvas = () => {
    if (!text || !textPosition || !ctxRef.current) return;

    const ctx = ctxRef.current;
    
    const deviceCoords = denormalizeCoordinates(textPosition.x, textPosition.y);
    const normalizedFontSize = normalizeFontSize(fontSize);
    const deviceFontSize = denormalizeFontSize(normalizedFontSize);
    
    ctx.font = `${deviceFontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.fillText(text, deviceCoords.x, deviceCoords.y);
    
    if (isRoomActive) {
      socket.emit("whiteboard-text", {
        room: room._id,
        text,
        x: textPosition.x,
        y: textPosition.y,
        color,
        fontSize: normalizedFontSize,
        fontFamily
      });
    }
    
    if (isTutor) saveBoardState();
    
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

  // View and room management
  const handleViewChange = (newView) => {
    if (isTutor && isRoomActive) {
      setView(newView);

      axios.put(
        // `http://localhost:5000/rooms/${room._id}/view`,
        `https://boardly-api.onrender.com/rooms/${room._id}/view`,
        { view: newView }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });

      socket.emit("change-view", { roomId: room._id, view: newView });
    }
    setSidebarOpen(false);
  };

  const handleRoomStatus = async (mode) => {
    try {
      const token = getToken();
      const res = await axios.put(
        // `http://localhost:5000/rooms/end-room/${room._id}`,
        `https://boardly-api.onrender.com/rooms/end-room/${room._id}`,
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

  const handleEndRoom = () => {
    if (window.confirm("Are you sure you want to end the room? This will disconnect all students.")) {
      handleRoomStatus("inactive");
    }
  };

  // Event handlers for components
  const handleMouseMove = (e) => {
    if (drawing) {
      draw(e);
    }
    handleCanvasMouseMove(e);
  };

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

  // If room is not active, show inactive state
  if (!isRoomActive) {
    return (
      <InactiveRoom 
        room={room}
        isTutor={isTutor}
        onNavigateToLobby={() => navigate('/lobby')}
        onActivateRoom={() => handleRoomStatus("active")}
      />
    );
  }

  // Main render
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
      <Header 
        room={room}
        socket={socket}
        isTutor={isTutor}
        qaEnabled={qaEnabled}
        qaLoading={qaLoading}
        qaPanelOpen={qaPanelOpen}
        sidebarOpen={sidebarOpen}
        onNavigateBack={() => navigate('/lobby')}
        onToggleQa={toggleQaEnabled}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onToggleQaPanel={() => setQaPanelOpen(!qaPanelOpen)}
      />

      <ToastContainer/>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 flex flex-col bg-gray-50 relative">
          {/* Mobile Toolbar Toggle */}
          {isTutor && view === "whiteboard" && (
            <MobileToolbarToggle 
              toolbarOpen={toolbarOpen}
              onToggleToolbar={() => setToolbarOpen(!toolbarOpen)}
            />
          )}

          {/* Desktop Toolbar */}
          {view === "whiteboard" && ( isTutor ? (
            <DesktopToolbar 
              tool={tool}
              setTool={setTool}
              color={color}
              setColor={setColor}
              lineWidth={lineWidth}
              setLineWidth={setLineWidth}
              onClearBoard={clearBoard}
              isTextMode={isTextMode}
              setIsTextMode={setIsTextMode}
            />
          ):(<div className="h-15 bg-white shadow-sm border-b border-gray-200 py-3"></div>))}

          {/* Mobile Floating Toolbar */}
          {isTutor && view === "whiteboard" && toolbarOpen && (
            <MobileFloatingToolbar 
              tool={tool}
              setTool={setTool}
              color={color}
              setColor={setColor}
              lineWidth={lineWidth}
              setLineWidth={setLineWidth}
              onClearBoard={clearBoard}
              isTextMode={isTextMode}
              setIsTextMode={setIsTextMode}
            />
          )}

          {/* Canvas Container */}
          <div 
            ref={canvasContainerRef}
            className="flex-1 overflow-auto"
          >
            {/* Whiteboard View */}
            <div className={`w-full h-full ${view === "whiteboard" ? 'block' : 'hidden'}`}>
              <WhiteboardCanvas 
                canvasRef={canvasRef}
                canvasSize={canvasSize}
                tool={tool}
                onCanvasClick={handleCanvasClick}
                onMouseDown={startDraw}
                onMouseMove={handleMouseMove}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
                tutorCursor={tutorCursor}
                isTutor={isTutor}
              />
              <TextInputComponent 
                showTextInput={showTextInput}
                textInputPosition={textInputPosition}
                text={text}
                setText={setText}
                fontSize={fontSize}
                setFontSize={setFontSize}
                fontFamily={fontFamily}
                setFontFamily={setFontFamily}
                onTextSubmit={handleTextSubmit}
                onTextCancel={handleTextCancel}
                canvasSize={canvasSize}
                canvasContainerRef={canvasContainerRef}
                canvasRef={canvasRef}
              />
            </div>

            {/* PDF View */}
            <div className={`w-full h-full ${view === "pdf" ? 'block' : 'hidden'}`}>
              <PDFViewer isTutor={isTutor} room={room} token={token} />
            </div>
          </div>
        </div>

        {/* Desktop Sidebar */}
        <DesktopSidebar 
          view={view}
          onViewChange={handleViewChange}
          qaEnabled={qaEnabled}
          onToggleQa={toggleQaEnabled}
          qaLoading={qaLoading}
          studentQuestions={studentQuestions}
          onOpenQaPanel={() => setQaPanelOpen(true)}
          onEndRoom={handleEndRoom}
          isTutor={isTutor}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      <MobileSidebarOverlay 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        view={view}
        onViewChange={handleViewChange}
        qaEnabled={qaEnabled}
        onToggleQa={toggleQaEnabled}
        qaLoading={qaLoading}
        studentQuestions={studentQuestions}
        onOpenQaPanel={() => setQaPanelOpen(true)}
        onEndRoom={handleEndRoom}
        isTutor={isTutor}
      />
    </div>
  );
};

export default WhiteboardLayout;