// "Type" tab: write the formula the way you would on a calculator and it is typeset as you go.
// Shows the current formula in that notation when it can do so faithfully; otherwise it starts empty and
// says that typing replaces the formula.
import { useEffect, useRef, useState } from "react";
import { NATURAL_EXAMPLES, latexToNatural, naturalToLatex } from "./naturalMath.js";

export default function EquationType({ latex, onChange }) {
  const initial = latexToNatural(latex);
  const [text, setText] = useState(initial ?? "");
  const [replaces, setReplaces] = useState(initial === null);
  const [problem, setProblem] = useState("");
  const mine = useRef(latex); // the last formula this tab itself produced, so its own edits are not mistaken for outside ones

  useEffect(() => {
    if (latex === mine.current) return;
    mine.current = latex;
    const natural = latexToNatural(latex);
    setText(natural ?? "");
    setReplaces(natural === null);
    setProblem("");
  }, [latex]);

  const edit = (value) => {
    setText(value);
    setReplaces(false);
    const result = naturalToLatex(value);
    if (result.error) { setProblem(result.error); return; }
    setProblem("");
    if (!result.latex) return;
    mine.current = result.latex;
    onChange(result.latex);
  };

  return (
    <div className="space-y-2.5">
      <div>
        <label htmlFor="natural-formula" className="mb-1 block text-xs font-medium">Type your formula</label>
        <textarea
          id="natural-formula"
          value={text}
          rows={2}
          maxLength={300}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          placeholder="For example  x^2/3 + sqrt(x)"
          aria-invalid={problem ? true : undefined}
          aria-describedby="natural-help"
          onChange={(e) => edit(e.target.value)}
          className={`w-full resize-none rounded-md border bg-white px-2 py-2 font-mono text-[14px] leading-snug ${problem ? "border-danger" : "border-line"}`}
        />
        <div id="natural-help" aria-live="polite" className="mt-1 min-h-[1rem] text-xs">
          {problem && text.trim() ? <span className="text-muted">{problem}</span> : replaces ? <span className="text-muted">This formula can’t be shown in plain typing. Typing here will replace it.</span> : null}
        </div>
      </div>

      <div>
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted">Try one</div>
        <div className="flex flex-wrap gap-1.5">
          {NATURAL_EXAMPLES.map((example) => (
            <button key={example} type="button" onClick={() => edit(example)} className="h-7 rounded-md border border-line px-2 font-mono text-xs text-gray-800 hover:bg-sunken">
              {example}
            </button>
          ))}
        </div>
      </div>

      <details className="rounded-md border border-line px-3 py-2 text-sm">
        <summary className="cursor-pointer select-none text-xs font-medium">What can I type?</summary>
        <dl className="mt-2 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-xs leading-5 text-gray-700">
          <dt className="font-mono">a/b</dt><dd>fraction (use brackets for longer parts: <span className="font-mono">(a+b)/(c+d)</span>)</dd>
          <dt className="font-mono">x^2  x_1</dt><dd>power and subscript (<span className="font-mono">x^(n+1)</span> for longer ones)</dd>
          <dt className="font-mono">sqrt(x)</dt><dd>square root; <span className="font-mono">root(3, x)</span> for other roots</dd>
          <dt className="font-mono">abs(x)</dt><dd>absolute value</dd>
          <dt className="font-mono">pi alpha theta</dt><dd>Greek letters (also <span className="font-mono">inf</span> for ∞)</dd>
          <dt className="font-mono">sin cos tan ln log</dt><dd>functions: <span className="font-mono">sin(x)</span> or <span className="font-mono">sin x</span></dd>
          <dt className="font-mono">&lt;= &gt;= != +-</dt><dd>≤ ≥ ≠ ±</dd>
          <dt className="font-mono">binom(n, k)</dt><dd>“n choose k”</dd>
        </dl>
        <p className="mt-2 text-xs text-muted">For sums, integrals, limits and matrices use <strong className="font-medium">Templates</strong> or <strong className="font-medium">Keys</strong>.</p>
      </details>
    </div>
  );
}
