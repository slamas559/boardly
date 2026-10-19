import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { describeTable, detectDelimiter, maxColumnsFor, parseDelimited, readTableFile, tableToText, xlsxToRows } from '../src/board/dataFile.js';
import { parseDataset } from '../src/board/stats.js';

const fileOf = (name, content) => {
  const bytes = typeof content === 'string' ? strToU8(content) : content;
  return { name, size: bytes.length, async arrayBuffer() { return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length); }, async text() { return new TextDecoder().decode(bytes); } };
};

test('detects comma, semicolon, tab and pipe separated text', () => {
  assert.equal(detectDelimiter('a,b,c\n1,2,3'), ',');
  assert.equal(detectDelimiter('a;b;c\n1;2;3'), ';');
  assert.equal(detectDelimiter('a\tb\n1\t2'), '\t');
  assert.equal(detectDelimiter('a|b\n1|2'), '|');
  assert.equal(detectDelimiter('a, "b; c"\n1, 2'), ',');
});

test('reads quoted cells, doubled quotes, CRLF and a leading BOM', () => {
  const { rows } = parseDelimited('\uFEFFx,y,label\r\n1,2,"a, b"\r\n3,4,"say ""hi"""\r\n\r\n5,6,c');
  assert.deepEqual(rows, [['x', 'y', 'label'], ['1', '2', 'a, b'], ['3', '4', 'say "hi"'], ['5', '6', 'c']]);
});

test('finds the header and the numeric columns', () => {
  const { rows, delimiter } = parseDelimited('Hours,Score,Name\n1,48,Ada\n2,55,Ben\n3,61,Chi');
  const table = describeTable(rows, delimiter);
  assert.equal(table.hasHeader, true);
  assert.deepEqual(table.numeric.map((c) => c.name), ['Hours', 'Score']);
  assert.equal(table.columns[2].numeric, false);
  assert.deepEqual(parseDataset(tableToText(table, [0, 1])).columns.map((c) => c.values), [[1, 2, 3], [48, 55, 61]]);
});

test('a file with no header row gets generic column names', () => {
  const { rows, delimiter } = parseDelimited('1,2\n3,4\n5,6');
  const table = describeTable(rows, delimiter);
  assert.equal(table.hasHeader, false);
  assert.deepEqual(table.columns.map((c) => c.name), ['Column 1', 'Column 2']);
  assert.equal(table.dataRows.length, 3);
});

test('decimal commas work in semicolon files', () => {
  const { rows, delimiter } = parseDelimited('x;y\n1,5;2,5\n3;4,25');
  const parsed = parseDataset(tableToText(describeTable(rows, delimiter), [0, 1]));
  assert.deepEqual(parsed.columns.map((c) => c.values), [[1.5, 3], [2.5, 4.25]]);
});

test('numbers with blanks keep their rows, so x and y stay paired', () => {
  const { rows, delimiter } = parseDelimited('x,y\n1,10\n2,\n3,30');
  const parsed = parseDataset(tableToText(describeTable(rows, delimiter), [0, 1]));
  assert.deepEqual(parsed.columns[1].values, [10, null, 30]);
});

function workbook(sheetXml, sharedXml) {
  return zipSync({
    'xl/workbook.xml': strToU8('<workbook xmlns:r="x"><sheets><sheet name="Data" sheetId="1" r:id="rId7"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': strToU8('<Relationships><Relationship Id="rId7" Type="t/worksheet" Target="worksheets/sheet3.xml"/></Relationships>'),
    'xl/worksheets/sheet3.xml': strToU8(sheetXml),
    ...(sharedXml ? { 'xl/sharedStrings.xml': strToU8(sharedXml) } : {}),
  });
}

test('reads the first sheet of an .xlsx file (shared strings, numbers, inline strings, gaps, entities)', async () => {
  const shared = '<sst><si><t>Hours</t></si><si><r><t>Sc</t></r><r><t>ore</t></r></si><si><t>R&amp;D</t></si></sst>';
  const sheet = '<worksheet><sheetData>'
    + '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="D1" t="inlineStr"><is><t>Team</t></is></c></row>'
    + '<row r="2"><c r="A2"><v>1</v></c><c r="B2"><v>48.5</v></c><c r="D2" t="s"><v>2</v></c></row>'
    + '<row r="3"><c r="A3"><v>2</v></c><c r="B3" t="str"><v>55</v></c></row>'
    + '</sheetData></worksheet>';
  const { rows } = await readTableFile(fileOf('scores.xlsx', workbook(sheet, shared)));
  assert.deepEqual(rows, [['Hours', 'Score', '', 'Team'], ['1', '48.5', '', 'R&D'], ['2', '55']]);
  const table = describeTable(rows, '\t');
  assert.deepEqual(table.numeric.map((c) => c.name), ['Hours', 'Score']);
});

test('a zip that is not a workbook is refused with a clear message', async () => {
  await assert.rejects(readTableFile(fileOf('x.xlsx', zipSync({ 'hello.txt': strToU8('hi') }))), /Excel/);
  await assert.rejects(readTableFile(fileOf('x.xlsx', strToU8('not a zip'))), /valid \.xlsx/);
});

test('unsupported and oversized files are refused with a clear message', async () => {
  await assert.rejects(readTableFile(fileOf('old.xls', 'x')), /\.xls/);
  await assert.rejects(readTableFile(fileOf('photo.png', 'x')), /\.csv/);
  await assert.rejects(readTableFile({ name: 'big.csv', size: 6 * 1024 * 1024, text: async () => '' }), /too large/);
  await assert.rejects(readTableFile(fileOf('bin.csv', 'a,b\u0000\n1,2')), /text or CSV/);
});

test('a scatter plot uses two columns, other charts up to four', () => {
  assert.equal(maxColumnsFor('scatter'), 2);
  assert.equal(maxColumnsFor('box'), 4);
});

test('xlsxToRows rejects a package without a workbook', () => {
  assert.throws(() => xlsxToRows({}, (x) => x), /Excel/);
});
