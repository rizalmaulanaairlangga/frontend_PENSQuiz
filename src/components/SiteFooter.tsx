import { BrandLogo } from './BrandLogo'

export function SiteFooter() {
  return (
    <footer className="bg-[linear-gradient(90deg,#6eacd2_0%,#1a4770_100%)] px-5 py-12 text-white sm:px-8 lg:px-10 lg:pb-10 lg:pt-20">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 border-b border-white/20 pb-12 lg:grid-cols-[1fr_auto] lg:gap-20 lg:pb-16">
          <div className="max-w-sm">
            <BrandLogo to="/dashboard" ariaLabel="PENSQuiz home" className="w-[154px] sm:w-[176px]" />
            <p className="mt-4 text-sm font-medium leading-6 text-white/90 sm:text-[15px]">
              Improve your skills anytime, anywhere.
              <br />
              Start your learning journey with us.
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:gap-20">
            <nav aria-label="Help links">
              <h3 className="text-lg font-bold">Help</h3>
              <ul className="mt-5 space-y-4 text-sm font-medium text-white/90 sm:text-[15px]">
                <li>
                  <a
                    href="#"
                    className="hover:text-[#fdc02a] focus:outline-none focus:ring-2 focus:ring-white/80"
                  >
                    Support
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-[#fdc02a] focus:outline-none focus:ring-2 focus:ring-white/80"
                  >
                    FAQs
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-[#fdc02a] focus:outline-none focus:ring-2 focus:ring-white/80"
                  >
                    Help Center
                  </a>
                </li>
              </ul>
            </nav>

            <nav aria-label="Legal links">
              <h3 className="text-lg font-bold">Privacy &amp; Legal</h3>
              <ul className="mt-5 space-y-4 text-sm font-medium text-white/90 sm:text-[15px]">
                <li>
                  <a
                    href="#"
                    className="hover:text-[#fdc02a] focus:outline-none focus:ring-2 focus:ring-white/80"
                  >
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-[#fdc02a] focus:outline-none focus:ring-2 focus:ring-white/80"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-[#fdc02a] focus:outline-none focus:ring-2 focus:ring-white/80"
                  >
                    Privacy Center
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-5 text-sm font-medium text-white/90 sm:flex-row sm:items-center sm:justify-between">
          <p>{new Date().getFullYear()} - PENSQuiz - All rights reserved</p>
          <div className="flex gap-6">
            <a
              href="#"
              aria-label="Facebook"
              className="transition hover:text-[#fdc02a] focus:outline-none focus:ring-2 focus:ring-white/80"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M14 8h2V5h-2c-3 0-5 2-5 5v2H7v3h2v6h3v-6h3l1-3h-4v-2c0-1.1.9-2 2-2Z" />
              </svg>
            </a>
            <a
              href="#"
              aria-label="Instagram"
              className="transition hover:text-[#fdc02a] focus:outline-none focus:ring-2 focus:ring-white/80"
            >
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <rect width="18" height="18" x="3" y="3" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <path d="M17.5 6.5h.01" />
              </svg>
            </a>
            <a
              href="#"
              aria-label="X"
              className="transition hover:text-[#fdc02a] focus:outline-none focus:ring-2 focus:ring-white/80"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M13.68 10.62 20.24 3h-1.55l-5.7 6.62L8.44 3H3.2l6.88 10.01L3.2 21h1.55l6.02-6.99L15.57 21h5.24l-7.13-10.38Zm-2.13 2.48-.7-1-5.54-7.93H7.7l4.47 6.4.7 1 5.82 8.31H16.3l-4.75-6.78Z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

