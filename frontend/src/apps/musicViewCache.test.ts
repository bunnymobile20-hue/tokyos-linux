import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getCachedSongsForView,
  hasCachedMusicContent,
  makePlaylistViewKey,
  makeSearchViewKey,
  pickPlaylistToRefresh,
  readMusicViewCache,
  setCachedSongsForView,
  writeMusicViewCache,
  type MusicViewCacheSnapshot,
} from './musicViewCache'

class MemoryStorage {
  private values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

function createSnapshot(): Omit<MusicViewCacheSnapshot, 'updatedAt'> {
  return {
    keyword: 'Jay Chou',
    activeTab: 'playlist-1',
    activeViewKey: makePlaylistViewKey('playlist-1'),
    songsByView: {
      [makePlaylistViewKey('playlist-1')]: [{ id: '1', title: 'Daoxiang', artist: 'Jay Chou', album: 'Capricórnio', duration: '03:43' }],
      [makeSearchViewKey('Jay Chou')]: [{ id: '2', title: 'ensolarado', artist: 'Jay Chou', album: 'Ye Huimei', duration: '04:29' }],
      [makeSearchViewKey('JJ Lin')]: [{ id: '3', title: 'Cao Cao', artist: 'JJ Lin', album: 'Cao Cao', duration: '04:12' }],
    },
    viewUpdatedAt: {
      [makePlaylistViewKey('playlist-1')]: 1,
      [makeSearchViewKey('Jay Chou')]: 1,
      [makeSearchViewKey('JJ Lin')]: 1,
    },
    recentSearches: ['Jay Chou', 'JJ Lin'],
    recentViewKeys: [makePlaylistViewKey('playlist-1'), makeSearchViewKey('Jay Chou')],
    playlists: [{ id: 'playlist-1', name: 'música que eu gosto', creator: { userId: 1 } }],
    userInfo: { userId: 1, nickname: 'Chris', avatarUrl: 'avatar.png' },
  }
}

test('readMusicViewCache restores per-tab snapshot', () => {
  const storage = new MemoryStorage()
  writeMusicViewCache(createSnapshot(), storage)

  const result = readMusicViewCache(storage)

  assert.ok(result)
  assert.equal(result?.keyword, 'Jay Chou')
  assert.equal(result?.activeTab, 'playlist-1')
  assert.equal(result?.activeViewKey, makePlaylistViewKey('playlist-1'))
  assert.equal(result?.songsByView[makePlaylistViewKey('playlist-1')]?.length, 1)
  assert.equal(result?.songsByView[makeSearchViewKey('Jay Chou')]?.length, 1)
  assert.equal(result?.playlists.length, 1)
  assert.equal(result?.userInfo?.nickname, 'Chris')
  assert.ok((result?.updatedAt ?? 0) > 0)
})

test('getCachedSongsForView returns isolated content per page', () => {
  const snapshot: MusicViewCacheSnapshot = {
    ...createSnapshot(),
    updatedAt: 1,
  }

  assert.equal(getCachedSongsForView(snapshot, makePlaylistViewKey('playlist-1'))[0]?.title, 'Daoxiang')
  assert.equal(getCachedSongsForView(snapshot, makeSearchViewKey('Jay Chou'))[0]?.title, 'ensolarado')
  assert.equal(getCachedSongsForView(snapshot, makeSearchViewKey('JJ Lin'))[0]?.title, 'Cao Cao')
  assert.deepEqual(getCachedSongsForView(snapshot, makePlaylistViewKey('playlist-404')), [])
})

test('setCachedSongsForView updates only target page cache', () => {
  const result = setCachedSongsForView({ [makeSearchViewKey('A')]: [{ id: '1', title: 'A', artist: 'B', album: 'C', duration: '01:00' }] }, makePlaylistViewKey('playlist-2'), [{ id: '2', title: 'D', artist: 'E', album: 'F', duration: '02:00' }])

  assert.equal(result[makeSearchViewKey('A')]?.length, 1)
  assert.equal(result[makePlaylistViewKey('playlist-2')]?.[0]?.title, 'D')
})

test('makeSearchViewKey isolates different keywords', () => {
  assert.notEqual(makeSearchViewKey('Jay Chou'), makeSearchViewKey('JJ Lin'))
  assert.equal(makeSearchViewKey(' Jay Chou '), makeSearchViewKey('Jay Chou'))
})

test('pickPlaylistToRefresh prefers active playlist when available', () => {
  assert.equal(pickPlaylistToRefresh('playlist-2', [{ id: 'playlist-1' }, { id: 'playlist-2' }]), 'playlist-2')
  assert.equal(pickPlaylistToRefresh('missing', [{ id: 'playlist-1' }]), 'playlist-1')
  assert.equal(pickPlaylistToRefresh('search', [{ id: 'playlist-1' }]), null)
})

test('hasCachedMusicContent detects visible cache payload', () => {
  assert.equal(hasCachedMusicContent(null), false)
  assert.equal(hasCachedMusicContent({ ...createSnapshot(), songsByView: {}, playlists: [], userInfo: null, updatedAt: 0 }), false)
  assert.equal(hasCachedMusicContent({ ...createSnapshot(), updatedAt: 1 }), true)
})
