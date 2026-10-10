import { parse } from '../src/parser/parse.js';
import { applyPositions, removePositions, withPosition } from '../src/model/edit.js';
import { autoLayout } from '../src/layout/layout.js';
import { edgeGeometry } from '../src/render/storyRenderer.js';

const { test } = QUnit;

QUnit.module('edit: positions in text');

test('appends a position when none exists', (assert) => {
  assert.equal(withPosition('actor Customer [user]', 10.4, 20.6), 'actor Customer [user] @ 10,21');
});

test('replaces an existing position and keeps comments', (assert) => {
  assert.equal(withPosition('actor A @ 1,2 // boss', 30, 40), 'actor A @ 30,40 // boss');
});

test('notes keep their target after the position', (assert) => {
  assert.equal(withPosition('note Hello -> Cashier', 5, 6), 'note Hello @ 5,6 -> Cashier');
  assert.equal(withPosition('note Hello @ 1,1 -> Cashier', 7, 8), 'note Hello @ 7,8 -> Cashier');
});

test('applyPositions only touches the given lines and preserves line endings', (assert) => {
  const text = 'title T\r\nactor A\r\nactor B\r\n';
  const out = applyPositions(text, [{ line: 3, x: 1, y: 2 }]);
  assert.equal(out, 'title T\r\nactor A\r\nactor B @ 1,2\r\n');
});

test('round trip: written positions parse back', (assert) => {
  const text = 'actor A\nobject O\nnote hi -> A\nA does O';
  const m = parse(text);
  autoLayout(m);
  const out = applyPositions(text, [...m.nodes, ...m.notes].map((n) => ({ line: n.line, x: n.x, y: n.y })));
  const m2 = parse(out);
  assert.deepEqual(m2.errors, []);
  assert.true(m2.nodes.every((n) => n.hasPos) && m2.notes.every((n) => n.hasPos));
  assert.equal(removePositions(out), text);
});

QUnit.module('layout');

test('auto layout flows left to right in story order', (assert) => {
  const m = parse('actor A\nactor B\nactor C\nA calls B\nB calls C');
  autoLayout(m);
  const x = (n) => m.nodeMap.get(n).x;
  assert.true(x('A') < x('B') && x('B') < x('C'));
});

test('positioned nodes are left alone', (assert) => {
  const m = parse('actor A @ 500,500\nactor B\nA calls B');
  autoLayout(m);
  assert.deepEqual([m.nodeMap.get('A').x, m.nodeMap.get('A').y], [500, 500]);
});

test('parallel arrows between the same pair get different curves', (assert) => {
  const m = parse('actor A @ 0,0\nactor B @ 300,0\nA calls B\nB calls A\nA calls B');
  const siblings = new Map([[['A', 'B'].sort().join('\u0000'), [0, 1, 2]]]);
  const paths = m.steps.map((s) => edgeGeometry(s, m, siblings).path);
  assert.equal(new Set(paths).size, 3);
});
