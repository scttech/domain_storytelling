import { parse } from '../src/parser/parse.js';
import { SAMPLES } from '../src/samples.js';
import { TUTORIALS } from '../src/tutorial/tutorials.js';
import { ICON_GROUPS, resolveIcon, iconMarkup } from '../src/icons.js';
import { renderMarkdown } from '../src/help/markdown.js';
import { encodeStory, decodeStory } from '../src/share.js';

const { test } = QUnit;

QUnit.module('content');

test('every sample parses without errors', (assert) => {
  for (const s of SAMPLES) {
    const m = parse(s.text);
    assert.deepEqual(m.errors, [], s.name);
    assert.true(m.steps.length > 0, `${s.name} has steps`);
  }
});

test('every tutorial step parses without errors', (assert) => {
  for (const t of TUTORIALS) {
    t.steps.forEach((step, i) => assert.deepEqual(parse(step.text).errors, [], `${t.id} step ${i + 1}`));
  }
});

test('every listed icon exists and has markup', (assert) => {
  for (const g of ICON_GROUPS) for (const name of g.icons) assert.equal(resolveIcon(name), name, name);
  assert.true(iconMarkup('user').includes('<path'));
});

test('markdown renders headings, lists, code and tables', (assert) => {
  const html = renderMarkdown('# T\n\n- a\n- `b`\n\n```\n<x>\n```\n\n| h |\n|---|\n| c |');
  assert.true(html.includes('<h1>T</h1>') && html.includes('<code>b</code>') && html.includes('&lt;x&gt;') && html.includes('<td>c</td>'));
});

test('share encoding round-trips (including unicode)', async (assert) => {
  const text = 'title Café ☕\nactor A\nactor B\nA calls B';
  const code = await encodeStory(text);
  assert.equal(await decodeStory(code), text);
  assert.true(/^[a-z]\.[A-Za-z0-9_-]+$/.test(code), 'url-safe');
});

test('share links are shorter than the text for real stories', async (assert) => {
  const text = SAMPLES[1].text;
  const code = await encodeStory(text);
  assert.true(code.length < text.length, `${code.length} < ${text.length}`);
});
