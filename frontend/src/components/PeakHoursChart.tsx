import type { PeakWindow } from '../api/types'

interface PeakHoursChartProps {
  windows: PeakWindow[]
}

const BAR = '#2a78d6' // sequential blue, step 450
const BAR_PEAK = '#184f95' // step 600, highlights the busiest window

export default function PeakHoursChart({ windows }: PeakHoursChartProps) {
  if (windows.length === 0) {
    return <p className="text-sm text-[#898781]">No check-ins in this range yet.</p>
  }

  const max = Math.max(...windows.map((w) => w.count))

  return (
    <div className="flex flex-col gap-2" role="img" aria-label="Check-ins by hour of day">
      <div className="flex h-40 items-stretch gap-2">
        {windows.map((w) => {
          const isPeak = w.count === max
          const heightPct = Math.max(6, (w.count / max) * 100)
          return (
            <div key={w.hourLabel} className="group relative flex h-full flex-1 items-end justify-center">
              <span
                className={`tabular-nums absolute bottom-full mb-1 w-full text-center text-xs font-medium text-[#52514e] ${
                  isPeak ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              >
                {w.count}
              </span>
              <div
                className="w-full rounded-t-[4px] transition-[height]"
                style={{ height: `${heightPct}%`, background: isPeak ? BAR_PEAK : BAR }}
                title={`${w.hourLabel}: ${w.count} check-in${w.count === 1 ? '' : 's'}`}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-2">
        {windows.map((w) => (
          <span key={w.hourLabel} className="flex-1 whitespace-nowrap text-center text-[10px] text-[#898781]">
            {w.hourLabel}
          </span>
        ))}
      </div>
    </div>
  )
}
