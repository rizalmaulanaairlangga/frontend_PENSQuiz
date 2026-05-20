import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSupabaseClient } from '../lib/supabase'
import { BrandLogo } from '../components/BrandLogo'
import { getFriendlyErrorMessage } from '../lib/api'

export function Register() {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const supabase = getSupabaseClient()
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            username: username,
          },
        },
      })
      if (signUpError) throw signUpError
      navigate('/login', { state: { success: 'Registration successful! Please login to continue.' } })
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  const landingUrl = import.meta.env.VITE_LANDING_PAGE_URL || '#'

  return (
    <main className="min-h-screen font-sans text-[#101010]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-4 p-4 lg:h-screen lg:grid-cols-2 lg:gap-6 lg:overflow-hidden lg:p-6">
        
        {/* IMAGE / ILLUSTRATION SECTION (KIRI) */}
        <section className="auth-slide-from-right relative hidden h-full overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,#8fd4f0_0%,#7dc6e9_18%,#5b98d0_52%,#1f4b88_100%)] px-6 py-8 shadow-sm sm:px-10 lg:block lg:min-h-0 lg:px-12 lg:py-7">
          <img
            src="/assets/images/img_background.png"
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-35 mix-blend-soft-light"
            aria-hidden="true"
          />

          <div className="relative z-10 flex min-h-full flex-col justify-between gap-7">
            <div className="flex justify-center pt-4 lg:pt-8">
              <img
                src="/assets/images/img_exam_1.png"
                alt="Student preparing an online quiz"
                className="w-full max-w-[360px] -scale-x-100 object-contain drop-shadow-[0_28px_40px_rgba(12,48,86,0.22)] sm:max-w-[420px] lg:max-w-[430px] xl:max-w-[500px]"
              />
            </div>

            <div className="pb-2 sm:pb-5 lg:pb-7 xl:pb-8">
              <h2 className="max-w-3xl text-3xl font-extrabold leading-tight tracking-normal text-white sm:text-4xl lg:text-[32px] xl:text-[36px]">
                Join and start your journey.
              </h2>
              <p className="mt-3 max-w-2xl text-base font-medium leading-7 text-white sm:text-lg lg:text-base xl:text-lg">
                Thousands of PENS students have been learning<br className="hidden sm:block" />
                smarter with PENSQuiz. Now it's your turn.
              </p>
            </div>
          </div>
        </section>

        {/* FORM SECTION (KANAN) */}
        <section className="auth-slide-from-left relative h-full overflow-hidden rounded-[32px] bg-[linear-gradient(180deg,#fafcff_0%,#edf5ff_63%,#d4e5fb_100%)] shadow-sm">
          <img
            src="/assets/images/img_background.png"
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35"
            aria-hidden="true"
          />

          <div className="relative z-10 h-full overflow-y-auto scrollbar-hide px-6 py-6 sm:px-10 sm:py-7 lg:px-12 lg:py-8 xl:px-16">
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
              <div className="w-full max-w-3xl">
                <div className="w-full">
                  <BrandLogo to="/" ariaLabel="PENSQuiz home" className="w-[154px] sm:w-[176px]" />

                  <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-normal text-black sm:text-[44px]">
                    Create an account
                  </h1>

                  <p className="mt-3 text-base font-medium leading-6 text-[#101010] sm:text-[17px]">
                    Register now and start your learning journey at PENSQuiz.<br className="hidden sm:block" />
                    Free for all PENS students.
                  </p>
                </div>

                <form onSubmit={onSubmit} className="mt-6 w-full space-y-3 sm:mt-7">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="first_name" className="block text-sm font-medium text-[#171717]">
                        First Name
                      </label>
                      <input
                        id="first_name"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        required
                        autoFocus
                        className="mt-2 h-12 w-full rounded-[16px] border border-[#6f6b69] bg-white px-5 text-base font-medium text-black placeholder:text-[#a9a0a0] shadow-sm transition focus:border-transparent focus:outline-none focus:ring-4 focus:ring-[#1d5687]/20"
                      />
                    </div>

                    <div>
                      <label htmlFor="last_name" className="block text-sm font-medium text-[#171717]">
                        Last Name
                      </label>
                      <input
                        id="last_name"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        className="mt-2 h-12 w-full rounded-[16px] border border-[#6f6b69] bg-white px-5 text-base font-medium text-black placeholder:text-[#a9a0a0] shadow-sm transition focus:border-transparent focus:outline-none focus:ring-4 focus:ring-[#1d5687]/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-[#171717]">
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="johndoe123"
                      required
                      className="mt-2 h-12 w-full rounded-[16px] border border-[#6f6b69] bg-white px-5 text-base font-medium text-black placeholder:text-[#a9a0a0] shadow-sm transition focus:border-transparent focus:outline-none focus:ring-4 focus:ring-[#1d5687]/20"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[#171717]">
                      PENS Student Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="1234@ds.student.pens.ac.id"
                      required
                      autoComplete="email"
                      className="mt-2 h-12 w-full rounded-[16px] border border-[#6f6b69] bg-white px-5 text-base font-medium text-black placeholder:text-[#a9a0a0] shadow-sm transition focus:border-transparent focus:outline-none focus:ring-4 focus:ring-[#1d5687]/20"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-[#171717]">
                        Password
                      </label>
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="123457890"
                        required
                        autoComplete="new-password"
                        className="mt-2 h-12 w-full rounded-[16px] border border-[#6f6b69] bg-white px-5 text-base font-medium text-black placeholder:text-[#a9a0a0] shadow-sm transition focus:border-transparent focus:outline-none focus:ring-4 focus:ring-[#1d5687]/20"
                      />
                    </div>

                    <div>
                      <label htmlFor="password_confirmation" className="block text-sm font-medium text-[#171717]">
                        Confirm Password
                      </label>
                      <input
                        id="password_confirmation"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="123457890"
                        required
                        autoComplete="new-password"
                        className="mt-2 h-12 w-full rounded-[16px] border border-[#6f6b69] bg-white px-5 text-base font-medium text-black placeholder:text-[#a9a0a0] shadow-sm transition focus:border-transparent focus:outline-none focus:ring-4 focus:ring-[#1d5687]/20"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <input
                      type="checkbox"
                      id="agree"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                      className="h-7 w-7 rounded-[8px] border border-[#6f6b69] bg-white text-[#1d5687] focus:ring-4 focus:ring-[#1d5687]/20"
                    />
                    <label htmlFor="agree" className="cursor-pointer text-sm font-medium leading-5 text-black">
                      I agree to the Terms & Conditions and Privacy Policy of PENSQuiz.
                    </label>
                  </div>

                  {error && (
                    <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !agree}
                    className="flex h-12 w-full items-center justify-center rounded-full bg-[#1d5687] px-8 text-base font-bold text-white shadow-[0_18px_40px_rgba(74,140,197,0.28)] transition hover:-translate-y-0.5 hover:bg-[#17466f] hover:shadow-[0_22px_48px_rgba(74,140,197,0.34)] focus:outline-none focus:ring-4 focus:ring-[#1d5687]/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:text-lg"
                  >
                    {loading ? 'Registering...' : 'Register'}
                  </button>

                  <p className="text-center text-sm font-medium text-[#111111] sm:text-base">
                    Already have an account?{' '}
                    <Link to="/login" className="font-extrabold transition hover:text-[#1d5687] focus:outline-none">
                      Login now.
                    </Link>
                  </p>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
