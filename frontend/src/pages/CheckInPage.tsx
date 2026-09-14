import { type FormEvent, useState } from 'react'
import { api } from '../api/client'
import type { CheckInResult } from '../api/types'
import { formatMinutes } from '../utils/time'

export default function CheckInPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [partySize, setPartySize] = useState(2)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CheckInResult | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter a name.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await api.checkIn({ name, phone: phone || undefined, partySize })
      setResult(res)
    } finally {
      setSubmitting(false)
    }
  }

  function checkInAnother() {
    setResult(null)
    setName('')
    setPhone('')
    setPartySize(2)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-10">
      <h1 className="mb-1 text-center text-2xl font-semibold text-[#0b0b0b]">QuickQueue</h1>
      <p className="mb-6 text-center text-sm text-[#898781]">Join the waitlist</p>

      {!result ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-[#e1e0d9] bg-white p-5">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[#0b0b0b]">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="rounded-md border border-[#c3c2b7] px-3 py-2 text-base outline-none focus:border-[#2a78d6]"
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[#0b0b0b]">Phone (optional)</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="555-0100"
              className="rounded-md border border-[#c3c2b7] px-3 py-2 text-base outline-none focus:border-[#2a78d6]"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-[#0b0b0b]">Party size</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPartySize((n) => Math.max(1, n - 1))}
                className="h-10 w-10 rounded-md border border-[#c3c2b7] text-lg text-[#52514e] hover:bg-[#f0efec]"
                aria-label="Decrease party size"
              >
                −
              </button>
              <span className="tabular-nums w-8 text-center text-lg font-medium">{partySize}</span>
              <button
                type="button"
                onClick={() => setPartySize((n) => Math.min(20, n + 1))}
                className="h-10 w-10 rounded-md border border-[#c3c2b7] text-lg text-[#52514e] hover:bg-[#f0efec]"
                aria-label="Increase party size"
              >
                +
              </button>
            </div>
          </label>

          {error && <p className="text-sm text-[#d03b3b]">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 rounded-md bg-[#2a78d6] py-2.5 text-base font-medium text-white hover:bg-[#256abf] disabled:opacity-60"
          >
            {submitting ? 'Joining…' : 'Join the waitlist'}
          </button>
        </form>
      ) : (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-[#e1e0d9] bg-white p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f2fb] text-2xl text-[#2a78d6]">✓</div>
          <div>
            <p className="font-semibold text-[#0b0b0b]">You're in the queue, {result.party.name}!</p>
            <p className="text-sm text-[#898781]">Party of {result.party.partySize}</p>
          </div>
          <div className="flex w-full gap-3">
            <div className="flex-1 rounded-lg bg-[#fcfcfb] p-3">
              <div className="text-xs text-[#898781]">Position</div>
              <div className="tabular-nums text-2xl font-semibold text-[#0b0b0b]">#{result.position}</div>
            </div>
            <div className="flex-1 rounded-lg bg-[#fcfcfb] p-3">
              <div className="text-xs text-[#898781]">Estimated wait</div>
              <div className="tabular-nums text-2xl font-semibold text-[#0b0b0b]">{formatMinutes(result.estimatedWaitMinutes)}</div>
            </div>
          </div>
          <p className="text-xs text-[#898781]">We'll seat you as soon as a table is ready. Keep an eye on the host stand.</p>
          <button type="button" onClick={checkInAnother} className="mt-2 text-sm text-[#256abf] underline underline-offset-2">
            Check in another party
          </button>
        </div>
      )}
    </div>
  )
}
