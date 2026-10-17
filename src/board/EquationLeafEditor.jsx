// Editing a formula straight on the board: faint boxes mark every number and letter of the selected formula, and
// clicking one opens a small field right on it. Typing changes just that part (live for everyone, one undo step),
// Tab moves to the next part, Enter finishes, Esc puts it back. The same rules as the Edit list in the panel
// (3, -2, x, pi, n+1 all work), so a number can become a whole expression.
import { useEffect, useRef, useState } from "react";
import { leafRects } from "./equationLeaves.js";
import { parseParts, partDisplay, replacePart } from "./latexParts.js";
import { measureEquation } from "./mathRender.js";
import { useMathReady } from "./useMath.js";

const toScreen = (r, view, grow = 0) => ({
  left: (r.x - view.x) * view.k - grow,
  top: (r.y - view.y) * view.k - grow,
  width: r.w * view.k + grow * 2,
  height: r.h * view.k + grow * 2,
});

/** The faint boxes on every editable part of the selected formula (the hovered one is stronger). Never takes the pointer. */
export function LeafOutlines({ eq, view, hover }) {
  const ready = useMathReady();
  if (!ready) return null;
  return (
    <>
      {leafRects(eq).map((r) => (
        <div
          key={r.part.index}
          aria-hidden="true"
          className={`pointer-events-none absolute rounded-[4px] border transition-colors ${hover === r.part.index ? "border-accent bg-accent/15" : "border-accent/30 bg-accent/[0.06]"}`}
          style={toScreen(r, view, 2)}
        />
      ))}
    </>
  );
}

/**
 * The field on the part being edited. `onPreview({ latex, w, h })` is called as you type (nothing is saved yet);
 * `onFinish(patch | null, nextIndex | null)` once when done: a patch to save (null = nothing changed or cancelled),
 * and the part to continue with when Tab was pressed.
 */
export function LeafEditor({ eq, partIndex, view, onPreview, onFinish }) {
  const ready = useMathReady();
  const inputRef = useRef(null);
  const closed = useRef(false);
  const latest = useRef(null); // the last valid { latex, w, h } while typing
  const start = useRef(null);

  if (!start.current) {
    const part = parseParts(eq.latex)[partIndex];
    const anchor = part ? leafRects(eq).find((r) => r.part.index === partIndex) : null;
    start.current = { part, base: eq.latex, original: eq, range: part ? { start: part.start, end: part.end } : null, anchor };
  }
  const { part, base, original } = start.current;
  const [value, setValue] = useState(part ? partDisplay(part) : "");
  const [problem, setProblem] = useState(false);

  useEffect(() => {
    if (!part || !start.current.anchor) { closed.current = true; onFinish(null, null); return; }
    inputRef.current?.focus();
    inputRef.current?.select();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!part || !ready) return null;

  // Follow the part while the formula changes around it (a wider numerator re-centres, for instance)
  const live = latest.current ? { ...eq, ...latest.current } : eq;
  const range = start.current.range;
  const moved = leafRects(live).find((r) => r.part.start >= range.start && r.part.start < Math.max(range.end, range.start + 1));
  const rect = moved || start.current.anchor;
  const box = toScreen(rect, view, 0);
  const fontPx = Math.max(15, Math.min(40, box.height * 0.7));
  const width = Math.max(box.width + 24, 52, (value.length + 2) * fontPx * 0.62);

  const change = (text) => {
    setValue(text);
    const result = replacePart(base, part, text);
    const measured = result.error ? null : measureEquation(result.latex, original.fontSize || 36);
    if (!measured || measured.error) { setProblem(true); return; }
    setProblem(false);
    start.current.range = { start: result.start, end: result.end };
    latest.current = { latex: result.latex, w: measured.w, h: measured.h };
    onPreview(latest.current);
  };

  const finish = (cancel, direction = 0) => {
    if (closed.current) return;
    closed.current = true;
    const patch = !cancel && latest.current && latest.current.latex !== original.latex ? latest.current : null;
    let next = null;
    if (direction && !cancel) {
      const parts = parseParts(patch ? patch.latex : original.latex);
      const at = start.current.range;
      const index = direction > 0 ? parts.findIndex((p) => p.start >= at.end) : parts.map((p) => p.end <= at.start).lastIndexOf(true);
      next = index >= 0 ? index : null;
    }
    onFinish(patch, next);
  };

  return (
    <div className="pointer-events-none absolute z-10" style={{ left: box.left + box.width / 2 - width / 2, top: box.top + box.height / 2 - (box.height + 10) / 2, width }}>
      <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[10px] leading-none text-paper">{part.label}</div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        aria-label={`Edit ${part.label}: ${partDisplay(part)}`}
        aria-invalid={problem ? true : undefined}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => change(e.target.value)}
        onBlur={() => finish(false)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") { e.preventDefault(); finish(false); }
          else if (e.key === "Escape") { e.preventDefault(); finish(true); }
          else if (e.key === "Tab") { e.preventDefault(); finish(false, e.shiftKey ? -1 : 1); }
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className={`pointer-events-auto w-full rounded-md border-2 bg-white text-center font-mono shadow-md outline-none ${problem ? "border-danger" : "border-accent"}`}
        style={{ height: box.height + 10, fontSize: fontPx }}
      />
    </div>
  );
}
