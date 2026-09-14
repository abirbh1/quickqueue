interface StatTileProps {
  label: string
  value: string
}

export default function StatTile({ label, value }: StatTileProps) {
  return (
    <div className="rounded-xl border border-[#e1e0d9] bg-[#fcfcfb] px-5 py-4">
      <div className="text-sm text-[#52514e]">{label}</div>
      <div className="tabular-nums mt-1 text-3xl font-semibold text-[#0b0b0b]">{value}</div>
    </div>
  )
}
