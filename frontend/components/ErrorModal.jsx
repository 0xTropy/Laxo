'use client'

export default function ErrorModal({ error, onClose }) {
  if (!error) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed top-4 right-4 z-50 p-4">
        <div className="relative w-full max-w-md rounded-2xl border border-red-500/50 bg-laxo-card p-6 shadow-xl">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-lg p-1 text-gray-400 transition hover:bg-laxo-bg hover:text-white"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Error icon */}
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/20">
              <svg className="h-6 w-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="font-display text-xl font-bold text-white">
              Error
            </h2>
          </div>

          {/* Error message */}
          <p className="mb-6 text-gray-300">
            {error}
          </p>

          {/* Action button */}
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-red-500/20 border border-red-500/50 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/30"
          >
            Dismiss
          </button>
        </div>
      </div>
    </>
  )
}
