import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { apiFetch } from '../lib/api'
import { QuizCard, type QuizCardModel } from '../components/QuizCard'

type HomeData = {
  history: QuizCardModel[]
  recommended: QuizCardModel[]
  popularInMajor: QuizCardModel[]
  trending: QuizCardModel[]
}

export function QuizzesPage() {
  const { session } = useAuth()
  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const location = useLocation()
  const navState = location.state as { search?: string, tag?: string } | null
  const [searchQuery, setSearchQuery] = useState(navState?.search || '')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [showTagModal, setShowTagModal] = useState(false)
  const [searchResults, setSearchResults] = useState<QuizCardModel[]>([])
  const [searching, setSearching] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [showTagRecs, setShowTagRecs] = useState(false)

  // Handle initial tag from navigation state
  useEffect(() => {
    if (navState?.tag && tags.length > 0) {
      const tagObj = tags.find(t => t.name.toLowerCase() === navState.tag?.toLowerCase())
      if (tagObj && !selectedTags.includes(tagObj.id)) {
        setSelectedTags(prev => [...prev, tagObj.id])
      }
    }
  }, [navState?.tag, tags])

  // Fetch home data and tags
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [home, t] = await Promise.all([
          apiFetch<HomeData>('/api/quizzes/home', session),
          apiFetch<any[]>('/api/metadata/tags', session)
        ])
        setData(home)
        setTags(t)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load quizzes')
      } finally {
        setLoading(false)
      }
    }
    void fetchData()
  }, [session])

  // Handle Search/Tag filtering
  useEffect(() => {
    if (!searchQuery && selectedTags.length === 0) {
      setSearchResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const queryParams = new URLSearchParams()
        if (searchQuery) queryParams.append('search', searchQuery)
        selectedTags.forEach(t => {
          const tagName = tags.find(tag => tag.id === t)?.name
          if (tagName) queryParams.append('tags', tagName)
        })
        
        const results = await apiFetch<QuizCardModel[]>(`/api/quizzes?${queryParams.toString()}`, session)
        setSearchResults(results)
      } catch (e) {
        console.error('Search failed', e)
      } finally {
        setSearching(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [searchQuery, selectedTags, session, tags])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-slate-200 border-t-[#528EB8]"></div>
      </div>
    )
  }

  const Section = ({ title, items }: { title: string; items: QuizCardModel[] }) => {
    if (items.length === 0) return null
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between px-4 lg:px-0">
          <h2 className="text-xl font-black text-[#104876] uppercase tracking-tight">{title}</h2>
          <button className="text-sm font-bold text-[#528EB8] hover:underline">View All</button>
        </div>
        <div className="flex overflow-x-auto pt-6 pb-12 gap-8 scrollbar-hide px-4 lg:px-0 -mt-4">
          {items.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} />
          ))}
        </div>
      </div>
    )
  }

  const isFiltering = searchQuery || selectedTags.length > 0

  return (
    <div className="max-w-[1400px] mx-auto space-y-12 pb-20">
      {/* Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 w-full h-full z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setShowTagModal(false)}>
          <div className="w-full max-w-xl rounded-[40px] bg-white p-8 shadow-2xl transition-all animate-in fade-in zoom-in duration-300 relative" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Filter Quizzes</h2>
              <button onClick={() => setShowTagModal(false)} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
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
                className="flex-[2] py-4 rounded-2xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-all active:scale-95"
              >
                Reset
              </button>
              <button 
                onClick={() => setShowTagModal(false)} 
                className="flex-[3] py-4 rounded-2xl btn-gradient font-black shadow-lg shadow-blue-100 transition-all active:scale-95"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="text-center space-y-8 pt-10">
        <h1 className="text-4xl lg:text-5xl font-black text-[#104876] tracking-tight">
          Ready to Test Your Knowledge?
        </h1>
        
        <div className="max-w-2xl mx-auto space-y-6 px-4">
          <div className="relative flex gap-4">
            <div className="relative flex-grow group">
              <input 
                type="text" 
                placeholder="Search folders, quizzes, tags..."
                className="w-full bg-white rounded-[32px] border-none shadow-md px-14 py-4 text-sm font-medium focus:ring-2 focus:ring-[#528EB8] transition-all hover:shadow-blue-glow/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <svg className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#528EB8] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button 
              onClick={() => setShowTagModal(true)}
              className={`p-4 rounded-full border shadow-md transition-all
                ${selectedTags.length > 0 ? 'btn-gradient border-none shadow-blue-900/20' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:shadow-blue-glow'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </button>
          </div>

          {/* External Applied Tags with Clear All */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 animate-in slide-in-from-top-2 duration-300">
              <button 
                onClick={() => setSelectedTags([])}
                className="px-4 py-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-red-50 hover:border-red-500 hover:text-red-600 transition-all flex items-center gap-1.5"
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
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#A6D9F0] to-[#528EB8] text-white rounded-full text-xs font-bold transition-all group"
                  >
                    {tag?.name || 'Tag'}
                    <svg className="w-3 h-3 text-white/70 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl font-bold text-center mx-4">
          {error}
        </div>
      )}

      {/* Quiz Content */}
      <div className="px-4 lg:px-0">
        {isFiltering ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-[#104876]">
                {searching ? 'Searching...' : `Found ${searchResults.length} Results`}
              </h2>
            </div>
            
            {searching ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-[340px] rounded-[32px] bg-slate-50 animate-pulse"></div>
                ))}
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {searchResults.map((quiz) => (
                  <QuizCard key={quiz.id} quiz={quiz} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-[40px] shadow-sm">
                <p className="text-slate-400 font-bold text-xl">No results found for your search.</p>
                <button 
                  onClick={() => { setSearchQuery(''); setSelectedTags([]) }}
                  className="mt-4 text-[#528FB9] font-bold hover:underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-16">
            <Section title="History: Quizzes You've Played" items={data?.history || []} />
            <Section title="Recommended For You" items={data?.recommended || []} />
            <Section title="Popular In Your Major" items={data?.popularInMajor || []} />
            <Section title="Trending This Week" items={data?.trending || []} />
          </div>
        )}
      </div>

      {/* No Home Results Fallback */}
      {!isFiltering && data && [data.history || [], data.recommended || [], data.popularInMajor || [], data.trending || []].every(l => l.length === 0) && (
        <div className="text-center py-20">
          <p className="text-gray-400 font-bold text-xl uppercase">No quizzes found yet.</p>
          <p className="text-gray-400 text-sm mt-2">Start creating your own or wait for community uploads!</p>
        </div>
      )}
    </div>
  )
}

