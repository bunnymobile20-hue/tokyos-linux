import test from 'node:test'
import assert from 'node:assert/strict'

import { buildDidaInboxWidgetModel } from './didaWidgetMeta'
import type { Project, Task } from './DidaApp/types'

function createTask(overrides: Partial<Task> & Pick<Task, 'id' | 'title' | 'projectId'>): Task {
  const { id, title, projectId, ...rest } = overrides
  return {
    id,
    title,
    projectId,
    content: '',
    priority: 0,
    status: 0,
    isAllDay: true,
    tags: [],
    sortOrder: 0,
    ...rest,
  }
}

test('buildDidaInboxWidgetModel keeps only inbox tasks and sorts overdue first', () => {
  const now = new Date('2026-04-07T10:00:00+08:00')
  const projects: Project[] = [
    { id: 'inbox', name: 'caixa de coleta', color: '#3b82f6', isSystem: true },
    { id: 'work', name: 'Trabalhar', color: '#ef4444' },
  ]

  const result = buildDidaInboxWidgetModel([
    createTask({ id: 'future', title: 'tarefas futuras', projectId: 'work', dueDate: '2026-04-09T08:00:00.000+0800' }),
    createTask({ id: 'today', title: 'A tarefa de hoje', projectId: 'inbox', dueDate: '2026-04-07T18:00:00.000+0800', priority: 3 }),
    createTask({ id: 'overdue', title: 'Tarefas atrasadas', projectId: 'inbox', dueDate: '2026-04-06T18:00:00.000+0800', priority: 5 }),
    createTask({ id: 'nodate', title: 'Nenhuma tarefa de data', projectId: 'inbox' }),
  ], projects, now, 4)

  assert.equal(result.inboxProjectId, 'inbox')
  assert.equal(result.pendingCount, 3)
  assert.deepEqual(result.tasks.map((task) => task.id), ['overdue', 'today', 'nodate'])
  assert.equal(result.tasks[0]?.dueLabel, 'Atrasado')
  assert.equal(result.tasks[1]?.dueLabel, 'hoje')
})

test('buildDidaInboxWidgetModel counts completed inbox tasks for today', () => {
  const now = new Date('2026-04-07T10:00:00+08:00')
  const result = buildDidaInboxWidgetModel([
    createTask({ id: 'done', title: 'Concluído', projectId: 'inbox', status: 2, dueDate: '2026-04-07T09:00:00.000+0800' }),
    createTask({ id: 'todo', title: 'Pendência', projectId: 'inbox', dueDate: '2026-04-07T12:00:00.000+0800' }),
  ], [{ id: 'inbox', name: 'caixa de coleta', color: '#3b82f6', isSystem: true }], now, 5)

  assert.equal(result.pendingCount, 1)
  assert.equal(result.completedTodayCount, 1)
  assert.deepEqual(result.tasks.map((task) => task.id), ['todo'])
})
