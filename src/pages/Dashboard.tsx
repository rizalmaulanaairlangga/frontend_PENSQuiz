import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js'
import { useAuth } from '../auth/AuthProvider'
import { apiFetch } from '../lib/api'
import { QuizCard, type QuizCardModel } from '../components/QuizCard'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

type Me = {
  id: string
  username: string | null
  firstName: string | null
  lastName: string | null
  role: string
}

type Quiz = {
  id: string
  slug?: string | null
  authorId: string
  authorName?: string | null
  title: string
  description: string | null
  timeLimitMinutes: number | null
  visibility: string
  access: string
  allowCopy: boolean
  coverImageUrl: string | null
  majorName?: string | null
  courseName?: string | null
  lecturerName?: string | null
  tags?: string[] | null
  updatedAt: string | null
  questionCount?: number
}

type StatsPayload = {
  attempts?: number
  participants?: number
  completionRate?: number
  chartData?: number[]
}

function AnimatedNumber({ value, suffix = '' }: { value: number | string; suffix?: string }) {
  const target = typeof value === 'number' ? value : parseInt(String(value), 10)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (Number.isNaN(target)) return

    let start: number | null = null
    const duration = 900

    function step(timestamp: number) {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      setCount(Math.floor(progress * target))
      if (progress < 1) {
        window.requestAnimationFrame(step)
      }
    }

    window.requestAnimationFrame(step)
    return () => {
      setCount(target)
    }
  }, [target])

  if (Number.isNaN(target)) {
    return <>{value}</>
  }

  return <>{count.toLocaleString()}{suffix}</>
}

export function Dashboard() {
  const { session } = useAuth()
  const [me, setMe] = useState<Me | null>(null)
  const [recent, setRecent] = useState<Quiz[]>([])
  const [mine, setMine] = useState<Quiz[]>([])
  const [attempts, setAttempts] = useState(0)
  const [participants, setParticipants] = useState(0)
  const [completionRate, setCompletionRate] = useState(0)
  const [chartData, setChartData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const chartRef = useRef<Chart | null>(null)

  const quizCount = mine.length
  const questionCount = useMemo(() => mine.reduce((sum, quiz) => sum + (quiz.questionCount ?? 0), 0), [mine])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([
      apiFetch<Me>('/api/me', session, { method: 'GET' }),
      apiFetch<{ history: Quiz[] }>('/api/quizzes/home', session, { method: 'GET' }),
      apiFetch<Quiz[]>('/api/quizzes/mine', session, { method: 'GET' }),
      apiFetch<StatsPayload & { chartData: number[] }>('/api/quizzes/mine/stats', session, { method: 'GET' }),
    ])
      .then(([meData, homeData, mineData, statsData]) => {
        if (cancelled) return
        setError(null)
        setMe(meData)
        setRecent(homeData.history.slice(0, 6))
        setMine(mineData)
        setAttempts(statsData.attempts ?? 0)
        setParticipants(statsData.participants ?? 0)
        setCompletionRate(statsData.completionRate ?? 0)
        setChartData(statsData.chartData ?? [0, 0, 0, 0, 0, 0, 0])
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [session])


  useEffect(() => {
    const canvas = chartCanvasRef.current
    if (!canvas) return

    if (chartRef.current) {
      chartRef.current.destroy()
      chartRef.current = null
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        datasets: [
          {
            data: chartData,
            backgroundColor: '#6BA9D0',
            borderRadius: 8,
            borderSkipped: false,
            barThickness: window.innerWidth < 640 ? 12 : 24,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 2000,
          easing: 'easeOutQuart',
          delay: (context) => {
            let delay = 0
            if (context.type === 'data' && context.mode === 'default') {
              delay = context.dataIndex * 150
            }
            return delay
          },
        },
        animations: {
          y: {
            from: (ctx) => ctx.chart.scales.y.getPixelForValue(0),
            duration: 2000,
            easing: 'easeOutQuart',
          },
        },
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#f8fafc' },
            ticks: { font: { weight: 'bold' }, color: '#94a3b8' },
          },
          x: {
            grid: { display: false },
            ticks: { font: { weight: 'bold' }, color: '#94a3b8' },
          },
        },
      },
    })

    function onResize() {
      const chart = chartRef.current
      if (!chart) return
      const ds = chart.data.datasets[0]
      if (!ds) return
      // @ts-expect-error chart.js typing for barThickness is too strict in some builds
      ds.barThickness = window.innerWidth < 640 ? 12 : 24
      chart.update()
    }

    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (chartRef.current) {
        chartRef.current.destroy()
        chartRef.current = null
      }
    }
  }, [chartData])

  const firstName = me?.firstName ?? 'Student'

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,#a8dbf1_0%,#79b7dc_52%,#4b87b2_100%)] px-6 py-8 shadow-[0_24px_80px_rgba(15,23,42,0.15)] sm:rounded-[32px] sm:px-8 sm:py-10">
        <div className="relative z-10">
          <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-md sm:text-4xl lg:text-5xl">
            Helloo, <span className="text-[#fdc02a]">{firstName}!</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base font-medium text-white drop-shadow sm:mt-4 sm:text-lg">
            Welcome back to PENS<span className="text-[#fdc02a]">Quiz</span>. Your centralized hub for{' '}
            <span className="text-[#fdc02a]">creating</span>, <span className="text-[#fdc02a]">managing</span>, and{' '}
            <span className="text-[#fdc02a]">exploring</span> high-quality educational quizzes.
          </p>
        </div>
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
      </section>

      {error ? (
        <div className="rounded-[24px] bg-white p-5 text-sm font-bold text-slate-600 shadow-sm sm:rounded-[32px] sm:p-6">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-5">
        <div className="grid grid-cols-2 gap-3 rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_35px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:gap-4 sm:p-6 lg:col-span-2">
          <div className="col-span-2 mb-2 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 sm:text-base">Creator Stats</h3>
            {quizCount > 0 ? (
              <Link to="/quizzes/create" className="text-xs font-bold text-blue-500 hover:underline hover:shadow-blue-glow transition-all">
                + New Quiz
              </Link>
            ) : null}
          </div>

          {loading ? (
            <div className="col-span-2 flex flex-col items-center justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#528EB8]"></div>
              <p className="mt-4 text-xs font-bold text-slate-400">Loading stats...</p>
            </div>
          ) : quizCount > 0 ? (
            <>
              {[
                {
                  label: 'Quizzes Created',
                  value: quizCount,
                  icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13M3 19c1.5-1 3-1.5 4.5-1.5S10.5 18 12 19m9-12C19.168 5.477 17.586 5 15.832 5c-1.746 0-3.332.477-4.5 1.253v13C12.5 18.477 14.168 18 15.832 18s3.332.477 4.5 1.253V6.253z',
                  color: 'bg-blue-500',
                },
                {
                  label: 'Total Questions',
                  value: questionCount,
                  icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
                  color: 'bg-indigo-500',
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="group flex flex-col items-center justify-center rounded-2xl border border-transparent bg-slate-50 p-3 transition-all duration-300 hover:border-blue-100 hover:bg-white hover:shadow-blue-glow sm:p-4"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-lg shadow-blue-500/10 sm:h-11 sm:w-11 ${s.color}`}>
                    <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={s.icon} />
                    </svg>
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-lg font-black text-slate-900 sm:text-xl">
                      <AnimatedNumber value={s.value} />
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="col-span-2 flex flex-col items-center justify-center py-4 text-center">
              <div className="mb-3 rounded-full bg-blue-50 p-4 text-blue-500">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13M3 19c1.5-1 3-1.5 4.5-1.5S10.5 18 12 19m9-12C19.168 5.477 17.586 5 15.832 5c-1.746 0-3.332.477-4.5 1.253v13C12.5 18.477 14.168 18 15.832 18s3.332.477 4.5 1.253V6.253z" />
                </svg>
              </div>
              <p className="mb-4 text-sm font-bold text-slate-600">No quizzes created yet.</p>
              <Link
                to="/quizzes/create"
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-black text-white shadow-md transition hover:scale-105 active:scale-95 hover:shadow-blue-glow"
              >
                Start Create Quiz
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_35px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:gap-4 sm:p-6 lg:col-span-3">
          <div className="col-span-3 mb-2 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 sm:text-base">Engagement Stats</h3>
            {attempts === 0 ? <span className="text-[10px] font-bold text-slate-400">Share your quizzes to get data</span> : null}
          </div>

          {attempts > 0 ? (
            <>
              {[
                {
                  label: 'Attempts',
                  value: <AnimatedNumber value={attempts} />,
                  icon: 'M13 10V3L4 14h7v7l9-11h-7z',
                  color: 'bg-[#6BA9D0]',
                },
                {
                  label: 'Participants',
                  value: <AnimatedNumber value={participants} />,
                  icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
                  color: 'bg-emerald-500',
                },
                {
                  label: 'Completion',
                  value: `${completionRate}%`,
                  icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
                  color: 'bg-orange-500',
                },
              ].map((s) => (
                <div
                  key={s.label}
                  className="group flex flex-col items-center justify-center rounded-2xl border border-transparent bg-slate-50 p-3 transition-all duration-300 hover:border-emerald-100 hover:bg-white hover:shadow-blue-glow sm:p-4"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-lg sm:h-11 sm:w-11 ${s.color}`}>
                    <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={s.icon} />
                    </svg>
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-lg font-black text-slate-900 sm:text-xl">{s.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{s.label}</p>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="col-span-3 flex flex-col items-center justify-center py-4 text-center">
              <div className="mb-3 rounded-full bg-emerald-50 p-4 text-emerald-500">
                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="mb-4 text-sm font-bold text-slate-600">No engagement recorded yet.</p>
              <Link
                to="/quizzes"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-black text-white shadow-md transition hover:scale-105 active:scale-95 hover:shadow-blue-glow"
              >
                Start Play Quiz
              </Link>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="flex h-full flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_35px_rgba(15,23,42,0.08)] sm:rounded-[32px]">
            <div className="flex items-center justify-between border-b border-slate-50 px-6 py-5 sm:px-8 sm:py-6">
              <h2 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">Recently Opened</h2>
              <Link to="/quizzes" className="text-xs font-bold text-[#6BA9D0] hover:underline sm:text-sm">
                View All
              </Link>
            </div>

            <div className="scrollbar-hide max-h-[500px] flex-1 overflow-y-auto p-6 pt-12 sm:max-h-[600px] sm:p-10 sm:pt-16">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2 justify-items-center">
                {loading ? (
                  <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#528EB8]"></div>
                    <p className="mt-4 text-sm font-bold text-slate-400">Fetching your recent activity...</p>
                  </div>
                ) : recent.length ? (
                  recent.map((q) => (
                    <QuizCard
                      key={q.id}
                      quiz={
                        {
                          id: q.id,
                          slug: q.slug,
                          title: q.title,
                          description: q.description,
                          coverImageUrl: q.coverImageUrl,
                          timeLimitMinutes: q.timeLimitMinutes,
                          questionCount: q.questionCount,
                          authorName: q.authorName,
                          lecturerName: q.lecturerName,
                          majorName: q.majorName,
                          courseName: q.courseName,
                          tags: q.tags,
                          updatedAt: q.updatedAt,
                        } satisfies QuizCardModel
                      }
                    />
                  ))
                ) : (
                  <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-4 rounded-full bg-slate-50 p-6 text-slate-300">
                      <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13M3 19c1.5-1 3-1.5 4.5-1.5S10.5 18 12 19m9-12C19.168 5.477 17.586 5 15.832 5c-1.746 0-3.332.477-4.5 1.253v13C12.5 18.477 14.168 18 15.832 18s3.332.477 4.5 1.253V6.253z" />
                      </svg>
                    </div>
                    <p className="mb-6 font-bold text-slate-400">No quizzes recently opened.</p>
                    <Link
                      to="/quizzes"
                      className="inline-flex items-center gap-2 rounded-full bg-[#6BA9D0] px-8 py-3 text-sm font-black text-white shadow-lg transition hover:scale-105 active:scale-95 hover:shadow-blue-glow"
                    >
                      Start Play Quiz
                    </Link>
                  </div>
                )}
              </div>
            </div>
            <div className="pointer-events-none h-8 bg-gradient-to-t from-white to-transparent" />
          </div>
        </section>

        <section className="space-y-6 sm:space-y-8">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_35px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:p-8">
            <h2 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">Quiz Completed</h2>
            <div className="mt-6 h-[200px] sm:mt-8 sm:h-[240px]">
              <canvas ref={chartCanvasRef} id="quizChart" />
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_35px_rgba(15,23,42,0.08)] sm:rounded-[32px] sm:p-8">
            <h2 className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">Performance Overview</h2>
            <div className="mt-6 space-y-3 sm:mt-8 sm:space-y-4">
              {[
                { label: 'Total Attempts', value: attempts },
                { label: 'Active Participants', value: participants },
                { label: 'Completion Rate', value: `${completionRate}%` },
              ].map((p) => (
                <div
                  key={p.label}
                  className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-blue-glow sm:p-4"
                >
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500 sm:text-sm">{p.label}</span>
                  <span className="text-base font-black text-slate-900 sm:text-lg">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
