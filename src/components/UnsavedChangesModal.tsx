import { useEffect, useRef } from 'react'

interface UnsavedChangesModalProps {
  isOpen: boolean
  onSaveAsDraft: () => void
  onBackToForm: () => void
  onDiscard: () => void
  isSaving?: boolean
}

export function UnsavedChangesModal({
  isOpen,
  onSaveAsDraft,
  onBackToForm,
  onDiscard,
  isSaving = false,
}: UnsavedChangesModalProps) {
  const backdropRef = useRef<HTMLDivElement | null>(null)

  // Trap focus inside modal & close on Escape
  useEffect(() => {
    if (!isOpen) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBackToForm()
    }
    document.addEventListener('keydown', handleKey)
    // Prevent background scroll
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onBackToForm])

  if (!isOpen) return null

  return (
    <div
      ref={backdropRef}
      onClick={(e) => {
        if (e.target === backdropRef.current) onBackToForm()
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ animation: 'ucm-fade-in 200ms ease-out both' }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-white rounded-[32px] shadow-[0_30px_80px_rgba(0,0,0,0.25)] border border-gray-100 overflow-hidden"
        style={{ animation: 'ucm-scale-in 300ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
      >
        {/* Top accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#A6D9F0] via-[#528EB8] to-[#104876]" />

        <div className="p-8 pt-7">
          {/* Warning icon */}
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-[20px] bg-amber-50 border border-amber-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-extrabold text-black text-center mb-2">
            Unsaved Changes
          </h2>

          {/* Description */}
          <p className="text-sm font-medium text-gray-400 text-center leading-relaxed mb-8">
            You have unsaved changes in your quiz. Would you like to save them as a draft before leaving?
          </p>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            {/* Save as Draft */}
            <button
              onClick={onSaveAsDraft}
              disabled={isSaving}
              className="w-full py-4 rounded-2xl bg-[#104876] text-white font-bold text-sm shadow-lg shadow-[#104876]/20 hover:bg-[#0c365a] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  Save as Draft
                </>
              )}
            </button>

            {/* Back to Form */}
            <button
              onClick={onBackToForm}
              disabled={isSaving}
              className="w-full py-4 rounded-2xl bg-white border-2 border-gray-100 text-black font-bold text-sm hover:border-[#528EB8]/30 hover:bg-[#eef8fc] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              Back to Form
            </button>

            {/* Discard Quiz */}
            <button
              onClick={onDiscard}
              disabled={isSaving}
              className="w-full py-4 rounded-2xl bg-red-50 border border-red-100 text-red-500 font-bold text-sm hover:bg-red-500 hover:text-white hover:border-red-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Discard Quiz
            </button>
          </div>
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes ucm-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes ucm-scale-in {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}
