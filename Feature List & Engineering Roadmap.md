# MVP Feature List & Technical Engineering Roadmap

## Platform: AI Job Hunter (Otomatisasi Lowongan Kerja berbasis AI)

---

## 1\. Breakdown Fitur MVP (Scope & Functional Breakdown)

### A. Authentication & Onboarding

* **Auth System:** Register, Login, Logout, Reset Password via JWT & Google OAuth 2.0.  
* **Profile & CV Management:** Form data diri, unggah file CV (.pdf), dan ekstraksi/parsing data CV otomatis oleh AI.  
* **Terms & Privacy Consent:** Modal/Persetujuan eksplisit penggunaan data pribadi untuk pengiriman email lamaran otomatis.

### B. Modul Psikotes Interaktif (Pauli & Kraepelin)

* **Interactive Web Test Interface:** Antarmuka penjumlah angka cepat berbasis keyboard/numpad dengan penanda waktu (*timer*).  
* **Scoring & Analytics Engine:** Kalkulasi metrik Puncak (Kapasitas Maksimal), Kecepatan (Rata-rata), Ketelitian (Persentase Error), dan Kestabilan (Fluktuasi).  
* **PDF Certificate Generator:** Pembuatan laporan/sertifikat hasil tes otomatis dalam format PDF yang siap dilampirkan ke email lamaran.

### C. AI Scraping & Data Extraction Pipeline (Dual-Path)

* **Web Scraper Worker:** Scraper otomatis berbasis Playwright (dengan *stealth mode* & rotasi IP Proxy) untuk mengambil lowongan dari Portal Kerja, Website Karir, & Poster Sosmed.  
* **AI Multimodal Extractor (Gemini API):** Mengubah poster/narasi lowongan menjadi format JSON terstruktur (`job_title`, `company_name`, `qualifications`, `application_type: EMAIL/WEBSITE_PORTAL`, `target_email`, `direct_apply_link`, `source_platform`).  
* **Match Score Engine:** Penilaian persentase kesesuaian (*matching score*) antara kualifikasi CV pencari kerja dan kualifikasi lowongan.

### D. Email Automation & Compliance Engine

* **Sender Integration:**  
  * *Option A:* Personal Email via Gmail OAuth 2.0 API.  
  * *Option B:* Platform Subdomain Email via AWS SES / Mailgun.  
* **Dynamic Content Generator:** AI menyusun Subject & Body email lamaran (*cover letter*) yang disesuaikan secara personal per posisi lowongan.  
* **Attachment Handler:** Otomatis melampirkan file CV (PDF) dan Sertifikat Psikotes (PDF).  
* **Delivery Queue & Jitter System:** Antrean pengiriman email dengan *delay jitter* acak (3-15 menit) untuk keamanan dari flagging *spam*.

### E. User Dashboard (Dual-Path Tracking & Hub)

* **Tab 1 \- Automatic Applied (Email):** Daftar riwayat email lamaran terkirim, status pengiriman, waktu, dan detail perusahaan.  
* **Tab 2 \- Manual Apply Hub (Non-Email / Portal Job):** Daftar rekomendasi loker portal web/ATS dengan informasi penting, *Direct Apply Link*, dan pembaruan status (*Belum Dilamar*, *Sudah Dilamar Manual*, *Disimpan*).  
* **Tab 3 \- Test Analytics:** Visualisasi grafik hasil tes Pauli & Kraepelin.  
* **Credit System UI:** Tampilan sisa kuota kredit pencarian/apply & riwayat transaksi (PAYG).

### F. WhatsApp Notification Gateway

* **Real-time Alert Dispatcher:** Integrasi WA Gateway (Fonnte/Wablas) untuk mengirim pesan otomatis:  
  * Notifikasi email lamaran berhasil terkirim.  
  * Notifikasi rekomendasi loker non-email baru beserta *Direct Apply Link*.

---

## 2\. Technical Engineering Roadmap (Timeline 6 Minggu)

Pengembangan dieksekusi dalam jangka waktu **6 Minggu** agar memastikan kualitas pengujian, kestabilan *scraping*, serta keamanan integrasi email & WhatsApp.

```
+-----------------------------------------------------------------------------------+
|                            ROADMAP TIMELINE (6 MINGGU)                            |
+-------------------+-----------------------------------+---------------------------+
| Minggu 1          | Foundation, Auth, CV & Kraepelin  | Frontend & Backend Setup  |
| Minggu 2          | Scraping Engine & AI Extraction   | Pipeline & Database       |
| Minggu 3          | Email Engine & Auto-Apply Queue   | AWS SES / Gmail OAuth     |
| Minggu 4          | Manual Hub & Credit System (PAYG) | UI Dashboard & Payment    |
| Minggu 5          | WhatsApp Gateway & Matching       | Notification & Scoring    |
| Minggu 6          | End-to-End Testing & Deployment   | Bug Fixing & Launch       |
+-------------------+-----------------------------------+---------------------------+
```

&nbsp;

---

### MINGGU 1: Core Foundation, Onboarding, & Psikotes Engine

#### Frontend (Client App)

* Setup project repository (Next.js/SvelteKit), Tailwind CSS, dan UI Component Library.  
* Pembuatan UI Halaman Auth: Register, Login, & Google OAuth button.  
* Pembuatan UI Onboarding: Upload CV (drag-and-drop), Form Data Diri, & Consent Modal.  
* Pembuatan UI Modul Tes Psikotes Pauli/Kraepelin interaktif (Keyboard listener, timer, & input numpad).

#### Backend (API & Database)

* Setup Server Repository (Node.js/Express atau Python/FastAPI), Database (PostgreSQL/MongoDB), & Redis Cache.  
* Implementasi Schema Database User, Profile, CV Storage (S3/Cloudinary bucket), & Privacy Logs.  
* Implementasi Authentication System (JWT Access/Refresh Token & OAuth 2.0 Google).  
* Implementasi Logika Kraepelin/Pauli Scoring Engine (Kalkulasi Kecepatan, Ketelitian, Kestabilan, Puncak).  
* Implementasi Endpoint PDF Generator untuk membuat Sertifikat Hasil Tes Psikotes.

---

### MINGGU 2: Web Scraping & Dual-Path AI Extraction Engine

#### Frontend (Client App)

* Pembuatan UI Prototype/Mockup untuk melihat hasil *scrape* loker mentah.  
* UI Form Filter Preferensi Pencarian Kerja (Posisi target, Lokasi, Tipe Pekerjaan).

#### Backend (API & Database)

* Setup Worker Service berbasis Playwright/Puppeteer dengan *stealth plugin*.  
* Integrasi Proxy Rotator (Residential Proxy) untuk menghindari blokir anti-bot/Cloudflare.  
* Integrasi Google Gemini API (Multimodal) untuk mendeteksi & mengekstrak gambar poster/halaman loker menjadi JSON terstruktur.  
* Implementasi Dual-Path Data Router: Memisahkan secara otomatis lowongan tipe `EMAIL` dan tipe `WEBSITE_PORTAL`.  
* Pengujian konsistensi ekstraksi data pada 100 poster/tautan lowongan variatif.

---

### MINGGU 3: Email Automation & Auto-Apply Queue

#### Frontend (Client App)

* Pembuatan UI Setting Integrasi Email (Opsi pilih Gmail OAuth pribadi vs Subdomain platform).  
* Pembuatan UI Preview Template Cover Letter yang digenerate oleh AI.

#### Backend (API & Database)

* Setup AWS SES / Mailgun Service lengkap dengan konfigurasi DNS (SPF, DKIM, DMARC) di subdomain platform.  
* Integrasi Gmail OAuth API untuk izin pengiriman via email pribadi pengguna.  
* Implementasi BullMQ / Redis Queue untuk antrean pengiriman email otomatis.  
* Implementasi *Delay Jitter System* (pengiriman berjadwal acak 3-15 menit) untuk proteksi spam flagging.  
* AI Cover Letter Generator Service (menggunakan Gemini API untuk menyusun isi email dinamis berdasarkan CV vs Loker).  
* Auto-Attachment Handler (Otomatis menggabungkan CV PDF \+ Sertifikat Psikotes PDF).

---

### MINGGU 4: Dual-Path Dashboard Hub & PAYG Credit System

#### Frontend (Client App)

* Pembuatan Dashboard Utama:  
  * **Tab 1:** Tabel Riwayat Lamaran Otomatis (Email) \+ Filter Status Delivery.  
  * **Tab 2:** Card/Grid View Loker Non-Email (Manual Apply Hub) dengan tombol *Direct Apply Link* & Toggle Status (*Belum Dilamar*, *Sudah Dilamar*, *Disimpan*).  
  * **Tab 3:** Analytics Chart Hasil Psikotes (Menggunakan Chart.js / Recharts).  
* Pembuatan UI Widget Credit Balance (Sisa Kredit) & Modal Top-Up Kredit.

#### Backend (API & Database)

* Implementasi CRUD API untuk Dashboard Data (Fetch Applied Jobs & Manual Hub Jobs).  
* Implementasi API Update Status Loker Manual oleh pengguna.  
* Implementasi Logic System Kredit PAYG (Potong 1 kredit per pencarian/lamaran).  
* Integrasi Payment Gateway lokal (Midtrans / Xendit) untuk top-up paket kredit token.  
* Implementasi *Free Trial Credit Allocator* (Auto-assign 10 kredit gratis saat onboarding selesai).

---

### MINGGU 5: WhatsApp Gateway & Matching Score Engine

#### Frontend (Client App)

* Pembuatan UI Integrasi & Verifikasi Nomor WhatsApp (OTP / Test Message).  
* Pembuatan UI Setting Notifikasi (Toggle Notifikasi WA untuk Lamaran Email & Loker Non-Email).  
* Integrasi Badge *Matching Score* (%) di setiap kartu lowongan pekerjaan.

#### Backend (API & Database)

* Integrasi WhatsApp Gateway API (Fonnte / Wablas) untuk pengiriman pesan otomatis.  
* Setup Event Trigger:  
  * Trigger 1: Kirim WA saat email lamaran berhasil terkirim.  
  * Trigger 2: Kirim WA Rangkuman Rekomendasi Loker Non-Email harian/real-time.  
* Implementasi AI Vector Similarity / LLM Matching Score Engine (Membandingkan kualifikasi CV dengan teks lowongan).

---

### MINGGU 6: End-to-End Integration, Testing, & MVP Launch

#### Frontend (Client App)

* Responsive UI Polish (Optimasi tampilan Mobile Web/Smartphone).  
* Error Boundary & Toast Notification handling (Menampilkan notifikasi error/sukses yang jelas).  
* Performance Optimization (Lazy loading, Caching UI, & Asset compression).

#### Backend (API & Database)

* End-to-End Integration Testing (Simulasi dari registrasi \-\> Tes Psikotes \-\> Scrape \-\> Auto Email \-\> Status Dashboard \-\> Notifikasi WA).  
* Load Testing & Scraping Fail-Safe Handler (Handling jika link loker mati atau email bounce).  
* Deployment Infrastruktur ke Production Environment (VPS, Database, Redis, Domain Setup).  
* Soft Launching & Monitoring Logs.