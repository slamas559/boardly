// components/Canvas.jsx
import React, { useCallback } from 'react';

// Text Input Component - CorelDraw/Paint Style
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
  canvasRef,
}) => {
  if (!showTextInput || !textInputPosition) return null;

  // Calculate position for the input dialog, ensuring it stays within viewport
  const getDialogPosition = useCallback(() => {
    if (!canvasContainerRef.current || !canvasRef.current) return { left: 0, top: 0 };
    
    const dialogWidth = 280;
    const dialogHeight = 140;
    const padding = 20;
    
    // Start with click position
    let left = textInputPosition.x;
    let top = textInputPosition.y;
    
    // Adjust if dialog would go outside canvas bounds
    if (left + dialogWidth + padding > canvasSize.width) {
      left = textInputPosition.x - dialogWidth - padding;
    }
    if (top + dialogHeight + padding > canvasSize.height) {
      top = textInputPosition.y - dialogHeight - padding;
    }
    
    // Ensure dialog stays within canvas bounds
    left = Math.max(padding, Math.min(left, canvasSize.width - dialogWidth - padding));
    top = Math.max(padding, Math.min(top, canvasSize.height - dialogHeight - padding));
    
    return { left, top };
  }, [textInputPosition, canvasSize, canvasContainerRef, canvasRef]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onTextSubmit();
    }
    if (e.key === 'Escape') {
      onTextCancel();
    }
  };

  const dialogPosition = getDialogPosition();

  return (
    <>
      {/* Text cursor/crosshair at exact click position */}
      <div
        className="absolute pointer-events-none z-40"
        style={{
          left: textInputPosition.x - 1,
          top: textInputPosition.y - 1,
          width: 2,
          height: parseInt(fontSize) + 4,
          backgroundColor: '#007ACC',
          animation: 'blink 1s infinite'
        }}
      />
      
      {/* Input dialog positioned smartly near click point */}
      <div
        className="absolute p-2 bg-transparent border-2 border-gray-400 rounded-lg shadow-2xl z-50 text-input-dialog"
        style={{
          left: dialogPosition.left,
          top: dialogPosition.top,
          minWidth: '280px',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15), 0 4px 10px rgba(0, 0, 0, 0.1)',
          border: '2px solid #ccc',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      >
        <div className="flex flex-col gap-3">
          {/* Preview text at actual size and font */}
          <div
            className="hidden md:block min-h-8 p-2 border border-gray-200 rounded bg-gray-50"
            style={{
              fontSize: `${fontSize}px`,
              fontFamily: fontFamily,
              lineHeight: '1.2'
            }}
          >
            {text || 'Type your text...'}
          </div>
          
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text here..."
            className="px-3 py-2 border-2 border-gray-300 bg-transparent rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm focus:outline-none"
            autoFocus
            onKeyDown={handleKeyDown}
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          />
          
          {/* Font controls */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600 min-w-10">Size:</label>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm flex-1 focus:ring-1 focus:ring-blue-500"
            >
              <option value="8">8px</option>
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
              <option value="48">48px</option>
              <option value="60">60px</option>
              <option value="72">72px</option>
            </select>
            
            <label className="text-xs font-medium text-gray-600 min-w-10">Font:</label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="px-2 py-1 border border-gray-300 rounded text-sm flex-1 focus:ring-1 focus:ring-blue-500"
            >
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times</option>
              <option value="Courier New">Courier</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
              <option value="Impact">Impact</option>
              <option value="Comic Sans MS">Comic Sans</option>
              <option value="Trebuchet MS">Trebuchet</option>
              <option value="system-ui">System</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-2">
            <button
              onClick={onTextSubmit}
              disabled={!text.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              OK
            </button>
            <button
              onClick={onTextCancel}
              className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
      
      {/* Add blinking animation for cursor */}
      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </>
  );
};

// Tutor Cursor Component (unchanged)
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

// Main Canvas Component - FIXED VERSION
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
  isTutor ,
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
    <div className="w-full h-full bg-white shadow-sm border border-gray-200 flex items-center justify-center relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className={`${isTutor ? getCursorClass() : 'cursor-default'} bg-white touch-none block`}
        // Mouse events
        onMouseDown={tool === "text" ? onCanvasClick : onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        // Touch events
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{ 
          // Remove any CSS width/height to prevent scaling conflicts
          // The canvas will use its natural dimensions set by width/height attributes
          touchAction: 'none',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          KhtmlUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          userSelect: 'none',
          // Ensure the canvas takes exactly the space calculated by JavaScript
          maxWidth: '100%',
          maxHeight: '100%'
        }}
      />
      {/* Show tutor cursor for students */}
      {!isTutor && tutorCursor && (
        <TutorCursor cursor={tutorCursor} />
      )}
    </div>
  );
};