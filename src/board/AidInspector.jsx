// Settings for the selected math aid (number line, unit circle or fraction bars), in the same docked
// panel / phone sheet as the graph and equation editors. Changes apply to the board as you make them.
import { useEffect, useRef, useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { PALETTE } from "./constants.js";
import { Swatches } from "./Toolbar.jsx";
import { NumberBox } from "./GraphParams.jsx";
import { ToggleRow } from "./GraphExplore.jsx";
import {
  AID_LIMITS, SPECIAL_ANGLES, jumpsToText, listToText, normalizeAngle, parseJumps, parseNumberList, radianLabel,
  unitCircleReadout, validNumberLine,
} from "./mathAids.js";

const FieldLabel = ({ children }) => <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">{children}</div>;
const chip = "h-8 shrink-0 rounded-md border border-line bg-white px-2.5 text-xs hover:bg-sunken";

const NUMBER_LINE_PRESETS = [
  { label: "−5 to 5", min: -5, max: 5, step: 1 },
  { label: "0 to 10", min: 0, max: 10, step: 1 },
  { label: "0 to 1 · tenths", min: 0, max: 1, step: 0.1 },
  { label: "0 to 1 · quarters", min: 0, max: 1, step: 0.25 },
  { label: "−1 to 1 · halves", min: -1, max: 1, step: 0.5 },
];

/** A text field for a list (points, jumps) that applies once what you typed makes sense. */
function ListField({ label, hint, placeholder, text, parse, onCommit }) {
  const [draft, setDraft] = useState(text);
  const [invalid, setInvalid] = useState(false);
  const timer = useRef(null);
  const sent = useRef(text);

  useEffect(() => { // undo / redo changed it from outside
    if (text !== sent.current) {
      sent.current = text;
      setDraft(text);
      setInvalid(false);
    }
  }, [text]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const change = (value) => {
    setDraft(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const result = parse(value);
      setInvalid(!result.ok);
      if (result.ok) {
        sent.current = result.text;
        onCommit(result.data);
      }
    }, 400);
  };

  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">{label}</label>
      <input
        type="text"
        value={draft}
        onChange={(e) => change(e.target.value)}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className={`h-10 w-full rounded-md border bg-white px-2.5 text-sm ${invalid ? "border-danger" : "border-line"}`}
      />
      <p className={`mt-1 text-[11px] ${invalid ? "text-danger" : "text-muted"}`}>{invalid ? "Some of that could not be read yet. " : ""}{hint}</p>
    </div>
  );
}

function Stepper({ label, value, min, max, onChange }) {
  const button = "flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white hover:bg-sunken disabled:opacity-40";
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[11px] text-muted">{label}</div>
      <div className="flex items-center gap-1">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)} className={button}><Minus size={15} /></button>
        <span className="w-8 text-center text-sm font-medium tabular-nums" aria-live="polite">{value}</span>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)} className={button}><Plus size={15} /></button>
      </div>
    </div>
  );
}

/* ------------------------------ number line ------------------------------ */

function NumberLineSettings({ aid, commit }) {
  const [problem, setProblem] = useState("");
  const setRange = (partial) => {
    const next = { min: aid.min, max: aid.max, step: aid.step, ...partial };
    if (!validNumberLine(next)) {
      setProblem(next.min >= next.max ? "The start must be smaller than the end." : next.step <= 0 ? "The step must be more than 0." : `Use at most ${AID_LIMITS.ticks} tick marks: a bigger step, or a shorter line.`);
      return;
    }
    setProblem("");
    commit(partial);
  };
  const field = "h-9 w-full text-right";
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Line</FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          {[["Start", "min"], ["End", "max"], ["Step", "step"]].map(([name, key]) => (
            <label key={key} className="min-w-0 text-[11px] text-muted">
              {name}
              <NumberBox value={aid[key]} label={name} onCommit={(value) => setRange({ [key]: value })} className={`${field} mt-1 text-sm text-ink`} />
            </label>
          ))}
        </div>
        {problem && <p role="alert" className="mt-1.5 text-xs text-danger">{problem}</p>}
        <div className="scroll-thin mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {NUMBER_LINE_PRESETS.map((preset) => (
            <button key={preset.label} type="button" className={chip} onClick={() => { setProblem(""); commit({ min: preset.min, max: preset.max, step: preset.step }); }}>{preset.label}</button>
          ))}
        </div>
      </div>
      <ListField
        label="Points"
        hint="Numbers separated by commas, for example 2, 5.5, −3."
        placeholder="2, 5.5, -3"
        text={listToText(aid.marks || [])}
        parse={(value) => {
          const tokens = value.split(/[\s,;]+/).filter(Boolean);
          const data = parseNumberList(value);
          const ok = tokens.every((token) => Number.isFinite(Number(token.replace("−", "-")))) && tokens.length <= AID_LIMITS.marks;
          return { ok, data, text: listToText(data) };
        }}
        onCommit={(marks) => commit({ marks })}
      />
      <ListField
        label="Jumps"
        hint="Write each jump as from > to, for example 0 > 3, 3 > −2."
        placeholder="0 > 3, 3 > -2"
        text={jumpsToText(aid.jumps || [])}
        parse={(value) => {
          const pieces = value.split(/[,;]+/).filter((piece) => piece.trim());
          const data = parseJumps(value);
          return { ok: data.length === pieces.length && pieces.length <= AID_LIMITS.jumps, data, text: jumpsToText(data) };
        }}
        onCommit={(jumps) => commit({ jumps })}
      />
    </div>
  );
}

/* ------------------------------ unit circle ------------------------------ */

function UnitCircleSettings({ aid, commit }) {
  const angle = normalizeAngle(Number.isFinite(aid.angle) ? aid.angle : 0);
  const read = unitCircleReadout(angle);
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Angle</FieldLabel>
        <div className="flex items-center gap-2">
          <input type="range" min={0} max={360} step={1} value={Math.round(angle)} onChange={(e) => commit({ angle: Number(e.target.value) })} aria-label="Angle in degrees" className="h-8 min-w-0 flex-1" />
          <NumberBox value={angle} label="Angle in degrees" onCommit={(value) => commit({ angle: normalizeAngle(value) })} className="h-8 w-[4.25rem] text-right" />
          <span className="text-sm text-muted" aria-hidden="true">°</span>
        </div>
        <p className="mt-1.5 text-xs text-muted" aria-live="polite">
          {read.degrees}° = {read.radianLabel ? `${read.radianLabel} rad` : `${read.radians} rad`}. Drag the dot on the board too.
        </p>
        <div className="scroll-thin mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {SPECIAL_ANGLES.map((special) => (
            <button key={special} type="button" aria-pressed={Math.abs(angle - special) < 0.05} onClick={() => commit({ angle: special })}
              className={`${chip} tabular-nums ${Math.abs(angle - special) < 0.05 ? "border-accent bg-accent-soft text-accent" : ""}`}>
              {aid.radians ? radianLabel(special) : `${special}°`}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <ToggleRow checked={aid.snap !== false} onChange={(snap) => commit({ snap })} title="Snap to special angles" hint="The dot clicks onto 30°, 45°, 60° and so on as you drag." />
        <ToggleRow checked={Boolean(aid.radians)} onChange={(radians) => commit({ radians })} title="Show radians" hint="Label the circle with π fractions instead of degrees." />
        <ToggleRow checked={aid.showTriangle !== false} onChange={(showTriangle) => commit({ showTriangle })} title="Show the right triangle" hint="cos is the flat side, sin is the upright side." />
        <ToggleRow checked={aid.showValues !== false} onChange={(showValues) => commit({ showValues })} title="Show values" hint="cos, sin and tan next to the circle. Needs a wide enough box." />
      </div>
    </div>
  );
}

/* ------------------------------ fraction bars ------------------------------ */

function FractionSettings({ aid, commit }) {
  const bars = aid.bars || [];
  const setBar = (index, patch) => commit({ bars: bars.map((bar, i) => {
    if (i !== index) return bar;
    const next = { ...bar, ...patch };
    return { parts: next.parts, shaded: Math.max(0, Math.min(next.parts, next.shaded)) };
  }) });
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Shape</FieldLabel>
        <div role="group" aria-label="Shape" className="flex rounded-md bg-sunken p-0.5">
          {[["bar", "Bars"], ["pie", "Circles"]].map(([value, label]) => (
            <button key={value} type="button" aria-pressed={(aid.shape || "bar") === value} onClick={() => commit({ shape: value })}
              className={`h-9 flex-1 rounded text-sm ${(aid.shape || "bar") === value ? "bg-white font-medium shadow-sm" : "text-gray-700 hover:text-ink"}`}>{label}</button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <FieldLabel>Fractions</FieldLabel>
        {bars.map((bar, index) => (
          <div key={index} className="flex items-end gap-3 rounded-md border border-line p-2.5">
            <Stepper label="Parts" value={bar.parts} min={1} max={AID_LIMITS.parts} onChange={(parts) => setBar(index, { parts })} />
            <Stepper label="Shaded" value={bar.shaded} min={0} max={bar.parts} onChange={(shaded) => setBar(index, { shaded })} />
            <div className="ml-auto flex items-center gap-2">
              <span className="text-lg font-medium tabular-nums" aria-label={`${bar.shaded} out of ${bar.parts}`}>{bar.shaded}/{bar.parts}</span>
              {bars.length > 1 && (
                <button type="button" aria-label={`Remove fraction ${index + 1}`} onClick={() => commit({ bars: bars.filter((_, i) => i !== index) })} className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-sunken hover:text-danger">
                  <X size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-1.5">
          <button type="button" disabled={bars.length >= AID_LIMITS.bars} className={`${chip} disabled:opacity-40`}
            onClick={() => commit({ bars: [...bars, { parts: bars.at(-1)?.parts ?? 4, shaded: 0 }] })}>+ Add a fraction</button>
          <button type="button" className={chip} onClick={() => commit({ bars: [{ parts: 2, shaded: 1 }, { parts: 4, shaded: 2 }, { parts: 8, shaded: 4 }] })}>Equivalent: ½ = 2/4 = 4/8</button>
        </div>
        <p className="text-[11px] text-muted">Tap a part on the board to shade it, tap the last shaded part to clear it.</p>
      </div>
    </div>
  );
}

export default function AidInspector({ aid, store }) {
  const commit = (patch) => store.commit([{ op: "update", id: aid.id, patch }], { coalesce: `aid:${aid.id}` });
  return (
    <div className="space-y-5" aria-label="Math aid settings">
      {aid.kind === "unitcircle" ? <UnitCircleSettings aid={aid} commit={commit} />
        : aid.kind === "fractions" ? <FractionSettings aid={aid} commit={commit} />
          : aid.kind === "pollbars" ? <p className="text-sm text-muted">These are the results of your question, as they stood when you put them on the board. You can move, resize and recolour them.</p>
            : <NumberLineSettings aid={aid} commit={commit} />}
      <div className="border-t border-line pt-3">
        <FieldLabel>Colour</FieldLabel>
        <Swatches colors={PALETTE.filter((c) => c !== "#FFFFFF")} value={aid.color || "#2540D9"} onPick={(color) => store.commit([{ op: "update", id: aid.id, patch: { color } }], { coalesce: `aid-color:${aid.id}` })} />
      </div>
    </div>
  );
}
