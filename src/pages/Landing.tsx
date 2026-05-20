import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

export function Landing() {
  const { session } = useAuth()

  return (
    <div className="card stack">
      <h1 style={{ margin: 0 }}>PENSQuiz</h1>
      <p className="muted" style={{ margin: 0 }}>
        Frontend React + TypeScript. Auth via Supabase, data via backend ASP.NET.
      </p>

      {session ? (
        <div className="row">
          <Link className="btn primary" to="/dashboard">
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="row">
          <Link className="btn primary" to="/login">
            Login
          </Link>
          <Link className="btn" to="/register">
            Register
          </Link>
        </div>
      )}
    </div>
  )
}

