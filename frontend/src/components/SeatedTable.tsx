import type { Party } from '../api/types'
import { formatClockTime, formatElapsed } from '../utils/time'

interface SeatedTableProps {
  parties: Party[]
  now: number
  busyId: string | null
  onFreeTable: (id: string) => void
}

export default function SeatedTable({ parties, now, busyId, onFreeTable }: SeatedTableProps) {
  if (parties.length === 0) {
    return <p className="py-6 text-center text-sm text-[#898781]">No occupied tables right now.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[#e1e0d9] text-[#898781]">
            <th className="py-2 pr-3 font-medium">Party</th>
            <th className="py-2 pr-3 font-medium">Size</th>
            <th className="py-2 pr-3 font-medium">Seated at</th>
            <th className="py-2 pr-3 font-medium">Time at table</th>
            <th className="py-2 pr-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {parties.map((party) => (
            <tr key={party.id} className="border-b border-[#e1e0d9] last:border-0">
              <td className="py-3 pr-3 font-medium text-[#0b0b0b]">{party.name}</td>
              <td className="tabular-nums py-3 pr-3">{party.partySize}</td>
              <td className="tabular-nums py-3 pr-3">{formatClockTime(party.seatedTime!)}</td>
              <td className="tabular-nums py-3 pr-3">{formatElapsed(party.seatedTime!, now)}</td>
              <td className="py-3 pr-3">
                <button
                  type="button"
                  disabled={busyId === party.id}
                  onClick={() => onFreeTable(party.id)}
                  className="rounded-md bg-[#1baf7a] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#199e70] disabled:opacity-50"
                >
                  Free table
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
