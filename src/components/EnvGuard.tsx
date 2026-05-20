import { isSupabaseConfigured } from '../lib/supabase'

export function EnvGuard({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="container">
        <div className="card stack" style={{ maxWidth: 720 }}>
          <h2 style={{ margin: 0 }}>Frontend belum dikonfigurasi</h2>
          <div className="muted">
            Halaman putih terjadi karena env Supabase belum diisi.
          </div>
          <div className="muted">
            Isi file <code>.env</code> di <code>pensquiz-frontend</code>:
          </div>
          <pre className="muted" style={{ overflowX: 'auto' }}>
{`VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...`}
          </pre>
          <div className="muted">Lalu restart Vite dev server.</div>
        </div>
      </div>
    )
  }

  return children
}

