import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { apiFetch } from '../lib/api'
import { useToast } from '../components/ToastProvider'

type SnapshotOption = { id: string; content: string; orderIndex: number }
type SnapshotQuestion = {
  id: string
  content: string
  questionType: string
  orderIndex: number
  correctOptionCount: number
  options: SnapshotOption[]
}
type StartAttemptResponse = {
  attemptId: string
  snapshotId: string
  startedAt: string
  questions: SnapshotQuestion[]
}

type QuizInfo = {
  id: string
  title: string
  timeLimitMinutes: number | null
  questionCount: number
}

// Review Types
type SnapshotOptionReview = {
  id: string
  content: string
  isCorrect: boolean
  orderIndex: number
}

type SnapshotQuestionReview = {
  id: string
  content: string
  questionType: string
  orderIndex: number
  explanation: string | null
  options: SnapshotOptionReview[]
  selectedOptions: string[]
}

type AttemptReviewResponse = {
  attemptId: string
  score: number
  questions: SnapshotQuestionReview[]
}

export function AttemptPlayPage() {
  const { quizId } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const { addToast } = useToast()

  // State
  const [data, setData] = useState<StartAttemptResponse | null>(null)
  const [quiz, setQuiz] = useState<QuizInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [submitting, setSubmitting] = useState(false)

  // View state: 'playing' | 'check_answers' | 'score' | 'review' | 'review_question'
  const [view, setView] = useState<'playing' | 'check_answers' | 'score' | 'review' | 'review_question'>('playing')
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)

  // Timer states
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [elapsedTime, setElapsedTime] = useState<number>(0)

  // Modals / Confirmation
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [score, setScore] = useState<number>(0)

  // Review states
  const [reviewData, setReviewData] = useState<AttemptReviewResponse | null>(null)
  const [loadingReview, setLoadingReview] = useState(false)
  const [retryTrigger, setRetryTrigger] = useState(0)

  // Fetch Attempt and Quiz Info
  useEffect(() => {
    if (!quizId) return

    // Use an AbortController so React StrictMode's double-invoke
    // cancels the first inflight request on cleanup.
    const controller = new AbortController()
    setError(null)
    setData(null)

    // 1. Fetch Quiz Info (fire-and-forget, non-critical)
    apiFetch<any>(`/api/quizzes/${quizId}`, session)
      .then((res) => {
        if (controller.signal.aborted) return
        setQuiz({
          id: res.quiz.id,
          title: res.quiz.title,
          timeLimitMinutes: res.quiz.timeLimitMinutes,
          questionCount: res.quiz.questionCount,
        })
        if (res.quiz.timeLimitMinutes) {
          setTimeLeft(res.quiz.timeLimitMinutes * 60)
        }
      })
      .catch(() => {})

    // 2. Start Attempt
    apiFetch<StartAttemptResponse>(`/api/quizzes/${quizId}/attempts/start`, session, {
      method: 'POST',
    })
      .then((res) => {
        if (controller.signal.aborted) return
        setData(res)

        // Restore answers from localStorage if they exist
        const savedRaw = localStorage.getItem(`pensquiz_answers_${quizId}`)
        let savedAnswers: Record<string, string[]> = {}
        if (savedRaw) {
          try { savedAnswers = JSON.parse(savedRaw) } catch {}
        }
        const initialAnswers: Record<string, string[]> = {}
        res.questions.forEach((q) => {
          initialAnswers[q.id] = savedAnswers[q.id] || []
        })
        setAnswers(initialAnswers)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        // Hide raw Postgres errors — show a friendly message instead
        setError('Gagal memulai kuis. Silakan tekan "Coba Lagi".')
      })

    return () => {
      controller.abort()
    }
  }, [quizId, session, retryTrigger])

  const questions = useMemo(() => data?.questions ?? [], [data])

  // Timer interval effect
  useEffect(() => {
    if (!data) return
    if (view === 'score' || view === 'review' || view === 'review_question') return

    const interval = setInterval(() => {
      if (quiz?.timeLimitMinutes) {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval)
            void handleAutoSubmit()
            return 0
          }
          return prev - 1
        })
      } else {
        setElapsedTime((prev) => prev + 1)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [data, view, quiz])

  // Auto-scroll to top whenever the active question or view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [view, activeQuestionIndex])

  // Save Answers to DB
  async function saveAnswer(snapshotQuestionId: string, selected: string[], currentAllAnswers: Record<string, string[]>) {
    if (!data) return
    try {
      localStorage.setItem(`pensquiz_answers_${quizId}`, JSON.stringify(currentAllAnswers))
      await apiFetch<void>(`/api/attempts/${data.attemptId}/answers`, session, {
        method: 'POST',
        body: JSON.stringify({ snapshotQuestionId, selectedSnapshotOptionIds: selected }),
      })
    } catch (e) {
      console.error('Failed to save answer:', e)
    }
  }

  // Handle Automatic Submission (Timer hits 0)
  async function handleAutoSubmit() {
    if (!data) return
    setSubmitting(true)
    setShowSubmitConfirm(false)
    try {
      const res = await apiFetch<{ attemptId: string; score: number }>(
        `/api/attempts/${data.attemptId}/submit`,
        session,
        { method: 'POST' },
      )
      localStorage.removeItem(`pensquiz_answers_${quizId}`)
      setScore(res.score)
      addToast('Waktu habis! Kuis otomatis dikirimkan.', 'info')
      setView('score')
    } catch (e) {
      setError('Gagal mengirimkan kuis otomatis. Silakan periksa koneksi internet Anda.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Manual Submission
  async function submit() {
    if (!data) return
    setSubmitting(true)
    setShowSubmitConfirm(false)
    try {
      const res = await apiFetch<{ attemptId: string; score: number }>(
        `/api/attempts/${data.attemptId}/submit`,
        session,
        { method: 'POST' },
      )
      localStorage.removeItem(`pensquiz_answers_${quizId}`)
      setScore(res.score)
      addToast('Kuis berhasil dikirimkan!', 'success')
      setView('score')
    } catch (e) {
      setError('Gagal mengirimkan kuis. Silakan periksa koneksi internet dan coba kirim kembali.')
    } finally {
      setSubmitting(false)
    }
  }

  // Fetch Review Data after Submit
  async function fetchReview() {
    if (!data) return
    setLoadingReview(true)
    try {
      const res = await apiFetch<AttemptReviewResponse>(`/api/attempts/${data.attemptId}/review`, session)
      setReviewData(res)
      setView('review')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to fetch review data')
    } finally {
      setLoadingReview(false)
    }
  }

  // Helper: check if a question has been answered
  const isQuestionAnswered = (qId: string) => {
    return answers[qId] && answers[qId].length > 0
  }

  // Helper: check correctness of review question
  const isQuestionCorrect = (q: SnapshotQuestionReview) => {
    const correctIds = q.options.filter(o => o.isCorrect).map(o => o.id)
    const selectedIds = q.selectedOptions
    
    if (correctIds.length !== selectedIds.length) return false
    return correctIds.every(id => selectedIds.includes(id))
  }

  // Format timer text
  const formatTimer = () => {
    if (quiz?.timeLimitMinutes) {
      const mins = Math.floor(timeLeft / 60)
      const secs = timeLeft % 60
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} left`
    } else {
      const mins = Math.floor(elapsedTime / 60)
      const secs = elapsedTime % 60
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')} elapsed`
    }
  }

  // Timer capsule badge style
  const timerBadgeStyle = () => {
    if (quiz?.timeLimitMinutes && timeLeft < 60) {
      return 'bg-rose-50 text-rose-600 border border-rose-100 px-5 py-2.5 rounded-full font-black text-sm transition-colors duration-300 shadow-sm animate-pulse'
    }
    return 'bg-[#eef8fc] text-[#528EB8] border border-blue-50/50 px-5 py-2.5 rounded-full font-black text-sm transition-colors duration-300 shadow-sm'
  }

  // Count unanswered questions
  const unansweredCount = useMemo(() => {
    return questions.filter(q => !isQuestionAnswered(q.id)).length
  }, [questions, answers])

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center px-4">
        <div className="bg-white rounded-[32px] p-8 border border-red-100 shadow-sm max-w-lg mx-auto space-y-6">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-600 font-bold text-lg leading-relaxed">{error}</p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => {
                setError(null)
                setRetryTrigger(prev => prev + 1)
              }} 
              className="px-6 py-3 rounded-2xl bg-[#528FB9] hover:bg-[#467da5] text-white font-black hover:scale-102 transition-all shadow-md shadow-[#528FB9]/20 cursor-pointer"
            >
              Try Again
            </button>
            <button 
              onClick={() => navigate(`/quizzes/${quizId}`)} 
              className="px-6 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black hover:scale-102 transition-all cursor-pointer"
            >
              Back to Quiz
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#104876] mb-4"></div>
        <p className="text-gray-400 font-bold">Setting up your quiz attempt...</p>
      </div>
    )
  }

  // ----------------------------------------------------
  // VIEW: PLAYING (Question Answering Mode)
  // ----------------------------------------------------
  if (view === 'playing') {
    const q = questions[activeQuestionIndex]
    const selected = answers[q.id] ?? []
    const isMulti = q.questionType === 'checkbox'

    return (
      <div className="w-full max-w-7xl mx-auto pb-20 px-4 mt-2">
        <div className="bg-white rounded-[40px] shadow-sm overflow-hidden border border-gray-100 p-8 lg:p-12 space-y-10 relative">
          
          {/* Header Area */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => {
                if (confirm('Are you sure you want to exit? Your progress is saved, but the timer will keep running if limited.')) {
                  navigate(`/quizzes/${quizId}`)
                }
              }}
              className="flex items-center gap-2 text-sm font-black text-gray-400 hover:text-black transition-colors"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            {/* Live Timer Pill */}
            <div className={timerBadgeStyle()}>
              {formatTimer()}
            </div>
          </div>

          {/* Question Gradient Card */}
          <div className="relative pt-6">
            <div 
              className="w-full min-h-[180px] flex items-center justify-center px-8 py-10 rounded-[28px] shadow-lg text-center relative overflow-visible"
              style={{
                background: 'linear-gradient(135deg, #A6D9F0 0%, #528EB8 100%)',
                boxShadow: '0 15px 30px rgba(82, 143, 184, 0.25)'
              }}
            >
              {/* Overlapping Badge */}
              <div 
                className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full text-xs font-black text-white shadow-md"
                style={{ backgroundColor: '#427ba3' }}
              >
                Question {activeQuestionIndex + 1} out of {questions.length}
              </div>

              <h2 className="text-xl md:text-2xl font-black text-white leading-relaxed max-w-2xl">
                {q.content}
              </h2>
            </div>
          </div>

          {/* Answer Mode Helper Text */}
          <div className="px-2">
            <p className="text-sm font-black text-gray-400 uppercase tracking-wider">
              {isMulti ? `Select ${q.correctOptionCount} jawaban terbaik` : 'Select 1 answer'}
            </p>
          </div>

          {/* Options List */}
          <div className="space-y-4">
            {q.options
              .slice()
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((o, idx) => {
                const checked = selected.includes(o.id)
                const letter = String.fromCharCode(65 + idx) // A, B, C, D...

                return (
                  <button
                    key={o.id}
                    onClick={async () => {
                      let next = selected
                      if (isMulti) {
                        if (checked) {
                          next = selected.filter((x) => x !== o.id)
                        } else {
                          // Sliding window queue behavior: if limit is reached, drop the first chosen option
                          if (selected.length < q.correctOptionCount) {
                            next = [...selected, o.id]
                          } else {
                            next = [...selected.slice(1), o.id]
                          }
                        }
                      } else {
                        next = [o.id]
                      }
                      
                      const currentAnswers = { ...answers, [q.id]: next }
                      setAnswers(currentAnswers)
                      await saveAnswer(q.id, next, currentAnswers)
                    }}
                    className={`w-full flex items-center gap-4 px-6 py-4.5 rounded-2xl border-2 text-left transition-all duration-200 hover:scale-[1.01] cursor-pointer ${
                      checked 
                        ? 'border-[#528EB8] bg-[#f2fafe] shadow-sm hover:border-[#104876] hover:bg-[#e6f4fc]' 
                        : 'border-[#528EB8]/20 bg-white hover:border-[#528EB8]/50 hover:bg-[#528EB8]/5'
                    }`}
                  >
                    {/* Circle Letter Badge */}
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 flex-shrink-0 transition-colors ${
                        checked 
                          ? 'bg-[#528EB8] text-white border-transparent' 
                          : 'bg-white text-[#528EB8] border-[#528EB8]/30'
                      }`}
                    >
                      {letter}
                    </div>

                    <span className={`text-sm md:text-base font-bold ${checked ? 'text-[#1d4f74]' : 'text-gray-700'}`}>
                      {o.content}
                    </span>
                  </button>
                )
              })}
          </div>

          {/* Navigation Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-50">
            <button
              onClick={() => {
                setActiveQuestionIndex((prev) => Math.max(0, prev - 1))
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              disabled={activeQuestionIndex === 0}
              className={`flex items-center gap-2 px-8 py-3.5 rounded-full font-black text-sm transition-all ${
                activeQuestionIndex === 0
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-500 hover:text-black hover:bg-gray-50'
              }`}
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            {activeQuestionIndex < questions.length - 1 ? (
              <button
                onClick={() => {
                  setActiveQuestionIndex((prev) => prev + 1)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="flex items-center gap-2 px-10 py-3.5 rounded-full bg-[#528FB9] hover:bg-[#467da5] text-white font-black text-sm shadow-md shadow-[#528FB9]/10 transition-all hover:scale-102"
              >
                Next
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => setView('check_answers')}
                className="flex items-center gap-2 px-10 py-3.5 rounded-full bg-[#104876] hover:bg-[#0c3558] text-white font-black text-sm shadow-md shadow-blue-900/10 transition-all hover:scale-102 animate-pulse"
              >
                Submit
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ----------------------------------------------------
  // VIEW: CHECK ANSWERS (Overview Grid Mode)
  // ----------------------------------------------------
  if (view === 'check_answers') {
    return (
      <div className="w-full max-w-7xl mx-auto pb-20 px-4 mt-2">
        <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 p-8 lg:p-12 space-y-10 relative">
          
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setView('playing')}
              className="flex items-center gap-2 text-sm font-black text-gray-400 hover:text-black transition-colors"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            {/* Timer Capsule Pill */}
            <div className={timerBadgeStyle()}>
              {formatTimer()}
            </div>
          </div>

          {/* Heading */}
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-black text-black tracking-tight">
              Check Your Answers
            </h1>
            <p className="text-gray-400 font-bold mt-1 text-sm">
              Review which questions you have answered before final submission.
            </p>
          </div>

          {/* Grid of question number cards */}
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-4 justify-items-center py-6 max-w-2xl mx-auto">
            {questions.map((q, idx) => {
              const answered = isQuestionAnswered(q.id)
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setActiveQuestionIndex(idx)
                    setView('playing')
                  }}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black text-white transition-all hover:scale-[1.08] relative overflow-hidden shadow-sm"
                  style={{
                    background: answered 
                      ? 'linear-gradient(135deg, #A6D9F0 0%, #528EB8 100%)' 
                      : '#b0b9c0',
                    boxShadow: answered 
                      ? '0 6px 15px rgba(82, 143, 184, 0.25)' 
                      : '0 4px 8px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>

          {/* Info & Action Row */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-8 border-t border-gray-50">
            {/* Info Legend */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Info</h3>
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-5 h-5 rounded-lg flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #A6D9F0 0%, #528EB8 100%)' }}
                  />
                  <span className="text-xs font-bold text-gray-500">Answered</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-lg bg-[#b0b9c0] flex-shrink-0" />
                  <span className="text-xs font-bold text-gray-500">Not answered</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="flex items-center gap-2.5 px-10 py-4.5 rounded-2xl bg-[#104876] hover:bg-[#0c3558] text-white font-black shadow-lg shadow-blue-950/15 hover:scale-102 transition-all"
            >
              Submit
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Submit Confirmation Modal Popup */}
        {showSubmitConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-gray-100 p-8 text-center relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Warning/Info Icon */}
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-6 shadow-inner">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <h3 className="text-2xl font-black text-black mb-3">Submit Quiz?</h3>
              
              <div className="mb-8">
                {unansweredCount > 0 ? (
                  <p className="text-gray-500 font-bold text-sm leading-relaxed">
                    You have <span className="text-red-500 font-black">{unansweredCount}</span> questions unanswered. Are you sure you want to submit anyway?
                  </p>
                ) : (
                  <p className="text-gray-500 font-bold text-sm leading-relaxed">
                    All questions have been answered. Ready to submit?
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  className="flex-1 py-4.5 rounded-2xl border-2 border-gray-100 hover:border-gray-200 font-black text-gray-500 hover:text-black transition-all text-sm"
                >
                  Check Again
                </button>
                <button
                  disabled={submitting}
                  onClick={() => void submit()}
                  className="flex-1 py-4.5 rounded-2xl bg-[#104876] hover:bg-[#0c3558] text-white font-black shadow-md shadow-blue-900/10 hover:scale-102 active:scale-95 transition-all text-sm disabled:opacity-55"
                >
                  {submitting ? 'Submitting...' : 'Submit Anyway'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ----------------------------------------------------
  // VIEW: SCORE (Score Display Mode)
  // ----------------------------------------------------
  if (view === 'score') {
    // Dynamic score color
    const scoreColorClass = () => {
      if (score >= 80) return 'text-[#10B981]' // Green
      if (score >= 50) return 'text-[#F59E0B]' // Orange/Amber
      return 'text-[#EF4444]' // Red
    };

    return (
      <div className="max-w-xl mx-auto pb-20 px-4 mt-12">
        <div className="bg-white rounded-[40px] shadow-[0_15px_40px_rgba(0,0,0,0.05)] border border-gray-100 p-8 lg:p-12 space-y-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          <div>
            <h1 className="text-3xl font-black text-black tracking-tight">
              Quiz Finished!
            </h1>
            <p className="text-gray-400 font-bold mt-1 text-sm">
              Here is your final score based on your answers.
            </p>
          </div>

          {/* Large Score Donut Chart Container */}
          <div className="flex justify-center py-4">
            <div className="relative w-48 h-48 flex items-center justify-center">
              {/* SVG Circular Donut Chart */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                {/* Background Track */}
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  className="stroke-gray-100"
                  strokeWidth="12"
                  fill="transparent"
                />
                {/* Animated Progress Circle */}
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke={score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'}
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray="440"
                  strokeDashoffset={440 - (score / 100) * 440}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                  style={{
                    filter: `drop-shadow(0 4px 6px ${score >= 80 ? 'rgba(16, 185, 129, 0.25)' : score >= 50 ? 'rgba(245, 158, 11, 0.25)' : 'rgba(239, 68, 68, 0.25)'})`
                  }}
                />
              </svg>

              {/* Centered Score Text */}
              <div className="absolute flex flex-col items-center">
                <span className={`text-5xl font-black tracking-tight ${scoreColorClass()}`}>
                  {Math.round(score)}
                </span>
                <span className="text-xs font-black text-gray-400 mt-0.5 uppercase tracking-widest">
                  Points
                </span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-6">
            <button
              disabled={loadingReview}
              onClick={() => void fetchReview()}
              className="w-full sm:flex-1 py-4.5 rounded-2xl border-2 border-[#528FB9] hover:bg-[#528FB9]/5 text-[#528FB9] font-black text-sm transition-all hover:scale-102 disabled:opacity-50 cursor-pointer"
            >
              {loadingReview ? 'Loading Review...' : 'Review Answer'}
            </button>
            <button
              onClick={() => navigate(`/quizzes/${quizId}`)}
              className="w-full sm:flex-1 py-4.5 rounded-2xl bg-[#528FB9] hover:bg-[#467da5] text-white font-black text-sm text-center shadow-md shadow-[#528FB9]/10 transition-all hover:scale-102 flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retake Quiz
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ----------------------------------------------------
  // VIEW: REVIEW GRID (Results Overview Grid)
  // ----------------------------------------------------
  if (view === 'review') {
    return (
      <div className="w-full max-w-7xl mx-auto pb-20 px-4 mt-2">
        <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 p-8 lg:p-12 space-y-10 relative">
          
          {/* Header Row */}
          <div className="flex items-center">
            <button 
              onClick={() => setView('score')}
              className="flex items-center gap-2 text-sm font-black text-gray-400 hover:text-black transition-colors"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </div>

          {/* Heading */}
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-black text-black tracking-tight">
              Review Your Answers
            </h1>
            <p className="text-gray-400 font-bold mt-1 text-sm">
              Click on a card number to see correct options and your choices.
            </p>
          </div>

          {/* Grid of review question cards */}
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-4 justify-items-center py-6 max-w-2xl mx-auto">
            {reviewData?.questions.map((q, idx) => {
              const correct = isQuestionCorrect(q)
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setActiveQuestionIndex(idx)
                    setView('review_question')
                  }}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black text-white transition-all hover:scale-[1.08] relative overflow-hidden shadow-sm"
                  style={{
                    background: correct 
                      ? 'linear-gradient(135deg, #34D399 0%, #10B981 100%)' // Emerald/Green Gradient
                      : 'linear-gradient(135deg, #F87171 0%, #EF4444 100%)', // Red/Rose Gradient
                    boxShadow: correct 
                      ? '0 6px 15px rgba(16, 185, 129, 0.25)' 
                      : '0 6px 15px rgba(239, 68, 68, 0.25)'
                  }}
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>

          {/* Info Legend & View Score Button */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-8 border-t border-gray-50">
            {/* Legend */}
            <div className="space-y-2.5">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Legend</h3>
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-5 h-5 rounded-lg flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)' }}
                  />
                  <span className="text-xs font-bold text-gray-500">Correct</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-5 h-5 rounded-lg flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #F87171 0%, #EF4444 100%)' }}
                  />
                  <span className="text-xs font-bold text-gray-500">Incorrect</span>
                </div>
              </div>
            </div>

            {/* View Score Button */}
            <button
              onClick={() => setView('score')}
              className="flex items-center gap-2 px-10 py-4.5 rounded-2xl bg-[#528FB9] hover:bg-[#467da5] text-white font-black text-sm shadow-md shadow-[#528FB9]/10 transition-all hover:scale-102"
            >
              View Score
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ----------------------------------------------------
  // VIEW: REVIEW QUESTION DETAIL (Read-only review detail)
  // ----------------------------------------------------
  if (view === 'review_question') {
    const q = reviewData!.questions[activeQuestionIndex]
    const correct = isQuestionCorrect(q)

    return (
      <div className="w-full max-w-7xl mx-auto pb-20 px-4 mt-2">
        <div className="bg-white rounded-[40px] shadow-sm overflow-hidden border border-gray-100 p-8 lg:p-12 space-y-10 relative animate-in fade-in duration-200">
          
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setView('review')}
              className="flex items-center gap-2 text-sm font-black text-gray-400 hover:text-black transition-colors"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Overview
            </button>
          </div>

          {/* Question Gradient Card */}
          <div className="relative pt-6">
            <div 
              className="w-full min-h-[180px] flex items-center justify-center px-8 py-10 rounded-[28px] shadow-lg text-center relative overflow-visible"
              style={{
                background: correct 
                  ? 'linear-gradient(135deg, #34D399 0%, #10B981 100%)' // Emerald/Green Gradient
                  : 'linear-gradient(135deg, #F87171 0%, #EF4444 100%)', // Red/Rose Gradient
                boxShadow: correct 
                  ? '0 15px 30px rgba(16, 185, 129, 0.2)' 
                  : '0 15px 30px rgba(239, 68, 68, 0.2)'
              }}
            >
              {/* Overlapping Badge */}
              <div 
                className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full text-xs font-black text-white shadow-md uppercase tracking-wider"
                style={{ backgroundColor: correct ? '#065f46' : '#991b1b' }}
              >
                Question {activeQuestionIndex + 1} ({correct ? 'Correct' : 'Incorrect'})
              </div>

              <h2 className="text-xl md:text-2xl font-black text-white leading-relaxed max-w-2xl">
                {q.content}
              </h2>
            </div>
          </div>

          {/* Review Details Helper Text */}
          <div className="px-2 flex items-center justify-between border-b border-gray-50 pb-2">
            <span className="text-xs font-black text-gray-400 uppercase tracking-wider">
              Review Options
            </span>
            {q.explanation && (
              <span className="text-xs font-bold text-[#528EB8]">
                Has explanation
              </span>
            )}
          </div>

          {/* Options list with Green / Red Correctness markers */}
          <div className="space-y-4">
            {q.options
              .slice()
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((o, idx) => {
                const userSelected = q.selectedOptions.includes(o.id)
                const letter = String.fromCharCode(65 + idx)

                // Correct option rule
                const correctOption = o.isCorrect

                // Determine option border and background styling
                let borderAndBgClass = 'border-gray-100 bg-gray-50/20'
                let letterClass = 'bg-white text-gray-500 border-gray-200'

                if (correctOption) {
                  borderAndBgClass = 'border-emerald-500 bg-emerald-50/20 shadow-inner'
                  letterClass = 'bg-emerald-500 text-white border-transparent'
                } else if (userSelected && !correctOption) {
                  borderAndBgClass = 'border-rose-500 bg-rose-50/20'
                  letterClass = 'bg-rose-500 text-white border-transparent'
                }

                return (
                  <div
                    key={o.id}
                    className={`w-full flex items-center justify-between gap-4 px-6 py-4.5 rounded-2xl border text-left ${borderAndBgClass}`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Circle Letter Badge */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border flex-shrink-0 ${letterClass}`}>
                        {letter}
                      </div>

                      <span className={`text-sm md:text-base font-bold ${
                        correctOption 
                          ? 'text-emerald-800' 
                          : userSelected 
                            ? 'text-rose-800' 
                            : 'text-gray-600'
                      }`}>
                        {o.content}
                      </span>
                    </div>

                    {/* Right side feedback icon */}
                    <div className="flex items-center gap-2 pr-2">
                      {correctOption && (
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-sm" title="Correct Option">
                          ✓
                        </div>
                      )}
                      {userSelected && !correctOption && (
                        <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-black text-sm" title="Your Incorrect Choice">
                          ✕
                        </div>
                      )}
                      {userSelected && correctOption && (
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1 bg-emerald-100/50 px-2.5 py-1 rounded-full">
                          Your Choice
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>

          {/* Explanation Area */}
          {q.explanation && (
            <div className="bg-slate-50/80 border border-slate-100 rounded-3xl p-6 space-y-2.5">
              <h4 className="text-sm font-black text-slate-800 tracking-tight">Explanation</h4>
              <p className="text-sm text-slate-600 font-bold leading-relaxed">{q.explanation}</p>
            </div>
          )}

          {/* Review Question Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-50">
            <button
              onClick={() => setActiveQuestionIndex((prev) => Math.max(0, prev - 1))}
              disabled={activeQuestionIndex === 0}
              className={`flex items-center gap-2 px-8 py-3.5 rounded-full font-black text-sm transition-all ${
                activeQuestionIndex === 0
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-500 hover:text-black hover:bg-gray-50'
              }`}
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            <button
              onClick={() => setView('review')}
              className="px-8 py-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm transition-all hover:scale-102"
            >
              Overview Grid
            </button>

            {activeQuestionIndex < reviewData!.questions.length - 1 ? (
              <button
                onClick={() => setActiveQuestionIndex((prev) => prev + 1)}
                className="flex items-center gap-2 px-10 py-3.5 rounded-full bg-[#528FB9] hover:bg-[#467da5] text-white font-black text-sm shadow-md shadow-[#528FB9]/10 transition-all hover:scale-102"
              >
                Next
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => setView('score')}
                className="flex items-center gap-2 px-10 py-3.5 rounded-full bg-[#104876] hover:bg-[#0c3558] text-white font-black text-sm shadow-md shadow-blue-900/10 transition-all hover:scale-102"
              >
                View Score
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}
