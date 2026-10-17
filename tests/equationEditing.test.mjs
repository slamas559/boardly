import test from 'node:test';
import assert from 'node:assert/strict';
import { latexToNatural, naturalToLatex, isCompound, NATURAL_EXAMPLES } from '../src/board/naturalMath.js';
import { parseParts, replacePart, highlightRange, groupParts, partDisplay } from '../src/board/latexParts.js';
import { TEMPLATES, buildTemplate, defaultValues } from '../src/board/mathTemplates.js';
import { KEYS } from '../src/board/mathKeys.js';
import { ensureMath, renderLatex } from '../src/board/mathRender.js';

const tex = (input) => naturalToLatex(input).latex;
const labels = (latex) => parseParts(latex).map((p) => `${p.label}|${partDisplay(p)}`);

/* ------------------------------ typing naturally ------------------------------ */

test('natural typing: fractions, powers, roots and functions', () => {
  assert.equal(tex('x^2/3 + sqrt(x)'), '\\frac{x^{2}}{3} + \\sqrt{x}');
  assert.equal(tex('(a+b)/2'), '\\frac{a + b}{2}');
  assert.equal(tex('2x/3'), '\\frac{2x}{3}');
  assert.equal(tex('a/bc'), '\\frac{a}{bc}');
  assert.equal(tex('x^(n+1)'), 'x^{n + 1}');
  assert.equal(tex('x^2^3'), 'x^{2^{3}}');
  assert.equal(tex('x_1 + x_12'), 'x_{1} + x_{12}');
  assert.equal(tex('root(3, x)'), '\\sqrt[3]{x}');
  assert.equal(tex('cbrt(8)'), '\\sqrt[3]{8}');
  assert.equal(tex('abs(x-1)'), '\\left|x - 1\\right|');
  assert.equal(tex('sin(x)^2 + cos(x)^2 = 1'), '\\sin(x)^{2} + \\cos(x)^{2} = 1');
  assert.equal(tex('sin^2(x)'), '\\sin^{2}(x)');
  assert.equal(tex('sinx'), '\\sin x');
  assert.equal(tex('binom(n, k)'), '\\binom{n}{k}');
});

test('natural typing: symbols, multiplication and signs', () => {
  assert.equal(tex('pi*r^2'), '\\pi r^{2}');
  assert.equal(tex('π r²'), '\\pi r^{2}');
  assert.equal(tex('4*a*c'), '4ac');
  assert.equal(tex('2*3'), '2 \\cdot 3');
  assert.equal(tex('2 3'), '2 \\cdot 3');
  assert.equal(tex('x × y'), 'x \\times y');
  assert.equal(tex('a <= b'), 'a \\leq b');
  assert.equal(tex('a != b'), 'a \\neq b');
  assert.equal(tex('-b +- sqrt(b^2)'), '-b \\pm \\sqrt{b^{2}}');
  assert.equal(tex('-x^2'), '-x^{2}');
  assert.equal(tex('90°'), '90^{\\circ}');
  assert.equal(tex('e^(i*pi) + 1 = 0'), 'e^{i\\pi } + 1 = 0');
  assert.equal(tex('x i'), 'xi');
  assert.equal(tex('xi'), '\\xi');
});

test('natural typing: unfinished or wrong input gives a gentle message, never a crash', () => {
  for (const bad of ['x^', '(1+2', '1+2)', 'sqrt', '3 +', '@', '|x|', 'root(1)', '((((((((((((((((((((((((((((((((x))))))))))))))))))))))))))))))))']) {
    const result = naturalToLatex(bad);
    assert.ok(result.error && !result.latex, `${bad} should be rejected`);
  }
  assert.deepEqual(naturalToLatex('   '), { latex: '', error: '' });
  assert.ok(naturalToLatex('x'.repeat(400)).error);
});

test('every example offered in the Type tab is valid', async () => {
  await ensureMath();
  for (const example of NATURAL_EXAMPLES) {
    const result = naturalToLatex(example);
    assert.equal(result.error, '', example);
    assert.equal(renderLatex(result.latex).error, '', example);
  }
});

test('LaTeX -> natural only answers when it reads back as the very same formula', () => {
  assert.equal(latexToNatural('y = x^{2}'), 'y = x^2');
  assert.equal(latexToNatural('x = \\frac{-b \\pm \\sqrt{b^{2} - 4ac}}{2a}'), 'x = (-b ± sqrt(b^2 - 4ac))/2a');
  assert.equal(latexToNatural('A = \\pi r^{2}'), 'A = pi r^2');
  assert.equal(latexToNatural('\\sqrt[3]{x}'), 'root(3, x)');
  assert.equal(latexToNatural('x i'), 'x i');
  // things plain typing cannot express are reported as null, not shown wrongly
  for (const hard of ['\\int_{a}^{b} f(x)\\,dx', '\\frac{1}{2}x', '\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}', "f'(x)", '\\text{area}']) assert.equal(latexToNatural(hard), null, hard);
  // and whatever it does show round-trips, for every ready-made formula of the keyboard
  for (const key of KEYS.library) {
    const natural = latexToNatural(key.insert);
    if (natural !== null) assert.equal(tex(natural).replace(/\s+/g, ''), key.insert.replace(/\s+/g, ''), key.label);
  }
  assert.equal(latexToNatural(''), '');
});

test('isCompound spots top-level sums and relations only', () => {
  assert.equal(isCompound('a + b'), true);
  assert.equal(isCompound('-3'), true);
  assert.equal(isCompound('a = b'), true);
  assert.equal(isCompound('a \\pm b'), true);
  assert.equal(isCompound('\\frac{a + b}{c}'), false);
  assert.equal(isCompound('(a + b)'), false);
  assert.equal(isCompound('x^{n - 1}'), false);
  assert.equal(isCompound('4ac'), false);
});

/* ------------------------------ editing parts ------------------------------ */

test('parts are labelled by where they sit', () => {
  assert.deepEqual(labels('y = x^{2}'), ['Formula|y', 'Formula|x', 'Power|2']);
  assert.deepEqual(labels('\\frac{2}{x^{3}}'), ['Numerator|2', 'Denominator|x', 'Denominator · Power|3']);
  assert.deepEqual(labels('\\sqrt[3]{8}'), ['Root index|3', 'Inside root|8']);
  assert.deepEqual(labels('x^2 + y_1'), ['Formula|x', 'Power|2', 'Formula|y', 'Subscript|1']);
  assert.deepEqual(labels('\\sum_{n=1}^{N} n'), ['Lower limit|n', 'Lower limit|1', 'Upper limit|N', 'Formula|n']);
  assert.deepEqual(labels('\\log_{2} x'), ['Base|2', 'Formula|x']);
  assert.deepEqual(labels('\\begin{pmatrix} 1 & 2 \\\\ 3 & \\pi \\end{pmatrix}'), ['Row 1, column 1|1', 'Row 1, column 2|2', 'Row 2, column 1|3', 'Row 2, column 2|π']);
  assert.deepEqual(labels('\\text{area} = \\pi r^{2}'), ['Formula|π', 'Formula|r', 'Power|2']); // words are left alone
  assert.deepEqual(labels('\\left(a+1\\right)'), ['Formula|a', 'Formula|1']);
  assert.deepEqual(parseParts('+ - = ()'), []);
});

test('parts of the quadratic formula are all reachable', () => {
  const parts = parseParts('x = \\frac{-b \\pm \\sqrt{b^{2} - 4ac}}{2a}');
  assert.equal(parts.length, 9);
  assert.deepEqual(groupParts(parts).map((g) => g.label), ['Formula', 'Numerator', 'Numerator · Inside root', 'Numerator · Inside root · Power', 'Numerator · Inside root', 'Denominator']);
});

test('changing one part rewrites only that part', () => {
  const edit = (latex, index, value) => {
    const result = replacePart(latex, parseParts(latex)[index], value);
    return result.error ? `error:${result.error}` : result.latex;
  };
  assert.equal(edit('y = x^{2}', 2, '3'), 'y = x^{3}');
  assert.equal(edit('y = x^{2}', 2, '2.5'), 'y = x^{2.5}');
  assert.equal(edit('\\frac{2}{x}', 0, '7'), '\\frac{7}{x}');
  assert.equal(edit('\\frac{2}{x}', 0, 'a+b'), '\\frac{a + b}{x}'); // alone in its group: no brackets needed
  assert.equal(edit('4ac', 1, 'x+1'), '4(x + 1)c'); // among other things: brackets keep the meaning
  assert.equal(edit('x = -b', 1, '-3'), 'x = -(-3)');
  assert.equal(edit('x^2', 1, '12'), 'x^{12}'); // a bare power is wrapped when it grows
  assert.equal(edit('x^2', 1, 'n+1'), 'x^{n + 1}');
  assert.equal(edit('x^2', 1, 'pi'), 'x^\\pi');
  assert.equal(edit('4ac', 1, 'pi'), '4\\pi c'); // never \pic
  assert.equal(edit('\\pi2', 1, 'x'), '\\pi x'); // never \pix
  assert.equal(edit('y = x', 0, 'alpha'), '\\alpha = x');
  assert.match(edit('y = x', 1, ''), /^error/);
  assert.match(edit('y = x', 1, '(('), /^error/);
});

test('replacing the same part again and again always starts from the original (no damage while typing)', () => {
  const base = 'a + 4ac';
  const part = parseParts(base)[2]; // the "a" in 4ac
  const results = Object.fromEntries(['x', 'x+', 'x+1', 'x+12'].map((typed) => [typed, replacePart(base, part, typed)]));
  assert.equal(results.x.latex, 'a + 4xc');
  assert.ok(results['x+'].error); // half typed: nothing changes
  assert.equal(results['x+1'].latex, 'a + 4(x + 1)c');
  assert.equal(results['x+12'].latex, 'a + 4(x + 12)c'); // each keystroke starts again from the original
});

test('the edited piece can be boxed for the preview', () => {
  const result = replacePart('y = x^{2}', parseParts('y = x^{2}')[2], '3');
  assert.equal(highlightRange(result.latex, result), 'y = x^{{\\boxed{3}}}');
  assert.equal(highlightRange('x', null), null);
  assert.equal(highlightRange('x', { start: 0, end: 5 }), null);
});

test('every formula in the ready-made library can be taken apart and boxed, and still typesets', async () => {
  await ensureMath();
  for (const key of KEYS.library) {
    const parts = parseParts(key.insert);
    assert.ok(parts.length > 0, key.label);
    for (const part of parts) {
      // putting the same value back leaves the formula as it was
      const same = replacePart(key.insert, part, partDisplay(part));
      assert.ok(same.latex, `${key.label} part ${part.index}`);
      const boxed = highlightRange(same.latex, same);
      assert.equal(renderLatex(boxed).error, '', `${key.label} part ${part.index}: ${boxed}`);
      assert.equal(renderLatex(same.latex).error, '', `${key.label} part ${part.index}`);
    }
  }
});

test('editing parts of a matrix keeps the matrix valid', async () => {
  await ensureMath();
  const matrix = KEYS.functions.find((k) => k.label === '2×2').insert.replace('‸', '');
  const parts = parseParts(matrix);
  assert.equal(parts.length, 0); // empty cells have no values yet
  const filled = '\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}';
  const edited = replacePart(filled, parseParts(filled)[3], 'x^2');
  assert.equal(renderLatex(edited.latex).error, '');
});

/* ------------------------------ templates ------------------------------ */

test('every template builds and typesets with its own letters and with numbers filled in', async () => {
  await ensureMath();
  for (const template of TEMPLATES) {
    const plain = buildTemplate(template, defaultValues(template));
    assert.ok(plain.latex, `${template.id}: ${plain.error}`);
    assert.equal(renderLatex(plain.latex).error, '', template.id);
    const numbers = Object.fromEntries(template.fields.map((f, i) => [f.key, String(i + 2)]));
    const filled = buildTemplate(template, numbers);
    assert.ok(filled.latex, `${template.id}: ${filled.error}`);
    assert.equal(renderLatex(filled.latex).error, '', `${template.id}: ${filled.latex}`);
    const negative = buildTemplate(template, Object.fromEntries(template.fields.map((f) => [f.key, '-1'])));
    assert.equal(renderLatex(negative.latex).error, '', `${template.id}: ${negative.latex}`);
  }
});

test('templates put brackets where a typed value needs them', () => {
  const byId = (id) => TEMPLATES.find((t) => t.id === id);
  assert.equal(buildTemplate(byId('quadratic'), { a: '2', b: '-3', c: '1' }).latex, 'x = \\frac{-(-3) \\pm \\sqrt{(-3)^{2} - 4 \\cdot 2 \\cdot 1}}{2 \\cdot 2}');
  assert.equal(buildTemplate(byId('line'), { m: '2', c: '-1' }).latex, 'y = 2x - 1');
  assert.equal(buildTemplate(byId('circleArea'), { r: '5' }).latex, 'A = \\pi \\cdot 5^{2}');
  assert.equal(buildTemplate(byId('integral'), { f: 'x^2+1' }).latex, '\\int_{a}^{b} \\left(x^{2} + 1\\right) \\, dx');
  assert.equal(buildTemplate(byId('pythagoras'), { a: '3', b: '4', c: '5' }).latex, '3^{2} + 4^{2} = 5^{2}');
  // a blank left empty keeps its letter
  assert.equal(buildTemplate(byId('pythagoras'), { a: '3', b: '  ' }).latex, '3^{2} + b^{2} = c^{2}');
});

test('a template blank that cannot be read is reported by name', () => {
  const quadratic = TEMPLATES.find((t) => t.id === 'quadratic');
  const result = buildTemplate(quadratic, { a: '2*' });
  assert.equal(result.key, 'a');
  assert.ok(result.error && !result.latex);
});

/* ------------------------------ editing on the board: where each part is drawn ------------------------------ */

import { leafBoxes } from '../src/board/mathRender.js';
import { leafAt, leafRects } from '../src/board/equationLeaves.js';
import { markParts } from '../src/board/latexParts.js';

test('parts are wrapped in markers that leave the layout untouched', () => {
  assert.equal(markParts('y = x^{2}', parseParts('y = x^{2}')), '{\\class{bl0}{y}} = {\\class{bl1}{x}}^{{\\class{bl2}{2}}}');
  // a power written without braces stays valid: the marker's own braces become the group
  assert.equal(markParts('x^2', parseParts('x^2')), '{\\class{bl0}{x}}^{\\class{bl1}{2}}');
});

test('every part of every ready-made formula has a place on the picture', async () => {
  await ensureMath();
  for (const key of KEYS.library) {
    const parts = parseParts(key.insert);
    const boxes = leafBoxes(key.insert);
    assert.ok(boxes, `${key.label}: could not be measured`);
    assert.equal(boxes.length, parts.length, `${key.label}: ${boxes.length} boxes for ${parts.length} parts`);
    for (const b of boxes) {
      assert.ok(b.w > 0 && b.h > 0, `${key.label} part ${b.part.index} has no size`);
      assert.ok(b.x > -0.02 && b.y > -0.02 && b.x + b.w < 1.02 && b.y + b.h < 1.02, `${key.label} part ${b.part.index} is outside the picture: ${JSON.stringify([b.x, b.y, b.w, b.h])}`);
    }
  }
});

test('parts sit where they are drawn: powers up and right, indexes left of roots, fraction parts stacked', async () => {
  await ensureMath();
  const at = (latex) => Object.fromEntries(leafBoxes(latex).map((b) => [`${b.part.label}|${b.part.text}`, b]));
  const power = at('y = x^{2}');
  assert.ok(power['Power|2'].x > power['Formula|x'].x, 'the power is right of x');
  assert.ok(power['Power|2'].y < power['Formula|x'].y, 'the power is higher than x');
  assert.ok(power['Power|2'].w < power['Formula|x'].w, 'the power is drawn smaller than x');
  // the index of a root is written first in LaTeX but drawn small, up and left of the number inside
  const root = at('\\sqrt[3]{8}');
  assert.ok(root['Root index|3'].x < root['Inside root|8'].x, 'index left of the radicand');
  assert.ok(root['Root index|3'].h < root['Inside root|8'].h, 'index is smaller');
  const fraction = at('\\frac{2}{x}');
  assert.ok(fraction['Numerator|2'].y < fraction['Denominator|x'].y, 'numerator above denominator');
});

test('a formula with a function name still maps parts to the right glyphs', async () => {
  await ensureMath();
  const boxes = leafBoxes('\\sin x + \\pi r^{2}');
  assert.deepEqual(boxes.map((b) => b.part.text), ['x', '\\pi', 'r', '2']);
  for (let i = 1; i < 3; i++) assert.ok(boxes[i].x > boxes[i - 1].x, 'parts follow each other left to right');
});

test('the part under a point on the board is found, with slack for small targets', async () => {
  await ensureMath();
  const eq = { id: 'e', type: 'equation', page: 0, latex: 'y = x^{2}', x: 100, y: 50, w: 200, h: 80 };
  const rects = leafRects(eq);
  assert.equal(rects.length, 3);
  const two = rects.find((r) => r.part.text === '2');
  assert.equal(leafAt(eq, [two.x + two.w / 2, two.y + two.h / 2], 0).part.text, '2');
  assert.equal(leafAt(eq, [two.x + two.w + 4, two.y + two.h / 2], 8).part.text, '2'); // just outside, within the slack
  assert.equal(leafAt(eq, [two.x + two.w + 60, two.y], 8), null); // nowhere near a part
  assert.equal(leafAt(eq, [0, 0], 8), null);
});

test('measuring is cached and safe for bad or empty input', async () => {
  await ensureMath();
  assert.equal(leafBoxes(''), null);
  assert.equal(leafBoxes('\\frac{'), null);
  assert.equal(leafBoxes('+ - ='), null); // nothing to edit
  assert.equal(leafBoxes('x'.repeat(700)), null);
  assert.strictEqual(leafBoxes('a + b'), leafBoxes('a + b'));
});
