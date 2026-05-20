import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { apiFetch } from '../lib/api'
import { getSupabaseClient } from '../lib/supabase'
import { useToast } from '../components/ToastProvider'

type Major = { id: string; name: string }

type Me = {
  id: string
  firstName: string | null
  lastName: string | null
  username: string | null
  majorId: string | null
  yearOfEntry: number | null
  avatarUrl: string | null
}

export function MePage() {
  const { session, signOut } = useAuth()
  const { addToast } = useToast()
  const [activeTab, setActiveTab] = useState<'personal' | 'login'>('personal')
  const [me, setMe] = useState<Me | null>(null)
  const [majors, setMajors] = useState<Major[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [, setError] = useState<string | null>(null)
  const [, setSuccess] = useState<string | null>(null)
  const [majorDropdownOpen, setMajorDropdownOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    majorId: '',
    yearOfEntry: '',
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  // Auto-scroll to top when tab change occurs
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeTab])

  const fetchMajors = useCallback(async () => {
    try {
      const data = await apiFetch<Major[]>('/api/metadata/majors', session)
      setMajors(data)
    } catch (e) {
      console.error('Failed to fetch majors', e)
    }
  }, [session])

  const fetchMe = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch<Me>('/api/me', session)
      setMe(data)
      setFormData({
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        username: data.username ?? '',
        majorId: data.majorId ?? '',
        yearOfEntry: data.yearOfEntry?.toString() ?? '',
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch profile')
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => {
    void fetchMajors()
    void fetchMe()
  }, [fetchMajors, fetchMe])

  const handlePersonalSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await apiFetch('/api/me', session, {
        method: 'PATCH',
        body: JSON.stringify({
          ...formData,
          majorId: formData.majorId ? formData.majorId : null,
          yearOfEntry: formData.yearOfEntry ? parseInt(formData.yearOfEntry) : null,
        }),
      })
      addToast('Profil berhasil diperbarui!', 'success')
      await fetchMe()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save changes'
      addToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSave = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      addToast('Password baru tidak cocok!', 'error')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.updateUser({ 
        password: passwordData.newPassword 
      })
      if (error) throw error
      
      addToast('Password berhasil diperbarui!', 'success')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setShowPasswords({ current: false, new: false, confirm: false })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to change password'
      addToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const calculateSemester = (year: string) => {
    if (!year) return '-'
    const entryYear = parseInt(year)
    if (isNaN(entryYear)) return '-'
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    
    let sem = (currentYear - entryYear) * 2
    if (currentMonth >= 8 || currentMonth <= 1) {
      sem += 1
    }
    return sem > 0 ? sem : 1
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#528FB9] rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="lg:w-1/4">
          <div className="bg-white rounded-[40px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center">
            {/* Avatar Circle */}
            <div className="w-32 h-32 rounded-full bg-[#FFB82E] flex items-center justify-center text-white text-5xl font-black mb-10 shadow-lg relative overflow-hidden">
              {me?.avatarUrl ? (
                <img src={me.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                (me?.firstName?.[0] ?? me?.username?.[0] ?? 'R').toUpperCase()
              )}
            </div>

            <nav className="w-full space-y-4">
              <button 
                onClick={() => { setActiveTab('personal'); setError(null); setSuccess(null) }}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-[20px] transition-all font-bold text-sm
                  ${activeTab === 'personal' ? 'bg-[#528FB9] text-white shadow-lg shadow-blue-100' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                Personal Info
              </button>
              
              <button 
                onClick={() => { setActiveTab('login'); setError(null); setSuccess(null) }}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-[20px] transition-all font-bold text-sm
                  ${activeTab === 'login' ? 'bg-[#528FB9] text-white shadow-lg shadow-blue-100' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Login Info
              </button>

              <div className="pt-4 mt-4 border-t border-slate-100">
                <button 
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full flex items-center gap-4 px-6 py-4 rounded-[20px] text-red-500 hover:bg-red-50 transition-all font-bold text-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:w-3/4">
          <div className="bg-white rounded-[40px] p-10 lg:p-14 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            
            {activeTab === 'personal' ? (
              <div className="space-y-8 animate-in fade-in duration-500">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-10">Personal Information</h1>
                

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">First Name</label>
                    <input 
                      type="text" 
                      value={formData.firstName}
                      onChange={e => setFormData({...formData, firstName: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-[20px] px-6 py-4 text-slate-800 font-semibold focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Last Name</label>
                    <input 
                      type="text" 
                      value={formData.lastName}
                      onChange={e => setFormData({...formData, lastName: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-[20px] px-6 py-4 text-slate-800 font-semibold focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Username</label>
                  <input 
                    type="text" 
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-[20px] px-6 py-4 text-slate-800 font-semibold focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Student Email</label>
                  <input 
                    type="email" 
                    value={session?.user?.email ?? ''} 
                    disabled 
                    className="w-full bg-slate-100/50 border-none rounded-[20px] px-6 py-4 text-slate-500 font-semibold cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Major</label>
                  <div className="relative group">
                    <button 
                      type="button"
                      onClick={() => setMajorDropdownOpen(!majorDropdownOpen)}
                      className="w-full bg-slate-50 border-none rounded-[20px] px-6 py-4 text-slate-800 font-semibold focus:ring-2 focus:ring-blue-100 transition-all outline-none flex items-center justify-between"
                    >
                      <span>{majors.find(m => m.id === formData.majorId)?.name || 'Select Major'}</span>
                      <svg className={`w-5 h-5 transition-transform ${majorDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    
                    {majorDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setMajorDropdownOpen(false)}
                        ></div>
                        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white rounded-[24px] shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-slate-100 py-3 z-20 animate-in fade-in zoom-in-95 duration-200">
                          <div className="max-h-[240px] overflow-y-auto custom-scrollbar px-2 space-y-1">
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({...formData, majorId: ''})
                                setMajorDropdownOpen(false)
                              }}
                              className={`w-full text-left px-4 py-3 rounded-[16px] text-sm font-bold transition-all
                                ${!formData.majorId ? 'bg-blue-50 text-[#528FB9]' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                              Select Major
                            </button>
                            {majors.map(m => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setFormData({...formData, majorId: m.id})
                                  setMajorDropdownOpen(false)
                                }}
                                className={`w-full text-left px-4 py-3 rounded-[16px] text-sm font-bold transition-all
                                  ${formData.majorId === m.id ? 'bg-blue-50 text-[#528FB9]' : 'text-slate-600 hover:bg-slate-50'}`}
                              >
                                {m.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Semester</label>
                    <input 
                      type="text" 
                      value={calculateSemester(formData.yearOfEntry)} 
                      disabled 
                      className="w-full bg-slate-100/50 border-none rounded-[20px] px-6 py-4 text-slate-500 font-bold cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-400 font-semibold ml-1 uppercase tracking-wider">Calculated automatically</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">Year of Entry</label>
                    <input 
                      type="text" 
                      value={formData.yearOfEntry}
                      onChange={e => setFormData({...formData, yearOfEntry: e.target.value})}
                      placeholder="e.g. 2023"
                      className="w-full bg-slate-50 border-none rounded-[20px] px-6 py-4 text-slate-800 font-semibold focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-10">
                  <button 
                    onClick={() => { fetchMe(); setError(null); setSuccess(null) }}
                    className="flex-1 px-8 py-4 rounded-[20px] font-black text-slate-600 bg-white border-2 border-slate-100 hover:bg-slate-50 transition-all active:scale-95"
                  >
                    Discard Changes
                  </button>
                  <button 
                    onClick={() => handlePersonalSave()}
                    disabled={saving}
                    className="flex-1 px-8 py-4 rounded-[20px] font-black text-white bg-[#528FB9] hover:bg-[#3d7aa8] shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-500">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-10">Login Information</h1>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Student Email</label>
                  <input 
                    type="email" 
                    value={session?.user?.email ?? ''} 
                    disabled 
                    className="w-full bg-slate-100/50 border-none rounded-[20px] px-6 py-4 text-slate-500 font-semibold cursor-not-allowed"
                  />
                </div>

                <div className="pt-6">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight mb-8">Change Password</h2>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Current Password</label>
                      <div className="relative">
                        <input 
                          type={showPasswords.current ? "text" : "password"} 
                          placeholder="Current password"
                          value={passwordData.currentPassword}
                          onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})}
                          className="w-full bg-slate-50 border-none rounded-[20px] px-6 py-4 pr-14 text-slate-800 font-semibold focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPasswords.current ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">New Password</label>
                        <div className="relative">
                          <input 
                            type={showPasswords.new ? "text" : "password"} 
                            placeholder="New password"
                            value={passwordData.newPassword}
                            onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                            className="w-full bg-slate-50 border-none rounded-[20px] px-6 py-4 pr-14 text-slate-800 font-semibold focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPasswords.new ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Confirm New Password</label>
                        <div className="relative">
                          <input 
                            type={showPasswords.confirm ? "text" : "password"} 
                            placeholder="Confirm new password"
                            value={passwordData.confirmPassword}
                            onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                            className="w-full bg-slate-50 border-none rounded-[20px] px-6 py-4 pr-14 text-slate-800 font-semibold focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPasswords.confirm ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-10">
                  <button 
                    onClick={() => { setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); setError(null); setSuccess(null) }}
                    className="flex-1 px-8 py-4 rounded-[20px] font-black text-slate-600 bg-white border-2 border-slate-100 hover:bg-slate-50 transition-all active:scale-95"
                  >
                    Discard Changes
                  </button>
                  <button 
                    onClick={() => handlePasswordSave()}
                    disabled={saving}
                    className="flex-1 px-8 py-4 rounded-[20px] font-black text-white bg-[#224466] hover:bg-[#1a334d] shadow-lg shadow-blue-100 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowLogoutConfirm(false)}>
          <div className="w-[90%] max-w-[400px] rounded-[32px] bg-white p-8 shadow-[0_20px_50px_rgba(15,23,42,0.15)] border border-slate-100 text-center animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-black text-slate-900">Sign Out</h3>
            <p className="mb-8 text-sm font-semibold text-slate-500 leading-relaxed">Are you sure you want to sign out? You will need to log back in to access your quizzes.</p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 rounded-2xl border-2 border-slate-100 py-3.5 text-sm font-black text-slate-500 hover:bg-slate-50 transition active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false)
                  void signOut()
                }}
                className="flex-1 rounded-2xl bg-red-500 py-3.5 text-sm font-black text-white hover:bg-red-600 shadow-lg shadow-red-100 transition active:scale-95"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

