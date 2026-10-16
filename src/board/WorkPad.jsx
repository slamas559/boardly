// A small drawing pad for "show your work": students write on it with a finger or mouse and send the
// picture to the teacher. Strokes are kept as lists of points so undo works, and the picture is made small
// enough to send (see workImage.js).
import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Send, Trash2, Undo2 } from "lucide-react";
import { fitImage } from "./workImage.js";

const W = 640;
const H = 400;
const COLORS = ["#17181C", "#2540D9", "#D9480F", "#0E8A6B"];

function drawStroke(ctx, stroke) {
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const pts = stroke.points;
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0][0], pts[0][1], stroke.width / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const midX = (pts[i][0] + pts[i + 1][0]) / 2;
    const midY = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], midX, midY);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last[0], last[1]);
  ctx.stroke();
}

export default function WorkPad({ disabled = false, sent = false, onSend }) {
  const canvasRef = useRef(null);
  const strokes = useRef([]);
  const current = useRef(null);
  const [color, setColor] = useState(COLORS[0]);
  const [erasing, setErasing] = useState(false);
  const [ink, setInk] = useState(false);
  const [problem, setProblem] = useState("");

  const redraw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, W, H);
    for (const stroke of strokes.current) drawStroke(ctx, stroke);
    if (current.current) drawStroke(ctx, current.current);
  }, []);
  useEffect(redraw, [redraw]);

  const point = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return [((e.clientX - rect.left) * W) / rect.width, ((e.clientY - rect.top) * H) / rect.height];
  };
  const down = (e) => {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    current.current = { color: erasing ? "#ffffff" : color, width: erasing ? 26 : 3.5, points: [point(e)] };
    redraw();
  };
  const move = (e) => {
    if (!current.current) return;
    current.current.points.push(point(e));
    redraw();
  };
  const up = () => {
    if (!current.current) return;
    strokes.current.push(current.current);
    current.current = null;
    setInk(true);
    setProblem("");
    redraw();
  };

  const undo = () => {
    strokes.current.pop();
    setInk(strokes.current.length > 0);
    redraw();
  };
  const clear = () => {
    strokes.current = [];
    setInk(false);
    redraw();
  };
  const send = () => {
    const source = canvasRef.current;
    const url = fitImage((scale, quality) => {
      const copy = document.createElement("canvas");
      copy.width = Math.round(W * scale);
      copy.height = Math.round(H * scale);
      const ctx = copy.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, copy.width, copy.height);
      ctx.drawImage(source, 0, 0, copy.width, copy.height);
      return copy.toDataURL("image/jpeg", quality);
    });
    if (!url) {
      setProblem("That drawing is too big to send. Clear a little and try again.");
      return;
    }
    setProblem("");
    onSend(url);
  };

  const tool = "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line bg-white text-gray-700 hover:bg-sunken disabled:opacity-40";
  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        aria-label="Drawing pad for your working"
        className={`block aspect-[8/5] w-full touch-none rounded-lg border border-line bg-white ${disabled ? "opacity-60" : "cursor-crosshair"}`}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        {COLORS.map((swatch) => (
          <button
            key={swatch}
            type="button"
            disabled={disabled}
            aria-label={`Pen colour ${swatch}`}
            aria-pressed={!erasing && color === swatch}
            onClick={() => { setColor(swatch); setErasing(false); }}
            className={`h-10 w-10 shrink-0 rounded-full border-2 ${!erasing && color === swatch ? "border-ink" : "border-transparent"}`}
          >
            <span className="mx-auto block h-6 w-6 rounded-full" style={{ background: swatch }} />
          </button>
        ))}
        <button type="button" disabled={disabled} aria-label="Eraser" aria-pressed={erasing} onClick={() => setErasing((value) => !value)} className={`${tool} ${erasing ? "border-accent bg-accent-soft text-accent" : ""}`}><Eraser size={18} /></button>
        <button type="button" disabled={disabled || !ink} aria-label="Undo" onClick={undo} className={tool}><Undo2 size={18} /></button>
        <button type="button" disabled={disabled || !ink} aria-label="Clear the pad" onClick={clear} className={tool}><Trash2 size={18} /></button>
        <button
          type="button"
          disabled={disabled || !ink}
          onClick={send}
          className="ml-auto flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          <Send size={16} /> {sent ? "Send again" : "Send to teacher"}
        </button>
      </div>
      {problem && <p role="alert" className="text-xs text-danger">{problem}</p>}
    </div>
  );
}
