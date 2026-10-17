// Settings for the selected equation block, in the same docked panel / phone sheet as the graph settings.
// Numbers and letters are edited right on the board (see EquationLeafEditor); this panel keeps it short:
// size and colour, plus sections that open only when wanted:
//  - All values: every number and letter as a labelled field (also the keyboard-friendly way)
//  - Type a formula: write it the way you would on a calculator (x^2/3 + sqrt(x))
//  - Templates: ready-made formulas with named blanks
//  - Keys and LaTeX: the math keyboard, with the LaTeX field for people who know it
// Edits are applied to the board as you type (debounced), so listeners watch the formula take shape.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDown, Keyboard, MousePointerClick } from "lucide-react";
import { PALETTE } from "./constants.js";
import { Swatches } from "./Toolbar.jsx";
import { NumberBox } from "./GraphParams.jsx";
import MathKeyboard from "./MathKeyboard.jsx";
import EquationParts from "./EquationParts.jsx";
import EquationType from "./EquationType.jsx";
import EquationTemplates from "./EquationTemplates.jsx";
import { backspace, insertSnippet, nextSlot, stepCaret } from "./mathKeys.js";
import { MAX_LATEX_LENGTH, measureEquation, renderLatex } from "./mathRender.js";
import { useMathReady } from "./useMath.js";
import { getEquationSection, requestEquationSection, subscribeEquationSection } from "./equationSection.js";

const COMMIT_DELAY_MS = 220;
const MIN_SIZE = 12;
const MAX_SIZE = 200;

const SECTIONS = [
  { id: "values", label: "All values", hint: "Every number and letter as a field" },
  { id: "type", label: "Type a formula", hint: "Like on a calculator: x^2/3 + sqrt(x)" },
  { id: "templates", label: "Templates", hint: "Ready-made formulas with blanks" },
  { id: "keys", label: "Keys and LaTeX", hint: "Math keyboard" },
];

const isTouchDevice = () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(pointer: coarse)").matches);

const FieldLabel = ({ children }) => <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">{children}</div>;

export default function EquationInspector({ equation, store, peek = false, onExpand }) {
  const id = equation.id;
  const ready = useMathReady();
  const [latex, setLatex] = useState(equation.latex);
  // Phones show only the on-screen keyboard unless the presenter asks for the device keyboard
  const [deviceKeyboard, setDeviceKeyboard] = useState(() => !isTouchDevice());
  const touch = isTouchDevice();
  const section = useSyncExternalStore(subscribeEquationSection, getEquationSection, () => null);
  const toggleSection = (name) => requestEquationSection(section === name ? null : name);

  const fieldRef = useRef(null);
  const committed = useRef(equation.latex);
  const timer = useRef(null);
  const nextCaret = useRef(null);

  const color = equation.color || "#17181C";
  const fontSize = equation.fontSize || 36;
  const result = ready ? renderLatex(latex) : null;
  const error = result?.error || "";

  const commitLatex = useCallback((text, { separate = false } = {}) => {
    clearTimeout(timer.current);
    timer.current = null;
    const current = store.get(id);
    if (!current) return;
    const size = measureEquation(text, current.fontSize || 36);
    if (!size || size.error) return; // invalid or not typeset yet: keep the last good formula on the board
    if (text === current.latex && Math.abs(size.w - current.w) < 0.5 && Math.abs(size.h - current.h) < 0.5) return;
    committed.current = text;
    // Coalesced so typing a whole formula is a single Ctrl+Z step (a template is its own step)
    store.commit([{ op: "update", id, patch: { latex: text, w: size.w, h: size.h } }], { coalesce: separate ? null : `equation:${id}` });
  }, [store, id]);

  // Used by templates: the whole formula changes at once, so it is saved straight away
  const applyNow = (text) => {
    if (text.length > MAX_LATEX_LENGTH) return;
    setLatex(text);
    commitLatex(text, { separate: true });
  };

  const commitRef = useRef(commitLatex);
  commitRef.current = commitLatex;
  const latexRef = useRef(latex);
  latexRef.current = latex;

  const change = (text, caret) => {
    if (text.length > MAX_LATEX_LENGTH) return;
    setLatex(text);
    if (caret !== undefined) nextCaret.current = caret;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => commitRef.current(text), COMMIT_DELAY_MS);
  };

  /* Put the caret where the last key press said it should go (after React has updated the field) */
  useLayoutEffect(() => {
    const el = fieldRef.current;
    const caret = nextCaret.current;
    if (!el || caret === null) return;
    nextCaret.current = null;
    el.focus({ preventScroll: true });
    el.setSelectionRange(caret, caret);
  }, [latex]);

  /* Pick up changes made elsewhere (undo, redo) without fighting our own commits */
  useEffect(() => {
    if (equation.latex === committed.current) return;
    committed.current = equation.latex;
    clearTimeout(timer.current);
    timer.current = null;
    setLatex(equation.latex);
  }, [equation.latex]);

  /* Blocks created before the engine had loaded only have an estimated size: fix it once we can measure */
  useEffect(() => {
    if (!ready) return;
    const current = store.get(id);
    const size = current && measureEquation(current.latex, current.fontSize || 36);
    if (size && !size.error && (Math.abs(size.w - current.w) > 1 || Math.abs(size.h - current.h) > 1)) {
      store.commit([{ op: "update", id, patch: { w: size.w, h: size.h } }], { coalesce: `equation:${id}` });
    }
  }, [ready, store, id]);

  /* Closing the panel or selecting something else must not drop a half-finished edit */
  useEffect(() => () => {
    if (timer.current) commitRef.current(latexRef.current);
  }, []);

  const selection = () => {
    const el = fieldRef.current;
    const end = latexRef.current.length;
    return [el?.selectionStart ?? end, el?.selectionEnd ?? end];
  };
  const moveCaret = (position) => {
    const el = fieldRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(position, position);
  };

  const onInsert = (snippet) => {
    const [start, end] = selection();
    const next = insertSnippet(latex, start, end, snippet);
    change(next.text, next.caret);
  };
  const onAction = (name) => {
    const [start, end] = selection();
    if (name === "backspace") {
      const next = backspace(latex, start, end);
      change(next.text, next.caret);
    } else if (name === "left") moveCaret(start !== end ? start : stepCaret(latex, start, -1));
    else if (name === "right") moveCaret(start !== end ? end : stepCaret(latex, end, 1));
    else if (name === "next") moveCaret(nextSlot(latex, end));
  };

  const setSize = (size) => {
    const clamped = Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(size)));
    const current = store.get(id);
    const measured = current && measureEquation(current.latex, clamped);
    if (!measured || measured.error) return;
    store.commit([{ op: "update", id, patch: { fontSize: clamped, w: measured.w, h: measured.h } }], { coalesce: `equation-size:${id}` });
  };
  const setColour = (value) => store.commit([{ op: "update", id, patch: { color: value } }], { coalesce: `equation-color:${id}` });

  const field = (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={`latex-${id}`} className="text-xs font-medium">Formula in LaTeX <span className="font-normal text-muted">(for people who know it)</span></label>
        {touch && !peek && (
          <button
            type="button"
            onClick={() => setDeviceKeyboard((value) => !value)}
            aria-pressed={deviceKeyboard}
            title={deviceKeyboard ? "Hide the phone keyboard" : "Type with the phone keyboard"}
            className={`flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] ${deviceKeyboard ? "border-accent bg-accent-soft text-accent" : "border-line text-gray-700 hover:bg-sunken"}`}
          >
            <Keyboard size={13} /> Phone keyboard
          </button>
        )}
      </div>
      <textarea
        id={`latex-${id}`}
        ref={fieldRef}
        value={latex}
        rows={peek ? 1 : 3}
        maxLength={MAX_LATEX_LENGTH}
        inputMode={deviceKeyboard ? "text" : "none"}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        aria-label="Formula in LaTeX"
        aria-invalid={Boolean(error) || undefined}
        placeholder="Use the keys below, or write LaTeX such as \frac{a}{b}"
        onChange={(e) => change(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            moveCaret(nextSlot(latex, e.currentTarget.selectionEnd));
          }
        }}
        className={`w-full resize-none rounded-md border bg-white px-2 py-2 font-mono text-[13px] leading-snug ${error ? "border-danger" : "border-line"}`}
      />
      {error && latex.trim() && <p role="alert" className="mt-1 text-xs text-danger">Can’t draw this yet: {error}</p>}
    </div>
  );

  /* ------------------------------ compact (phone peek) ------------------------------ */
  const hint = (
    <p className="flex items-start gap-2 rounded-md bg-accent-soft px-2.5 py-2 text-[13px] leading-[1.35] text-accent-strong">
      <MousePointerClick size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>Tap a number or letter on the board to change it.</span>
    </p>
  );

  if (peek) {
    return (
      <div className="space-y-2">
        {hint}
        <EquationParts latex={latex} onChange={change} compact />
        <button type="button" onClick={onExpand} className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-line text-sm hover:bg-sunken">
          <Keyboard size={16} /> More ways to edit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3" aria-label="Equation settings">
      {hint}

      <div className="space-y-3">
        <div>
          <FieldLabel>Size</FieldLabel>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={MIN_SIZE}
              max={120}
              step={1}
              value={Math.max(MIN_SIZE, Math.min(120, fontSize))}
              onChange={(e) => setSize(Number(e.target.value))}
              aria-label="Equation size"
              className="h-8 min-w-0 flex-1"
            />
            <NumberBox value={fontSize} label="Equation size in pixels" onCommit={setSize} className="h-8 w-[4.25rem] text-right" />
          </div>
        </div>
        <div>
          <FieldLabel>Colour</FieldLabel>
          <Swatches colors={PALETTE.filter((c) => c !== "#FFFFFF")} value={color} onPick={(value) => setColour(value)} />
        </div>
      </div>

      <div className="divide-y divide-line overflow-hidden rounded-md border border-line">
        {SECTIONS.map((item) => {
          const open = section === item.id;
          return (
            <div key={item.id}>
              <button
                type="button"
                id={`eq-head-${item.id}`}
                aria-expanded={open}
                aria-controls={`eq-section-${item.id}`}
                onClick={() => toggleSection(item.id)}
                className={`flex min-h-10 w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-sunken ${open ? "bg-sunken" : ""}`}
              >
                <span>
                  <span className="block text-[13px] font-medium">{item.label}</span>
                  {!open && <span className="block text-[11px] leading-4 text-muted">{item.hint}</span>}
                </span>
                <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
              {open && (
                <div role="region" id={`eq-section-${item.id}`} aria-labelledby={`eq-head-${item.id}`} className="border-t border-line bg-white px-3 py-3">
                  {item.id === "values" && <EquationParts latex={latex} onChange={change} />}
                  {item.id === "type" && <EquationType latex={latex} onChange={change} />}
                  {item.id === "templates" && <EquationTemplates ready={ready} color={color} onUse={(text) => { applyNow(text); requestEquationSection(null); }} />}
                  {item.id === "keys" && (
                    <div className="space-y-3">
                      {field}
                      <MathKeyboard onInsert={onInsert} onAction={onAction} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
