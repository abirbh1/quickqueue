/**
 * Mock backend client.
 *
 * This is the ONLY module in the app that touches "server" data. Every screen
 * calls functions exported here instead of reading storage directly. Today
 * this is backed by localStorage + setTimeout to simulate a network round
 * trip; swapping in real HTTP calls later only means rewriting the bodies of
 * these functions, not any call site.
 */
import type {
  CheckInInput,
  CheckInResult,
  Party,
  PeakWindow,
  ReportRange,
  ReportSummary,
  WaitTimeStats,
} from './types'

const STORAGE_KEY = 'quickqueue_db_v1'
const TURNOVER_HISTORY_SIZE = 5
const DEFAULT_TURNOVER_MINUTES = 18
const SIMULATED_LATENCY_MS = 350

interface Db {
  parties: Party[]
  turnoverMinutes: number[]
}

function minutesAgo(n: number): string {
  return new Date(Date.now() - n * 60_000).toISOString()
}

function buildSeed(): Db {
  const parties: Party[] = [
    // Currently waiting
    { id: crypto.randomUUID(), name: 'Alvarez', partySize: 4, checkInTime: minutesAgo(18), status: 'waiting', seatedTime: null, tableFreedTime: null },
    { id: crypto.randomUUID(), name: 'Chen', partySize: 2, checkInTime: minutesAgo(9), status: 'waiting', seatedTime: null, tableFreedTime: null },
    { id: crypto.randomUUID(), name: 'Okafor', phone: '555-0142', partySize: 6, checkInTime: minutesAgo(3), status: 'waiting', seatedTime: null, tableFreedTime: null },
    // Currently seated
    { id: crypto.randomUUID(), name: 'Diallo', partySize: 3, checkInTime: minutesAgo(24), status: 'seated', seatedTime: minutesAgo(6), tableFreedTime: null },
    // Completed today (feeds today's report + turnover history)
    { id: crypto.randomUUID(), name: 'Nguyen', partySize: 2, checkInTime: minutesAgo(150), status: 'seated', seatedTime: minutesAgo(135), tableFreedTime: minutesAgo(100) },
    { id: crypto.randomUUID(), name: 'Park', partySize: 5, checkInTime: minutesAgo(140), status: 'seated', seatedTime: minutesAgo(128), tableFreedTime: minutesAgo(95) },
    { id: crypto.randomUUID(), name: 'Silva', partySize: 2, checkInTime: minutesAgo(130), status: 'seated', seatedTime: minutesAgo(120), tableFreedTime: minutesAgo(88) },
    { id: crypto.randomUUID(), name: 'Haddad', partySize: 4, checkInTime: minutesAgo(125), status: 'seated', seatedTime: minutesAgo(110), tableFreedTime: minutesAgo(78) },
    { id: crypto.randomUUID(), name: 'Kowalski', partySize: 3, checkInTime: minutesAgo(90), status: 'seated', seatedTime: minutesAgo(80), tableFreedTime: minutesAgo(45) },
    { id: crypto.randomUUID(), name: 'Tremblay', partySize: 2, checkInTime: minutesAgo(85), status: 'no_show', seatedTime: null, tableFreedTime: null },
    { id: crypto.randomUUID(), name: 'Ibrahim', partySize: 4, checkInTime: minutesAgo(70), status: 'seated', seatedTime: minutesAgo(60), tableFreedTime: minutesAgo(28) },
    { id: crypto.randomUUID(), name: 'Roy', partySize: 2, checkInTime: minutesAgo(55), status: 'cancelled', seatedTime: null, tableFreedTime: null },
    // Completed earlier this week (feeds the "week" report only)
    { id: crypto.randomUUID(), name: 'Martin', partySize: 2, checkInTime: minutesAgo(60 * 26), status: 'seated', seatedTime: minutesAgo(60 * 26 - 14), tableFreedTime: minutesAgo(60 * 26 - 45) },
    { id: crypto.randomUUID(), name: 'Fournier', partySize: 6, checkInTime: minutesAgo(60 * 27), status: 'seated', seatedTime: minutesAgo(60 * 27 - 20), tableFreedTime: minutesAgo(60 * 27 - 62) },
    { id: crypto.randomUUID(), name: 'Bouchard', partySize: 3, checkInTime: minutesAgo(60 * 50), status: 'seated', seatedTime: minutesAgo(60 * 50 - 10), tableFreedTime: minutesAgo(60 * 50 - 38) },
    { id: crypto.randomUUID(), name: 'Gagnon', partySize: 4, checkInTime: minutesAgo(60 * 51), status: 'seated', seatedTime: minutesAgo(60 * 51 - 16), tableFreedTime: minutesAgo(60 * 51 - 50) },
  ]

  return {
    parties,
    turnoverMinutes: [34, 41, 29, 37, 30],
  }
}

let db: Db | null = null

function load(): Db {
  if (db) return db
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    db = JSON.parse(raw) as Db
  } else {
    db = buildSeed()
    save()
  }
  return db
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

/** Subscribe to any change in the mock backend (new check-ins, seating, etc). */
function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Keep tabs in sync: when another tab writes to localStorage, drop our cache
// and notify local subscribers so the UI refetches.
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    db = null
    emit()
  }
})

function delay(ms = SIMULATED_LATENCY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function findPartyOrThrow(id: string): Party {
  const party = load().parties.find((p) => p.id === id)
  if (!party) throw new Error(`Party ${id} not found`)
  return party
}

function averageTurnoverMinutes(): number {
  const { turnoverMinutes } = load()
  if (turnoverMinutes.length === 0) return DEFAULT_TURNOVER_MINUTES
  const sum = turnoverMinutes.reduce((a, b) => a + b, 0)
  return sum / turnoverMinutes.length
}

/** Waiting parties, in current queue order (arrival order, adjusted by manual reorders). */
async function getQueue(): Promise<Party[]> {
  await delay()
  return load().parties.filter((p) => p.status === 'waiting')
}

/** Parties currently occupying a table (seated, table not yet freed). */
async function getSeated(): Promise<Party[]> {
  await delay()
  return load().parties.filter((p) => p.status === 'seated' && !p.tableFreedTime)
}

async function getWaitStats(): Promise<WaitTimeStats> {
  await delay()
  return { rollingAverageWaitMinutes: averageTurnoverMinutes(), lastUpdated: new Date().toISOString() }
}

async function checkIn(input: CheckInInput): Promise<CheckInResult> {
  await delay()
  const party: Party = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    phone: input.phone?.trim() || undefined,
    partySize: input.partySize,
    checkInTime: new Date().toISOString(),
    status: 'waiting',
    seatedTime: null,
    tableFreedTime: null,
  }
  const { parties } = load()
  parties.push(party)
  save()
  emit()

  const waiting = parties.filter((p) => p.status === 'waiting')
  const position = waiting.findIndex((p) => p.id === party.id) + 1
  return { party, position, estimatedWaitMinutes: Math.round(averageTurnoverMinutes() * position) }
}

async function seatParty(id: string): Promise<Party> {
  await delay()
  const party = findPartyOrThrow(id)
  party.status = 'seated'
  party.seatedTime = new Date().toISOString()
  save()
  emit()
  return party
}

async function freeTable(id: string): Promise<Party> {
  await delay()
  const party = findPartyOrThrow(id)
  if (!party.seatedTime) throw new Error('Party has not been seated yet')
  party.tableFreedTime = new Date().toISOString()

  const turnoverMs = new Date(party.tableFreedTime).getTime() - new Date(party.seatedTime).getTime()
  const turnoverMinutesValue = Math.max(1, Math.round(turnoverMs / 60_000))
  const { turnoverMinutes } = load()
  turnoverMinutes.push(turnoverMinutesValue)
  while (turnoverMinutes.length > TURNOVER_HISTORY_SIZE) turnoverMinutes.shift()

  save()
  emit()
  return party
}

async function cancelParty(id: string): Promise<Party> {
  await delay()
  const party = findPartyOrThrow(id)
  party.status = 'cancelled'
  save()
  emit()
  return party
}

async function markNoShow(id: string): Promise<Party> {
  await delay()
  const party = findPartyOrThrow(id)
  party.status = 'no_show'
  save()
  emit()
  return party
}

function swapWaitingPositions(id: string, direction: 'up' | 'down') {
  const { parties } = load()
  const waitingIndices: number[] = []
  parties.forEach((p, i) => {
    if (p.status === 'waiting') waitingIndices.push(i)
  })
  const waitingParties = waitingIndices.map((i) => parties[i])
  const pos = waitingParties.findIndex((p) => p.id === id)
  if (pos < 0) return
  const swapWith = direction === 'up' ? pos - 1 : pos + 1
  if (swapWith < 0 || swapWith >= waitingParties.length) return
  ;[waitingParties[pos], waitingParties[swapWith]] = [waitingParties[swapWith], waitingParties[pos]]
  waitingIndices.forEach((originalIndex, k) => {
    parties[originalIndex] = waitingParties[k]
  })
}

async function moveUp(id: string): Promise<void> {
  await delay(120)
  swapWaitingPositions(id, 'up')
  save()
  emit()
}

async function moveDown(id: string): Promise<void> {
  await delay(120)
  swapWaitingPositions(id, 'down')
  save()
  emit()
}

function rangeStart(range: ReportRange): number {
  if (range === 'today') {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }
  return Date.now() - 7 * 24 * 60 * 60 * 1000
}

async function getReport(range: ReportRange): Promise<ReportSummary> {
  await delay()
  const start = rangeStart(range)
  const inRange = load().parties.filter((p) => new Date(p.checkInTime).getTime() >= start)

  const waitSamples = inRange.filter((p) => p.seatedTime).map((p) => (new Date(p.seatedTime!).getTime() - new Date(p.checkInTime).getTime()) / 60_000)
  const averageWaitMinutes = waitSamples.length ? waitSamples.reduce((a, b) => a + b, 0) / waitSamples.length : 0

  const totalPartiesServed = inRange.filter((p) => p.tableFreedTime).length

  const hourCounts = new Map<number, number>()
  for (const p of inRange) {
    const hour = new Date(p.checkInTime).getHours()
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1)
  }
  const peakWindows: PeakWindow[] = [...hourCounts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([hour, count]) => ({ hourLabel: formatHourWindow(hour), count }))

  return { range, averageWaitMinutes, totalPartiesServed, peakWindows }
}

function formatHourWindow(hour: number): string {
  const label = (h: number) => {
    const period = h < 12 ? 'AM' : 'PM'
    const display = h % 12 === 0 ? 12 : h % 12
    return `${display} ${period}`
  }
  return `${label(hour)}–${label((hour + 1) % 24)}`
}

export const api = {
  getQueue,
  getSeated,
  getWaitStats,
  getReport,
  checkIn,
  seatParty,
  freeTable,
  cancelParty,
  markNoShow,
  moveUp,
  moveDown,
  subscribe,
}
