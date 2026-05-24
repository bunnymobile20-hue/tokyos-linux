import test from 'node:test'
import assert from 'node:assert/strict'

import { getNotePreview, htmlToMarkdown, markdownToHtml } from './noteMarkdown'

test('getNotePreview strips markdown syntax for sidebar copy', () => {
  assert.equal(getNotePreview('# título\n- Listar itens\n[Link](https://example.com)'), 'título Listar itens Link')
})

test('markdownToHtml renders markdown headings', () => {
  assert.match(markdownToHtml('# título'), /<h1[^>]*>título<\/h1>/)
})

test('htmlToMarkdown converts editor html back to markdown', () => {
  assert.equal(htmlToMarkdown('<h1>título</h1><p>texto</p>').trim(), '# título\n\ntexto')
})
