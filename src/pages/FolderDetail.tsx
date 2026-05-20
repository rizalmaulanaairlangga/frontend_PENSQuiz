import { useEffect, useRef, useState, useCallback } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { apiFetch } from '../lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────

type Folder = { id: string; name: string; item_count: number; updated_at: string | null }
type Quiz = {
  id: string; slug: string | null; title: string; description: string | null
  visibility: string; coverImageUrl: string | null
  majorName: string | null; courseName: string | null; updatedAt: string | null
}
type TabFilter = 'all' | 'published' | 'draft'

function timeAgo(d: string | null): string {
  if (!d) return '—'
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`
}

// ─── Delete Quiz Modal ────────────────────────────────────────────────────────

function DeleteQuizModal({ quiz, onClose, onDeleted }: { quiz: Quiz; onClose: () => void; onDeleted: (id: string) => void }) {
  const { session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function handleDelete() {
    setLoading(true); setError(null)
    try {
      await apiFetch<void>(`/api/quizzes/${quiz.id}`, session, { method: 'DELETE' })
      onDeleted(quiz.id); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setLoading(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-black text-slate-900">Delete Quiz?</h2>
        <p className="mt-2 text-sm text-slate-500">Are you sure you want to delete <span className="font-bold text-slate-700">{quiz.title}</span>? This cannot be undone.</p>
        {error && <p className="mt-3 text-xs font-bold text-red-500">{error}</p>}
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-[14px] border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => void handleDelete()} disabled={loading} className="flex-1 rounded-[14px] bg-red-500 py-2.5 text-sm font-black text-white hover:bg-red-600 disabled:opacity-60">{loading ? 'Deleting…' : 'Delete'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Rename Folder Modal ──────────────────────────────────────────────────────

function RenameFolderModal({ folder, onClose, onRenamed }: { folder: Folder; onClose: () => void; onRenamed: (name: string) => void }) {
  const { session } = useAuth()
  const [name, setName] = useState(folder.name)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); if (!name.trim()) return
    setLoading(true); setError(null)
    try {
      await apiFetch<void>(`/api/metadata/folders/${folder.id}`, session, { method: 'PATCH', body: JSON.stringify({ name: name.trim() }) })
      onRenamed(name.trim()); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setLoading(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-black text-slate-900">Rename Folder</h2>
        <form onSubmit={e => void handleSubmit(e)} className="mt-4 space-y-4">
          <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Folder name" className="w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-[#6BA9D0] focus:ring-2 focus:ring-[#6BA9D0]/20" />
          {error && <p className="text-xs font-bold text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-[14px] border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading || !name.trim()} className="flex-1 rounded-[14px] bg-[#528EB8] py-2.5 text-sm font-black text-white hover:bg-[#3d7aa8] disabled:opacity-60">{loading ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Delete Folder Modal ──────────────────────────────────────────────────────

function DeleteFolderModal({ folder, onClose, onDeleted }: { folder: Folder; onClose: () => void; onDeleted: () => void }) {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function handleDelete() {
    setLoading(true); setError(null)
    try {
      await apiFetch<void>(`/api/metadata/folders/${folder.id}`, session, { method: 'DELETE' })
      onDeleted(); navigate('/my-quizzes')
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); setLoading(false) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-black text-slate-900">Delete Folder?</h2>
        <p className="mt-2 text-sm text-slate-500">Folder <span className="font-bold text-slate-700">{folder.name}</span> will be removed. Quizzes inside will not be deleted.</p>
        {error && <p className="mt-3 text-xs font-bold text-red-500">{error}</p>}
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-[14px] border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => void handleDelete()} disabled={loading} className="flex-1 rounded-[14px] bg-red-500 py-2.5 text-sm font-black text-white hover:bg-red-600 disabled:opacity-60">{loading ? 'Deleting…' : 'Delete Folder'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Existing Quiz Modal ──────────────────────────────────────────────────

function AddExistingQuizModal({ folder, currentQuizzes, onClose, onAdded }: { folder: Folder; currentQuizzes: Quiz[]; onClose: () => void; onAdded: () => void }) {
  const { session } = useAuth()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLoading(true)
    apiFetch<Quiz[]>('/api/quizzes/mine', session)
      .then(data => {
        // Quizzes already in this folder
        const existingIds = new Set(currentQuizzes.map(q => q.id))
        setAddedIds(existingIds)
        // Show all user's quizzes
        setQuizzes(data)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [session, currentQuizzes])

  async function handleToggle(quizId: string, isCurrentlyAdded: boolean) {
    setSavingId(quizId); setError(null)
    try {
      await apiFetch<void>(`/api/quizzes/${quizId}/folder`, session, { 
        method: 'PATCH', 
        body: JSON.stringify({ folderId: isCurrentlyAdded ? null : folder.id }) 
      })
      onAdded() // Refresh parent list in background
      setAddedIds(prev => {
        const next = new Set(prev)
        if (isCurrentlyAdded) next.delete(quizId)
        else next.add(quizId)
        return next
      })
    } catch (e) { 
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-[28px] bg-white p-8 shadow-2xl flex flex-col max-h-[80vh] border border-slate-100" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Manage Folder Quizzes</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-600 active:scale-90">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        {error && <p className="mb-4 text-sm font-bold text-red-500 shrink-0 bg-red-50 p-3 rounded-xl">{error}</p>}
        
        <div className="overflow-y-auto flex-1 px-2 py-4 -mx-2 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col justify-center items-center h-48 text-slate-400 gap-3">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-[#528EB8] rounded-full animate-spin"></div>
              <p className="text-sm font-bold">Fetching your quizzes...</p>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center bg-slate-50 rounded-[20px] border border-dashed border-slate-200">
              <p className="text-base font-bold text-slate-500">No quizzes found.</p>
              <p className="text-sm text-slate-400 mt-1">Create a quiz first to add it here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {quizzes.map(q => {
                const isAdded = addedIds.has(q.id)
                return (
                  <div 
                    key={q.id} 
                    className={`flex items-center justify-between p-4 border rounded-[22px] transition-all duration-300 transform 
                      ${isAdded 
                        ? 'bg-[#A6D9F0]/10 border-[#528EB8]/40 shadow-sm' 
                        : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:border-[#528EB8]/60 hover:shadow-[0_8px_25px_-5px_rgba(166,217,240,0.5)] hover:scale-[1.02]'
                      }`}
                  >
                    <div className="min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-black text-base truncate transition-colors ${isAdded ? 'text-[#528EB8]' : 'text-slate-800'}`}>
                          {q.title}
                        </h3>
                        {isAdded && (
                          <span className="shrink-0 inline-flex items-center rounded-full bg-[#A6D9F0] px-2 py-0.5 text-[10px] font-black text-[#528EB8] uppercase">
                            Added
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-500 truncate mt-1">
                        {q.majorName || 'No major'} • {q.courseName || 'No course'}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleToggle(q.id, isAdded)}
                      disabled={savingId === q.id}
                      className={`shrink-0 px-6 py-2.5 text-sm font-black rounded-xl transition-all active:scale-95 shadow-sm
                        ${isAdded 
                          ? 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-100' 
                          : 'bg-[#528EB8] text-white hover:bg-[#3d7aa8] shadow-[#A6D9F0]/40 hover:shadow-lg'
                        } disabled:opacity-50`}
                    >
                      {savingId === q.id ? '...' : isAdded ? 'Cancel' : 'Add'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


// ─── Quiz Row ─────────────────────────────────────────────────────────────────

function QuizRow({ quiz, onRemoveFromFolder, onDeletePermanently }: { quiz: Quiz; onRemoveFromFolder: (id: string) => void; onDeletePermanently: (q: Quiz) => void }) {
  const navigate = useNavigate()
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)
  const deleteMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (deleteMenuRef.current && !deleteMenuRef.current.contains(e.target as Node)) setShowDeleteMenu(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  return (
    <div className="flex flex-col gap-3 rounded-[22px] border border-slate-100 bg-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition hover:shadow-[0_12px_35px_-5px_rgba(166,217,240,0.5)] hover:border-[#A6D9F0]/60 sm:flex-row sm:items-start sm:gap-4">
      {/* Cover */}
      <div className="relative flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-slate-100 sm:h-[88px] sm:w-[140px]">
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
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${quiz.visibility === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {quiz.visibility === 'published' ? 'Published' : 'Draft'}
          </span>
        </div>
        {(quiz.majorName || quiz.courseName) && (
          <p className="mt-1 flex flex-wrap items-center gap-1 text-[13px] font-semibold text-[#528EB8]">
            {quiz.majorName && <span>{quiz.majorName}</span>}
            {quiz.majorName && quiz.courseName && <span className="text-slate-300">•</span>}
            {quiz.courseName && <span>{quiz.courseName}</span>}
          </p>
        )}
        {quiz.description && (
          <div className="mt-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Description</p>
            <p className="mt-0.5 line-clamp-2 text-[13px] text-slate-500">{quiz.description}</p>
          </div>
        )}
        <p className="mt-1.5 text-[11px] text-slate-400">Modified {timeAgo(quiz.updatedAt)}</p>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:w-[120px]">
        <button onClick={() => navigate(`/quizzes/create?edit=${quiz.id}`)} className="flex-1 rounded-[12px] bg-[#528EB8] px-4 py-2 text-sm font-black text-white transition hover:bg-[#3d7aa8] active:scale-95">Edit</button>
        <button onClick={() => navigate(`/quizzes/${quiz.id}`)} className="flex-1 rounded-[12px] border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 active:scale-95">Stats</button>
        
        <div className="relative flex-1 sm:flex-none" ref={deleteMenuRef}>
          <button 
            onClick={() => setShowDeleteMenu(!showDeleteMenu)} 
            className={`w-full rounded-[12px] px-4 py-2 text-sm font-black transition active:scale-95 
              ${showDeleteMenu ? 'bg-slate-900 text-white' : 'bg-red-500 text-white hover:bg-red-600'}`}
          >
            Delete
          </button>
          {showDeleteMenu && (
            <div className="absolute right-0 bottom-full mb-2 z-50 w-48 rounded-[18px] border border-slate-200 bg-white p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
              <button
                onClick={() => { setShowDeleteMenu(false); onRemoveFromFolder(quiz.id) }}
                className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove from Folder
              </button>
              <div className="my-1 h-px bg-slate-100" />
              <button
                onClick={() => { setShowDeleteMenu(false); onDeletePermanently(quiz) }}
                className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-xs font-bold text-red-500 transition hover:bg-red-50"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Permanently
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


// ─── Page ─────────────────────────────────────────────────────────────────────

export function FolderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { session } = useAuth()
  const navigate = useNavigate()

  const [folder, setFolder] = useState<Folder | null>(null)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TabFilter>('all')
  const [sort, setSort] = useState<'latest' | 'oldest'>('latest')

  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showRename, setShowRename] = useState(false)
  const [showDeleteFolder, setShowDeleteFolder] = useState(false)
  const [showAddExisting, setShowAddExisting] = useState(false)
  const [deleteQuizTarget, setDeleteQuizTarget] = useState<Quiz | null>(null)

  const menuRef = useRef<HTMLDivElement | null>(null)
  const addMenuRef = useRef<HTMLDivElement | null>(null)

  // close menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setShowAddMenu(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true); setError(null)
    try {
      const data = await apiFetch<{ folder: Folder; quizzes: Quiz[] }>(`/api/metadata/folders/${id}`, session)
      setFolder(data.folder)
      setQuizzes(data.quizzes)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load folder')
    } finally {
      setLoading(false)
    }
  }, [id, session])

  useEffect(() => { void loadData() }, [loadData])

  const filtered = quizzes
    .filter(q => {
      const matchTab = tab === 'all' || (tab === 'published' && q.visibility === 'published') || (tab === 'draft' && q.visibility !== 'published')
      const s = search.toLowerCase()
      const matchSearch = !s || q.title.toLowerCase().includes(s) || (q.majorName ?? '').toLowerCase().includes(s) || (q.courseName ?? '').toLowerCase().includes(s)
      return matchTab && matchSearch
    })
    .sort((a, b) => {
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return sort === 'latest' ? tb - ta : ta - tb
    })

  const handleRemoveFromFolder = async (quizId: string) => {
    try {
      await apiFetch<void>(`/api/quizzes/${quizId}/folder`, session, { 
        method: 'PATCH', 
        body: JSON.stringify({ folderId: null }) 
      })
      loadData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove from folder')
    }
  }

  return (
    <>
      {showRename && folder && (
        <RenameFolderModal folder={folder} onClose={() => setShowRename(false)} onRenamed={n => setFolder(f => f ? { ...f, name: n } : f)} />
      )}
      {showDeleteFolder && folder && (
        <DeleteFolderModal folder={folder} onClose={() => setShowDeleteFolder(false)} onDeleted={() => setFolder(null)} />
      )}
      {deleteQuizTarget && (
        <DeleteQuizModal quiz={deleteQuizTarget} onClose={() => setDeleteQuizTarget(null)} onDeleted={id => setQuizzes(prev => prev.filter(q => q.id !== id))} />
      )}
      {showAddExisting && folder && (
        <AddExistingQuizModal folder={folder} currentQuizzes={quizzes} onClose={() => setShowAddExisting(false)} onAdded={() => { loadData() }} />
      )}

      <div className="space-y-6">

        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link to="/my-quizzes" className="font-semibold transition hover:text-[#528EB8]">My Quizzes</Link>
          <svg className="h-4 w-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m9 18 6-6-6-6" />
          </svg>
          <span className="font-semibold text-slate-800 truncate max-w-[200px]">{loading ? '…' : (folder?.name ?? 'Folder')}</span>
        </nav>

        {/* ── Back Button ── */}
        <div>
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition focus:outline-none">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        </div>

        {/* ── Folder Header Card ── */}
        <div className="flex flex-wrap items-center gap-6 rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
          {/* Folder icon */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[16px] bg-slate-100 text-[#528EB8]">
            <svg className="h-12 w-12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9.17 6l2 2H20v10H4V6h5.17M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
            </svg>
          </div>

          {/* Name + count */}
          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="h-8 w-48 animate-pulse rounded-[10px] bg-slate-100" />
            ) : (
              <h1 className="text-[28px] font-bold text-slate-900 leading-tight truncate">{folder?.name ?? 'Folder'}</h1>
            )}
            <p className="mt-1 text-sm text-slate-500 font-medium">
              {loading ? '…' : `${folder?.item_count ?? 0} items`}
            </p>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-3">
            {/* Add Quiz Dropdown */}
            <div className="relative" ref={addMenuRef}>
              <button
                onClick={() => setShowAddMenu(v => !v)}
                className="inline-flex items-center rounded-full bg-[#528EB8] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#3d7aa8] active:scale-95"
              >
                Add Quiz +
              </button>

              {showAddMenu && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 rounded-[18px] border border-slate-200/70 bg-white p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
                  <button
                    onClick={() => { setShowAddMenu(false); navigate(`/quizzes/create?folderId=${folder?.id}`) }}
                    className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Create New Quiz
                  </button>
                  <div className="my-1 h-px bg-slate-100" />
                  <button
                    onClick={() => { setShowAddMenu(false); setShowAddExisting(true) }}
                    className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    Add Existing Quiz
                  </button>
                </div>
              )}
            </div>

            {/* Three-dot menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(v => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 active:scale-95"
                aria-label="Folder options"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>

              {showMenu && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-44 rounded-[18px] border border-slate-200/70 bg-white p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
                  <button
                    onClick={() => { setShowMenu(false); setShowRename(true) }}
                    className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Rename
                  </button>
                  <div className="my-1 h-px bg-slate-100" />
                  <button
                    onClick={() => { setShowMenu(false); setShowDeleteFolder(true) }}
                    className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Folder
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-[18px] bg-red-50 px-5 py-4 text-sm font-bold text-red-600">{error}</div>
        )}

        {/* ── Search Bar ── */}
        <div className="relative">
          <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            id="folder-search"
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search folder by title, tag, major, or course..."
            className="w-full rounded-full border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-[#6BA9D0] focus:ring-2 focus:ring-[#6BA9D0]/20"
          />
        </div>

        {/* ── Tabs + Sort ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-full bg-[#528EB8] p-1 shadow-sm sm:bg-transparent sm:border sm:border-slate-200 sm:p-1.5 sm:bg-white">
            {(['all', 'published', 'draft'] as TabFilter[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-5 py-2 text-sm font-bold capitalize transition ${tab === t ? 'bg-[#528EB8] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {t === 'all' ? 'All' : t === 'published' ? 'Published' : 'Draft'}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div>
            <button
              onClick={() => setSort(s => s === 'latest' ? 'oldest' : 'latest')}
              className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              {sort === 'latest' ? 'Latest' : 'Oldest'}
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Quiz List ── */}
        <div className="space-y-3 pb-8">
          {loading ? (
            [1, 2, 3].map(i => <div key={i} className="h-28 animate-pulse rounded-[20px] bg-slate-100" />)
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-slate-200 bg-white py-14 text-center">
              <div className="mb-4 rounded-full bg-blue-50 p-5 text-[#528EB8]">
                <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13M3 19c1.5-1 3-1.5 4.5-1.5S10.5 18 12 19m9-12C19.168 5.477 17.586 5 15.832 5c-1.746 0-3.332.477-4.5 1.253v13C12.5 18.477 14.168 18 15.832 18s3.332.477 4.5 1.253V6.253z" />
                </svg>
              </div>
              <p className="mb-5 font-bold text-slate-400">{search ? 'No quizzes match your search.' : 'No quizzes in this folder yet.'}</p>
              <button onClick={() => navigate('/quizzes/create')} className="inline-flex items-center gap-2 rounded-full bg-[#528EB8] px-8 py-3 text-sm font-black text-white shadow-md transition hover:scale-105 active:scale-95">
                Create a Quiz
              </button>
            </div>
          ) : (
            filtered.map(q => <QuizRow key={q.id} quiz={q} onRemoveFromFolder={handleRemoveFromFolder} onDeletePermanently={setDeleteQuizTarget} />)
          )}
        </div>
      </div>
    </>
  )
}
