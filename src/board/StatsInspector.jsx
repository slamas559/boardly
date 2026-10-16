// Editor for the selected statistics chart, in the same docked panel / phone sheet as the other editors.
// Paste or type data, pick the chart, and every number (mean, median, SD, regression ...) updates on the board.
import { useEffect, useRef, useState } from "react";
import { PALETTE } from "./constants.js";
import { Swatches } from "./Toolbar.jsx";
import { NumberBox } from "./GraphParams.jsx";
import { ToggleRow } from "./GraphExplore.jsx";
import { CHARTS, EXAMPLES, datasetToText, describeCorrelation, histogramBins, linearRegression, numbersOf, pairsOf, parseDataset, statsTable } from "./stats.js";

const FieldLabel = ({ children }) => <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">{children}</div>;
const chip = "h-8 shrink-0 rounded-md border border-line bg-white px-2.5 text-xs hover:bg-sunken";

function Segmented({ label, value, options, onChange }) {
  return (
    <div role="group" aria-label={label} className="flex rounded-md bg-sunken p-0.5">
      {options.map(([id, text]) => (
        <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)}
          className={`h-9 min-w-0 flex-1 truncate rounded px-1 text-sm ${value === id ? "bg-white font-medium shadow-sm" : "text-gray-700 hover:text-ink"}`}>{text}</button>
      ))}
    </div>
  );
}

/** The paste box. It reads the text as you type and updates the chart once the numbers make sense. */
function DataBox({ chart, commit }) {
  const stored = datasetToText(chart.columns);
  const [text, setText] = useState(stored);
  const [report, setReport] = useState(null);
  const timer = useRef(null);
  const sent = useRef(stored);

  useEffect(() => { // undo / redo or an example changed the data from outside
    if (stored !== sent.current) {
      sent.current = stored;
      setText(stored);
      setReport(null);
    }
  }, [stored]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const change = (value) => {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const parsed = parseDataset(value);
      setReport(parsed);
      if (parsed.ok) {
        sent.current = datasetToText(parsed.columns);
        commit({ columns: parsed.columns });
      }
    }, 450);
  };

  const shown = report ?? parseDataset(stored);
  const count = shown.columns.reduce((sum, column) => sum + numbersOf(column).length, 0);
  const summary = shown.ok
    ? `${shown.columns.length} column${shown.columns.length === 1 ? "" : "s"} · ${count} value${count === 1 ? "" : "s"}${shown.hasHeader ? " · names read from the first row" : ""}`
    : shown.notes[0];

  return (
    <div>
      <label htmlFor={`data-${chart.id}`} className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">Data</label>
      <textarea
        id={`data-${chart.id}`}
        value={text}
        onChange={(e) => change(e.target.value)}
        rows={7}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-invalid={shown.ok ? undefined : true}
        placeholder={"Paste from Excel or Google Sheets, or type numbers:\n45 52 58 61 64\n\nTwo columns for a scatter plot:\nHours\tScore\n1\t48\n2\t55"}
        className={`w-full resize-y rounded-md border bg-white px-2.5 py-2 font-mono text-[13px] leading-relaxed ${shown.ok ? "border-line" : "border-danger"}`}
      />
      <p className={`mt-1 text-[11px] ${shown.ok ? "text-muted" : "text-danger"}`} aria-live="polite">
        {summary}{shown.ok && shown.notes.length ? ` · ${shown.notes.join(" ")}` : ""}
      </p>
      {chart.chart === "scatter" && chart.columns.length < 2 && <p className="mt-1 text-[11px] text-danger">A scatter plot needs two columns (x and y).</p>}
    </div>
  );
}

function SummaryTable({ chart }) {
  const table = statsTable(chart);
  const fit = chart.chart === "scatter" ? linearRegression(pairsOf(chart.columns)) : null;
  return (
    <div>
      <FieldLabel>Summary</FieldLabel>
      <div className="scroll-thin overflow-x-auto rounded-md border border-line">
        <table className="w-full border-collapse text-sm" aria-label="Summary statistics">
          {table.headers.length > 0 && (
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th scope="col" className="px-2.5 py-1.5 text-left font-medium"><span className="sr-only">Statistic</span></th>
                {table.headers.map((name) => <th key={name} scope="col" className="px-2.5 py-1.5 text-right font-semibold text-ink">{name}</th>)}
              </tr>
            </thead>
          )}
          <tbody>
            {table.rows.map((row) => (
              <tr key={row[0]} className="border-b border-line/60 last:border-0">
                <th scope="row" className="px-2.5 py-1.5 text-left font-normal text-muted">{row[0]}</th>
                {row.slice(1).map((cell, index) => <td key={index} className="px-2.5 py-1.5 text-right font-medium tabular-nums">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {fit && <p className="mt-1.5 text-xs text-muted">The data show a <span className="font-medium text-ink">{describeCorrelation(fit.r)}</span> correlation.</p>}
      <p className="mt-1.5 text-[11px] text-muted">Quartiles are the medians of the lower and upper halves of the sorted data.</p>
    </div>
  );
}

export default function StatsInspector({ chart, store }) {
  const commit = (patch) => store.commit([{ op: "update", id: chart.id, patch }], { coalesce: `stats:${chart.id}` });
  const [title, setTitle] = useState(chart.title || "");
  const titleTimer = useRef(null);
  const sentTitle = useRef(chart.title || "");
  useEffect(() => {
    if ((chart.title || "") !== sentTitle.current) {
      sentTitle.current = chart.title || "";
      setTitle(chart.title || "");
    }
  }, [chart.title]);
  useEffect(() => () => clearTimeout(titleTimer.current), []);
  const changeTitle = (value) => {
    setTitle(value);
    clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => {
      sentTitle.current = value.trim();
      commit({ title: value.trim() || null });
    }, 400);
  };

  const autoWidth = chart.chart === "histogram" ? histogramBins(numbersOf(chart.columns?.[0])).width : null;

  return (
    <div className="space-y-5" aria-label="Chart settings">
      <div>
        <FieldLabel>Chart</FieldLabel>
        <Segmented label="Chart type" value={chart.chart} onChange={(value) => commit({ chart: value })} options={CHARTS.map((item) => [item.id, item.label])} />
      </div>

      <DataBox chart={chart} commit={commit} />

      <div>
        <FieldLabel>Examples</FieldLabel>
        <div className="scroll-thin flex gap-1.5 overflow-x-auto pb-1">
          {EXAMPLES.map((example) => (
            <button key={example.id} type="button" className={chip}
              onClick={() => commit({ chart: example.chart, columns: example.columns.map((column) => ({ ...column, values: [...column.values] })) })}>{example.label}</button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel>Show on the chart</FieldLabel>
        {chart.chart === "histogram" && (
          <>
            <div className="flex items-center gap-2 rounded-md border border-line px-2.5 py-2">
              <label htmlFor={`width-${chart.id}`} className="min-w-0 flex-1 text-sm">
                <span className="block font-medium">Class width</span>
                <span className="block text-[11px] text-muted">{chart.binWidth > 0 ? "Set by you" : `Chosen for you: ${autoWidth}`}</span>
              </label>
              <NumberBox value={chart.binWidth > 0 ? chart.binWidth : autoWidth} label="Class width" onCommit={(value) => value > 0 && commit({ binWidth: value })} className="h-9 w-20 text-right text-sm" />
              <button type="button" className={`${chip} ${chart.binWidth > 0 ? "" : "opacity-50"}`} disabled={!(chart.binWidth > 0)} onClick={() => commit({ binWidth: null })}>Auto</button>
            </div>
            <ToggleRow checked={Boolean(chart.showMean)} onChange={(showMean) => commit({ showMean })} title="Mean line" hint="A dashed line where the average falls." />
            <ToggleRow checked={Boolean(chart.showMedian)} onChange={(showMedian) => commit({ showMedian })} title="Median line" hint="The middle value of the sorted data." />
            <ToggleRow checked={chart.showCounts !== false} onChange={(showCounts) => commit({ showCounts })} title="Counts above the bars" hint="How many values are in each class." />
          </>
        )}
        {chart.chart === "box" && (
          <>
            <ToggleRow checked={Boolean(chart.showMean)} onChange={(showMean) => commit({ showMean })} title="Mean marker" hint="A cross where the average falls." />
            <ToggleRow checked={chart.showValues !== false} onChange={(showValues) => commit({ showValues })} title="Five numbers" hint="Minimum, Q1, median, Q3 and maximum (one group)." />
            <p className="text-[11px] text-muted">Points beyond 1.5 × IQR from the box are drawn as circles (outliers). Add more columns to compare groups.</p>
          </>
        )}
        {chart.chart === "scatter" && (
          <>
            <ToggleRow checked={chart.showLine !== false} onChange={(showLine) => commit({ showLine })} title="Line of best fit" hint="The least-squares regression line." />
            <ToggleRow checked={chart.showEquation !== false} onChange={(showEquation) => commit({ showEquation })} title="Equation and r" hint="Written on the chart." disabled={chart.showLine === false} />
          </>
        )}
        <ToggleRow checked={chart.showStats !== false} onChange={(showStats) => commit({ showStats })} title="Statistics table" hint="Shown beside the chart when it is wide enough." />
      </div>

      {chart.chart !== "scatter" && (
        <div>
          <FieldLabel>Standard deviation</FieldLabel>
          <Segmented label="Standard deviation" value={chart.sd === "population" ? "population" : "sample"} onChange={(sd) => commit({ sd })} options={[["sample", "Sample (n − 1)"], ["population", "Population (n)"]]} />
        </div>
      )}

      <SummaryTable chart={chart} />

      <div className="space-y-3 border-t border-line pt-3">
        <div>
          <label htmlFor={`title-${chart.id}`} className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted">Title</label>
          <input id={`title-${chart.id}`} type="text" value={title} maxLength={80} onChange={(e) => changeTitle(e.target.value)} placeholder="Optional, e.g. Class 4B maths test"
            className="h-10 w-full rounded-md border border-line bg-white px-2.5 text-sm" />
        </div>
        <div>
          <FieldLabel>Colour</FieldLabel>
          <Swatches colors={PALETTE.filter((c) => c !== "#FFFFFF")} value={chart.color || "#2540D9"} onPick={(color) => store.commit([{ op: "update", id: chart.id, patch: { color } }], { coalesce: `stats-color:${chart.id}` })} />
        </div>
      </div>
    </div>
  );
}
