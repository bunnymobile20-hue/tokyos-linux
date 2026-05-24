import test from 'node:test'
import assert from 'node:assert/strict'
import {
  clearMusicState,
  getMusicDisplayState,
  registerMusicCommandHandler,
  reportMusicState,
  resetMusicBridgeForTests,
  sendMusicCommandToActive,
  subscribeMusicDisplayState
} from './musicBridge'

test.beforeEach(() => {
  resetMusicBridgeForTests()
})

test('returns latest snapshot for display after late subscription', () => {
  reportMusicState({
    appId: 'music',
    status: 'playing',
    playing: true,
    title: 'Noturno',
    artist: 'Jay Chou',
    cover: 'cover-a',
    lyric: 'Um grupo de formigas sedentas de sangue'
  })

  const current = getMusicDisplayState()
  assert.equal(current?.appId, 'music')
  assert.equal(current?.title, 'Noturno')
})

test('notifies listeners when state changes', () => {
  let notifyCount = 0
  const unsubscribe = subscribeMusicDisplayState(() => {
    notifyCount += 1
  })

  reportMusicState({
    appId: 'music',
    status: 'preparing',
    playing: false,
    title: 'Daoxiang',
    artist: 'Jay Chou',
    cover: '',
    lyric: ''
  })

  unsubscribe()
  assert.equal(notifyCount, 1)
})

test('latest audible source wins and pauses previous owner', () => {
  const commands: string[] = []

  registerMusicCommandHandler('music', (command) => {
    commands.push(`music:${command}`)
  })
  registerMusicCommandHandler('localmusic', (command) => {
    commands.push(`localmusic:${command}`)
  })

  reportMusicState({
    appId: 'music',
    status: 'playing',
    playing: true,
    title: 'Canção A',
    artist: 'cantor A',
    cover: '',
    lyric: ''
  })

  reportMusicState({
    appId: 'localmusic',
    status: 'preparing',
    playing: false,
    title: 'Canção B',
    artist: 'cantor B',
    cover: '',
    lyric: ''
  })

  const current = getMusicDisplayState()
  assert.equal(current?.appId, 'localmusic')
  assert.deepEqual(commands, ['music:pause'])
})

test('active commands target the current owner', () => {
  const commands: string[] = []

  registerMusicCommandHandler('music', (command) => {
    commands.push(`music:${command}`)
  })

  reportMusicState({
    appId: 'music',
    status: 'playing',
    playing: true,
    title: 'Canção C',
    artist: 'cantor C',
    cover: '',
    lyric: ''
  })

  sendMusicCommandToActive('toggle')
  assert.deepEqual(commands, ['music:toggle'])
})

test('clearing active source falls back to another displayable snapshot', () => {
  reportMusicState({
    appId: 'music',
    status: 'paused',
    playing: false,
    title: 'Canção D',
    artist: 'cantor D',
    cover: '',
    lyric: ''
  })

  reportMusicState({
    appId: 'localmusic',
    status: 'paused',
    playing: false,
    title: 'Canção E',
    artist: 'cantor E',
    cover: '',
    lyric: ''
  })

  clearMusicState('localmusic')

  const current = getMusicDisplayState()
  assert.equal(current?.appId, 'music')
  assert.equal(current?.title, 'Canção D')
})
