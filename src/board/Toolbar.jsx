// Tool rail (desktop) / dock (mobile), plus the contextual style panel.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity, AlignCenter, AlignLeft, AlignRight, ArrowUpRight, Bold, Brush, Circle, Copy, Crosshair, Diamond, Eraser, Hand, Highlighter,
  Hexagon, Italic, Lock, Minus, MousePointer2, PenLine, Plus, Redo2, Shapes, SlidersHorizontal, Square, Star, Strikethrough, Trash2,
  RectangleHorizontal, Table2, Triangle,
  Type, Underline, Undo2, Unlock, X,
} from "lucide-react";
import { FONT_OPTIONS, FONT_STACKS, HIGHLIGHT_PALETTE, PALETTE, SHAPE_KINDS, TEXT_SIZES } from "./constants.js";

const SHAPE_ICONS = {
  rect: Square, ellipse: Circle, diamond: Diamond, triangle: Triangle, roundedRect: RectangleHorizontal,
  hexagon: Hexagon, star: Star, line: Minus, arrow: ArrowUpRight,
};
const SHAPE_LABELS = {
  rect: "Rectangle", ellipse: "Ellipse", diamond: "Diamond", triangle: "Triangle",
  roundedRect: "Rounded rectangle", hexagon: "Hexagon", star: "Star", line: "Line", arrow: "Arrow",
};

const keepFocus = (e) => e.preventDefault(); // keep a text box focused while clicking toolbar buttons

function ToolButton({ icon: Icon, label, shortcut, active, onClick, disabled, children, className = "" }) {
  return (
    <button
      type="button"
      onPointerDown={keepFocus}
      onMouseDown={keepFocus}
      onClick={onClick}
      disabled={disabled}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={active}
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors md:h-9 md:w-9 ${
        active ? "bg-ink text-paper" : "text-gray-700 hover:bg-sunken"
      } ${disabled ? "opacity-35 hover:bg-transparent" : ""} ${className}`}
    >
      {Icon ? <Icon size={18} strokeWidth={1.8} /> : null}
      {children}
    </button>
  );
}

const Divider = () => <div className="mx-0.5 h-6 w-px shrink-0 bg-line md:mx-0 md:my-0.5 md:h-px md:w-6" />;

export function ToolRail({
  mode, tool, onTool, lastShape, canUndo, canRedo, onUndo, onRedo, keepTool, onKeepTool, onCreateGraph, onCreateTable,
  onStyleToggle, styleSwatch, hasStyle, styleOpen,
}) {
  const [shapesOpen, setShapesOpen] = useState(false);
  const wrapRef = useRef(null);
  const shapeMenuRef = useRef(null);
  const [shapeMenuPosition, setShapeMenuPosition] = useState(null);

  useEffect(() => {
    if (!shapesOpen) return undefined;
    const close = (e) => {
      if (!wrapRef.current?.contains(e.target) && !shapeMenuRef.current?.contains(e.target)) setShapesOpen(false);
    };
    document.addEventListener("pointerdown", close);
    const closeOnViewportChange = () => setShapesOpen(false);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [shapesOpen]);

  const isShape = SHAPE_KINDS.includes(tool);
  const ShapeIcon = isShape ? SHAPE_ICONS[tool] : SHAPE_ICONS[lastShape] || Shapes;
  const openShapeMenu = () => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) {
      const menuSize = 140;
      if (window.matchMedia("(min-width: 768px)").matches) {
        setShapeMenuPosition({
          left: Math.min(rect.right + 8, window.innerWidth - menuSize - 8),
          top: Math.max(8, Math.min(rect.top, window.innerHeight - menuSize - 8)),
        });
      } else {
        const top = rect.top >= menuSize + 8 ? rect.top - menuSize - 8 : rect.bottom + 8;
        setShapeMenuPosition({
          left: Math.max(8, Math.min(rect.left, window.innerWidth - menuSize - 8)),
          top: Math.max(8, Math.min(top, window.innerHeight - menuSize - 8)),
        });
      }
    }
    setShapesOpen(true);
  };
  const toggleShapeMenu = () => {
    if (shapesOpen) setShapesOpen(false);
    else openShapeMenu();
  };

  return (
    <div
      role="toolbar"
      aria-label="Drawing tools"
      className="float-panel scroll-thin flex items-center gap-0.5 overflow-x-auto p-1 md:max-h-[calc(100%-1.5rem)] md:flex-col md:overflow-y-auto md:overflow-x-visible"
    >
      <ToolButton icon={MousePointer2} label="Select" shortcut="V" active={tool === "select"} onClick={() => onTool("select")} />
      {mode === "board" && (
        <ToolButton icon={Hand} label="Pan (drag the board)" shortcut="H" active={tool === "pan"} onClick={() => onTool("pan")} />
      )}
      <Divider />

      {mode === "pdf" && (
        <>
          <ToolButton icon={Highlighter} label="Highlight text" shortcut="H" active={tool === "highlight"} onClick={() => onTool("highlight")} />
          <ToolButton icon={Underline} label="Underline text" shortcut="U" active={tool === "underline"} onClick={() => onTool("underline")} />
          <ToolButton icon={Strikethrough} label="Strike through text" shortcut="S" active={tool === "strike"} onClick={() => onTool("strike")} />
          <Divider />
        </>
      )}

      <ToolButton icon={PenLine} label="Pen" shortcut="P" active={tool === "pen"} onClick={() => onTool("pen")} />
      <ToolButton icon={mode === "pdf" ? Brush : Highlighter} label="Marker" shortcut="M" active={tool === "highlighter"} onClick={() => onTool("highlighter")} />
      <ToolButton icon={Eraser} label="Eraser" shortcut="E" active={tool === "eraser"} onClick={() => onTool("eraser")} />
      <Divider />

      <ToolButton icon={Type} label="Text" shortcut="T" active={tool === "text"} onClick={() => onTool("text")} />

      <div ref={wrapRef} className="relative">
        <ToolButton
          icon={ShapeIcon}
          label={isShape ? SHAPE_LABELS[tool] : "Shapes"}
          active={isShape}
          onClick={() => (isShape ? toggleShapeMenu() : (onTool(lastShape), openShapeMenu()))}
        >
          <span className="absolute bottom-0.5 right-0.5 h-0 w-0 border-b-[4px] border-l-[4px] border-b-current border-l-transparent opacity-60" />
        </ToolButton>
        {shapesOpen && shapeMenuPosition && createPortal(
          <div
            ref={shapeMenuRef}
            className="float-panel fixed z-[100] grid grid-cols-3 gap-0.5 p-1"
            style={{ left: shapeMenuPosition.left, top: shapeMenuPosition.top }}
            role="menu"
            aria-label="Shape tools"
          >
            {SHAPE_KINDS.map((k) => (
              <ToolButton
                key={k}
                icon={SHAPE_ICONS[k]}
                label={SHAPE_LABELS[k]}
                shortcut={{ rect: "R", ellipse: "O", diamond: "D", line: "L", arrow: "A" }[k]}
                active={tool === k}
                onClick={() => { onTool(k); setShapesOpen(false); }}
              />
            ))}
          </div>,
          document.body
        )}
      </div>

      {mode === "board" && (
        <>
          <Divider />
          <ToolButton icon={Activity} label="Add graph" onClick={onCreateGraph} />
          <ToolButton icon={Table2} label="Add table" onClick={onCreateTable} />
        </>
      )}

      <ToolButton icon={Crosshair} label="Laser pointer" shortcut="K" active={tool === "laser"} onClick={() => onTool("laser")} />
      <Divider />

      <ToolButton icon={Undo2} label="Undo" shortcut="Ctrl Z" disabled={!canUndo} onClick={onUndo} />
      <ToolButton icon={Redo2} label="Redo" shortcut="Ctrl Shift Z" disabled={!canRedo} onClick={onRedo} />
      <ToolButton
        icon={keepTool ? Lock : Unlock}
        label={keepTool ? "Tool stays active (click to unlock)" : "Keep tool active after drawing a shape"}
        active={keepTool}
        onClick={onKeepTool}
      />

      {/* Show / hide the style panel (a bottom sheet on phones, a side panel on desktop) */}
      {hasStyle && (
        <>
          <Divider />
          <button
            type="button"
            onClick={onStyleToggle}
            aria-label={styleOpen ? "Hide style panel" : "Show style panel"}
            aria-pressed={styleOpen}
            title={styleOpen ? "Hide style panel" : "Show style panel"}
            className={`flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 text-sm md:h-9 md:w-9 md:justify-center md:border-0 md:px-0 ${
              styleOpen ? "bg-sunken text-ink" : "text-gray-700 hover:bg-sunken"
            }`}
          >
            <span className="h-4 w-4 rounded-sm border border-line-strong md:hidden" style={{ background: styleSwatch || "#17181C" }} />
            <SlidersHorizontal size={15} className="md:size-[18px]" />
            <span className="md:hidden">Style</span>
          </button>
        </>
      )}
    </div>
  );
}

/* ------------------------------ style panel ------------------------------ */

function Swatches({ colors, value, onPick }) {
  const isCustom = value && !colors.map((c) => c.toLowerCase()).includes(String(value).toLowerCase());
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onPointerDown={keepFocus}
          onClick={() => onPick(c)}
          aria-label={`Colour ${c}`}
          aria-pressed={String(value).toLowerCase() === c.toLowerCase()}
          className={`h-6 w-6 rounded-[4px] border ${c.toLowerCase() === "#ffffff" ? "border-line-strong" : "border-black/10"} ${
            String(value).toLowerCase() === c.toLowerCase() ? "outline outline-2 outline-offset-2 outline-ink" : ""
          }`}
          style={{ background: c }}
        />
      ))}
      <label
        className={`relative flex h-6 w-6 cursor-pointer items-center justify-center overflow-hidden rounded-[4px] border border-dashed border-line-strong text-gray-500 hover:text-ink ${
          isCustom ? "outline outline-2 outline-offset-2 outline-ink" : ""
        }`}
        title="Custom colour"
        style={isCustom ? { background: value } : undefined}
      >
        {!isCustom && <Plus size={13} />}
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(value || "") ? value : "#2540d9"}
          onChange={(e) => onPick(e.target.value.toUpperCase())}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label="Custom colour"
        />
      </label>
    </div>
  );
}

const Label = ({ children }) => <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">{children}</div>;

function Segmented({ children }) {
  return <div className="flex overflow-hidden rounded-md border border-line">{children}</div>;
}

function SegButton({ active, onClick, label, children, className = "" }) {
  return (
    <button
      type="button"
      onPointerDown={keepFocus}
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`flex h-8 flex-1 items-center justify-center border-r border-line text-sm last:border-r-0 ${
        active ? "bg-ink text-paper" : "text-gray-700 hover:bg-sunken"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function StylePanel({ group, style, onChange, selectionCount, onDelete, onDuplicate, open, collapsed, onClose, mode }) {
  if (!group || !style) return null;
  const isMarker = group === "highlighter" || group === "markup";
  const colors = isMarker ? HIGHLIGHT_PALETTE : PALETTE;
  const title = { pen: "Pen", highlighter: "Marker", shape: "Shape", text: "Text", markup: "Highlight", markupLine: "Markup" }[group];

  return (
    <div
      className={`float-panel z-20 w-full p-3 md:absolute md:left-16 md:top-0 md:w-60 ${
        open ? `absolute inset-x-0 bottom-full mb-2 ${collapsed ? "md:hidden" : ""}` : collapsed ? "hidden" : "hidden md:block"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium">{title}{selectionCount > 1 ? ` · ${selectionCount} selected` : ""}</span>
        <button type="button" onClick={onClose} aria-label="Close style panel" title="Hide panel" className="rounded-md p-1 text-gray-500 hover:bg-sunken hover:text-ink">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-3.5">
        <div>
          <Label>Colour</Label>
          <Swatches colors={colors} value={style.color} onPick={(c) => onChange({ color: c })} />
        </div>

        {(group === "pen" || group === "highlighter" || group === "shape") && (
          <div>
            <Label>{group === "shape" ? "Stroke" : "Thickness"} · {Math.round(style.width * 10) / 10}</Label>
            <input
              type="range"
              min={group === "highlighter" ? 6 : 1}
              max={group === "highlighter" ? (mode === "pdf" ? 40 : 60) : (mode === "pdf" ? 12 : 24)}
              step="0.5"
              value={style.width}
              onChange={(e) => onChange({ width: Number(e.target.value) })}
              className="w-full"
              aria-label="Thickness"
            />
          </div>
        )}

        {group === "highlighter" && (
          <div>
            <Label>Opacity · {Math.round((style.opacity ?? 0.45) * 100)}%</Label>
            <input
              type="range" min="0.15" max="0.9" step="0.05" value={style.opacity ?? 0.45}
              onChange={(e) => onChange({ opacity: Number(e.target.value) })} className="w-full" aria-label="Opacity"
            />
          </div>
        )}

        {group === "shape" && (
          <div>
            <Label>Fill</Label>
            <Segmented>
              <SegButton active={!style.fill} onClick={() => onChange({ fill: false })} label="No fill">None</SegButton>
              <SegButton active={!!style.fill} onClick={() => onChange({ fill: true })} label="Tinted fill">Tint</SegButton>
            </Segmented>
          </div>
        )}

        {group === "text" && (
          <>
            <div>
              <Label>Font</Label>
              <div className="grid grid-cols-4 gap-1">
                {FONT_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onPointerDown={keepFocus}
                    onClick={() => onChange({ fontFamily: f.id })}
                    title={f.label}
                    aria-label={f.label}
                    aria-pressed={style.fontFamily === f.id}
                    className={`h-9 rounded-md border text-base ${
                      style.fontFamily === f.id ? "border-ink bg-ink text-paper" : "border-line text-gray-800 hover:bg-sunken"
                    }`}
                    style={{ fontFamily: FONT_STACKS[f.id], fontSize: f.id === "hand" ? 20 : 16 }}
                  >
                    Aa
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Size</Label>
              <div className="flex items-center gap-1.5">
                <button type="button" onPointerDown={keepFocus} onClick={() => onChange({ fontSize: Math.max(6, style.fontSize - (style.fontSize > 40 ? 8 : 2)) })} aria-label="Smaller" className="h-8 w-8 rounded-md border border-line hover:bg-sunken">−</button>
                <input
                  type="number" min="6" max="300" value={Math.round(style.fontSize)}
                  onChange={(e) => onChange({ fontSize: clampNum(e.target.value, 6, 300) })}
                  className="h-8 w-14 rounded-md border border-line bg-white text-center text-sm" aria-label="Font size"
                />
                <button type="button" onPointerDown={keepFocus} onClick={() => onChange({ fontSize: Math.min(300, style.fontSize + (style.fontSize >= 40 ? 8 : 2)) })} aria-label="Larger" className="h-8 w-8 rounded-md border border-line hover:bg-sunken">+</button>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {TEXT_SIZES.map((s) => (
                  <button
                    key={s} type="button" onPointerDown={keepFocus} onClick={() => onChange({ fontSize: mode === "pdf" ? Math.round(s * 0.7) : s })}
                    className="rounded-sm px-1.5 py-0.5 text-xs text-muted hover:bg-sunken hover:text-ink"
                  >
                    {mode === "pdf" ? Math.round(s * 0.7) : s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Segmented>
                <SegButton active={style.bold} onClick={() => onChange({ bold: !style.bold })} label="Bold" className="w-9"><Bold size={15} /></SegButton>
                <SegButton active={style.italic} onClick={() => onChange({ italic: !style.italic })} label="Italic" className="w-9"><Italic size={15} /></SegButton>
                <SegButton active={style.underline} onClick={() => onChange({ underline: !style.underline })} label="Underline" className="w-9"><Underline size={15} /></SegButton>
              </Segmented>
              <Segmented>
                <SegButton active={style.align === "left"} onClick={() => onChange({ align: "left" })} label="Align left" className="w-9"><AlignLeft size={15} /></SegButton>
                <SegButton active={style.align === "center"} onClick={() => onChange({ align: "center" })} label="Align centre" className="w-9"><AlignCenter size={15} /></SegButton>
                <SegButton active={style.align === "right"} onClick={() => onChange({ align: "right" })} label="Align right" className="w-9"><AlignRight size={15} /></SegButton>
              </Segmented>
            </div>
          </>
        )}

        {selectionCount > 0 && (
          <div className="flex gap-1.5 border-t border-line pt-3">
            <button type="button" onClick={onDuplicate} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-line text-sm hover:bg-sunken">
              <Copy size={14} /> Duplicate
            </button>
            <button type="button" onClick={onDelete} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-line text-sm text-danger hover:bg-danger-soft">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function clampNum(v, a, b) {
  const n = Number(v);
  if (!Number.isFinite(n)) return a;
  return Math.max(a, Math.min(b, n));
}
