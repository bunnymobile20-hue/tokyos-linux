import assert from 'node:assert/strict';
import test from 'node:test';
import { getNaturalTimeFragments, parseNaturalTaskInput } from './naturalInput';

const fixedNow = new Date('2026-04-07T10:00:00+08:00');

test('parseNaturalTaskInput parses Depois de amanhã8Clique e extraia o título', () => {
  const parsed = parseNaturalTaskInput('Depois de amanhã8Clique para participar da reunião', fixedNow);
  assert.equal(parsed.title, 'participar de reuniões');
  assert.equal(parsed.isAllDay, false);
  assert.equal(parsed.reminder, '0');
  assert.ok(parsed.dueDate);

  const due = new Date(parsed.dueDate!);
  assert.equal(due.getHours(), 8);
});

test('parseNaturalTaskInput parses amanhã18:30', () => {
  const parsed = parseNaturalTaskInput('amanhã18:30Jantar com a equipe', fixedNow);
  assert.equal(parsed.title, 'Jantar com a equipe');
  assert.equal(parsed.isAllDay, false);
  assert.equal(parsed.reminder, '0');
  assert.ok(parsed.dueDate);
});

test('parseNaturalTaskInput handles date only', () => {
  const parsed = parseNaturalTaskInput('Enviar relatório semanal depois de amanhã', fixedNow);
  assert.equal(parsed.title, 'Enviar relatório semanal');
  assert.equal(parsed.isAllDay, true);
  assert.equal(parsed.reminder, undefined);
  assert.ok(parsed.dueDate);
});

test('parseNaturalTaskInput keeps original title when no natural time found', () => {
  const parsed = parseNaturalTaskInput('Organize os documentos do projeto', fixedNow);
  assert.equal(parsed.title, 'Organize os documentos do projeto');
  assert.equal(parsed.dueDate, undefined);
});

test('getNaturalTimeFragments extracts date/time tokens', () => {
  const fragments = getNaturalTimeFragments('Depois de amanhã8Clique para participar da reunião');
  assert.deepEqual(fragments.sort(), ['8apontar', 'manhã', 'depois de amanhã'].sort());
});

test('parseNaturalTaskInput parses tonight shorthand for widget quick add', () => {
  const parsed = parseNaturalTaskInput('essa noite8Clique para me lembrar de pagar', fixedNow);
  assert.equal(parsed.title, 'Lembre-me de pagar');
  assert.equal(parsed.isAllDay, false);
  assert.equal(parsed.reminder, '0');
  assert.ok(parsed.dueDate);
  const due = new Date(parsed.dueDate!);
  assert.equal(due.getHours(), 20);
});
