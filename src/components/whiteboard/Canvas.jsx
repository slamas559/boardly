// components/Canvas.jsx
import React, { useCallback } from 'react';

// Text Input Component
export const TextInputComponent = ({ 
  showTextInput, 
  textInputPosition, 
  text, 
  setText, 
  fontSize, 
  setFontSize, 
  fontFamily, 
  setFontFamily, 
  onTextSubmit, 
  onTextCancel, 
  canvasSize, 
  canvasContainerRef, 
  canvasRef 
}) => {
  if (!showTextInput || !textInputPosition) return null;

  // Improved position calculation with better viewport awareness
  const getInputPosition = useCallback(() => {
    if (!canvasContainerRef.current || !canvasRef.current) return { left: 0, top: 0 };
    
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
  }, [textInputPosition, canvasSize, canvasContainerRef, canvasRef]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onTextSubmit();
    }
    if (e.key === 'Escape') {
      onTextCancel();
    }
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
          onKeyDown={handleKeyDown}
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
            onClick={onTextSubmit}
            className="flex-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm transition-colors"
          >
            Add Text
          </button>
          <button
            onClick={onTextCancel}
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
export const TutorCursor = ({ cursor }) => {
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

// Main Canvas Component
export const WhiteboardCanvas = ({ 
  canvasRef, 
  canvasSize, 
  tool, 
  onCanvasClick, 
  onMouseDown, 
  onMouseMove, 
  onMouseUp, 
  onMouseLeave, 
  onTouchStart, 
  onTouchMove, 
  onTouchEnd, 
  tutorCursor, 
  isTutor 
}) => {
  const getCursorClass = () => {
    switch(tool) {
      case "pen": return "cursor-crosshair";
      case "eraser": return "cursor-cell";
      case "text": return "cursor-text";
      default: return "cursor-default";
    }
  };

  return (
    <div className="bg-white shadow-sm border border-gray-200 h-full flex items-center justify-center relative">
      <canvas
        ref={canvasRef}
        className={`${isTutor && (getCursorClass())} bg-white rounded-lg`}
        onMouseDown={tool === "text" ? onCanvasClick : onMouseDown}
        onMouseMove={onMouseMove}
        onTouchMove={onTouchMove}
        onTouchStart={tool === "text" ? onCanvasClick : onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        width={canvasSize.width}
        height={canvasSize.height}
      />
      {/* Show tutor cursor for students */}
      {!isTutor && tutorCursor && (
        <TutorCursor cursor={tutorCursor} />
      )}
    </div>
  );
};