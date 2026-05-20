import { Link } from 'react-router-dom'

export type QuizCardModel = {
  id: string
  slug?: string | null
  title: string
  description?: string | null
  coverImageUrl?: string | null
  timeLimitMinutes?: number | null
  questionCount?: number
  authorName?: string | null
  lecturerName?: string | null
  majorName?: string | null
  courseName?: string | null
  tags?: string[] | null
  updatedAt?: string | null
}

export function QuizCard({ quiz, className = '' }: { quiz: QuizCardModel; className?: string }) {
  return (
    <Link
      to={`/quizzes/${quiz.slug || quiz.id}`}
      className={`${className} group flex w-full max-w-[320px] shrink-0 flex-col overflow-hidden rounded-[32px] border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-blue-glow hover:border-[#528FB9]/20`}
    >
      {/* Cover Image */}
      <div className="relative h-44 w-full shrink-0 overflow-hidden bg-gray-50">
        <img
          src={quiz.coverImageUrl ?? '/assets/default-cover.png'}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          alt={quiz.title}
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).src = '/assets/default-cover.png'
          }}
        />
        {/* Overlay Badge (Optional) */}
        <div className="absolute top-4 left-4">
          <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-[#104876] shadow-sm">
            {quiz.courseName || 'General'}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col p-6 space-y-4">
        {/* Title & Metadata */}
        <div className="space-y-1">
          <div className="relative overflow-hidden h-[3.5rem] flex items-center">
            <h3 className="text-lg font-black text-black leading-tight group-hover:text-[#528FB9] transition-colors w-full">
              <div className="group-hover:hidden line-clamp-2">
                {quiz.title}
              </div>
              <div className="hidden group-hover:flex whitespace-nowrap animate-title-scroll">
                <span className="pr-12 flex-shrink-0">{quiz.title}</span>
                <span className="pr-12 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 delay-[1500ms]">
                  {quiz.title}
                </span>
              </div>
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wide">
            <span>{quiz.majorName || 'All Majors'}</span>
            <span className="text-gray-200">•</span>
            <span>{quiz.courseName || 'All Courses'}</span>
          </div>
        </div>

        {/* Roles */}
        <div className="space-y-1">
          <div className="text-[12px] font-bold text-gray-500">
            By <span className="text-black">{quiz.authorName || 'Unknown'}</span>
          </div>
          {quiz.lecturerName && (
            <div className="text-[11px] font-medium text-[#528FB9]">
              Lecturer: <span className="font-bold">{quiz.lecturerName}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 py-2 border-y border-gray-50">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#104876]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-[12px] font-black text-black">{quiz.questionCount ?? 0} Questions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#104876]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-[12px] font-black text-black">{quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} Min` : 'No Limit'}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 min-h-[1.5rem]">
          {quiz.tags?.slice(0, 3).map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-md bg-gray-50 text-[10px] font-bold text-gray-400 border border-gray-100 uppercase tracking-tighter transition-all duration-300 group-hover:border-[#528FB9]/50 group-hover:text-[#528FB9]">
              {tag}
            </span>
          ))}
          {quiz.tags && quiz.tags.length > 3 && (
            <span className="text-[10px] font-bold text-gray-300">+{quiz.tags.length - 3}</span>
          )}
        </div>
      </div>
    </Link>
  )
}

