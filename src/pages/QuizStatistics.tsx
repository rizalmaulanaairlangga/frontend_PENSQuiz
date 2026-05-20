import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { apiFetch } from '../lib/api'

type StatisticsData = {
  title: string
  majorName: string | null
  courseName: string | null
  coverImageUrl: string | null
  totalAttempts: number
  participants: number
  completionRate: number
}

export function QuizStatisticsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { session } = useAuth()
  
  const [data, setData] = useState<StatisticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await apiFetch<StatisticsData>(`/api/quizzes/${id}/statistics`, session)
        setData(stats)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load statistics')
      } finally {
        setLoading(false)
      }
    }
    void fetchStats()
  }, [id, session])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#7AB8DC] border-solid border-r-transparent"></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12 text-red-500 font-bold">
        {error || 'Quiz not found'}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* QUIZ HEADER CARD */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        {/* Cover Image */}
        <div className="h-32 w-full bg-gray-100 relative">
          <img 
            src={data.coverImageUrl ?? '/assets/default-cover.png'} 
            alt="Quiz Cover" 
            className="w-full h-full object-cover" 
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = '/assets/default-cover.png'
            }}
          />
        </div>
        {/* Title and Info */}
        <div className="p-6">
          <h1 className="text-2xl font-extrabold text-black mb-1">{data.title}</h1>
          <div className="flex items-center gap-2 text-sm text-black font-medium">
            <span>{data.majorName || 'All Majors'}</span>
            <span className="text-gray-400">&bull;</span>
            <span>{data.courseName || 'All Courses'}</span>
          </div>
        </div>
      </div>

      {/* STATISTICS CARD */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        {/* Header */}
        <div className="relative flex items-center justify-center mb-8">
          <button 
            onClick={() => navigate('/my-quizzes')} 
            className="absolute left-0 flex items-center gap-2 text-sm font-bold text-black hover:text-gray-600 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
            Back
          </button>
          <h2 className="text-xl font-extrabold text-black">Statistics</h2>
        </div>

        {/* Content */}
        <div>
          <h3 className="text-base font-bold text-black mb-4">Engagements</h3>
          
          <div className="space-y-3">
            {/* Users Clicked */}
            <div className="flex items-center justify-between bg-[#f8fafc] border border-gray-200 rounded-xl px-6 py-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#7AB8DC] hover:bg-[#f0f7fb] hover:shadow-[0_4px_15px_rgba(122,184,220,0.3)]">
              <span className="text-[15px] font-bold text-black">Users Clicked</span>
              <span className="text-[15px] font-bold text-black">{data.totalAttempts}</span>
            </div>

            {/* Participants */}
            <div className="flex items-center justify-between bg-[#f8fafc] border border-gray-200 rounded-xl px-6 py-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#7AB8DC] hover:bg-[#f0f7fb] hover:shadow-[0_4px_15px_rgba(122,184,220,0.3)]">
              <span className="text-[15px] font-bold text-black">Participants</span>
              <span className="text-[15px] font-bold text-black">{data.participants}</span>
            </div>

            {/* Completion Rate */}
            <div className="flex items-center justify-between bg-[#f8fafc] border border-gray-200 rounded-xl px-6 py-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#7AB8DC] hover:bg-[#f0f7fb] hover:shadow-[0_4px_15px_rgba(122,184,220,0.3)]">
              <span className="text-[15px] font-bold text-black">Completion Rate</span>
              <span className="text-[15px] font-bold text-black">{data.completionRate}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
