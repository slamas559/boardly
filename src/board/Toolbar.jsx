// Tool bar: related tools share one button with a flyout (Draw, Shapes, Insert), so the bar stays short.
// It can be dragged to any screen edge (see ToolDock) and lays itself out vertically or horizontally.
// Also holds the contextual style panel body below.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity, AlignCenter, AlignLeft, AlignRight, ArrowUpRight, Bold, Brush, Circle, Copy, Crosshair, Diamond, Eraser, Group, GripHorizontal, GripVertical,
  Hand, Highlighter, ImagePlus, Link2, Hexagon, Italic, Lock, Minus, MousePointer2, PenLine, Plus, Redo2, SlidersHorizontal, Square, Star, Strikethrough, Trash2,
  RectangleHorizontal, Ruler, Shapes, Sigma, Table2, Triangle, Type, Underline, Undo2, Ungroup, Unlock,
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
const SHAPE_SHORTCUTS = { rect: "R", ellipse: "O", diamond: "D", line: "L", arrow: "A" };

const keepFocus = (e) => e.preventDefault(); // keep a text box focused while clicking toolbar buttons

function ToolButton({ icon: Icon, label, shortcut, active, onClick, disabled, children, className = "", role, popup, expanded }) {
  const radio = role === "menuitemradio";
  return (
    <button
      type="button"
      role={role}
      onPointerDown={keepFocus}
      onClick={onClick}
      disabled={disabled}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={radio ? undefined : active}
      aria-checked={radio ? Boolean(active) : undefined}
      aria-haspopup={popup ? "menu" : undefined}
      aria-expanded={popup ? Boolean(expanded) : undefined}
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-colors md:h-9 md:w-9 ${
        active ? "bg-ink text-paper" : "text-gray-700 hover:bg-sunken"
      } ${disabled ? "opacity-35 hover:bg-transparent" : ""} ${className}`}
    >
      {Icon ? <Icon size={18} strokeWidth={1.8} /> : null}
      {children}
    </button>
  );
}

function Divider({ vertical }) {
  return <div aria-hidden="true" className={vertical ? "my-0.5 h-px w-6 shrink-0 bg-line" : "mx-0.5 h-6 w-px shrink-0 bg-line"} />;
}

// A row in a flyout: icon, name and (for tools) the keyboard shortcut
function MenuItem({ icon: Icon, label, shortcut, active, disabled, onClick, role = "menuitem" }) {
  const toggled = role === "menuitemradio" || role === "menuitemcheckbox";
  return (
    <button
      type="button"
      role={role}
      aria-checked={toggled ? Boolean(active) : undefined}
      onPointerDown={keepFocus}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-9 w-full min-w-[11rem] items-center gap-2.5 rounded-md px-2.5 text-left text-sm transition-colors ${
        active ? "bg-ink text-paper" : "text-gray-800 hover:bg-sunken"
      } ${disabled ? "opacity-35 hover:bg-transparent" : ""}`}
    >
      {Icon ? <Icon size={16} strokeWidth={1.8} className="shrink-0" /> : null}
      <span className="flex-1 truncate">{label}</span>
      {shortcut && <span className="pl-3 font-mono text-[11px] opacity-60">{shortcut}</span>}
    </button>
  );
}

// A small popover anchored to a toolbar button. It opens towards the board (`side`), stays inside the
// window, closes on outside click / Esc / scroll / resize and supports arrow-key navigation.
function Flyout({ anchorRef, open, onClose, side, label, focusFirst, className = "", children }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const a = anchorRef.current?.getBoundingClientRect();
    const m = menuRef.current?.getBoundingClientRect();
    if (!a || !m) return;
    const GAP = 8, EDGE = 8;
    const left = side === "right" ? a.right + GAP : side === "left" ? a.left - m.width - GAP : a.left;
    const top = side === "bottom" ? a.bottom + GAP : side === "top" ? a.top - m.height - GAP : a.top;
    setPos({
      left: Math.max(EDGE, Math.min(left, window.innerWidth - m.width - EDGE)),
      top: Math.max(EDGE, Math.min(top, window.innerHeight - m.height - EDGE)),
    });
  }, [open, side, anchorRef]);

  useEffect(() => {
    if (!open || !pos || !focusFirst) return;
    const items = menuRef.current?.querySelectorAll("button:not(:disabled)");
    const current = menuRef.current?.querySelector('[aria-checked="true"]:not(:disabled)');
    (current || items?.[0])?.focus();
  }, [open, pos, focusFirst]);

  useEffect(() => {
    if (!open) return undefined;
    const outside = (e) => {
      if (!anchorRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) onClose(false);
    };
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopPropagation(); // Esc closes the menu only; it must not also clear the selection
      onClose(true);
    };
    const dismiss = (e) => { if (!menuRef.current?.contains(e.target)) onClose(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const onMenuKey = (e) => {
    const keys = ["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const items = [...menuRef.current.querySelectorAll("button:not(:disabled)")];
    if (!items.length) return;
    e.preventDefault();
    const i = items.indexOf(document.activeElement);
    const forward = e.key === "ArrowDown" || e.key === "ArrowRight";
    const next = e.key === "Home" ? 0 : e.key === "End" ? items.length - 1 : (i + (forward ? 1 : -1) + items.length) % items.length;
    items[next].focus();
  };

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={label}
      onKeyDown={onMenuKey}
      className={`float-panel fixed z-[100] p-1 ${className}`}
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden" }}
    >
      {children}
    </div>,
    document.body
  );
}

const Caret = () => (
  <span aria-hidden="true" className="absolute bottom-0.5 right-0.5 h-0 w-0 border-b-[4px] border-l-[4px] border-b-current border-l-transparent opacity-60" />
);

/**
 * One toolbar button standing for several tools (kind "tools") or several insert actions (kind "actions").
 * Tool groups show the active / last used tool; clicking an inactive group selects it and opens the flyout,
 * clicking an active group toggles the flyout.
 */
function ToolGroup({ kind = "tools", icon, label, items, activeId, lastId, onPick, side, grid = false, footer, disabled }) {
  const [open, setOpen] = useState(false);
  const [byKeyboard, setByKeyboard] = useState(false);
  const wrapRef = useRef(null);
  const active = kind === "tools" && items.some((item) => item.id === activeId);
  const shown = kind === "tools" ? items.find((item) => item.id === (active ? activeId : lastId)) || items[0] : null;

  const close = useCallback((refocus) => {
    setOpen(false);
    if (refocus) wrapRef.current?.querySelector("button")?.focus();
  }, []);

  const onClick = (e) => {
    setByKeyboard(e.detail === 0);
    if (kind === "tools" && !active) {
      onPick(shown.id);
      setOpen(true);
    } else {
      setOpen((v) => !v);
    }
  };
  const choose = (item) => {
    if (item.onSelect) item.onSelect();
    else onPick(item.id);
    close(byKeyboard);
  };

  return (
    <div ref={wrapRef} className="relative">
      <ToolButton
        icon={shown ? shown.icon : icon}
        label={shown ? shown.label : label}
        shortcut={shown?.shortcut}
        active={active}
        onClick={onClick}
        disabled={disabled}
        popup
        expanded={open}
      >
        <Caret />
      </ToolButton>
      <Flyout anchorRef={wrapRef} open={open} onClose={close} side={side} label={label} focusFirst={byKeyboard}>
        {grid ? (
          <div className="grid grid-cols-3 gap-0.5">
            {items.map((item) => (
              <ToolButton
                key={item.id}
                role="menuitemradio"
                icon={item.icon}
                label={item.label}
                shortcut={item.shortcut}
                active={kind === "tools" && activeId === item.id}
                disabled={item.disabled}
                onClick={() => choose(item)}
              />
            ))}
          </div>
        ) : (
          items.map((item) => (
            <MenuItem
              key={item.id}
              role={kind === "tools" ? "menuitemradio" : "menuitem"}
              icon={item.icon}
              label={item.label}
              shortcut={item.shortcut}
              active={kind === "tools" && activeId === item.id}
              disabled={item.disabled}
              onClick={() => choose(item)}
            />
          ))
        )}
        {footer && <div className="mt-1 border-t border-line pt-1">{footer}</div>}
      </Flyout>
    </div>
  );
}

// The handle that drags the bar to another edge. Arrow keys do the same for keyboard users.
function Grip({ vertical, grip }) {
  if (!grip) return null;
  const Icon = vertical ? GripHorizontal : GripVertical;
  return (
    <button
      type="button"
      aria-label="Move toolbar"
      title="Drag to move the toolbar · Arrow keys dock it · Double-click to reset"
      onPointerDown={(e) => { keepFocus(e); grip.onPointerDown(e); }}
      onPointerMove={grip.onPointerMove}
      onPointerUp={grip.onPointerUp}
      onPointerCancel={grip.onPointerCancel}
      onKeyDown={grip.onKeyDown}
      onDoubleClick={grip.onReset}
      className={`flex shrink-0 cursor-grab touch-none items-center justify-center text-gray-400 hover:text-gray-700 active:cursor-grabbing ${vertical ? "h-5 w-full" : "h-auto w-5"}`}
    >
      <Icon size={14} strokeWidth={1.8} />
    </button>
  );
}

export function ToolRail({
  mode, tool, onTool, lastShape, canUndo, canRedo, onUndo, onRedo, keepTool, onKeepTool, onCreateGraph, onCreateEquation, onCreateAid, onCreateTable, onAddVideoLink,
  onStyleToggle, styleSwatch, hasStyle, styleOpen, styleLabel = "Style", onUploadMedia, mediaUploading = false,
  vertical = true, side = "right", grip, canGroup = false, canUngroup = false, onGroup, onUngroup,
}) {
  // Remember which tool of a group was used last, so the button keeps showing it
  const lastDraw = useRef("pen");
  if (tool === "pen" || tool === "highlighter") lastDraw.current = tool;
  const lastMarkup = useRef("highlight");
  if (["highlight", "underline", "strike"].includes(tool)) lastMarkup.current = tool;

  const pdf = mode === "pdf";
  const drawItems = [
    { id: "pen", icon: PenLine, label: "Pen", shortcut: "P" },
    { id: "highlighter", icon: pdf ? Brush : Highlighter, label: "Marker", shortcut: "M" },
  ];
  const markupItems = [
    { id: "highlight", icon: Highlighter, label: "Highlight text", shortcut: "H" },
    { id: "underline", icon: Underline, label: "Underline text", shortcut: "U" },
    { id: "strike", icon: Strikethrough, label: "Strike through text", shortcut: "S" },
  ];
  const shapeItems = SHAPE_KINDS.map((k) => ({ id: k, icon: SHAPE_ICONS[k], label: SHAPE_LABELS[k], shortcut: SHAPE_SHORTCUTS[k] }));
  const insertItems = [
    { id: "graph", icon: Activity, label: "Graph", onSelect: onCreateGraph },
    { id: "equation", icon: Sigma, label: "Equation", onSelect: onCreateEquation },
    { id: "aids", icon: Ruler, label: "Math aids and tools", onSelect: onCreateAid },
    { id: "table", icon: Table2, label: "Table", onSelect: onCreateTable },
    { id: "media", icon: ImagePlus, label: mediaUploading ? "Uploading media…" : "Image or video", onSelect: onUploadMedia, disabled: mediaUploading },
    { id: "link", icon: Link2, label: "Video link", onSelect: onAddVideoLink },
  ];

  // The Group button flips to Ungroup when the selection is a group
  const ungroupMode = canUngroup && !canGroup;
  const GroupIcon = ungroupMode ? Ungroup : Group;

  return (
    <div className={`float-panel flex max-h-full max-w-full items-stretch overflow-hidden ${vertical ? "flex-col" : "flex-row"}`}>
      <Grip vertical={vertical} grip={grip} />
      <div
        role="toolbar"
        aria-label="Drawing tools"
        aria-orientation={vertical ? "vertical" : "horizontal"}
        className={`scroll-thin flex min-h-0 min-w-0 items-center gap-0.5 p-1 ${
          vertical ? "flex-col overflow-y-auto overflow-x-hidden pt-0" : "overflow-x-auto overflow-y-hidden pl-0"
        }`}
      >
        <ToolButton icon={MousePointer2} label="Select" shortcut="V" active={tool === "select"} onClick={() => onTool("select")} />
        {mode === "board" && (
          <ToolButton icon={Hand} label="Pan (drag the board)" shortcut="H" active={tool === "pan"} onClick={() => onTool("pan")} />
        )}
        <Divider vertical={vertical} />

        {pdf && (
          <ToolGroup label="Text markup" items={markupItems} activeId={tool} lastId={lastMarkup.current} onPick={onTool} side={side} />
        )}
        <ToolGroup label="Pen and marker" items={drawItems} activeId={tool} lastId={lastDraw.current} onPick={onTool} side={side} />
        <ToolButton icon={Eraser} label="Eraser" shortcut="E" active={tool === "eraser"} onClick={() => onTool("eraser")} />
        <ToolButton icon={Type} label="Text" shortcut="T" active={tool === "text"} onClick={() => onTool("text")} />
        <ToolGroup
          label="Shapes"
          icon={Shapes}
          items={shapeItems}
          activeId={tool}
          lastId={lastShape}
          onPick={onTool}
          side={side}
          grid
          footer={
            <MenuItem
              role="menuitemcheckbox"
              icon={keepTool ? Lock : Unlock}
              label="Keep tool active"
              active={keepTool}
              onClick={onKeepTool}
            />
          }
        />
        {mode === "board" && <ToolGroup kind="actions" icon={Plus} label="Insert" items={insertItems} side={side} />}
        <Divider vertical={vertical} />

        <ToolButton icon={Crosshair} label="Laser pointer" shortcut="K" active={tool === "laser"} onClick={() => onTool("laser")} />
        <ToolButton
          icon={GroupIcon}
          label={ungroupMode ? "Ungroup" : "Group"}
          shortcut={ungroupMode ? "Ctrl Shift G" : "Ctrl G"}
          disabled={!canGroup && !canUngroup}
          onClick={ungroupMode ? onUngroup : onGroup}
        />
        <Divider vertical={vertical} />

        <ToolButton icon={Undo2} label="Undo" shortcut="Ctrl Z" disabled={!canUndo} onClick={onUndo} />
        <ToolButton icon={Redo2} label="Redo" shortcut="Ctrl Shift Z" disabled={!canRedo} onClick={onRedo} />

        {/* Show / hide the properties panel (docked on desktop, a bottom sheet on phones) */}
        {hasStyle && (
          <>
            <Divider vertical={vertical} />
            <button
              type="button"
              onClick={onStyleToggle}
              aria-label={styleOpen ? "Hide properties panel" : "Show properties panel"}
              aria-pressed={styleOpen}
              title={styleOpen ? "Hide properties panel" : "Show properties panel"}
              className={`flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-md text-sm ${
                vertical ? "w-10 md:h-9 md:w-9" : "border border-line px-2.5"
              } ${styleOpen ? "bg-sunken text-ink" : "text-gray-700 hover:bg-sunken"}`}
            >
              {styleSwatch && !vertical && <span className="h-4 w-4 rounded-sm border border-line-strong" style={{ background: styleSwatch }} />}
              <SlidersHorizontal size={vertical ? 18 : 15} strokeWidth={1.8} />
              {!vertical && <span>{styleLabel}</span>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ style panel ------------------------------ */

export function Swatches({ colors, value, onPick }) {
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

// The panel body only: the properties dock supplies the frame, header and close button.
export function StylePanel({ group, style, onChange, selectionCount, onDelete, onDuplicate, mode }) {
  if (!group || !style) return null;
  if (group === "media") {
    return (
      <div className="space-y-3 text-sm">
        {["video", "embed"].includes(style.mediaType) && (
          <button
            type="button"
            onPointerDown={keepFocus}
            onClick={() => onChange({ playing: !style.playing })}
            className="h-9 w-full rounded-md border border-line font-medium hover:bg-sunken"
          >
            {style.playing ? "Pause video" : "Play video"}
          </button>
        )}
        <p className="leading-5 text-muted">Drag to move this media. Drag a corner handle to resize it.</p>
      </div>
    );
  }
  const isMarker = group === "highlighter" || group === "markup";
  const colors = isMarker ? HIGHLIGHT_PALETTE : PALETTE;

  return (
    <div>
      <div className="space-y-3.5">
        <div>
          <Label>Colour</Label>
          <Swatches colors={colors} value={style.color} onPick={(c) => onChange({ color: c })} />
        </div>

        {group === "table" && (
          <>
            <div>
              <Label>Cell text size · {Math.round(style.fontSize)} px</Label>
              <input
                type="range"
                min="8"
                max="40"
                step="1"
                value={style.fontSize}
                onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
                className="w-full"
                aria-label="Cell text size"
              />
            </div>
            <div>
              <Label>Column width · {Math.round(style.cellWidth)} px</Label>
              <input
                type="range"
                min="40"
                max="320"
                step="5"
                value={style.cellWidth}
                onChange={(e) => onChange({ cellWidth: Number(e.target.value) })}
                className="w-full"
                aria-label="Table column width"
              />
            </div>
            <div>
              <Label>Row height · {Math.round(style.cellHeight)} px</Label>
              <input
                type="range"
                min="24"
                max="120"
                step="2"
                value={style.cellHeight}
                onChange={(e) => onChange({ cellHeight: Number(e.target.value) })}
                className="w-full"
                aria-label="Table row height"
              />
            </div>
          </>
        )}

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

        {group === "shape" && mode !== "pdf" && (
          <>
            <div>
              <Label>Show lengths and angles</Label>
              <Segmented>
                <SegButton active={!style.measure} onClick={() => onChange({ measure: false })} label="Hide measurements">Off</SegButton>
                <SegButton active={!!style.measure} onClick={() => onChange({ measure: true })} label="Show side lengths in cm and angles in degrees">On</SegButton>
              </Segmented>
            </div>
            <div>
              <Label>Snap to corners, edges and grid</Label>
              <Segmented>
                <SegButton active={!style.snap} onClick={() => onChange({ snap: false })} label="Draw freely">Off</SegButton>
                <SegButton active={!!style.snap} onClick={() => onChange({ snap: true })} label="Snap to corners, midpoints, edges and the paper grid">On</SegButton>
              </Segmented>
              <p className="mt-1.5 text-[11px] text-muted">Hold Alt to draw freely. Rulers and set squares always work as a straight edge.</p>
            </div>
          </>
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
