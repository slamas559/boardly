import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";
import { FaPencilAlt, FaEraser, FaTrash, FaLink, FaFilePdf, FaPen } from "react-icons/fa";
import { toast } from "react-hot-toast";
import PDFViewer from "./PDFViewer"; // 👈 import the PDF viewer

const WhiteboardLayout = ({ room, isTutor, token }) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const { socket } = useSocket();

  const [drawing, setDrawing] = useState(false);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(3);
  const [view, setView] = useState("whiteboard"); // 👈 switch view (whiteboard or pdf)

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth * 0.65;
    canvas.height = window.innerHeight * 0.7;

    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctxRef.current = ctx;

    socket.emit("join-room", room._id);

    socket.on("draw", ({ x0, y0, x1, y1, color, lineWidth }) => {
      drawLine(x0, y0, x1, y1, color, lineWidth, false);
    });

    socket.on("clear-board", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    return () => {
      socket.off("draw");
      socket.off("clear-board");
    };
  }, [room._id, socket]);

  const startDraw = ({ nativeEvent }) => {
    if (view !== "whiteboard" || !isTutor) return; // 👈 restrict drawing to tutors & whiteboard only
    const { offsetX, offsetY } = nativeEvent;
    setDrawing(true);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(offsetX, offsetY);
    ctxRef.current.strokeStyle = tool === "pen" ? color : "#ffffff";
    ctxRef.current.lineWidth = lineWidth;
    ctxRef.current.lastX = offsetX;
    ctxRef.current.lastY = offsetY;
  };

  const draw = ({ nativeEvent }) => {
    if (!drawing || view !== "whiteboard" || !isTutor) return;
    const { offsetX, offsetY } = nativeEvent;
    ctxRef.current.lineTo(offsetX, offsetY);
    ctxRef.current.stroke();

    socket.emit("draw", {
      room: room._id,
      x0: ctxRef.current.lastX,
      y0: ctxRef.current.lastY,
      x1: offsetX,
      y1: offsetY,
      color: tool === "pen" ? color : "#ffffff",
      lineWidth,
    });

    ctxRef.current.lastX = offsetX;
    ctxRef.current.lastY = offsetY;
  };

  const endDraw = () => {
    if (view !== "whiteboard") return;
    setDrawing(false);
    ctxRef.current.closePath();
  };

  const clearBoard = () => {
    ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    socket.emit("clear-board", room._id);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${room.code}`);
    toast.success("Link copied to clipboard");
  };

  return (
    <div className="flex flex-col w-full h-screen bg-gray-50">
      {/* Header */}
      <div className="flex justify-between items-center bg-white px-6 py-3 border-b shadow-sm">
        <div className="flex items-center gap-3">
          {room.creator?.avatar && (
            <img
              src={room.creator.avatar}
              alt="avatar"
              className="w-10 h-10 rounded-full border object-cover"
            />
          )}
          <div>
            <h1 className="font-semibold text-primary text-lg">{room.topic}</h1>
            <p className="text-sm text-gray-500">Hosted by: {room.creator?.name}</p>
          </div>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 text-blue-600 hover:underline"
        >
          <FaLink /> Copy Room Link
        </button>
      </div>

      {/* Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Tools (only for tutor) */}
        {isTutor && (
          <div className="w-16 bg-white border-r p-2 flex flex-col items-center gap-5 shadow-md">
            <button onClick={() => setTool("pen")} title="Pen">
              <FaPencilAlt className={`text-xl ${tool === "pen" ? "text-primary" : "text-gray-600"}`} />
            </button>
            <button onClick={() => setTool("eraser")} title="Eraser">
              <FaEraser className={`text-xl ${tool === "eraser" ? "text-primary" : "text-gray-600"}`} />
            </button>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-6 h-6"
              title="Color Picker"
            />
            <input
              type="range"
              min="1"
              max="10"
              value={lineWidth}
              onChange={(e) => setLineWidth(e.target.value)}
              className="w-12"
              title="Line Width"
            />
            <button onClick={clearBoard} title="Clear">
              <FaTrash className="text-red-500 text-xl" />
            </button>
          </div>
        )}

        {/* Center Board (Whiteboard or PDF) */}
        <div className="flex-1 flex justify-center items-center bg-white relative">
          {view === "whiteboard" ? (
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
            />
          ) : (
            <PDFViewer isTutor={isTutor} room={room} token={token} />
          )}
        </div>

        {/* Right Sidebar (Tutor: toggles view) */}
        <div className="w-64 bg-white border-l p-4 shadow-md hidden md:block">
          <h3 className="font-semibold text-gray-800 mb-3">Display Options</h3>
          {isTutor ? (
            <ul className="space-y-2 text-sm text-gray-700">
              <li
                className={`cursor-pointer hover:text-primary ${view === "whiteboard" ? "font-bold text-primary" : ""}`}
                onClick={() => setView("whiteboard")}
              >
                📝 Whiteboard
              </li>
              <li
                className={`cursor-pointer hover:text-primary ${view === "pdf" ? "font-bold text-primary" : ""}`}
                onClick={() => setView("pdf")}
              >
                📄 PDF Viewer
              </li>
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">Waiting for tutor to select content...</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhiteboardLayout;
