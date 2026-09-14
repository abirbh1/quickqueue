import { useState } from 'react'
import { api } from '../api/client'
import type { ReportRange } from '../api/types'
import CheckInQrCard from '../components/CheckInQrCard'
import PeakHoursChart from '../components/PeakHoursChart'
import QueueTable from '../components/QueueTable'
import SeatedTable from '../components/SeatedTable'
import StatTile from '../components/StatTile'
import { useLiveData } from '../hooks/useLiveData'
import { useNow } from '../hooks/useNow'
import { formatMinutes } from '../utils/time'

type Tab = 'queue' | 'reports'

export default function ManagerPage() {
  const [tab, setTab] = useState<Tab>('queue')
  const [range, setRange] = useState<ReportRange>('today')
  const [busyId, setBusyId] = useState<string | null>(null)
  const now = useNow(1000)

  const { data: queue } = useLiveData(api.getQueue)
  const { data: seated } = useLiveData(api.getSeated)
  const { data: waitStats } = useLiveData(api.getWaitStats)
  const { data: report } = useLiveData(() => api.getReport(range), [range])

  async function withBusy(id: string, action: () => Promise<unknown>) {
    setBusyId(id)
    try {
      await action()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#0b0b0b]">QuickQueue</h1>
          <p className="text-sm text-[#898781]">Manager view</p>
        </div>
        <nav className="flex gap-1 rounded-lg border border-[#e1e0d9] bg-[#fcfcfb] p-1 text-sm">
          <button
            type="button"
            onClick={() => setTab('queue')}
            className={`rounded-md px-3 py-1.5 font-medium ${tab === 'queue' ? 'bg-[#2a78d6] text-white' : 'text-[#52514e] hover:bg-[#f0efec]'}`}
          >
            Queue
          </button>
          <button
            type="button"
            onClick={() => setTab('reports')}
            className={`rounded-md px-3 py-1.5 font-medium ${tab === 'reports' ? 'bg-[#2a78d6] text-white' : 'text-[#52514e] hover:bg-[#f0efec]'}`}
          >
            Reports
          </button>
        </nav>
      </header>

      {tab === 'queue' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
          <div className="flex flex-col gap-6">
            <section className="rounded-xl border border-[#e1e0d9] bg-white p-4 sm:p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-[#0b0b0b]">Waiting ({queue?.length ?? 0})</h2>
                {waitStats && <span className="text-xs text-[#898781]">Avg. turnover: {formatMinutes(waitStats.rollingAverageWaitMinutes)}</span>}
              </div>
              <QueueTable
                parties={queue ?? []}
                now={now}
                avgTurnoverMinutes={waitStats?.rollingAverageWaitMinutes ?? 0}
                busyId={busyId}
                onSeat={(id) => withBusy(id, () => api.seatParty(id))}
                onCancel={(id) => withBusy(id, () => api.cancelParty(id))}
                onNoShow={(id) => withBusy(id, () => api.markNoShow(id))}
                onMoveUp={(id) => withBusy(id, () => api.moveUp(id))}
                onMoveDown={(id) => withBusy(id, () => api.moveDown(id))}
              />
            </section>

            <section className="rounded-xl border border-[#e1e0d9] bg-white p-4 sm:p-5">
              <h2 className="mb-3 font-semibold text-[#0b0b0b]">Seated ({seated?.length ?? 0})</h2>
              <SeatedTable parties={seated ?? []} now={now} busyId={busyId} onFreeTable={(id) => withBusy(id, () => api.freeTable(id))} />
            </section>
          </div>

          <CheckInQrCard />
        </div>
      )}

      {tab === 'reports' && (
        <div className="flex flex-col gap-6">
          <div className="flex gap-1 self-start rounded-lg border border-[#e1e0d9] bg-[#fcfcfb] p-1 text-sm">
            {(['today', 'week'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded-md px-3 py-1.5 font-medium capitalize ${range === r ? 'bg-[#2a78d6] text-white' : 'text-[#52514e] hover:bg-[#f0efec]'}`}
              >
                {r === 'today' ? 'Today' : 'Last 7 days'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
            <StatTile label="Average wait" value={report ? formatMinutes(report.averageWaitMinutes) : '—'} />
            <StatTile label="Parties served" value={report ? String(report.totalPartiesServed) : '—'} />
          </div>

          <section className="rounded-xl border border-[#e1e0d9] bg-white p-4 sm:p-5">
            <h2 className="mb-4 font-semibold text-[#0b0b0b]">Peak wait-time windows</h2>
            <PeakHoursChart windows={report?.peakWindows ?? []} />
          </section>
        </div>
      )}
    </div>
  )
}
