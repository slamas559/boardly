// Settings for the selected 3D solid, in the same docked panel / phone sheet as the other editors: its sizes,
// colour and how it is drawn, with the volume and surface area worked out. Changes apply to the board as you go.
import { useEffect, useRef, useState } from "react";
import { PALETTE } from "./constants.js";
import { Swatches } from "./Toolbar.jsx";
import { NumberBox } from "./GraphParams.jsx";
import { ToggleRow } from "./GraphExplore.jsx";
import { SOLIDS, SOLID_LIMITS, defaultSizes, measureLines, solidInfo, solidSizes, solidTitle } from "./solids.js";

const FieldLabel = ({ children }) => <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">{children}</div>;
const chip = "h-8 shrink-0 rounded-md border border-line bg-white px-2.5 text-xs hover:bg-sunken";

const VIEWS = [
  { label: "Corner", azimuth: 38, elevation: 24 },
  { label: "Front", azimuth: 0, elevation: 6 },
  { label: "Side", azimuth: 90, elevation: 6 },
  { label: "Top", azimuth: 0, elevation: 86 },
];

/** A text field that applies after a short pause, and follows undo/redo from outside. */
function TextField({ id, label, value, placeholder, maxLength, onCommit }) {
  const [draft, setDraft] = useState(value);
  const timer = useRef(null);
  const sent = useRef(value);
  useEffect(() => {
    if (value !== sent.current) { sent.current = value; setDraft(value); }
  }, [value]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div>
      <label htmlFor={id}><FieldLabel>{label}</FieldLabel></label>
      <input
        id={id}
        value={draft}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => {
          setDraft(e.target.value);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => { sent.current = e.target.value; onCommit(e.target.value); }, 350);
        }}
        className="h-9 w-full rounded-md border border-line bg-white px-2.5 text-sm"
      />
    </div>
  );
}

export default function SolidInspector({ solid, store }) {
  const commit = (patch) => store.commit([{ op: "update", id: solid.id, patch }], { coalesce: `solid:${solid.id}` });
  const info = solidInfo(solid.kind);
  const sizes = solidSizes(solid);
  const lines = measureLines(solid);
  const range = `${SOLID_LIMITS.min} to ${SOLID_LIMITS.max}`;

  const setSize = (key, value) => {
    if (value < SOLID_LIMITS.min || value > SOLID_LIMITS.max) return;
    commit({ params: { ...sizes, [key]: value } });
  };

  return (
    <div className="space-y-4 p-3">
      <div>
        <FieldLabel>Solid</FieldLabel>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Kind of solid">
          {SOLIDS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === info.id}
              onClick={() => item.id !== info.id && commit({ kind: item.id, params: defaultSizes(item.id) })}
              className={`${chip} ${item.id === info.id ? "border-ink bg-sunken font-medium" : ""}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Sizes</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {info.params.map((param) => (
            <label key={param.key} className="block">
              <span className="mb-1 block text-xs text-muted">{param.label} ({param.symbol})</span>
              <NumberBox value={sizes[param.key]} label={`${param.label} of the ${info.label.toLowerCase()}`} onCommit={(n) => setSize(param.key, n)} className="h-9 w-full" />
            </label>
          ))}
          <TextField id={`unit-${solid.id}`} label="Unit" value={solid.unit || ""} placeholder="cm, m, in …" maxLength={SOLID_LIMITS.unitLength} onCommit={(value) => commit({ unit: value.trim() })} />
        </div>
        <p className="mt-1 text-[11px] text-muted">Sizes from {range}.</p>
      </div>

      <div>
        <FieldLabel>View</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {VIEWS.map((view) => <button key={view.label} type="button" className={chip} onClick={() => commit({ azimuth: view.azimuth, elevation: view.elevation })}>{view.label}</button>)}
        </div>
        <p className="mt-1 text-[11px] text-muted">Drag the solid on the board to turn it. To move the card, drag its title or its edge.</p>
      </div>

      <div>
        <FieldLabel>Colour</FieldLabel>
        <Swatches colors={PALETTE.filter((c) => c !== "#FFFFFF")} value={solid.color || "#2540D9"} onPick={(color) => commit({ color })} />
      </div>

      <div className="space-y-1.5">
        <FieldLabel>Show</FieldLabel>
        <ToggleRow checked={solid.edges !== false} onChange={(checked) => commit({ edges: checked })} title="Edges" hint="Draw the outline of every face" />
        <ToggleRow checked={solid.seeThrough === true} onChange={(checked) => commit({ seeThrough: checked })} title="See-through" hint="See the hidden edges and faces" />
        <ToggleRow checked={solid.labels !== false} onChange={(checked) => commit({ labels: checked })} title="Sizes on the solid" hint="Mark each size with a line and a label" />
        <ToggleRow checked={solid.measures !== false} onChange={(checked) => commit({ measures: checked })} title="Volume and surface area" hint="Show the formulas and working on the board" />
      </div>

      <TextField id={`title-${solid.id}`} label="Title" value={solid.title ?? ""} placeholder={solidTitle({ ...solid, title: undefined })} maxLength={SOLID_LIMITS.titleLength} onCommit={(value) => commit({ title: value === "" ? null : value })} />
      <p className="-mt-2 text-[11px] text-muted">Leave empty for the default name. A single space hides the title.</p>

      <div>
        <FieldLabel>Working</FieldLabel>
        <div className="space-y-2 rounded-md border border-line p-2.5 text-sm">
          {[lines.volume, lines.surface].map((item) => (
            <div key={item.label}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="font-semibold">{item.label}</span>
                <span className="text-xs text-muted">{item.formula}</span>
              </div>
              <div className="tabular-nums">= {item.working} = <span className="font-semibold">{item.answer}</span></div>
            </div>
          ))}
          {lines.extras.map((extra) => <div key={extra.label} className="text-xs text-muted">{extra.text}</div>)}
        </div>
      </div>
    </div>
  );
}
