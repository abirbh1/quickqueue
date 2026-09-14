/**
 * Backend client.
 *
 * This is the ONLY module in the app that touches "server" data. Every screen
 * calls functions exported here instead of talking to the network directly.
 * Talks to the FastAPI backend (see ../../../backend) over HTTP.
 */
import type {
  CheckInInput,
  CheckInResult,
  Party,
  ReportRange,
  ReportSummary,
  WaitTimeStats,
} from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

/** Subscribe to any change in the backend (new check-ins, seating, etc). */
function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// The backend has no push channel yet, so poll periodically to pick up
// changes made from other tabs/devices (e.g. a customer checking in while
// the manager view is open).
const POLL_INTERVAL_MS = 4000
setInterval(emit, POLL_INTERVAL_MS)

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: init.body ? { 'Content-Type': 'application/json', ...init.headers } : init.headers,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.detail ?? `Request failed with status ${response.status}`)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/** Waiting parties, in current queue order (arrival order, adjusted by manual reorders). */
async function getQueue(): Promise<Party[]> {
  return request('/queue')
}

/** Parties currently occupying a table (seated, table not yet freed). */
async function getSeated(): Promise<Party[]> {
  return request('/seated')
}

async function getWaitStats(): Promise<WaitTimeStats> {
  return request('/wait-stats')
}

async function checkIn(input: CheckInInput): Promise<CheckInResult> {
  const result = await request<CheckInResult>('/checkin', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  emit()
  return result
}

async function seatParty(id: string): Promise<Party> {
  const party = await request<Party>(`/parties/${id}/seat`, { method: 'POST' })
  emit()
  return party
}

async function freeTable(id: string): Promise<Party> {
  const party = await request<Party>(`/parties/${id}/free`, { method: 'POST' })
  emit()
  return party
}

async function cancelParty(id: string): Promise<Party> {
  const party = await request<Party>(`/parties/${id}/cancel`, { method: 'POST' })
  emit()
  return party
}

async function markNoShow(id: string): Promise<Party> {
  const party = await request<Party>(`/parties/${id}/no-show`, { method: 'POST' })
  emit()
  return party
}

async function moveUp(id: string): Promise<void> {
  await request<void>(`/parties/${id}/move-up`, { method: 'POST' })
  emit()
}

async function moveDown(id: string): Promise<void> {
  await request<void>(`/parties/${id}/move-down`, { method: 'POST' })
  emit()
}

async function getReport(range: ReportRange): Promise<ReportSummary> {
  return request(`/reports?range=${range}`)
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
