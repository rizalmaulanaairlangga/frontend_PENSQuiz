import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { apiFetch, getFriendlyErrorMessage } from '../lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────

type Folder = {
  id: string
  name: string
  item_count: number
  updated_at: string | null
}

type Quiz = {
  id: string
  slug: string | null
  title: string
  description: string | null
  visibility: string
  coverImageUrl: string | null
  majorName: string | null
  courseName: string | null
  authorName: string | null
  tags: string[] | null
  updatedAt: string | null
}

type TabFilter = 'all' | 'published' | 'draft'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  const months = Math.floor(days / 30)
  return `${months} month${months > 1 ? 's' : ''} ago`
}

// ─── New Folder Modal ─────────────────────────────────────────────────────────

function NewFolderModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (folder: Folder) => void
}) {
  const { session } = useAuth()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      const folder = await apiFetch<{ id: string; name: string }>(
        '/api/metadata/folders',
        session,
        { method: 'POST', body: JSON.stringify({ name: name.trim() }) },
      )
      onCreated({ id: folder.id, name: folder.name, item_count: 0, updated_at: new Date().toISOString() })
      onClose()
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to create folder. Please try again.'));
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-black text-slate-900">New Folder</h2>
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name"
            className="w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#6BA9D0] focus:ring-2 focus:ring-[#6BA9D0]/20"
          />
          {error && <p className="text-xs font-bold text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[14px] border border-slate-200 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 rounded-[14px] bg-[#528FB9] py-2.5 text-sm font-black text-white transition hover:bg-[#3d7aa8] disabled:opacity-60"
            >
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({
  quiz,
  onClose,
  onDeleted,
}: {
  quiz: Quiz
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const { session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)
    try {
      await apiFetch<void>(`/api/quizzes/${quiz.id}`, session, { method: 'DELETE' })
      onDeleted(quiz.id)
      onClose()
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to delete quiz. Please try again.'));
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-black text-slate-900">Delete Quiz?</h2>
        <p className="mt-2 text-sm text-slate-500">
          Are you sure you want to delete <span className="font-bold text-slate-700">{quiz.title}</span>? This action cannot be undone.
        </p>
        {error && <p className="mt-3 text-xs font-bold text-red-500">{error}</p>}
        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-[14px] border border-slate-200 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleDelete()}
            disabled={loading}
            className="flex-1 rounded-[14px] bg-red-500 py-2.5 text-sm font-black text-white transition hover:bg-red-600 disabled:opacity-60"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Quiz Row ─────────────────────────────────────────────────────────────────

function QuizRow({
  quiz,
  onDelete,
}: {
  quiz: Quiz
  onDelete: (quiz: Quiz) => void
}) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-slate-100 bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition hover:shadow-[0_8px_30px_rgba(15,23,42,0.10)] sm:flex-row sm:items-start sm:gap-4">
      {/* Cover */}
      <div className="relative flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-slate-100 sm:h-[88px] sm:w-[140px]">
        <img
          src={quiz.coverImageUrl ?? '/assets/default-cover.png'}
          alt={quiz.title}
          className="h-full w-full object-cover"
          onError={(e) => { 
            (e.currentTarget as HTMLImageElement).src = '/assets/default-cover.png' 
          }}
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-black text-slate-900 leading-snug">{quiz.title}</h3>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              quiz.visibility === 'published'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {quiz.visibility === 'published' ? 'Published' : 'Draft'}
          </span>
        </div>

        {(quiz.majorName || quiz.courseName) && (
          <p className="mt-1 flex flex-wrap items-center gap-1 text-[13px] font-semibold text-[#528FB9]">
            {quiz.majorName && <span>{quiz.majorName}</span>}
            {quiz.majorName && quiz.courseName && (
              <span className="text-slate-300">•</span>
            )}
            {quiz.courseName && <span>{quiz.courseName}</span>}
          </p>
        )}

        {quiz.description && (
          <div className="mt-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Description</p>
            <p className="mt-0.5 line-clamp-2 text-[13px] text-slate-500">{quiz.description}</p>
          </div>
        )}

        <p className="mt-1.5 text-[11px] text-slate-400">
          Modified {timeAgo(quiz.updatedAt)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
        <button
          onClick={() => navigate(`/quizzes/create?edit=${quiz.id}`)}
          className="flex-1 rounded-[12px] bg-[#528FB9] px-5 py-2 text-sm font-black text-white transition hover:bg-[#3d7aa8] active:scale-95 sm:flex-none sm:px-6"
        >
          Edit
        </button>
        <button
          onClick={() => navigate(`/quizzes/${quiz.id}/statistics`)}
          className="flex-1 rounded-[12px] border border-slate-200 px-5 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 active:scale-95 sm:flex-none sm:px-6"
        >
          Statistics
        </button>
        <button
          onClick={() => onDelete(quiz)}
          className="flex-1 rounded-[12px] bg-red-500 px-5 py-2 text-sm font-black text-white transition hover:bg-red-600 active:scale-95 sm:flex-none sm:px-6"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function MyQuizzesPage() {
  const { session } = useAuth()
  const navigate = useNavigate()

  const [folders, setFolders] = useState<Folder[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TabFilter>('all')
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest')
  const [selectedMajorId, setSelectedMajorId] = useState('')
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const [majors, setMajors] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [openDropdown, setOpenDropdown] = useState<'major' | 'course' | 'sort' | 'tags' | null>(null)
  const [tagInput, setTagInput] = useState('')
  const [showTagRecs, setShowTagRecs] = useState(false)

  const [showNewFolder, setShowNewFolder] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Quiz | null>(null)

  // Fetch metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [m, c, t] = await Promise.all([
          apiFetch<any[]>('/api/metadata/majors', session),
          apiFetch<any[]>('/api/metadata/courses', session),
          apiFetch<any[]>('/api/metadata/tags', session)
        ])
        setMajors(m)
        setCourses(c)
        setTags(t)
      } catch (err) {
        console.error('Failed to fetch metadata', err)
      }
    }
    void fetchMetadata()
  }, [session])

  // Fetch data
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [foldersData, quizzesData] = await Promise.all([
        apiFetch<Folder[]>('/api/metadata/folders', session, { method: 'GET' }),
        apiFetch<Quiz[]>('/api/quizzes/mine', session, { method: 'GET' }),
      ])
      setFolders(foldersData)
      setQuizzes(quizzesData)
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Failed to load quizzes. Please try again.'));
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => { void loadData() }, [loadData])

  // Filtered and sorted quizzes
  const filtered = quizzes
    .filter((q) => {
      const matchesTab =
        tab === 'all' ||
        (tab === 'published' && q.visibility === 'published') ||
        (tab === 'draft' && q.visibility !== 'published')

      const s = search.toLowerCase()
      const matchesSearch =
        !s ||
        q.title.toLowerCase().includes(s) ||
        (q.majorName ?? '').toLowerCase().includes(s) ||
        (q.courseName ?? '').toLowerCase().includes(s) ||
        (q.description ?? '').toLowerCase().includes(s) ||
        (q.authorName ?? '').toLowerCase().includes(s) ||
        (q.tags ?? []).some(t => t.toLowerCase().includes(s))

      const matchesMajor = !selectedMajorId || q.majorName === majors.find(m => m.id === selectedMajorId)?.name
      const matchesCourse = !selectedCourseId || q.courseName === courses.find(c => c.id === selectedCourseId)?.name
      
      // Note: Quiz type doesn't have tags yet in the list, but we'll implement matchesSearch for tags if they existed.
      // For now, filtering by major/course/tab/search is already a big improvement.

      return matchesTab && matchesSearch && matchesMajor && matchesCourse
    })
    .sort((a, b) => {
      const timeA = new Date(a.updatedAt || 0).getTime()
      const timeB = new Date(b.updatedAt || 0).getTime()
      return sortOrder === 'latest' ? timeB - timeA : timeA - timeB
    })

  function handleFolderCreated(folder: Folder) {
    setFolders((prev) => [...prev, folder])
  }

  function handleQuizDeleted(id: string) {
    setQuizzes((prev) => prev.filter((q) => q.id !== id))
  }

  const FilterDropdown = ({ 
    type, 
    label, 
    value, 
    options, 
    onSelect 
  }: { 
    type: 'major' | 'course' | 'sort' | 'tags', 
    label: string, 
    value: string, 
    options: { id: string, name: string }[],
    onSelect: (id: string) => void
  }) => {
    const isOpen = openDropdown === type
    const selectedName = options.find(o => o.id === value)?.name || label

    return (
      <div className="relative">
        <button
          onClick={() => setOpenDropdown(isOpen ? null : type)}
          className={`flex items-center gap-2 rounded-[14px] border px-4 py-2 text-sm font-bold transition-all shadow-sm
            ${value ? 'bg-blue-50 border-[#6BA9D0] text-[#528FB9]' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          {selectedName}
          <svg className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)}></div>
            <div className="absolute top-[calc(100%+8px)] right-0 min-w-[180px] bg-white rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-slate-100 py-2 z-20 animate-in fade-in zoom-in-95 duration-200">
              <div className="max-h-[280px] overflow-y-auto custom-scrollbar px-1.5 space-y-0.5">
                <button
                  onClick={() => { onSelect(''); setOpenDropdown(null) }}
                  className={`w-full text-left px-4 py-2.5 rounded-[12px] text-[13px] font-bold transition-all
                    ${!value ? 'bg-blue-50 text-[#528FB9]' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  All {label}s
                </button>
                {options.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { onSelect(opt.id); setOpenDropdown(null) }}
                    className={`w-full text-left px-4 py-2.5 rounded-[12px] text-[13px] font-bold transition-all
                      ${value === opt.id ? 'bg-blue-50 text-[#528FB9]' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    {opt.name}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      {showNewFolder && (
        <NewFolderModal
          onClose={() => setShowNewFolder(false)}
          onCreated={handleFolderCreated}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          quiz={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleQuizDeleted}
        />
      )}

      {/* Tags Filter Modal */}
      {openDropdown === 'tags' && (
        <div className="fixed inset-0 w-full h-full z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setOpenDropdown(null)}>
          <div className="w-full max-w-xl rounded-[40px] bg-white p-8 shadow-2xl transition-all animate-in fade-in zoom-in duration-300 relative" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Filter My Quizzes</h2>
              <button onClick={() => setOpenDropdown(null)} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-8">
              <div className="relative">
                <div className="relative group">
                  <input 
                    type="text" 
                    placeholder="Search or add new tags..."
                    className="w-full bg-slate-50 rounded-2xl border-none px-12 py-4 text-sm font-medium focus:ring-2 focus:ring-[#528EB8] transition-all"
                    value={tagInput}
                    onChange={(e) => {
                      setTagInput(e.target.value)
                      setShowTagRecs(true)
                    }}
                    onFocus={() => setShowTagRecs(true)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && tagInput.trim()) {
                        const newTagName = tagInput.trim()
                        const existing = tags.find(t => t.name.toLowerCase() === newTagName.toLowerCase())
                        if (existing) {
                          if (!selectedTags.includes(existing.id)) {
                            setSelectedTags(prev => [...prev, existing.id])
                          }
                        } else {
                          try {
                            const created = await apiFetch<{id: string, name: string}>('/api/metadata/tags', session, {
                              method: 'POST',
                              body: JSON.stringify({ name: newTagName })
                            })
                            // Update local tags list FIRST so it's available for the UI
                            const newTag = { ...created, usage_count: 1 };
                            setTags(prev => [...prev, newTag])
                            setSelectedTags(prev => [...prev, created.id])
                            // Increment in background
                            void apiFetch(`/api/metadata/tags/${created.id}/increment`, session, { method: 'POST' })
                          } catch (err) {
                            console.error('Failed to create tag', err)
                          }
                        }
                        setTagInput('')
                        setShowTagRecs(false)
                      }
                    }}
                  />
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-[#528EB8] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Recommendations Dropdown */}
                {showTagRecs && tagInput.trim() && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in-95 duration-200">
                    {!tags.some(t => t.name.toLowerCase() === tagInput.toLowerCase().trim()) && (
                      <button
                        type="button"
                        onClick={async () => {
                          const newTagName = tagInput.trim()
                          try {
                            const created = await apiFetch<{id: string, name: string}>('/api/metadata/tags', session, {
                              method: 'POST',
                              body: JSON.stringify({ name: newTagName })
                            })
                            await apiFetch(`/api/metadata/tags/${created.id}/increment`, session, { method: 'POST' })
                            setTags(prev => [...prev, { ...created, usage_count: 1 }])
                            setSelectedTags(prev => [...prev, created.id])
                          } catch (err) { console.error(err) }
                          setTagInput('')
                          setShowTagRecs(false)
                        }}
                        className="w-full text-left px-5 py-3 text-sm font-bold text-[#528EB8] hover:bg-[#eef8fc] transition flex items-center gap-2 border-b border-slate-50"
                      >
                        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#528EB8] text-white text-[10px]">+</span>
                        Add "{tagInput.trim()}"
                      </button>
                    )}
                    {tags
                      .filter(t => t.name.toLowerCase().includes(tagInput.toLowerCase()) && !selectedTags.includes(t.id))
                      .slice(0, 5)
                      .map(rec => (
                        <button
                          key={rec.id}
                          type="button"
                          onClick={async () => {
                            setSelectedTags(prev => [...prev, rec.id])
                            try {
                              await apiFetch(`/api/metadata/tags/${rec.id}/increment`, session, { method: 'POST' })
                            } catch (err) { console.error(err) }
                            setTagInput('')
                            setShowTagRecs(false)
                          }}
                          className="w-full text-left px-5 py-3 text-sm font-medium text-slate-600 hover:bg-[#eef8fc] hover:text-[#528EB8] transition flex items-center justify-between"
                        >
                          <span>{rec.name}</span>
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Existing</span>
                        </button>
                      ))
                    }
                  </div>
                )}
                {/* Click outside to close */}
                {showTagRecs && (
                  <div className="fixed inset-0 z-40" onClick={() => setShowTagRecs(false)}></div>
                )}
              </div>

              {/* Applied Tags */}
              {selectedTags.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">Applied</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map(id => {
                      const tag = tags.find(t => t.id === id)
                      return (
                        <button
                          key={id}
                          onClick={() => setSelectedTags(prev => prev.filter(tid => tid !== id))}
                          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#A6D9F0] to-[#528EB8] text-white rounded-xl text-sm font-bold transition-all group shadow-md shadow-blue-900/10"
                        >
                          {tag?.name || 'Tag'}
                          <svg className="w-4 h-4 text-white/70 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Popular Tags */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">Popular Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags
                    .sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
                    .slice(0, 10)
                    .filter(t => !selectedTags.includes(t.id))
                    .map(tag => (
                      <button
                        key={tag.id}
                        onClick={async () => {
                          setSelectedTags(prev => [...prev, tag.id])
                          try {
                            await apiFetch(`/api/metadata/tags/${tag.id}/increment`, session, { method: 'POST' })
                          } catch (err) {
                            console.error('Failed to increment tag usage', err)
                          }
                        }}
                        className="px-5 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-sm font-bold text-slate-600 hover:border-[#528EB8] hover:bg-[#eef8fc] hover:text-[#528EB8] hover:shadow-blue-glow transition-all"
                      >
                        {tag.name}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-12">
              <button 
                onClick={() => setSelectedTags([])} 
                className="flex-[2] py-4 rounded-2xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-all"
              >
                Reset
              </button>
              <button 
                onClick={() => setOpenDropdown(null)} 
                className="flex-[3] py-4 rounded-2xl btn-gradient font-black shadow-lg shadow-blue-100 transition-all active:scale-95"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* Hero headline + search */}
        <div className="flex flex-col items-center gap-6 pt-2 text-center w-full max-w-2xl mx-auto">
          <h1 className="text-3xl font-black tracking-tight text-[#104876] sm:text-4xl">
            Ready to Create More Challenges?
          </h1>
          <div className="w-full space-y-4">
            <div className="flex w-full items-center gap-4">
              <div className="relative flex-1 group">
                <input
                  id="my-quizzes-search"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search folders, quizzes, tags…"
                  className="w-full rounded-[32px] border-none bg-white py-4 pl-14 pr-4 text-sm font-medium text-slate-700 shadow-md outline-none transition focus:ring-2 focus:ring-[#528EB8] hover:shadow-blue-glow/20"
                />
                <svg
                  className="pointer-events-none absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 group-focus-within:text-[#528EB8] transition-colors"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"
                    d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
              </div>
              <button
                onClick={() => setOpenDropdown('tags')}
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border shadow-md transition-all
                  ${selectedTags.length > 0 ? 'btn-gradient border-none shadow-blue-900/20' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:shadow-blue-glow'}`}
                aria-label="Filter Tags"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </button>
            </div>

            {/* External Applied Tags with Clear All */}
            {selectedTags.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 animate-in slide-in-from-top-2 duration-300">
                <button 
                  onClick={() => setSelectedTags([])}
                  className="px-4 py-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-red-50 hover:border-red-500 hover:text-red-600 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                  Clear Tags
                </button>
                {selectedTags.map(id => {
                  const tag = tags.find(t => t.id === id)
                  return (
                    <button
                      key={id}
                      onClick={() => setSelectedTags(prev => prev.filter(tid => tid !== id))}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#A6D9F0] to-[#528EB8] text-white rounded-full text-xs font-bold transition-all group shadow-sm"
                    >
                      {tag?.name || 'Tag'}
                      <svg className="w-3 h-3 text-white/50 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-[18px] bg-red-50 px-5 py-4 text-sm font-bold text-red-600">
            {error}
          </div>
        )}

        {/* ── Folders ── */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-800">Folders</h2>
            <button
              onClick={() => setShowNewFolder(true)}
              className="inline-flex items-center gap-2 rounded-[14px] bg-[#528FB9] px-4 py-2 text-sm font-black text-white shadow-md transition hover:bg-[#3d7aa8] active:scale-95"
            >
              New Folder
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-[18px] bg-slate-100" />
              ))}
            </div>
          ) : folders.length === 0 ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-[20px] border border-dashed border-slate-200 bg-white py-10 text-center">
              <svg className="h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                  d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
              <p className="mt-3 text-sm font-bold text-slate-400">No folders yet</p>
              <button
                onClick={() => setShowNewFolder(true)}
                className="mt-4 rounded-full bg-[#528FB9] px-6 py-2 text-sm font-black text-white transition hover:bg-[#3d7aa8]"
              >
                Create Folder
              </button>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {folders.map((folder) => (
                <Link
                  to={`/my-quizzes/folders/${folder.id}`}
                  key={folder.id}
                  className="flex items-center gap-4 rounded-[18px] border border-slate-100 bg-white px-5 py-4 shadow-[0_4px_16px_rgba(15,23,42,0.05)] transition hover:shadow-[0_8px_24px_rgba(15,23,42,0.10)] hover:border-[#6BA9D0]/50"
                >
                  {/* Folder icon */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#eef6fb] text-[#528FB9]">
                    <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-800">{folder.name}</p>
                    <p className="text-[12px] text-slate-400">{folder.item_count} item{folder.item_count !== 1 ? 's' : ''}</p>
                    <p className="text-[11px] text-slate-400">Modified {timeAgo(folder.updated_at)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ── My Quizzes ── */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-800">My Quizzes</h2>
            <button
              onClick={() => navigate('/quizzes/create')}
              className="inline-flex items-center gap-2 rounded-[14px] bg-[#528FB9] px-4 py-2 text-sm font-black text-white shadow-md transition hover:bg-[#3d7aa8] active:scale-95"
            >
              New Quiz
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Tabs + filters row */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 rounded-[14px] border border-slate-200 bg-white p-1 shadow-sm">
              {(['all', 'published', 'draft'] as TabFilter[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-[10px] px-4 py-1.5 text-sm font-bold capitalize transition ${
                    tab === t
                      ? 'bg-[#528FB9] text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {t === 'all' ? 'All' : t === 'published' ? 'Published' : 'Draft'}
                </button>
              ))}
            </div>

            {/* Sort/filter dropdowns */}
            <div className="ml-auto flex items-center gap-2">
              <FilterDropdown 
                type="major" 
                label="Major" 
                value={selectedMajorId} 
                options={majors} 
                onSelect={setSelectedMajorId} 
              />
              <FilterDropdown 
                type="course" 
                label="Course" 
                value={selectedCourseId} 
                options={courses.filter(c => !selectedMajorId || c.majorId === selectedMajorId)} 
                onSelect={setSelectedCourseId} 
              />
              <FilterDropdown 
                type="sort" 
                label="Sort" 
                value={sortOrder} 
                options={[{ id: 'latest', name: 'Latest' }, { id: 'oldest', name: 'Oldest' }]} 
                onSelect={(id) => setSortOrder(id as any)} 
              />
            </div>
          </div>

          {/* Quiz list */}
          <div className="mt-4 space-y-3">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-[20px] bg-slate-100" />
              ))
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-slate-200 bg-white py-14 text-center">
                <div className="mb-4 rounded-full bg-blue-50 p-5 text-[#528FB9]">
                  <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13M3 19c1.5-1 3-1.5 4.5-1.5S10.5 18 12 19m9-12C19.168 5.477 17.586 5 15.832 5c-1.746 0-3.332.477-4.5 1.253v13C12.5 18.477 14.168 18 15.832 18s3.332.477 4.5 1.253V6.253z" />
                  </svg>
                </div>
                <p className="mb-5 font-bold text-slate-400">
                  {search ? 'No quizzes match your search.' : 'You have no quizzes yet.'}
                </p>
                <button
                  onClick={() => navigate('/quizzes/create')}
                  className="inline-flex items-center gap-2 rounded-full bg-[#528FB9] px-8 py-3 text-sm font-black text-white shadow-md transition hover:scale-105 active:scale-95"
                >
                  Create your first quiz
                </button>
              </div>
            ) : (
              filtered.map((quiz) => (
                <QuizRow key={quiz.id} quiz={quiz} onDelete={setDeleteTarget} />
              ))
            )}
          </div>
        </section>
      </div>
    </>
  )
}
