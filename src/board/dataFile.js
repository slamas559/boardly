// Reading a data file (CSV, TSV, text or an Excel .xlsx workbook) into a table of text cells, and choosing which
// columns of it to chart. The chart's own reader (parseDataset in stats.js) then turns the chosen columns into
// numbers, so a file behaves exactly like pasted data. Pure functions apart from readTableFile, so they are testable.
import { STATS_LIMITS, cellNumber } from "./stats.js";

export const FILE_LIMITS = { textBytes: 5 * 1024 * 1024, xlsxBytes: 10 * 1024 * 1024, rows: 5000, columns: 200 };
export const FILE_ACCEPT = ".csv,.tsv,.txt,.xlsx,text/csv,text/tab-separated-values,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/* ------------------------------ CSV and friends ------------------------------ */

const DELIMITERS = ["\t", ";", ",", "|"];

/** Pick the separator that splits the first lines the same way every time. */
export function detectDelimiter(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "").slice(0, 8);
  let best = ",";
  let bestScore = 0;
  for (const delimiter of DELIMITERS) {
    const counts = lines.map((line) => {
      let n = 0;
      let quoted = false;
      for (const ch of line) {
        if (ch === '"') quoted = !quoted;
        else if (ch === delimiter && !quoted) n++;
      }
      return n;
    });
    if (!counts.length || counts[0] === 0) continue;
    const consistent = counts.filter((n) => n === counts[0]).length / counts.length;
    const score = consistent * 100 + counts[0]; // consistency first, then how many columns it makes
    if (score > bestScore) { best = delimiter; bestScore = score; }
  }
  return best;
}

/** Split delimited text into rows of cells. Handles quoted cells, doubled quotes, CRLF and a leading BOM. */
export function parseDelimited(input, delimiter) {
  const text = String(input ?? "").replace(/^\uFEFF/, "");
  const sep = delimiter || detectDelimiter(text);
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const endRow = () => {
    row.push(cell);
    cell = "";
    if (row.some((value) => value.trim() !== "")) rows.push(row.slice(0, FILE_LIMITS.columns));
    row = [];
  };
  for (let i = 0; i < text.length && rows.length < FILE_LIMITS.rows; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else cell += ch;
  }
  if (cell !== "" || row.length) endRow();
  return { rows, delimiter: sep };
}

/* ----------------------------------- Excel ----------------------------------- */

const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decodeXml = (text) => text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, name) => {
  if (name[0] === "#") {
    const code = name[1].toLowerCase() === "x" ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
    return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
  }
  return entities[name.toLowerCase()] ?? "";
});

const textOf = (xml) => {
  const parts = [];
  const re = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
  let m;
  while ((m = re.exec(xml))) parts.push(m[1]);
  return decodeXml(parts.join(""));
};

const columnIndex = (ref) => {
  const letters = /^[A-Z]+/i.exec(ref)?.[0].toUpperCase() ?? "A";
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

/** Rows of text from the first worksheet of an .xlsx file. `files` is the unzipped package: { path: Uint8Array }. */
export function xlsxToRows(files, decode) {
  const read = (path) => (files[path] ? decode(files[path]) : null);
  const workbook = read("xl/workbook.xml");
  if (!workbook) throw new Error("This does not look like an Excel .xlsx file.");

  let sheetPath = "xl/worksheets/sheet1.xml";
  const first = /<sheet\b[^>]*>/.exec(workbook)?.[0];
  const rid = first && /r:id="([^"]+)"/.exec(first)?.[1];
  const rels = read("xl/_rels/workbook.xml.rels");
  if (rid && rels) {
    const rel = new RegExp(`<Relationship\\b[^>]*Id="${rid}"[^>]*>`).exec(rels)?.[0];
    const target = rel && /Target="([^"]+)"/.exec(rel)?.[1];
    if (target) sheetPath = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
  }
  const sheet = read(sheetPath);
  if (!sheet) throw new Error("The first sheet of this workbook could not be read.");

  const shared = [];
  const sharedXml = read("xl/sharedStrings.xml");
  if (sharedXml) {
    const re = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
    let m;
    while ((m = re.exec(sharedXml))) shared.push(textOf(m[1].replace(/<rPh\b[\s\S]*?<\/rPh>/g, "")));
  }

  const grid = [];
  const cells = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
  let c;
  while ((c = cells.exec(sheet))) {
    const attrs = c[1];
    const ref = /\br="([A-Z]+)(\d+)"/i.exec(attrs);
    if (!ref) continue;
    const row = Number(ref[2]) - 1;
    const col = columnIndex(ref[1]);
    if (row >= FILE_LIMITS.rows || col >= FILE_LIMITS.columns || !c[2]) continue;
    const type = /\bt="([^"]+)"/.exec(attrs)?.[1];
    const body = c[2];
    let value = "";
    if (type === "inlineStr") value = textOf(body);
    else {
      const raw = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "";
      if (type === "s") value = shared[Number(raw)] ?? "";
      else if (type === "b") value = raw === "1" ? "TRUE" : "FALSE";
      else if (type === "e") value = "";
      else value = decodeXml(raw);
    }
    (grid[row] ||= [])[col] = value;
  }
  const rows = [];
  for (const row of grid) {
    if (!row) { if (rows.length) rows.push([]); continue; }
    const filled = Array.from(row, (cell) => cell ?? "");
    if (filled.some((cell) => cell.trim() !== "")) rows.push(filled);
    else if (rows.length) rows.push([]);
  }
  return rows.filter((row) => row.length > 0);
}

/* ------------------------------- the whole file ------------------------------- */

/** Read a File into a table: { rows, delimiter }. Throws an Error whose message can be shown as it is. */
export async function readTableFile(file) {
  const name = String(file?.name || "").toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
  if (ext === "xls") throw new Error("Old .xls files are not supported. In Excel, choose Save As and pick .xlsx or .csv.");
  if (["pdf", "doc", "docx", "ppt", "pptx", "png", "jpg", "jpeg", "gif", "zip"].includes(ext)) throw new Error("Choose a .csv, .tsv, .txt or .xlsx file.");

  if (ext === "xlsx") {
    if (file.size > FILE_LIMITS.xlsxBytes) throw new Error("That file is too large (10 MB at most).");
    const { unzipSync, strFromU8 } = await import("fflate");
    let files;
    try {
      files = unzipSync(new Uint8Array(await file.arrayBuffer()), {
        filter: (entry) => /^xl\/(workbook\.xml|_rels\/workbook\.xml\.rels|sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(entry.name) && entry.originalSize < 40 * 1024 * 1024,
      });
    } catch {
      throw new Error("This workbook could not be opened. Is it a valid .xlsx file?");
    }
    return { rows: xlsxToRows(files, strFromU8), delimiter: "\t" };
  }

  if (file.size > FILE_LIMITS.textBytes) throw new Error("That file is too large (5 MB at most).");
  const text = await file.text();
  if (text.includes("\u0000")) throw new Error("This does not look like a text or CSV file.");
  return parseDelimited(text);
}

/* ------------------------------ choosing columns ------------------------------ */

// "3,14" (a decimal comma) in a file that does not use commas to separate columns
const commaDecimal = (cell) => (/^[-+]?\d+,\d+$/.test(cell.trim()) ? cell.trim().replace(",", ".") : cell);

/**
 * What the table holds: whether the first row is a header, and for each column its name and how many of its
 * values are numbers. Numeric columns are the ones that can be charted.
 */
export function describeTable(rows, delimiter = ",") {
  const clean = (cell) => (delimiter === "," ? String(cell ?? "") : commaDecimal(String(cell ?? "")));
  const width = Math.min(FILE_LIMITS.columns, Math.max(0, ...rows.map((row) => row.length)));
  const first = (rows[0] || []).map(clean);
  const body = rows.slice(1).map((row) => row.map(clean));
  const hasHeader = rows.length > 1 && first.some((cell) => cell.trim() !== "" && cellNumber(cell) === null)
    && body.some((row) => row.some((cell) => cellNumber(cell) !== null));
  const dataRows = (hasHeader ? body : rows.map((row) => row.map(clean)));
  const columns = Array.from({ length: width }, (_, index) => {
    const filled = dataRows.map((row) => row[index] ?? "").filter((cell) => cell.trim() !== "");
    const numbers = filled.filter((cell) => cellNumber(cell) !== null).length;
    const named = hasHeader ? first[index]?.trim() : "";
    return {
      index,
      name: (named || `Column ${index + 1}`).slice(0, STATS_LIMITS.nameLength),
      count: numbers,
      numeric: numbers > 0 && numbers >= filled.length * 0.5,
    };
  });
  return { hasHeader, dataRows, columns, numeric: columns.filter((column) => column.numeric) };
}

/** Tab-separated text of the chosen columns (with their names) for the chart's data box. */
export function tableToText(table, indexes) {
  const names = indexes.map((index) => table.columns[index].name.replace(/[\t\r\n]+/g, " "));
  const lines = [names.join("\t")];
  for (const row of table.dataRows) lines.push(indexes.map((index) => String(row[index] ?? "").replace(/[\t\r\n]+/g, " ")).join("\t"));
  return lines.join("\n");
}

/** How many columns a chart can use: a scatter plot needs exactly an x and a y. */
export const maxColumnsFor = (chartKind) => (chartKind === "scatter" ? 2 : STATS_LIMITS.columns);
