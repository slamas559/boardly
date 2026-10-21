// "Templates" tab: ready-made formulas with named blanks. Choose one, fill in the blanks (or leave letters),
// check the preview, and put it on the board in one step.
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { TEMPLATES, buildTemplate, defaultValues } from "./mathTemplates.js";
import { equationSvgUrl } from "./mathRender.js";

function Picture({ latex, color, height, label }) {
  const url = latex ? equationSvgUrl(latex, color) : null;
  return url ? <img src={url} alt={label} draggable={false} className="h-auto w-auto max-w-full" style={{ maxHeight: height }} /> : null;
}

export default function EquationTemplates({ onUse, color, ready }) {
  const [chosen, setChosen] = useState(null);
  const [values, setValues] = useState({});

  const gallery = useMemo(
    () => (ready ? TEMPLATES.map((template) => ({ template, latex: buildTemplate(template, defaultValues(template)).latex })) : []),
    [ready]
  );

  if (!chosen) {
    return (
      <div className="space-y-2">
        <p className="text-xs leading-5 text-muted">Pick a formula, then type your own numbers into the blanks.</p>
        <div className="grid grid-cols-2 gap-1.5">
          {TEMPLATES.map((template) => {
            const picture = gallery.find((g) => g.template.id === template.id);
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => { setChosen(template); setValues({}); }}
                className="flex min-h-[4.5rem] flex-col items-start justify-between gap-1.5 rounded-md border border-line bg-white p-2 text-left hover:bg-sunken"
              >
                <span className="text-xs font-medium text-ink">{template.name}</span>
                <span className="flex h-8 w-full items-center overflow-hidden">
                  <Picture latex={picture?.latex} color="#17181C" height={30} label="" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const built = buildTemplate(chosen, values);
  return (
    <div className="space-y-3">
      <button type="button" onClick={() => setChosen(null)} className="flex h-8 items-center gap-1.5 rounded-md px-1.5 text-sm text-gray-700 hover:bg-sunken">
        <ArrowLeft size={15} /> All templates
      </button>
      <div>
        <h4 className="text-sm font-semibold">{chosen.name}</h4>
        <div className="mt-2 flex min-h-[64px] items-center justify-center overflow-hidden rounded-md border border-line bg-white p-3" aria-live="polite">
          {built.latex ? <Picture latex={built.latex} color={color} height={100} label={`Preview: ${built.latex}`} /> : <span className="text-xs text-muted">{built.error}</span>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {chosen.fields.map((f) => (
          <label key={f.key} className="block text-xs font-medium">
            {f.label}
            <input
              type="text"
              value={values[f.key] ?? ""}
              placeholder={f.value}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={built.key === f.key ? true : undefined}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              className={`mt-1 h-9 w-full rounded-md border bg-white px-2 font-mono text-[14px] ${built.key === f.key ? "border-danger" : "border-line"}`}
            />
          </label>
        ))}
      </div>
      <p className="text-xs text-muted">Leave a blank empty to keep its letter.</p>
      <button
        type="button"
        disabled={!built.latex}
        onClick={() => { onUse(built.latex); setChosen(null); }}
        className="h-10 w-full rounded-md bg-accent text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
      >
        Use this formula
      </button>
    </div>
  );
}
