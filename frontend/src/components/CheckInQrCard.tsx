import { QRCodeSVG } from 'qrcode.react'

export default function CheckInQrCard() {
  const url = `${window.location.origin}/checkin`

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-[#e1e0d9] bg-[#fcfcfb] p-5 text-center">
      <p className="text-sm font-medium text-[#0b0b0b]">Scan to join the waitlist</p>
      <div className="rounded-lg bg-white p-3">
        <QRCodeSVG value={url} size={140} />
      </div>
      <a href="/checkin" target="_blank" rel="noreferrer" className="text-xs text-[#256abf] underline underline-offset-2">
        {url}
      </a>
      <p className="max-w-[220px] text-xs text-[#898781]">Post this at the entrance. Customers scan it to check themselves in.</p>
    </div>
  )
}
