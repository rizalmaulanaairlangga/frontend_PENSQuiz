import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { getSupabaseClient } from '../lib/supabase'
import { BrandLogo } from '../components/BrandLogo'
import { getFriendlyErrorMessage } from '../lib/api'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const location = useLocation()
  const successMessage = location.state?.success as string | undefined

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInError) throw signInError
      navigate('/dashboard')
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Unable to log in. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  const landingUrl = import.meta.env.VITE_LANDING_PAGE_URL || '#'

  return (
    <main className="min-h-screen font-sans text-[#101010]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-4 p-4 lg:h-screen lg:grid-cols-2 lg:gap-6 lg:overflow-hidden lg:p-6">
        
        {/* FORM SECTION (KIRI) */}
        <section className="auth-slide-from-right relative h-full overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,#fafcff_0%,#edf5ff_63%,#d4e5fb_100%)] shadow-sm">
          <img
            src="/assets/images/img_background.png"
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35"
            aria-hidden="true"
          />

          <div className="relative z-10 flex min-h-full flex-col overflow-y-auto scrollbar-hide px-6 py-7 sm:px-10 sm:py-8 lg:px-14 lg:py-8 xl:px-20">
            {successMessage && (
              <div className="fixed right-6 top-6 z-50 flex animate-in fade-in slide-in-from-top-4 items-center gap-3 rounded-2xl bg-green-500 px-6 py-4 text-white shadow-2xl duration-500">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <p className="text-base font-bold">{successMessage}</p>
              </div>
            )}

            <a 
              href={landingUrl} 
              className="inline-flex w-fit items-center gap-3 text-base font-semibold text-[#101010] transition hover:text-[#1d5687] focus:outline-none"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
              Back
            </a>

            <div className="flex w-full flex-col items-center py-10 lg:my-auto">
              <div className="w-full max-w-xl">
                <div className="w-full">
                  <BrandLogo to="/" ariaLabel="PENSQuiz home" className="w-[154px] sm:w-[176px]" />

                  <h1 className="mt-8 text-5xl font-extrabold leading-none tracking-normal text-black sm:text-6xl lg:text-[68px]">
                    Welcome back!
                  </h1>

                  <p className="mt-5 text-base font-medium leading-7 text-[#101010] sm:text-lg">
                    Continue your studies with the PENS community.<br className="hidden sm:block" />
                    Log in and start today's quiz.
                  </p>
                </div>

                <form onSubmit={onSubmit} className="mt-8 w-full space-y-4 sm:mt-10 lg:mt-11">
                  <div>
                    <label htmlFor="email" className="block text-base font-medium text-[#171717]">
                      PENS Student Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="1234@ds.student.pens.ac.id"
                      required
                      autoFocus
                      autoComplete="username"
                      className="mt-2 h-[52px] w-full rounded-[18px] border border-[#6f6b69] bg-white px-5 py-4 text-base font-medium text-black placeholder:text-[#a9a0a0] shadow-sm transition focus:border-transparent focus:outline-none focus:ring-4 focus:ring-[#1d5687]/20 sm:h-14 sm:px-6 sm:text-lg lg:h-[58px]"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-base font-medium text-[#171717]">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="123457890"
                      required
                      autoComplete="current-password"
                      className="mt-2 h-[52px] w-full rounded-[18px] border border-[#6f6b69] bg-white px-5 py-4 text-base font-medium text-black placeholder:text-[#a9a0a0] shadow-sm transition focus:border-transparent focus:outline-none focus:ring-4 focus:ring-[#1d5687]/20 sm:h-14 sm:px-6 sm:text-lg lg:h-[58px]"
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-14 w-full items-center justify-center rounded-full bg-[#1d5687] px-8 text-lg font-bold text-white shadow-[0_18px_40px_rgba(74,140,197,0.28)] transition hover:-translate-y-0.5 hover:bg-[#17466f] hover:shadow-[0_22px_48px_rgba(74,140,197,0.34)] focus:outline-none focus:ring-4 focus:ring-[#1d5687]/25 active:scale-[0.99] disabled:opacity-50 sm:text-xl lg:h-[58px]"
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </button>

                  <p className="text-center text-base font-medium text-[#111111]">
                    Don't have an account yet?{' '}
                    <Link to="/register" className="font-extrabold transition hover:text-[#1d5687] focus:outline-none">
                      Sign up now.
                    </Link>
                  </p>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* IMAGE / ILLUSTRATION SECTION (KANAN) */}
        <section className="auth-slide-from-left relative hidden h-full overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,#8fd4f0_0%,#7dc6e9_18%,#5b98d0_52%,#1f4b88_100%)] px-6 py-10 shadow-sm sm:px-10 lg:block lg:min-h-0 lg:px-12 lg:py-8">
          <img
            src="/assets/images/img_background.png"
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-35 mix-blend-soft-light"
            aria-hidden="true"
          />

          <div className="relative z-10 flex min-h-full flex-col justify-between gap-8">
            <div className="flex justify-center pt-4 lg:pt-10">
              <img
                src="/assets/images/img_exam_1.png"
                alt="Student taking an online quiz"
                className="w-full max-w-[360px] object-contain drop-shadow-[0_28px_40px_rgba(12,48,86,0.22)] sm:max-w-[420px] lg:max-w-[430px] xl:max-w-[500px]"
              />
            </div>

            <div className="pb-2 sm:pb-6 lg:pb-8 xl:pb-10">
              <h2 className="max-w-3xl text-3xl font-extrabold leading-tight tracking-normal text-white sm:text-4xl lg:text-[32px] xl:text-[36px]">
                Learn smarter, starting here.
              </h2>
              <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-white sm:text-lg lg:text-base xl:text-lg">
                Hone your knowledge, measure your abilities.<br className="hidden sm:block" />
                From PENS students, for PENS students.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
