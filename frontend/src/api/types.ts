export type PartyStatus = 'waiting' | 'seated' | 'cancelled' | 'no_show'

export interface Party {
  id: string
  name: string
  phone?: string
  partySize: number
  checkInTime: string // ISO timestamp
  status: PartyStatus
  seatedTime: string | null
  tableFreedTime: string | null
}

export interface CheckInInput {
  name: string
  phone?: string
  partySize: number
}

export interface CheckInResult {
  party: Party
  position: number
  estimatedWaitMinutes: number
}

export interface WaitTimeStats {
  rollingAverageWaitMinutes: number
  lastUpdated: string
}

export type ReportRange = 'today' | 'week'

export interface PeakWindow {
  hourLabel: string
  count: number
}

export interface ReportSummary {
  range: ReportRange
  averageWaitMinutes: number
  totalPartiesServed: number
  peakWindows: PeakWindow[]
}
