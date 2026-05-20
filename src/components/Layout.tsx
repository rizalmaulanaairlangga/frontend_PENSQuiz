import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export function Layout({ children }: { children: React.ReactNode }) {
  const { session, signOut } = useAuth()
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <div className="container">
      <div className="nav">
        <div className="row">
          <Link to="/">
            <strong>PENSQuiz</strong>
          </Link>
          {session ? (
            <>
              <Link to="/dashboard" className="muted">
                Dashboard
              </Link>
              <Link to="/quizzes" className="muted">
                Quizzes
              </Link>
              <Link to="/me" className="muted">
                Profile
              </Link>
            </>
          ) : null}
        </div>

        <div className="row">
          {session ? (
            <button className="btn" onClick={() => setShowConfirm(true)}>
              Logout
            </button>
          ) : (
            <>
              <Link className="btn" to="/login">
                Login
              </Link>
              <Link className="btn primary" to="/register">
                Register
              </Link>
            </>
          )}
        </div>
      </div>

      <div style={{ height: 16 }} />
      {children}

      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowConfirm(false)}>
          <div className="w-[90%] max-w-[400px] rounded-[32px] bg-white p-8 shadow-[0_20px_50px_rgba(15,23,42,0.15)] border border-slate-100 text-center animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-black text-slate-900">Sign Out</h3>
            <p className="mb-8 text-sm font-semibold text-slate-500 leading-relaxed">Are you sure you want to sign out? You will need to log back in to access your quizzes.</p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-2xl border-2 border-slate-100 py-3.5 text-sm font-black text-slate-500 hover:bg-slate-50 transition active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false)
                  void signOut()
                }}
                className="flex-1 rounded-2xl bg-red-500 py-3.5 text-sm font-black text-white hover:bg-red-600 shadow-lg shadow-red-100 transition active:scale-95"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

