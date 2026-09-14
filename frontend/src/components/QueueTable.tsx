import type { Party } from '../api/types'
import { formatClockTime, formatElapsed, formatMinutes } from '../utils/time'

interface QueueTableProps {
  parties: Party[]
  now: number
  avgTurnoverMinutes: number
  busyId: string | null
  onSeat: (id: string) => void
  onCancel: (id: string) => void
  onNoShow: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
}

export default function QueueTable({ parties, now, avgTurnoverMinutes, busyId, onSeat, onCancel, onNoShow, onMoveUp, onMoveDown }: QueueTableProps) {
  if (parties.length === 0) {
    return <p className="py-6 text-center text-sm text-[#898781]">No parties waiting. Queue is empty.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[#e1e0d9] text-[#898781]">
            <th className="py-2 pr-3 font-medium">#</th>
            <th className="py-2 pr-3 font-medium">Party</th>
            <th className="py-2 pr-3 font-medium">Size</th>
            <th className="py-2 pr-3 font-medium">Checked in</th>
            <th className="py-2 pr-3 font-medium">Waiting</th>
            <th className="py-2 pr-3 font-medium">Est. wait</th>
            <th className="py-2 pr-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {parties.map((party, index) => {
            const position = index + 1
            const disabled = busyId === party.id
            return (
              <tr key={party.id} className="border-b border-[#e1e0d9] last:border-0">
                <td className="tabular-nums py-3 pr-3 text-[#52514e]">{position}</td>
                <td className="py-3 pr-3 font-medium text-[#0b0b0b]">
                  {party.name}
                  {party.phone && <div className="text-xs font-normal text-[#898781]">{party.phone}</div>}
                </td>
                <td className="tabular-nums py-3 pr-3">{party.partySize}</td>
                <td className="tabular-nums py-3 pr-3">{formatClockTime(party.checkInTime)}</td>
                <td className="tabular-nums py-3 pr-3">{formatElapsed(party.checkInTime, now)}</td>
                <td className="tabular-nums py-3 pr-3">{formatMinutes(avgTurnoverMinutes * position)}</td>
                <td className="py-3 pr-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onSeat(party.id)}
                      className="rounded-md bg-[#2a78d6] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#256abf] disabled:opacity-50"
                    >
                      Seat
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onNoShow(party.id)}
                      className="rounded-md border border-[#c3c2b7] px-2.5 py-1 text-xs font-medium text-[#52514e] hover:bg-[#f0efec] disabled:opacity-50"
                    >
                      No-show
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onCancel(party.id)}
                      className="rounded-md border border-[#c3c2b7] px-2.5 py-1 text-xs font-medium text-[#52514e] hover:bg-[#f0efec] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={disabled || index === 0}
                      onClick={() => onMoveUp(party.id)}
                      aria-label={`Move ${party.name} up`}
                      className="rounded-md border border-[#c3c2b7] px-2 py-1 text-xs text-[#52514e] hover:bg-[#f0efec] disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={disabled || index === parties.length - 1}
                      onClick={() => onMoveDown(party.id)}
                      aria-label={`Move ${party.name} down`}
                      className="rounded-md border border-[#c3c2b7] px-2 py-1 text-xs text-[#52514e] hover:bg-[#f0efec] disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
