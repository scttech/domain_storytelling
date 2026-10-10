import { parse } from '../src/parser/parse.js';

const { test } = QUnit;
const BASE = `actor Customer
actor Cashier [user-circle]
system POS
object Pizza [pizza]
object Orders List
`;

QUnit.module('parse: declarations');

test('title, kinds, default and chosen icons', (assert) => {
  const m = parse(`title Demo\n${BASE}`);
  assert.equal(m.title, 'Demo');
  assert.deepEqual(m.nodes.map((n) => [n.name, n.kind, n.icon]), [
    ['Customer', 'actor', 'user'], ['Cashier', 'actor', 'user-circle'], ['POS', 'system', 'device-desktop'],
    ['Pizza', 'object', 'pizza'], ['Orders List', 'object', 'file-text'],
  ]);
  assert.deepEqual(m.errors, []);
});

test('positions are read and flagged', (assert) => {
  const m = parse('actor A @ 10, 20.5\nactor B');
  assert.deepEqual([m.nodes[0].x, m.nodes[0].y, m.nodes[0].hasPos], [10, 20.5, true]);
  assert.false(m.nodes[1].hasPos);
});

test('icon aliases resolve and unknown icons are reported', (assert) => {
  const m = parse('actor A [person]\nactor B [nope]');
  assert.equal(m.nodes[0].icon, 'user');
  assert.equal(m.errors.length, 1);
  assert.equal(m.errors[0].line, 2);
  assert.equal(m.nodes[1].icon, 'user', 'falls back to the default icon');
});

test('duplicate names and comments', (assert) => {
  const m = parse('actor A // trailing\n// whole line\nactor A');
  assert.equal(m.nodes.length, 1);
  assert.equal(m.errors.length, 1);
  assert.equal(m.errors[0].line, 3);
});

QUnit.module('parse: sentences');

test('actor verb object preposition actor carries the object', (assert) => {
  const s = parse(`${BASE}Customer orders Pizza from Cashier`).steps[0];
  assert.deepEqual([s.source, s.activity, s.carried, s.target], ['Customer', 'orders', 'Pizza', 'Cashier']);
  assert.equal(s.sentence, 'Customer orders Pizza from Cashier');
});

test('actor verb object targets the object node', (assert) => {
  const s = parse(`${BASE}Cashier creates Pizza`).steps[0];
  assert.deepEqual([s.source, s.carried, s.target], ['Cashier', null, 'Pizza']);
});

test('actor verb actor', (assert) => {
  const s = parse(`${BASE}Customer pays Cashier.`).steps[0];
  assert.deepEqual([s.activity, s.carried, s.target], ['pays', null, 'Cashier']);
});

test('multi-word names and quoted activities', (assert) => {
  const m = parse(`${BASE}Cashier "adds to" Orders List`);
  assert.deepEqual(m.errors, []);
  assert.deepEqual([m.steps[0].activity, m.steps[0].target], ['adds to', 'Orders List']);
});

test('names are matched case-sensitively and by whole word', (assert) => {
  const m = parse(`${BASE}Customer sends pizza boxes to Cashier`);
  assert.deepEqual(m.errors, [], 'lowercase "pizza" is not the Pizza object');
  assert.equal(m.steps[0].target, 'Cashier');
});

test('automatic and explicit numbering', (assert) => {
  const m = parse(`${BASE}Customer pays Cashier\n5. Cashier creates Pizza\nCashier creates Pizza\n6a. Customer pays Cashier\nCustomer pays Cashier`);
  assert.deepEqual(m.steps.map((s) => s.label), ['1', '5', '6', '6a', '7']);
});

test('sentences may appear before declarations', (assert) => {
  const m = parse('A greets B\nactor A\nactor B');
  assert.deepEqual(m.errors, []);
  assert.equal(m.steps.length, 1);
});

test('helpful errors', (assert) => {
  const m = parse(`${BASE}Nobody pays Cashier\nCustomer pays\nCustomer pays Cashier banana\nCustomer Cashier\nPOS sends POS to Customer`);
  assert.deepEqual(m.errors.map((e) => e.line), [6, 7, 8, 9, 10]);
  assert.equal(m.steps.length, 0);
});

QUnit.module('parse: groups and notes');

test('groups', (assert) => {
  const m = parse(`${BASE}group Front: Customer, Cashier\ngroup Bad: Customer, Ghost`);
  assert.deepEqual(m.groups[0].members, ['Customer', 'Cashier']);
  assert.equal(m.errors.length, 1);
});

test('notes with position and target', (assert) => {
  const m = parse(`${BASE}note Busy at lunch @ 5,6 -> Cashier\nnote Floating`);
  assert.deepEqual([m.notes[0].text, m.notes[0].x, m.notes[0].y, m.notes[0].target], ['Busy at lunch', 5, 6, 'Cashier']);
  assert.equal(m.notes[1].target, null);
  assert.false(m.notes[1].hasPos);
});

test('objects that only ride on arrows are hidden as nodes', (assert) => {
  const m = parse(`${BASE}Customer orders Pizza from Cashier`);
  assert.true(m.nodeMap.get('Pizza').hidden);
  assert.false(m.nodeMap.get('Orders List').hidden, 'unused declarations stay visible');
  const m2 = parse(`${BASE}Customer orders Pizza from Cashier\nCashier creates Pizza`);
  assert.false(m2.nodeMap.get('Pizza').hidden);
});

QUnit.module('parse: assumptions and comments');

test('blocks collect dash items and continuation lines', (assert) => {
  const m = parse(`${BASE}assumptions {\n- First\n- Second item\n  that wraps\n}\ncomments {\n- A comment\n}\nassumptions {\n- Third\n}`);
  assert.deepEqual(m.errors, []);
  assert.deepEqual(m.assumptions.map((a) => a.text), ['First', 'Second item that wraps', 'Third']);
  assert.deepEqual(m.comments.map((a) => [a.text, a.line]), [['A comment', 12]]);
  assert.equal(m.steps.length, 0, 'block lines are not parsed as sentences');
});

test('an unclosed block is reported on its opening line', (assert) => {
  const m = parse(`${BASE}comments {\n- Oops`);
  assert.equal(m.errors.length, 1);
  assert.equal(m.errors[0].line, 6);
});

test('block keywords are case-insensitive and ignore comments inside', (assert) => {
  const m = parse(`Assumptions {\n// hidden\n- One // trailing\n}`);
  assert.deepEqual(m.assumptions.map((a) => a.text), ['One']);
});

QUnit.module('parse: options');

test('arrow-icons defaults on and can be switched', (assert) => {
  assert.true(parse(BASE).options.arrowIcons);
  assert.false(parse(`${BASE}arrow-icons off`).options.arrowIcons);
  assert.true(parse(`arrow-icons OFF\narrow-icons on`).options.arrowIcons);
  assert.equal(parse('arrow-icons maybe').errors.length, 1);
});
