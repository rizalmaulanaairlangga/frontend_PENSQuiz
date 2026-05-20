# PENSQuiz Frontend (React + TypeScript)

A responsive React + TypeScript SPA built with Vite and Tailwind CSS. Connects to Supabase Auth and the ASP.NET Core backend to provide students with an interactive, real-time quiz-taking and assessment dashboard.

Frontend ini terpisah dari fullstack Laravel lama dan menggunakan:
*   **Authentication**: Supabase Auth (Register, Login, Session Management) via `@supabase/supabase-js`
*   **API Client**: Menghubungkan secara langsung ke backend ASP.NET Core API (`pensquiz_backend`)
*   **Asset & CMS**: Memanfaatkan Notion CMS secara dinamis melalui server backend
*   **State & Styling**: React Router DOM (v7) untuk routing, Tailwind CSS (v4) untuk tampilan modern dan premium.

---

## 🛠️ Persyaratan System

*   **Node.js** (v18 atau yang lebih baru)
*   **npm** atau package manager alternatif (yarn, pnpm)
*   **PENSQuiz Backend** berjalan secara lokal atau online

---

## 🚀 Panduan Setup & Instalasi

### 1) Salin Environment Variables
Salin file `.env.example` menjadi `.env` di root folder frontend:
```bash
cp .env.example .env
```

Buka `.env` dan konfigurasikan key yang dibutuhkan:
*   `VITE_SUPABASE_URL` — URL project Supabase Anda.
*   `VITE_SUPABASE_ANON_KEY` — Public Anon Key dari project Supabase Anda.
*   `VITE_API_URL` — Base URL dari REST API backend ASP.NET Core Anda (contoh: `http://localhost:5000/api` atau `https://localhost:7082/api`).

### 2) Instalasi Dependency & Jalankan Development Server
Jalankan perintah berikut di folder `pensquiz_frontend/`:
```bash
# Menginstal package node modules
npm install

# Menjalankan Vite development server
npm run dev
```

Secara default, aplikasi frontend React akan berjalan di `http://localhost:5173`.

---

## 🎯 Fitur & Struktur Utama Halaman

*   **Dashboard Utama**: Statistik pengerjaan quiz, riwayat skor rata-rata, dan histori attempt.
*   **Daftar Quiz**: Kumpulan quiz publik maupun quiz buatan user sendiri.
*   **Halaman Pengerjaan Quiz (Attempt Flow)**: Interface responsif dengan waktu pengerjaan, simpan jawaban dinamis, dan kalkulasi skor otomatis setelah disubmit.
*   **Autentikasi Aman**: Login & Register terintegrasi penuh dengan Supabase Auth Session.
