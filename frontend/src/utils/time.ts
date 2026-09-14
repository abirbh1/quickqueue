export function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function formatElapsed(sinceIso: string, nowMs: number): string {
  const totalSeconds = Math.max(0, Math.floor((nowMs - new Date(sinceIso).getTime()) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

export function formatMinutes(minutes: number): string {
  const rounded = Math.round(minutes)
  if (rounded < 1) return '<1 min'
  if (rounded === 1) return '1 min'
  return `${rounded} min`
}
