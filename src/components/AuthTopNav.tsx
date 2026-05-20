import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { apiFetch } from '../lib/api'
import { BrandLogo } from './BrandLogo'

function navLinkClass(isActive: boolean) {
  return [
    'relative font-semibold transition focus:outline-none',
    isActive ? 'text-[#fdc02a]' : 'text-white/80 hover:text-[#fdc02a]',
  ].join(' ')
}

export function AuthTopNav() {
  const { session, signOut } = useAuth()
  const location = useLocation()
  const [profile, setProfile] = useState<{ username?: string | null; firstName?: string | null; lastName?: string | null } | null>(null)

  useEffect(() => {
    if (!session) return
    apiFetch<{ username?: string | null; firstName?: string | null; lastName?: string | null }>('/api/me', session)
      .then((res) => setProfile(res))
      .catch((e) => console.error('Failed to load profile in navbar:', e))
  }, [session])

  const userEmail = session?.user?.email ?? 'user@example.com'
  const userHandle = useMemo(() => {
    if (profile?.username) return profile.username
    const meta = (session?.user?.user_metadata ?? {}) as Record<string, unknown>
    if (typeof meta.username === 'string' && meta.username) {
      return meta.username
    }
    return userEmail.split('@')[0] ?? 'user'
  }, [profile?.username, session?.user?.user_metadata, userEmail])

  const userLabel = useMemo(() => {
    if (profile?.firstName || profile?.lastName) {
      const full = [profile.firstName, profile.lastName].filter(Boolean).join(' ')
      if (full) return full
    }
    const meta = (session?.user?.user_metadata ?? {}) as Record<string, unknown>
    const firstName = typeof meta.first_name === 'string' ? meta.first_name : null
    const lastName = typeof meta.last_name === 'string' ? meta.last_name : null
    const full = [firstName, lastName].filter(Boolean).join(' ')
    return full || userEmail
  }, [profile, session?.user?.user_metadata, userEmail])
  const userInitial = (userLabel?.[0] ?? 'U').toUpperCase()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [myQuizzesOpen, setMyQuizzesOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const myQuizzesRef = useRef<HTMLDivElement | null>(null)
  const userMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node
      if (myQuizzesRef.current && !myQuizzesRef.current.contains(target)) {
        setMyQuizzesOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
    setMyQuizzesOpen(false)
    setUserMenuOpen(false)
  }, [location.pathname])

  return (
    <header className="sticky top-0 z-50 px-5 pt-4 pb-2 sm:px-8 lg:px-10 lg:pt-5">
      <div className="mx-auto max-w-7xl rounded-[28px] bg-[linear-gradient(145deg,#a8dbf1_0%,#79b7dc_52%,#4b87b2_100%)] shadow-[0_16px_40px_rgba(21,65,107,0.14)]">
        <div className="flex items-center justify-between gap-6 px-6 py-4 sm:px-8 sm:py-5 lg:px-10">
          <BrandLogo to="/dashboard" ariaLabel="PENSQuiz dashboard" className="w-[140px] sm:w-[176px] lg:w-[194px]" />

          <nav className="hidden items-center gap-10 text-base text-white md:flex" aria-label="Primary navigation">
            <Link 
              to="/dashboard" 
              className={navLinkClass(location.pathname === '/dashboard')}
            >
              Dashboard
            </Link>
            <Link 
              to="/quizzes" 
              className={navLinkClass(location.pathname === '/quizzes' || (location.pathname.startsWith('/quizzes/') && location.pathname !== '/quizzes/create'))}
            >
              Quizzes
            </Link>

            <div className="relative" ref={myQuizzesRef}>
              <button
                type="button"
                onClick={() => setMyQuizzesOpen((v) => !v)}
                className={navLinkClass(location.pathname === '/my-quizzes' || location.pathname === '/quizzes/create')}
              >
                <span className="inline-flex items-center gap-2">
                  My Quizzes
                  <svg
                    className={`h-4 w-4 transition-transform ${myQuizzesOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </button>

              {myQuizzesOpen ? (
                <div className="absolute left-1/2 top-[calc(100%+1.15rem)] z-50 -translate-x-1/2 rounded-[24px] border border-slate-200/70 bg-white p-2 text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
                  <div className="grid min-w-[15rem] gap-1">
                    <Link
                      to="/my-quizzes"
                      className={`flex items-center gap-4 rounded-[18px] px-4 py-3 text-sm font-bold transition hover:bg-[#eef8fc] hover:text-[#528FB9] focus:outline-none ${location.pathname === '/my-quizzes' ? 'bg-[#eef8fc] text-[#528FB9]' : 'text-slate-700'}`}
                    >
                      <img
                        src="/assets/images/img_myquizzes.png"
                        className="h-5 w-5 shrink-0 object-contain"
                        alt="My Quizzes"
                      />
                      My Quizzes
                    </Link>
                    <Link
                      to="/quizzes/create"
                      className={`flex items-center gap-4 rounded-[18px] px-4 py-3 text-sm font-bold transition hover:bg-[#eef8fc] hover:text-[#528FB9] focus:outline-none ${location.pathname === '/quizzes/create' ? 'bg-[#eef8fc] text-[#528FB9]' : 'text-slate-700'}`}
                    >
                      <img
                        src="/assets/images/img_create_quiz.png"
                        className="h-5 w-5 shrink-0 object-contain"
                        alt="Create a Quiz"
                      />
                      Create a Quiz
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/60 md:hidden"
              aria-label="Open menu"
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="relative hidden md:block" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="group inline-flex items-center gap-3 rounded-[22px] bg-white/10 px-3 py-2 text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/60"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fdc02a] text-[#528FB9] font-black">
                  {userInitial}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-sm font-black leading-5">{userLabel}</div>
                  <div className="text-xs font-bold text-white/70">@{userHandle}</div>
                </div>
                <svg
                  className={`h-4 w-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>

              {userMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+1.15rem)] z-50 w-[18rem] rounded-[24px] border border-slate-200/70 bg-white p-2 text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.16)]">
                  <div className="grid gap-1">
                    <Link
                      to="/me"
                      className="flex items-center gap-4 rounded-[18px] px-4 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-[#eef8fc] hover:text-[#528FB9] focus:outline-none"
                    >
                      <img
                        src="/assets/images/img_profile.png"
                        className="h-6 w-6 shrink-0 object-contain"
                        alt="Profile"
                      />
                      Profile
                    </Link>
                    <Link
                      to="/me"
                      className="flex items-center gap-4 rounded-[18px] px-4 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-[#eef8fc] hover:text-[#528FB9] focus:outline-none"
                    >
                      <img
                        src="/assets/images/img_settings.png"
                        className="h-6 w-6 shrink-0 object-contain"
                        alt="Settings"
                      />
                      Settings
                    </Link>
                    <div className="my-1 h-px w-full bg-slate-50" />
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false)
                        setShowLogoutConfirm(true)
                      }}
                      className="flex w-full items-center gap-4 rounded-[18px] px-4 py-3.5 text-sm font-bold text-red-500 transition hover:bg-red-50 focus:outline-none"
                    >
                      <img
                        src="/assets/images/img_logout.png"
                        className="h-6 w-6 shrink-0 object-contain"
                        alt="Logout"
                      />
                      Logout
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {mobileMenuOpen ? (
          <div className="md:hidden border-t border-white/20 px-6 py-4">
            <nav className="flex flex-col gap-2">
              <Link
                to="/dashboard"
                className={[
                  'flex items-center justify-between rounded-[18px] px-4 py-3.5 text-base font-black transition focus:outline-none',
                  location.pathname === '/dashboard' ? 'bg-white text-[#528FB9]' : 'text-white hover:bg-white/10',
                ].join(' ')}
              >
                Dashboard
                {location.pathname === '/dashboard' ? <div className="h-2 w-2 rounded-full bg-[#fdc02a]" /> : null}
              </Link>
              <Link
                to="/quizzes"
                className={[
                  'flex items-center justify-between rounded-[18px] px-4 py-3.5 text-base font-black transition focus:outline-none',
                  (location.pathname === '/quizzes' || (location.pathname.startsWith('/quizzes/') && location.pathname !== '/quizzes/create')) ? 'bg-white text-[#528FB9]' : 'text-white hover:bg-white/10',
                ].join(' ')}
              >
                Quizzes
                {(location.pathname === '/quizzes' || (location.pathname.startsWith('/quizzes/') && location.pathname !== '/quizzes/create')) ? <div className="h-2 w-2 rounded-full bg-[#fdc02a]" /> : null}
              </Link>

              <div className="my-2 h-px w-full bg-white/10" />
              <p className="px-4 text-[11px] font-bold uppercase tracking-widest text-white/50">Creator Area</p>
              <Link
                to="/my-quizzes"
                className={`flex items-center gap-4 rounded-[18px] px-4 py-3.5 text-base font-black transition hover:bg-white/10 focus:outline-none ${location.pathname === '/my-quizzes' ? 'bg-white/10 text-[#fdc02a]' : 'text-white'}`}
              >
                <img src="/assets/images/img_myquizzes.png" className={`h-5 w-5 ${location.pathname === '/my-quizzes' ? '' : 'brightness-0 invert'}`} alt="" />
                My Quizzes
              </Link>
              <Link
                to="/quizzes/create"
                className={`flex items-center gap-4 rounded-[18px] px-4 py-3.5 text-base font-black transition hover:bg-white/10 focus:outline-none ${location.pathname === '/quizzes/create' ? 'bg-white/10 text-[#fdc02a]' : 'text-white'}`}
              >
                <img src="/assets/images/img_create_quiz.png" className={`h-5 w-5 ${location.pathname === '/quizzes/create' ? '' : 'brightness-0 invert'}`} alt="" />
                Create a Quiz
              </Link>
            </nav>
          </div>
        ) : null}
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowLogoutConfirm(false)}>
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
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-2xl border-2 border-slate-100 py-3.5 text-sm font-black text-slate-500 hover:bg-slate-50 transition active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false)
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
    </header>
  )
}

