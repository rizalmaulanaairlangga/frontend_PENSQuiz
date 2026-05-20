import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams, useBlocker } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { apiFetch, getFriendlyErrorMessage } from '../lib/api'
import { ImageUpload } from '../components/ImageUpload'
import { uploadQuizCover, uploadQuestionImage } from '../lib/storage'
import { UnsavedChangesModal } from '../components/UnsavedChangesModal'
import { useToast } from '../components/ToastProvider'

type Major = { id: string; name: string }
type Course = { id: string; name: string; majorId: string }
type Folder = { id: string; name: string }
type Tag = { id: string; name: string }

type Option = {
  id?: string
  content: string
  isCorrect: boolean
  orderIndex: number
}

type Question = {
  id?: string
  content: string
  questionType: 'multiple_choice' | 'checkbox'
  orderIndex: number
  imageUrl?: string
  imageFile?: File
  imagePreview?: string
  options: Option[]
}

export function CreateQuiz() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const formTopRef = useRef<HTMLDivElement | null>(null)
  const questionRefs = useRef<(HTMLDivElement | null)[]>([])
  const pendingScrollToIndex = useRef<number | null>(null)
  const formBottomRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const scrollToTop = () => {
    formTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollToBottom = () => {
    formBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  const [isBottomVisible, setIsBottomVisible] = useState(false)

  // --- Unsaved Changes Guard state defined here, logic moved below form state ---
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)
  const [draftSaving, setDraftSaving] = useState(false)
  const initialFormSnapshot = useRef<string | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsBottomVisible(entry.isIntersecting)
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )

    if (formBottomRef.current) {
      observer.observe(formBottomRef.current)
    }

    return () => observer.disconnect()
  }, [step])

  // Metadata
  const [majors, setMajors] = useState<Major[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])

  // Quiz State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [majorId, setMajorId] = useState('')
  const [courseId, setCourseId] = useState('')
  const [folderId, setFolderId] = useState('')
  const [timeLimit, setTimeLimit] = useState<number | ''>('')
  const [access, setAccess] = useState<'public' | 'private'>('private')
  const [allowCopy, setAllowCopy] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [showTagRecs, setShowTagRecs] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  const handleRemoveImage = () => {
    setCoverFile(null)
    setCoverPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleQuestionImageChange = (qIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const newQuestions = [...questions]
      newQuestions[qIdx].imageFile = file
      newQuestions[qIdx].imagePreview = URL.createObjectURL(file)
      setQuestions(newQuestions)
    }
  }

  const handleRemoveQuestionImage = (qIdx: number) => {
    const newQuestions = [...questions]
    newQuestions[qIdx].imageFile = undefined
    newQuestions[qIdx].imagePreview = undefined
    newQuestions[qIdx].imageUrl = undefined // Critical fix
    setQuestions(newQuestions)
  }

  // Questions State
  const [questions, setQuestions] = useState<Question[]>([
    {
      content: '',
      questionType: 'multiple_choice',
      orderIndex: 0,
      options: [
        { content: '', isCorrect: true, orderIndex: 0 },
        { content: '', isCorrect: false, orderIndex: 1 },
        { content: '', isCorrect: false, orderIndex: 2 },
        { content: '', isCorrect: false, orderIndex: 3 },
      ]
    },
    {
      content: '',
      questionType: 'checkbox',
      orderIndex: 1,
      options: [
        { content: '', isCorrect: true, orderIndex: 0 },
        { content: '', isCorrect: true, orderIndex: 1 },
        { content: '', isCorrect: false, orderIndex: 2 },
        { content: '', isCorrect: false, orderIndex: 3 },
      ]
    }
  ])

  // --- Unsaved Changes Guard Logic ---
  const getFormSnapshot = useCallback(() => {
    return JSON.stringify({
      title, description, majorId, courseId, folderId, timeLimit, access, allowCopy, tags, coverPreview,
      questions: questions.map(q => ({
        content: q.content, questionType: q.questionType, imagePreview: q.imagePreview || q.imageUrl || null,
        options: q.options.map(o => ({ content: o.content, isCorrect: o.isCorrect }))
      }))
    })
  }, [title, description, majorId, courseId, folderId, timeLimit, access, allowCopy, tags, coverPreview, questions])

  useEffect(() => {
    if (initialFormSnapshot.current !== null) return
    if (editId && !isDataLoaded) return // wait for edit data
    const timeout = setTimeout(() => {
      if (initialFormSnapshot.current === null) {
        initialFormSnapshot.current = getFormSnapshot()
      }
    }, 300)
    return () => clearTimeout(timeout)
  }, [editId, isDataLoaded, getFormSnapshot])

  const isFormDirty = initialFormSnapshot.current !== null && getFormSnapshot() !== initialFormSnapshot.current

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !isSubmitting && isFormDirty && currentLocation.pathname !== nextLocation.pathname
  )

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowUnsavedModal(true)
    }
  }, [blocker.state])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFormDirty && !isSubmitting) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isFormDirty, isSubmitting])

  const handleUnsavedSaveAsDraft = async () => {
    setDraftSaving(true)
    try {
      await handleSubmit('draft')
    } catch {
      setDraftSaving(false)
    }
  }

  const handleUnsavedBackToForm = () => {
    setShowUnsavedModal(false)
    if (blocker.state === 'blocked') blocker.reset()
  }

  const handleUnsavedDiscard = () => {
    setShowUnsavedModal(false)
    initialFormSnapshot.current = getFormSnapshot()
    if (blocker.state === 'blocked') blocker.proceed()
  }

  // Load existing quiz if editing
  useEffect(() => {
    if (!editId || isDataLoaded) return
    setLoading(true)
    apiFetch<any>(`/api/quizzes/${editId}/full`, session)
      .then(data => {
        const q = data.quiz
        setTitle(q.title || '')
        setDescription(q.description || '')
        setMajorId(q.majorId || '')
        setCourseId(q.courseId || '')
        setFolderId(q.folderId || '')
        setTimeLimit(q.timeLimitMinutes || '')
        setAccess(q.access || 'private')
        setAllowCopy(q.allowCopy || false)
        setTags(q.tags || [])
        setCoverPreview(q.coverImageUrl || null)

        if (data.questions && data.questions.length > 0) {
          setQuestions(data.questions.map((q: any) => ({
            id: q.id,
            content: q.content,
            questionType: q.questionType,
            orderIndex: q.orderIndex,
            imageUrl: q.imageUrl,
            imagePreview: q.imageUrl,
            options: q.options.map((o: any) => ({
              id: o.id,
              content: o.content,
              isCorrect: o.isCorrect,
              orderIndex: o.orderIndex
            }))
          })))
        }
        setIsDataLoaded(true)
      })
      .catch(err => setError(getFriendlyErrorMessage(err, 'Failed to load quiz details. Please try again.')))
      .finally(() => setLoading(false))
  }, [editId, session, isDataLoaded])

  useEffect(() => {
    Promise.all([
      apiFetch<Major[]>('/api/metadata/majors', session),
      apiFetch<Course[]>('/api/metadata/courses', session),
      apiFetch<Folder[]>('/api/metadata/folders', session),
      apiFetch<Tag[]>('/api/metadata/tags', session),
    ]).then(([m, c, f, t]) => {
      setMajors(m)
      setCourses(c)
      setFolders(f)
      setAllTags(t)
    }).catch(err => setError(getFriendlyErrorMessage(err, 'Failed to fetch categories and metadata.')))
  }, [session])

  const filteredCourses = courses.filter(c => {
    if (!majorId) return true;
    const cMid = c.majorId || (c as any).major_id || (c as any).MajorId;
    if (!cMid) return false;
    return String(cMid).toLowerCase() === String(majorId).toLowerCase();
  });

  const [majorSearch, setMajorSearch] = useState('')
  const [courseSearch, setCourseSearch] = useState('')
  const [folderSearch, setFolderSearch] = useState('')

  const [showMajorDropdown, setShowMajorDropdown] = useState(false)
  const [showCourseDropdown, setShowCourseDropdown] = useState(false)
  const [showFolderDropdown, setShowFolderDropdown] = useState(false)
  const [showAccessDropdown, setShowAccessDropdown] = useState(false)
  const [openTypeDropdownIndex, setOpenTypeDropdownIndex] = useState<number | null>(null)

  const majorRef = useRef<HTMLDivElement | null>(null)
  const courseRef = useRef<HTMLDivElement | null>(null)
  const folderRef = useRef<HTMLDivElement | null>(null)
  const accessRef = useRef<HTMLDivElement | null>(null)

  // Sync search inputs with loaded IDs
  useEffect(() => {
    if (majorId && majors.length > 0) {
      const found = majors.find(m => m.id === majorId)
      if (found) setMajorSearch(found.name)
    } else if (!majorId) {
      setMajorSearch('')
    }
  }, [majorId, majors])

  useEffect(() => {
    if (courseId && courses.length > 0) {
      const found = courses.find(c => c.id === courseId)
      if (found) setCourseSearch(found.name)
    } else if (!courseId) {
      setCourseSearch('')
    }
  }, [courseId, courses])

  useEffect(() => {
    if (folderId && folders.length > 0) {
      const found = folders.find(f => f.id === folderId)
      if (found) setFolderSearch(found.name)
    } else if (!folderId) {
      setFolderSearch('')
    }
  }, [folderId, folders])

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (majorRef.current && !majorRef.current.contains(target)) {
        setShowMajorDropdown(false)
      }
      if (courseRef.current && !courseRef.current.contains(target)) {
        setShowCourseDropdown(false)
      }
      if (folderRef.current && !folderRef.current.contains(target)) {
        setShowFolderDropdown(false)
      }
      if (accessRef.current && !accessRef.current.contains(target)) {
        setShowAccessDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAddMajor = async (nameToCreate: string) => {
    const name = nameToCreate.trim()
    if (!name) return
    try {
      const res = await apiFetch<Major>('/api/metadata/majors', session, {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      setMajors(prev => [...prev, res])
      setMajorId(res.id)
      setMajorSearch(res.name)
      setShowMajorDropdown(false)
      setCourseId('')
      setCourseSearch('')
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleAddCourse = async (nameToCreate: string) => {
    const name = nameToCreate.trim()
    if (!name) return
    try {
      const res = await apiFetch<Course>('/api/metadata/courses', session, {
        method: 'POST',
        body: JSON.stringify({ name, majorId: majorId || null }),
      })
      setCourses(prev => [...prev, res])
      setCourseId(res.id)
      setCourseSearch(res.name)
      setShowCourseDropdown(false)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleAddFolder = async (nameToCreate: string) => {
    const name = nameToCreate.trim()
    if (!name) return
    try {
      const res = await apiFetch<Folder>('/api/metadata/folders', session, {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      setFolders(prev => [...prev, res])
      setFolderId(res.id)
      setFolderSearch(res.name)
      setShowFolderDropdown(false)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleAddQuestion = (afterIndex?: number) => {
    const newQuestion = {
      content: '',
      questionType: 'multiple_choice' as const,
      orderIndex: 0,
      options: [
        { content: '', isCorrect: true, orderIndex: 0 },
        { content: '', isCorrect: false, orderIndex: 1 },
        { content: '', isCorrect: false, orderIndex: 2 },
        { content: '', isCorrect: false, orderIndex: 3 },
      ]
    }
    const insertAt = afterIndex !== undefined ? afterIndex + 1 : questions.length
    const newQuestions = [
      ...questions.slice(0, insertAt),
      newQuestion,
      ...questions.slice(insertAt)
    ].map((q, i) => ({ ...q, orderIndex: i }))
    pendingScrollToIndex.current = insertAt
    setQuestions(newQuestions)
  }

  // Auto-scroll to newly added question after render
  useEffect(() => {
    if (pendingScrollToIndex.current !== null) {
      const idx = pendingScrollToIndex.current
      pendingScrollToIndex.current = null
      setTimeout(() => {
        const el = questionRefs.current[idx]
        if (el) {
          const y = el.getBoundingClientRect().top + window.scrollY - 120 // 120px offset to account for the sticky header
          window.scrollTo({ top: y, behavior: 'smooth' })
        }
      }, 50)
    }
  }, [questions])

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) return
    setQuestions(questions.filter((_, i) => i !== idx))
  }

  const handleOptionChange = (qIdx: number, oIdx: number, content: string) => {
    const newQuestions = [...questions]
    newQuestions[qIdx].options[oIdx].content = content
    setQuestions(newQuestions)
  }

  const handleCorrectOption = (qIdx: number, oIdx: number) => {
    const newQuestions = [...questions]
    const q = newQuestions[qIdx]
    if (q.questionType === 'multiple_choice') {
      q.options.forEach((opt, i) => opt.isCorrect = i === oIdx)
    } else {
      q.options[oIdx].isCorrect = !q.options[oIdx].isCorrect
    }
    setQuestions(newQuestions)
  }

  const handleAddOption = (qIdx: number) => {
    const newQuestions = [...questions]
    newQuestions[qIdx].options.push({
      content: '',
      isCorrect: false,
      orderIndex: newQuestions[qIdx].options.length
    })
    setQuestions(newQuestions)
  }

  const handleRemoveOption = (qIdx: number, oIdx: number) => {
    const newQuestions = [...questions]
    if (newQuestions[qIdx].options.length <= 2) return
    newQuestions[qIdx].options = newQuestions[qIdx].options.filter((_, i) => i !== oIdx)
    setQuestions(newQuestions)
  }

  const handleAddTag = (name?: string) => {
    const val = (name || tagInput).trim()
    if (val && !tags.includes(val)) {
      setTags([...tags, val])
      setTagInput('')
      setShowTagRecs(false)
    }
  }

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter(tag => tag !== t))
  }

  const validate = (visibility: 'published' | 'draft') => {
    if (visibility === 'draft') return true

    if (!title.trim()) return 'Title is required'
    if (!majorId) return 'Major is required'
    if (!courseId) return 'Course is required'

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.content.trim()) return `Question ${i + 1} content is required`
      if (q.options.length < 2) return `Question ${i + 1} needs at least 2 options`
      if (q.options.every(o => !o.isCorrect)) return `Question ${i + 1} needs a correct answer`
      if (q.options.some(o => !o.content.trim())) return `Question ${i + 1} has empty options`
    }

    return true
  }

  const handleSubmit = async (status: 'draft' | 'published') => {
    const valResult = validate(status)
    if (valResult !== true) {
      setError(valResult)
      return
    }

    setLoading(true)
    setError(null)
    setIsSubmitting(true) // disable the guard

    try {
      const url = editId ? `/api/quizzes/${editId}` : '/api/quizzes'
      const method = editId ? 'PUT' : 'POST'

      // 1. Upload cover image if changed
      let finalCoverUrl = coverFile 
        ? await uploadQuizCover(crypto.randomUUID(), access, coverFile, session) 
        : coverPreview;

      // 2. Prepare questions with uploaded images
      const finalQuestions = await Promise.all(questions.map(async (q, i) => {
        let qImageUrl = q.imageUrl || null;
        if (q.imageFile) {
          qImageUrl = await uploadQuestionImage(crypto.randomUUID(), access, q.imageFile, session);
        } else if (q.imagePreview) {
          qImageUrl = q.imagePreview; // Keep existing or newly uploaded
        } else {
          qImageUrl = null; // Removed
        }

        return {
          id: q.id,
          content: q.content,
          questionType: q.questionType,
          orderIndex: i,
          imageUrl: qImageUrl,
          options: q.options.map((o, j) => ({
            id: o.id,
            content: o.content,
            isCorrect: o.isCorrect,
            orderIndex: j
          }))
        }
      }))

      await apiFetch(url, session, {
        method,
        body: JSON.stringify({
          title,
          description,
          majorId: majorId || null,
          courseId: courseId || null,
          folderId: folderId || null,
          timeLimitMinutes: timeLimit || null,
          access,
          visibility: status,
          allowCopy,
          coverImageUrl: finalCoverUrl,
          tags,
          questions: finalQuestions
        })
      })
      // Reset the snapshot so the guard doesn't trigger during navigation
      initialFormSnapshot.current = getFormSnapshot()
      addToast(editId ? 'Quiz updated successfully!' : `Quiz ${status === 'published' ? 'published' : 'saved as draft'} successfully!`)
      navigate('/my-quizzes')
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err, 'Failed to save quiz. Please check details and try again.'))
      setIsSubmitting(false) // re-enable guard on error
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 lg:px-6 relative">
      <div className="mx-auto max-w-6xl relative">
        <div ref={formTopRef} className="absolute -top-20" />
        {error && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-xl animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-red-100 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 flex-shrink-0 flex items-center justify-center text-red-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-black">Action Required</h3>
                <p className="text-xs font-bold text-red-600/80 leading-relaxed">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="w-10 h-10 rounded-xl hover:bg-gray-50 flex items-center justify-center text-gray-400 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: DETAIL */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8 relative">
              <button onClick={() => navigate(-1)} className="absolute left-0 flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-black transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
                Cancel
              </button>
              <h1 className="text-2xl font-extrabold text-black w-full text-center">{editId ? 'Edit Quiz' : 'Quiz Detail'}</h1>
            </div>

            <div className="bg-white rounded-[32px] shadow-sm border border-gray-200">
              <div className="p-8 lg:p-12 pb-0">
                <ImageUpload 
                  label="Quiz Cover Image"
                  currentPreview={coverPreview}
                  onImageSelect={(file) => {
                    setCoverFile(file);
                    setCoverPreview(file ? URL.createObjectURL(file) : null);
                  }}
                  aspectRatio="video"
                  maxSizeMB={10}
                />
              </div>
              <div className="p-8 lg:p-12 space-y-8">
                <div>
                  <label className="block text-sm font-bold text-black mb-3">Quiz Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter your quiz title here"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-black transition focus:border-[#528EB8] focus:ring-2 focus:ring-[#528EB8]/20 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div ref={majorRef} className="relative">
                    <label className="block text-sm font-bold text-black mb-3">Quiz Major</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={majorSearch}
                        onChange={(e) => {
                          setMajorSearch(e.target.value)
                          setShowMajorDropdown(true)
                          if (!e.target.value) {
                            setMajorId('')
                          }
                        }}
                        onFocus={() => setShowMajorDropdown(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const trimmed = majorSearch.trim()
                            if (!trimmed) return
                            const match = majors.find(m => m.name.toLowerCase() === trimmed.toLowerCase())
                            if (match) {
                              setMajorId(match.id)
                              setMajorSearch(match.name)
                              setShowMajorDropdown(false)
                            } else {
                              void handleAddMajor(trimmed)
                            }
                          }
                        }}
                        placeholder="Search or type a new major..."
                        className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-black transition focus:border-[#528EB8] focus:ring-2 focus:ring-[#528EB8]/20 focus:outline-none"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>

                    {showMajorDropdown && (
                      <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-200/80 rounded-2xl shadow-[0_15px_35px_rgba(15,23,42,0.12)] z-50 max-h-[250px] overflow-y-auto scrollbar-hide p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                        {majorSearch.trim() && !majors.some(m => m.name.toLowerCase() === majorSearch.toLowerCase().trim()) && (
                          <button
                            type="button"
                            onClick={() => void handleAddMajor(majorSearch)}
                            className="w-full text-left px-4 py-3 rounded-xl text-sm font-black text-[#528EB8] hover:bg-[#eef8fc] transition-all flex items-center gap-2 border-b border-slate-50 mb-1"
                          >
                            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#528EB8] text-white text-xs font-black">+</span>
                            Add "{majorSearch.trim()}"
                          </button>
                        )}

                        {majors.filter(m => m.name.toLowerCase().includes(majorSearch.toLowerCase())).length > 0 ? (
                          majors
                            .filter(m => m.name.toLowerCase().includes(majorSearch.toLowerCase()))
                            .map(m => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setMajorId(m.id)
                                  setMajorSearch(m.name)
                                  setShowMajorDropdown(false)
                                  setCourseId('')
                                  setCourseSearch('')
                                }}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${m.id === majorId ? 'bg-[#eef8fc] text-[#528EB8]' : 'text-slate-700 hover:bg-slate-50'}`}
                              >
                                <span>{m.name}</span>
                                {m.id === majorId && <span className="text-[#528EB8] text-xs font-black">Selected</span>}
                              </button>
                            ))
                        ) : !majorSearch.trim() ? (
                          <div className="px-4 py-3 text-xs font-bold text-slate-400 text-center">Start typing to search...</div>
                        ) : (
                          <div className="px-4 py-3 text-xs font-bold text-slate-400 text-center">No matching majors found. Press Enter to add.</div>
                        )}
                      </div>
                    )}
                  </div>
                  <div ref={courseRef} className="relative">
                    <label className="block text-sm font-bold text-black mb-3">Quiz Course</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={courseSearch}
                        onChange={(e) => {
                          setCourseSearch(e.target.value)
                          setShowCourseDropdown(true)
                          if (!e.target.value) {
                            setCourseId('')
                          }
                        }}
                        onFocus={() => setShowCourseDropdown(true)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const trimmed = courseSearch.trim()
                            if (!trimmed) return
                            const match = filteredCourses.find(c => c.name.toLowerCase() === trimmed.toLowerCase())
                            if (match) {
                              setCourseId(match.id)
                              setCourseSearch(match.name)
                              setShowCourseDropdown(false)
                            } else {
                              void handleAddCourse(trimmed)
                            }
                          }
                        }}
                        placeholder="Search or type a new course..."
                        className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-black transition focus:border-[#528EB8] focus:ring-2 focus:ring-[#528EB8]/20 focus:outline-none"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>

                    {showCourseDropdown && (
                      <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-200/80 rounded-2xl shadow-[0_15px_35px_rgba(15,23,42,0.12)] z-50 max-h-[250px] overflow-y-auto scrollbar-hide p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                        {courseSearch.trim() && !filteredCourses.some(c => c.name.toLowerCase() === courseSearch.toLowerCase().trim()) && (
                          <button
                            type="button"
                            onClick={() => void handleAddCourse(courseSearch)}
                            className="w-full text-left px-4 py-3 rounded-xl text-sm font-black text-[#528EB8] hover:bg-[#eef8fc] transition-all flex items-center gap-2 border-b border-slate-50 mb-1"
                          >
                            <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#528EB8] text-white text-xs font-black">+</span>
                            Add "{courseSearch.trim()}"
                          </button>
                        )}

                        {filteredCourses.filter(c => c.name.toLowerCase().includes(courseSearch.toLowerCase())).length > 0 ? (
                          filteredCourses
                            .filter(c => c.name.toLowerCase().includes(courseSearch.toLowerCase()))
                            .map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => {
                                  setCourseId(c.id)
                                  setCourseSearch(c.name)
                                  setShowCourseDropdown(false)
                                }}
                                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${c.id === courseId ? 'bg-[#eef8fc] text-[#528EB8]' : 'text-slate-700 hover:bg-slate-50'}`}
                              >
                                <span>{c.name}</span>
                                {c.id === courseId && <span className="text-[#528EB8] text-xs font-black">Selected</span>}
                              </button>
                            ))
                        ) : !courseSearch.trim() ? (
                          <div className="px-4 py-3 text-xs font-bold text-slate-400 text-center">Start typing to search...</div>
                        ) : (
                          <div className="px-4 py-3 text-xs font-bold text-slate-400 text-center">No matching courses found. Press Enter to add.</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div ref={folderRef} className="relative">
                  <label className="block text-sm font-bold text-black mb-3">Quiz Folder (Optional)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={folderSearch}
                      onChange={(e) => {
                        setFolderSearch(e.target.value)
                        setShowFolderDropdown(true)
                        if (!e.target.value) {
                          setFolderId('')
                        }
                      }}
                      onFocus={() => setShowFolderDropdown(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const trimmed = folderSearch.trim()
                          if (!trimmed) return
                          const match = folders.find(f => f.name.toLowerCase() === trimmed.toLowerCase())
                          if (match) {
                            setFolderId(match.id)
                            setFolderSearch(match.name)
                            setShowFolderDropdown(false)
                          } else {
                            void handleAddFolder(trimmed)
                          }
                        }
                      }}
                      placeholder="Search or type a new folder..."
                      className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-black transition focus:border-[#528EB8] focus:ring-2 focus:ring-[#528EB8]/20 focus:outline-none"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>

                  {showFolderDropdown && (
                    <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-200/80 rounded-2xl shadow-[0_15px_35px_rgba(15,23,42,0.12)] z-50 max-h-[250px] overflow-y-auto scrollbar-hide p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                      {folderSearch.trim() && !folders.some(f => f.name.toLowerCase() === folderSearch.toLowerCase().trim()) && (
                        <button
                          type="button"
                          onClick={() => void handleAddFolder(folderSearch)}
                          className="w-full text-left px-4 py-3 rounded-xl text-sm font-black text-[#528EB8] hover:bg-[#eef8fc] transition-all flex items-center gap-2 border-b border-slate-50 mb-1"
                        >
                          <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#528EB8] text-white text-xs font-black">+</span>
                          Add "{folderSearch.trim()}"
                        </button>
                      )}

                      {folders.filter(f => f.name.toLowerCase().includes(folderSearch.toLowerCase())).length > 0 ? (
                        folders
                          .filter(f => f.name.toLowerCase().includes(folderSearch.toLowerCase()))
                          .map(f => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => {
                                setFolderId(f.id)
                                setFolderSearch(f.name)
                                setShowFolderDropdown(false)
                              }}
                              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${f.id === folderId ? 'bg-[#eef8fc] text-[#528EB8]' : 'text-slate-700 hover:bg-slate-50'}`}
                            >
                              <span>{f.name}</span>
                              {f.id === folderId && <span className="text-[#528EB8] text-xs font-black">Selected</span>}
                            </button>
                          ))
                      ) : !folderSearch.trim() ? (
                        <div className="px-4 py-3 text-xs font-bold text-slate-400 text-center">Start typing to search...</div>
                      ) : (
                        <div className="px-4 py-3 text-xs font-bold text-slate-400 text-center">No matching folders found. Press Enter to add.</div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-3">Description</label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter your quiz description here"
                    className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-black transition focus:border-[#528EB8] focus:ring-2 focus:ring-[#528EB8]/20 focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-black mb-3">Duration (minutes)</label>
                    <input
                      type="number"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(e.target.value === '' ? '' : parseInt(e.target.value))}
                      placeholder="e.g. 60"
                      className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-black transition focus:border-[#528EB8] focus:ring-2 focus:ring-[#528EB8]/20 focus:outline-none"
                    />
                  </div>
                  <div ref={accessRef} className="relative">
                    <label className="block text-sm font-bold text-black mb-3">Access</label>
                    <div 
                      onClick={() => setShowAccessDropdown(!showAccessDropdown)}
                      className="w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-black transition focus:border-[#528EB8] focus:ring-2 focus:ring-[#528EB8]/20 focus:outline-none cursor-pointer flex justify-between items-center"
                    >
                      <span className="capitalize">{access}</span>
                      <div className="text-gray-400 pointer-events-none">
                        <svg className={`w-5 h-5 transition-transform ${showAccessDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                    {showAccessDropdown && (
                      <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-slate-200/80 rounded-2xl shadow-[0_15px_35px_rgba(15,23,42,0.12)] z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                        <button
                          type="button"
                          onClick={() => { setAccess('private'); setShowAccessDropdown(false); }}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${access === 'private' ? 'bg-[#eef8fc] text-[#528EB8]' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                          <span>Private</span>
                          {access === 'private' && <span className="text-[#528EB8] text-xs font-black">Selected</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAccess('public'); setShowAccessDropdown(false); }}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${access === 'public' ? 'bg-[#eef8fc] text-[#528EB8]' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                          <span>Public</span>
                          {access === 'public' && <span className="text-[#528EB8] text-xs font-black">Selected</span>}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer group">
                    <input type="checkbox" checked={allowCopy} onChange={(e) => setAllowCopy(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#104876]"></div>
                    <span className="ml-3 text-sm font-bold text-black group-hover:text-[#104876] transition">Allow Copy</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-4">Tags</label>

                  {/* Selected Tags */}
                  <div className="flex flex-wrap gap-2 mb-4 min-h-[36px]">
                    {tags.map(t => (
                      <div key={t} className="flex items-center gap-2 bg-[#528EB8] text-white px-4 py-1.5 rounded-full text-xs font-bold transition hover:bg-[#3E779F]">
                        <span>{t}</span>
                        <button onClick={() => handleRemoveTag(t)} className="hover:text-red-200 transition">✕</button>
                      </div>
                    ))}
                  </div>

                  {/* Tag Search & Add */}
                  <div className="flex items-center gap-3 relative">
                    <div className="relative flex-1 max-w-sm">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => {
                          setTagInput(e.target.value)
                          setShowTagRecs(true)
                        }}
                        onBlur={() => setTimeout(() => setShowTagRecs(false), 200)}
                        onFocus={() => setShowTagRecs(true)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                        placeholder="Search or add tags..."
                        className="w-full rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm text-black transition focus:border-[#528EB8] focus:ring-2 focus:ring-[#528EB8]/20 focus:outline-none shadow-sm"
                      />

                      {/* Recommendations Dropdown */}
                      {showTagRecs && tagInput.trim() && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden py-1">
                          {/* 1. Add New Option (Top) - Only show if NO exact match exists in DB */}
                          {!allTags.some(t => t.name.toLowerCase() === tagInput.toLowerCase().trim()) && !tags.includes(tagInput.trim()) && (
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); handleAddTag(); }}
                              className="w-full text-left px-5 py-2.5 text-sm font-bold text-[#528EB8] hover:bg-[#eef8fc] transition flex items-center gap-2 border-b border-gray-50"
                            >
                              <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#528EB8] text-white text-xs">+</span>
                              Add "{tagInput.trim()}"
                            </button>
                          )}

                          {/* 2. Existing Recommendations (Below Add New) */}
                          {allTags
                            .filter(t => t.name.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t.name))
                            .slice(0, 5)
                            .map(rec => (
                              <button
                                key={rec.id}
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); handleAddTag(rec.name); }}
                                className="w-full text-left px-5 py-2.5 text-sm font-medium hover:bg-[#eef8fc] hover:text-[#528EB8] transition flex items-center justify-between"
                              >
                                <span>{rec.name}</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Existing</span>
                              </button>
                            ))
                          }
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 flex justify-end">
              <button
                onClick={() => { setStep(2); scrollToTop(); }}
                className="bg-[#104876] text-white w-full sm:w-auto px-10 py-4 rounded-full font-bold shadow-lg hover:bg-[#0c365a] transition-all flex items-center justify-center gap-3"
              >
                Continue
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: QUESTIONS */}
        {step === 2 && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-12 relative">
              <button onClick={() => { setStep(1); scrollToTop(); }} className="absolute left-0 flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-black transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
                Previous
              </button>
              <h1 className="text-3xl font-extrabold text-black w-full text-center">Questions</h1>
            </div>

            <div className="space-y-12">
              {questions.map((q, qIdx) => (
                <div 
                  key={qIdx} 
                  ref={(el) => { questionRefs.current[qIdx] = el }}
                  className="bg-white rounded-[48px] shadow-sm border border-gray-100 p-10 lg:p-14 relative group"
                >
                  <div className="flex items-center justify-between mb-10">
                    <h2 className="text-2xl font-extrabold text-black">Question {qIdx + 1}</h2>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenTypeDropdownIndex(openTypeDropdownIndex === qIdx ? null : qIdx)}
                        className="min-w-[180px] text-left rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-black transition hover:border-[#528EB8] focus:border-[#528EB8] focus:ring-2 focus:ring-[#528EB8]/20 flex items-center justify-between gap-4"
                      >
                        {q.questionType === 'multiple_choice' ? 'Multiple Choice' : 'Checkbox'}
                        <svg className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${openTypeDropdownIndex === qIdx ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      
                      {openTypeDropdownIndex === qIdx && (
                        <div className="absolute top-[calc(100%+8px)] right-0 w-full min-w-[180px] bg-white border border-slate-200/80 rounded-2xl shadow-[0_15px_35px_rgba(15,23,42,0.12)] z-50 overflow-hidden p-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                          <button
                            type="button"
                            onClick={() => {
                              const newQuestions = [...questions];
                              newQuestions[qIdx].questionType = 'multiple_choice';
                              setQuestions(newQuestions);
                              setOpenTypeDropdownIndex(null);
                            }}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${q.questionType === 'multiple_choice' ? 'bg-[#eef8fc] text-[#528EB8]' : 'text-slate-700 hover:bg-slate-50'}`}
                          >
                            Multiple Choice
                            {q.questionType === 'multiple_choice' && <span className="text-[#528EB8] text-xs font-black">Selected</span>}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newQuestions = [...questions];
                              newQuestions[qIdx].questionType = 'checkbox';
                              setQuestions(newQuestions);
                              setOpenTypeDropdownIndex(null);
                            }}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${q.questionType === 'checkbox' ? 'bg-[#eef8fc] text-[#528EB8]' : 'text-slate-700 hover:bg-slate-50'}`}
                          >
                            Checkbox
                            {q.questionType === 'checkbox' && <span className="text-[#528EB8] text-xs font-black">Selected</span>}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-12">
                    <div>
                      <label className="block text-xl font-extrabold text-black mb-6">Question Text</label>
                        <div className="space-y-6">
                          <textarea
                            value={q.content}
                            onChange={(e) => {
                              const newQuestions = [...questions]
                              newQuestions[qIdx].content = e.target.value
                              setQuestions(newQuestions)
                            }}
                            rows={5}
                            placeholder="Enter your question here"
                            className="w-full rounded-[32px] border border-gray-100 bg-white px-8 py-7 text-sm font-medium text-black transition focus:border-[#528EB8] focus:outline-none resize-none"
                          />
                          
                          {q.imagePreview && (
                            <div className="relative max-w-2xl group/img-container">
                              <div className="aspect-video rounded-3xl overflow-hidden border border-gray-100 shadow-sm relative">
                                <img src={q.imagePreview} className="w-full h-full object-cover" alt="Question" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img-container:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                  <button 
                                    onClick={() => window.open(q.imagePreview, '_blank')}
                                    className="px-6 py-2 bg-white text-black text-sm font-bold rounded-xl hover:bg-gray-100 transition"
                                  >
                                    Preview Image
                                  </button>
                                  <button 
                                    onClick={() => handleRemoveQuestionImage(qIdx)}
                                    className="px-6 py-2 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 transition"
                                  >
                                    Delete Image
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                    </div>

                    <div>
                      <label className="block text-xl font-extrabold text-black mb-6">Choices</label>
                      <div className="space-y-4 mb-8">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-4">
                            <div className="relative flex-1">
                              <div className="absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-50 text-sm font-bold text-black">
                                {String.fromCharCode(65 + oIdx)}
                              </div>
                              <input
                                type="text"
                                value={opt.content}
                                onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                                placeholder="Enter choice"
                                className={`w-full rounded-3xl border-none pl-20 pr-12 py-6 text-sm font-medium text-black shadow-sm ${opt.isCorrect ? 'bg-[#eef8fc] ring-2 ring-[#528EB8]/20' : 'bg-gray-50'}`}
                              />
                              <button
                                onClick={() => handleCorrectOption(qIdx, oIdx)}
                                className={`absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border transition-all ${opt.isCorrect ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-200 text-transparent'}`}
                              >
                                ✓
                              </button>
                            </div>
                            <button
                              onClick={() => handleRemoveOption(qIdx, oIdx)}
                              title="Remove Choice"
                              className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-2xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-100"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      <button onClick={() => handleAddOption(qIdx)} className="w-full py-6 rounded-[32px] bg-gray-50 text-sm font-bold text-black hover:bg-gray-100 transition border border-dashed border-gray-200">
                        + Add Choice
                      </button>


                      <div className="mt-8">
                        <label className="block text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
                          {q.questionType === 'checkbox' ? 'Select Correct Answers (multiple)' : 'Select Correct Answer'}
                        </label>
                        <div className="flex flex-wrap gap-3">
                          {q.options.map((opt, oIdx) => (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => handleCorrectOption(qIdx, oIdx)}
                              className={`flex-1 min-w-[80px] py-4 rounded-2xl text-sm font-black transition-all border-2 ${opt.isCorrect
                                  ? 'bg-[#104876] border-[#104876] text-white shadow-lg shadow-[#104876]/20'
                                  : 'bg-white border-gray-100 text-gray-400 hover:border-[#104876]/30 hover:text-[#104876]'
                                }`}
                            >
                              Option {String.fromCharCode(65 + oIdx)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute right-[-60px] top-0 flex flex-col gap-4 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => handleAddQuestion(qIdx)} title="Add Question Below" className="w-12 h-12 rounded-2xl bg-[#104876] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform">+</button>
                    <button onClick={() => handleRemoveQuestion(qIdx)} title="Remove Question" className="w-12 h-12 rounded-2xl bg-white text-red-500 flex items-center justify-center shadow-lg border border-red-50 hover:scale-110 transition-transform">🗑</button>
                    <button 
                      onClick={() => {
                        const input = document.getElementById(`q-img-${qIdx}`) as HTMLInputElement;
                        input?.click();
                      }} 
                      title="Add Image" 
                      className="w-12 h-12 rounded-2xl bg-white text-[#528EB8] flex items-center justify-center shadow-lg border border-gray-50 hover:scale-110 transition-transform"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <input 
                      id={`q-img-${qIdx}`}
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => handleQuestionImageChange(qIdx, e)}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 sm:mt-24 flex justify-between items-center pb-24">
              <button onClick={() => { setStep(1); scrollToTop(); }} className="bg-white border border-gray-100 text-black px-12 py-6 rounded-[32px] font-bold shadow-sm">Previous</button>
              <div className="flex gap-6">
                <button onClick={() => handleSubmit('draft')} className="bg-white border border-gray-100 text-gray-400 px-12 py-6 rounded-[32px] font-bold shadow-sm" disabled={loading}>Save Draft</button>
                <button onClick={() => { setStep(3); scrollToTop(); }} className="bg-[#104876] text-white px-12 py-6 rounded-[32px] font-bold shadow-xl">Continue</button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SUMMARY */}
        {step === 3 && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-12 relative">
              <button onClick={() => { setStep(2); scrollToTop(); }} className="absolute left-0 flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-black transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
                Previous
              </button>
              <h1 className="text-3xl font-extrabold text-black w-full text-center">Summary</h1>
            </div>

            <div className="bg-white rounded-[48px] shadow-sm border border-gray-100 overflow-hidden">
              <div className="h-64 w-full bg-gray-100">
                <img src={coverPreview || "/assets/default-cover.png"} alt="Quiz Cover" className="h-full w-full object-cover" />
              </div>
              <div className="p-10 lg:p-14">
                <h1 className="text-4xl font-black text-black mb-4">{title || 'Untitled Quiz'}</h1>
                <div className="flex items-center gap-3 text-lg font-bold text-gray-400 mb-12">
                  <span>{majors.find(m => m.id === majorId)?.name || 'No Major'}</span>
                  <span>•</span>
                  <span>{courses.find(c => c.id === courseId)?.name || 'No Course'}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  <div className="bg-gray-50 border border-gray-100 rounded-3xl p-8">
                    <div className="text-2xl font-black text-black">{questions.length}</div>
                    <div className="text-sm font-bold text-gray-400">Questions</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-3xl p-8">
                    <div className="text-2xl font-black text-black">{timeLimit ? `${timeLimit}m` : '∞'}</div>
                    <div className="text-sm font-bold text-gray-400">Time Limit</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-3xl p-8">
                    <div className="text-2xl font-black text-black capitalize">{access}</div>
                    <div className="text-sm font-bold text-gray-400">Access</div>
                  </div>
                </div>

                <div className="mb-12">
                  <h3 className="text-xl font-extrabold text-black mb-4">Description</h3>
                  <p className="text-gray-500 leading-relaxed text-lg">{description || 'No description provided.'}</p>
                </div>
              </div>
            </div>

            <div className="mt-12 flex flex-col gap-6 items-center">
              <button
                onClick={() => handleSubmit('published')}
                className="w-full bg-[#528EB8] text-white py-8 rounded-[32px] text-xl font-black shadow-xl hover:bg-[#3E779F] transition-all"
                disabled={loading}
              >
                {loading ? 'Publishing...' : 'Publish Quiz'}
              </button>
              <button
                onClick={() => { setStep(2); scrollToTop(); }}
                className="w-full bg-white border-2 border-gray-100 text-gray-400 py-8 rounded-[32px] text-xl font-black"
              >
                Back to Questions
              </button>
            </div>
          </div>
        )}

        <div ref={formBottomRef} className="h-1 mt-10" />

        {/* Floating Scroll to Bottom Button */}
        {!isBottomVisible && (
          <div className="fixed bottom-10 right-4 md:right-10 z-50 animate-in fade-in zoom-in duration-300">
            <button
              onClick={scrollToBottom}
              className="group w-14 h-14 bg-[#104876] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
              title="Scroll to Bottom"
            >
              <svg className="w-6 h-6 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
          </div>
        )}

        {/* Unsaved Changes Warning Modal */}
        <UnsavedChangesModal
          isOpen={showUnsavedModal}
          onSaveAsDraft={handleUnsavedSaveAsDraft}
          onBackToForm={handleUnsavedBackToForm}
          onDiscard={handleUnsavedDiscard}
          isSaving={draftSaving}
        />
      </div>
    </div>
  )
}
