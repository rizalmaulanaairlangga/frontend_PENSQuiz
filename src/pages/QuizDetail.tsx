import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { apiFetch } from '../lib/api'
import { QuizCard, type QuizCardModel } from '../components/QuizCard'
import { useToast } from '../components/ToastProvider'

type Quiz = QuizCardModel & {
  createdAt?: string
  allowCopy?: boolean
}

type QuizDetailData = {
  quiz: Quiz
  relatedQuizzes: QuizCardModel[]
}

export function QuizDetailPage() {
  const { id } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<QuizDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [showPlayConfirm, setShowPlayConfirm] = useState(false)
  const [copying, setCopying] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const copyMenuRef = useRef<HTMLDivElement | null>(null)
  const { addToast } = useToast()

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node
      if (copyMenuRef.current && !copyMenuRef.current.contains(target)) {
        setShowCopyModal(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => {
      document.removeEventListener('click', onDocClick)
    }
  }, [])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    apiFetch<QuizDetailData>(`/api/quizzes/${id}`, session)
      .then((res) => {
        if (!cancelled) {
          setData(res)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load quiz')
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [id, session])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#104876]"></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <p className="text-red-500 font-bold mb-4">{error || 'Quiz not found'}</p>
        <Link to="/quizzes" className="text-[#528FB9] font-bold hover:underline">Return to Quizzes</Link>
      </div>
    )
  }

  const { quiz, relatedQuizzes } = data
  const formattedDate = quiz.createdAt ? new Date(quiz.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) : 'N/A'

  const handleCopyClick = () => {
    setShowCopyModal(true)
    setCopyError(null)
  }

  const handleDirectCopy = async () => {
    setCopying(true)
    setCopyError(null)
    try {
      const res = await apiFetch<{ id: string }>(`/api/quizzes/${quiz.id}/copy`, session, {
        method: 'POST'
      })
      setShowCopyModal(false)
      addToast('Quiz copied successfully!')
      navigate(`/quizzes/${res.id}`)
    } catch (e) {
      setCopyError(e instanceof Error ? e.message : 'Failed to copy quiz')
    } finally {
      setCopying(false)
    }
  }

  const handleCopyAndEdit = async () => {
    setCopying(true)
    setCopyError(null)
    try {
      const res = await apiFetch<{ id: string }>(`/api/quizzes/${quiz.id}/copy`, session, {
        method: 'POST'
      })
      setShowCopyModal(false)
      navigate(`/quizzes/create?edit=${res.id}`)
    } catch (e) {
      setCopyError(e instanceof Error ? e.message : 'Failed to copy quiz')
    } finally {
      setCopying(false)
    }
  }

  return (
    <>
      <div className="max-w-[1400px] mx-auto pb-20 px-4">
        {/* Back Link */}
        <div className="mt-2 mb-4">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-black text-gray-500 hover:text-[#104876] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>

        <div className="space-y-12">
          {/* Main Card */}
          <div className="bg-white rounded-[40px] shadow-sm overflow-hidden border border-gray-100">
        {/* Cover Banner */}
        <div className="relative h-[300px] w-full bg-gray-50 overflow-hidden">
          <img 
            src={quiz.coverImageUrl ?? '/assets/default-cover.png'} 
            className="w-full h-full object-cover"
            alt={quiz.title}
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).src = '/assets/default-cover.png'
            }}
          />
        </div>

        <div className="p-10 space-y-10">
          {/* Header Area: Title & Meta vs Author */}
          <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
            <div className="space-y-4">
              <h1 className="text-4xl font-black text-black tracking-tight leading-tight">
                {quiz.title}
              </h1>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-sm font-black text-gray-400 uppercase tracking-wider">
                  <span 
                    onClick={() => quiz.majorName && navigate('/quizzes', { state: { search: quiz.majorName } })}
                    className={quiz.majorName ? "relative group cursor-pointer hover:text-[#7AB8DC] transition-colors" : ""}
                  >
                    {quiz.majorName || 'All Majors'}
                    {quiz.majorName && <span className="absolute -bottom-0.5 left-0 w-full h-[2px] bg-[#7AB8DC] scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300"></span>}
                  </span>
                  <span className="text-gray-200">•</span>
                  <span 
                    onClick={() => quiz.courseName && navigate('/quizzes', { state: { search: quiz.courseName } })}
                    className={quiz.courseName ? "relative group cursor-pointer hover:text-[#7AB8DC] transition-colors" : ""}
                  >
                    {quiz.courseName || 'All Courses'}
                    {quiz.courseName && <span className="absolute -bottom-0.5 left-0 w-full h-[2px] bg-[#7AB8DC] scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300"></span>}
                  </span>
                </div>
                {quiz.lecturerName && (
                  <p className="text-sm font-bold text-[#528FB9]">
                    Lecturer:{' '}
                    <span 
                      onClick={() => navigate('/quizzes', { state: { search: quiz.lecturerName } })}
                      className="relative group cursor-pointer hover:text-[#7AB8DC] transition-colors"
                    >
                      {quiz.lecturerName}
                      <span className="absolute -bottom-0.5 left-0 w-full h-[2px] bg-[#7AB8DC] scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300"></span>
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-gray-400">By <span 
                onClick={() => quiz.authorName && navigate('/quizzes', { state: { search: quiz.authorName } })}
                className={quiz.authorName ? "text-black font-black relative group cursor-pointer hover:text-[#7AB8DC] transition-colors" : "text-black font-black"}
              >
                {quiz.authorName || 'Unknown'}
                {quiz.authorName && <span className="absolute -bottom-0.5 left-0 w-full h-[2px] bg-[#7AB8DC] scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300"></span>}
              </span></p>
              <p className="text-[12px] font-bold text-gray-400">Created {formattedDate}</p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-[32px] border-2 border-gray-50 bg-gray-50/30">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white shadow-sm border border-gray-100">
                <svg className="w-5 h-5 text-[#104876]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-sm font-black text-black">{quiz.questionCount ?? 0} Questions</span>
              </div>
              <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white shadow-sm border border-gray-100">
                <svg className="w-5 h-5 text-[#104876]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-sm font-black text-black">{quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} Min` : 'No Time Limit'}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div ref={copyMenuRef} className="relative">
                <button 
                  onClick={() => setShowCopyModal(!showCopyModal)}
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl border-2 border-[#528FB9] text-[#528FB9] font-black hover:bg-[#528FB9]/5 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                  Copy quiz
                </button>

                {showCopyModal && (
                  <div className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 z-50 flex flex-col gap-1 w-[180px] bg-white border-2 border-[#528FB9] rounded-2xl p-1.5 shadow-[0_10px_30px_rgba(82,143,185,0.25)] animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <button 
                      disabled={copying}
                      onClick={(e) => { e.stopPropagation(); handleDirectCopy(); }}
                      className="w-full px-3 py-2.5 rounded-xl text-center text-sm font-black text-slate-700 hover:bg-[#528FB9]/10 hover:text-[#528FB9] active:scale-95 transition-all duration-200"
                    >
                      {copying ? 'Copying...' : 'Langsung Copy'}
                    </button>
                    <button 
                      disabled={copying}
                      onClick={(e) => { e.stopPropagation(); handleCopyAndEdit(); }}
                      className="w-full px-3 py-2.5 rounded-xl text-center text-sm font-black text-slate-700 hover:bg-[#528FB9]/10 hover:text-[#528FB9] active:scale-95 transition-all duration-200"
                    >
                      {copying ? 'Copying...' : 'Edit Dulu'}
                    </button>
                    {copyError && (
                      <div className="px-3 py-2 text-xs font-bold text-red-500 text-center bg-red-50 rounded-xl">
                        {copyError}
                      </div>
                    )}
                    {/* Tooltip Arrow */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[8px] border-transparent border-t-white"></div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[8px] border-transparent border-t-[#528FB9] -z-10 translate-y-[2px]"></div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setShowPlayConfirm(true)}
                className="flex items-center gap-2 px-10 py-4 rounded-2xl bg-[#528FB9] text-white font-black shadow-lg shadow-[#528FB9]/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Start quiz now
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-4 px-2">
            <h2 className="text-xl font-black text-black">Description</h2>
            <p className="text-gray-500 font-medium leading-relaxed max-w-4xl">
              {quiz.description || "No description provided for this quiz."}
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-4 px-2">
            <h2 className="text-xl font-black text-black">Tags</h2>
            <div className="flex flex-wrap gap-3">
              {quiz.tags?.length ? quiz.tags.map(tag => (
                <button 
                  key={tag} 
                  onClick={() => navigate('/quizzes', { state: { tag: tag } })}
                  className="px-5 py-2 rounded-full bg-transparent border border-[#7AB8DC]/40 text-sm font-bold text-gray-500 uppercase tracking-tight hover:border-[#7AB8DC] hover:ring-1 hover:ring-[#7AB8DC] hover:bg-[#7AB8DC]/10 hover:shadow-[0_4px_12px_rgba(122,184,220,0.3)] transition-all cursor-pointer"
                >
                  {tag}
                </button>
              )) : <span className="text-gray-400 font-bold">No tags</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Related Quizzes */}
      {relatedQuizzes.length > 0 && (
        <div className="space-y-8">
          <h2 className="text-2xl font-black text-[#104876] tracking-tight px-2">Related Quizzes</h2>
          <div className="flex overflow-x-auto pb-10 gap-8 scrollbar-hide">
            {relatedQuizzes.map(item => (
              <QuizCard key={item.id} quiz={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  </div>

      {/* Play Confirmation Modal Popup */}
      {showPlayConfirm && (
        <div 
          onClick={() => setShowPlayConfirm(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[32px] w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-gray-100 p-8 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Top-left Back button */}
            <button 
              onClick={() => setShowPlayConfirm(false)}
              className="absolute top-6 left-6 flex items-center gap-2 text-sm font-black text-gray-500 hover:text-black transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>

            <div className="flex flex-col items-center text-center my-6 mt-12">
              <div className="w-16 h-16 rounded-3xl bg-[#eef8fc] text-[#528EB8] flex items-center justify-center mb-6 shadow-inner">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-2xl font-black text-black mb-6">Start Quiz Attempt</h3>
              
              <div className="w-full bg-gray-50/50 rounded-2xl border border-gray-100 p-6 space-y-4 mb-8">
                <div className="flex justify-between items-center text-sm font-bold text-gray-500 border-b border-gray-100/50 pb-3">
                  <span>Total Questions</span>
                  <span className="text-black font-black">{quiz.questionCount ?? 0} Questions</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-gray-500">
                  <span>Time Limit</span>
                  <span className="text-black font-black">
                    {quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} Minutes` : 'No Time Limit (Tidak ada limit waktu)'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => navigate(`/quizzes/${quiz.id}/start`)}
                className="w-full py-4 rounded-2xl bg-[#528FB9] text-white font-black shadow-lg shadow-[#528FB9]/20 hover:scale-[1.02] active:scale-95 transition-all text-base"
              >
                Start Play
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}

