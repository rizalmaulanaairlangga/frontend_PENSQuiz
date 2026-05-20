import { AuthTopNav } from './AuthTopNav'
import { SiteFooter } from './SiteFooter'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col font-sans antialiased text-slate-900">
      <AuthTopNav />
      <main className="flex-1 px-5 py-8 sm:px-8 lg:px-10 lg:py-5">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
      <SiteFooter />
    </div>
  )
}
