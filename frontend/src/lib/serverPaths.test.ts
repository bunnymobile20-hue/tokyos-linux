import test from 'node:test'
import assert from 'node:assert/strict'

import { fetchServerPaths, saveServerPaths } from './serverPaths'

function mockWindowPathname(pathname: string) {
  Object.defineProperty(globalThis, 'window', {
    value: { location: { pathname } },
    configurable: true
  })
}

test('fetchServerPaths reads server-side path config', async () => {
  const originalFetch = global.fetch
  const originalWindow = (globalThis as { window?: Window }).window

  mockWindowPathname('/')

  global.fetch = (async () => ({
    json: async () => ({ success: true, data: { notesDir: '/mock/home/documento/Notas aleatórias', readerDir: '/mock/home/documento/RSSInformação', stockAnalysisDir: '/mock/home/documento/AIAnálise de negociação de ações' } })
  } as Response)) as unknown as typeof fetch

  try {
    const paths = await fetchServerPaths()
    assert.equal(paths.notesDir, '/mock/home/documento/Notas aleatórias')
    assert.equal(paths.readerDir, '/mock/home/documento/RSSInformação')
    assert.equal(paths.stockAnalysisDir, '/mock/home/documento/AIAnálise de negociação de ações')
  } finally {
    global.fetch = originalFetch
    Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true })
  }
})

test('saveServerPaths posts updated server-side path config', async () => {
  const originalFetch = global.fetch
  const originalWindow = (globalThis as { window?: Window }).window
  let requestBody = ''

  mockWindowPathname('/')

  global.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    requestBody = String(init?.body || '')
    return {
      json: async () => ({ success: true, data: { videoDownloadsDir: '/mock/home/vídeo', readerDir: '/mock/home/documento/RSSInformação', stockAnalysisDir: '/mock/home/documento/AIAnálise de negociação de ações' } })
    } as Response
  }) as unknown as typeof fetch

  try {
    const paths = await saveServerPaths({ videoDownloadsDir: '/mock/home/vídeo' })
    assert.equal(paths.videoDownloadsDir, '/mock/home/vídeo')
    assert.match(requestBody, /videoDownloadsDir/)
  } finally {
    global.fetch = originalFetch
    Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true })
  }
})
