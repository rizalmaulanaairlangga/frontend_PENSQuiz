import { useEffect } from 'react'
import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAuth } from './auth/RequireAuth'
import { EnvGuard } from './components/EnvGuard'
import { AppShell } from './components/AppShell'
import { AttemptPlayPage } from './pages/AttemptPlay'
import { Dashboard } from './pages/Dashboard'
import { CreateQuiz } from './pages/CreateQuiz'
import { Login } from './pages/Login'
import { MePage } from './pages/Me'
import { FolderDetailPage } from './pages/FolderDetail'
import { MyQuizzesPage } from './pages/MyQuizzes'
import { QuizDetailPage } from './pages/QuizDetail'
import { QuizStatisticsPage } from './pages/QuizStatistics'
import { QuizzesPage } from './pages/Quizzes'
import { Register } from './pages/Register'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

import { ToastProvider } from './components/ToastProvider'

function RootLayout() {
  return (
    <>
      <ScrollToTop />
      <EnvGuard>
        <AuthProvider>
          <ToastProvider>
            <Outlet />
          </ToastProvider>
        </AuthProvider>
      </EnvGuard>
    </>
  )
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell><Outlet /></AppShell>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/me" element={<MePage />} />
          <Route path="/my-quizzes" element={<MyQuizzesPage />} />
          <Route path="/my-quizzes/folders/:id" element={<FolderDetailPage />} />
          <Route path="/quizzes" element={<QuizzesPage />} />
          <Route path="/quizzes/create" element={<CreateQuiz />} />
          <Route path="/quizzes/:id" element={<QuizDetailPage />} />
          <Route path="/quizzes/:id/statistics" element={<QuizStatisticsPage />} />
          <Route path="/quizzes/:quizId/start" element={<AttemptPlayPage />} />
        </Route>
      </Route>
    </Route>
  )
)

export default function App() {
  return <RouterProvider router={router} />
}
