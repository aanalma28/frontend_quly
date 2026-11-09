# Frontend → Backend Checklist — Superadmin User Management & Billing Management

Dokumen ini dipakai untuk mengecek apakah kebutuhan frontend pada menu:

- `/superadmin/users`
- `/superadmin/billing`

sudah tersedia di backend production.

Base URL production:

```text
https://api.quly.web.id/api
```

Frontend saat ini sudah diarahkan ke API production melalui:

```env
IS_PRODUCTION=true
BACKEND_API_URL_PROD=https://api.quly.web.id
```

---

## 1. Endpoint yang sudah dipakai frontend

| Menu | Method | Endpoint | Dipakai untuk | Status |
|---|---|---|---|---|
| User Management | `GET` | `/api/superadmin/users` | List user + filter + pagination | Sudah ada |
| User Management | `GET` | `/api/superadmin/users/stats` | KPI user + statistik aplikasi global | Sudah ada |
| User Management | `GET` | `/api/superadmin/users/:userId` | Detail user + recent applications | Sudah ada |
| User Management | `PATCH` | `/api/superadmin/users/:userId/role` | Ubah role user | Sudah ada |
| Billing Management | `GET` | `/api/superadmin/billing/overview` | KPI billing + statistik global | Sudah ada |
| Billing Management | `GET` | `/api/superadmin/billing/users` | List billing user + filter + pagination | Sudah ada |
| Billing Management | `GET` | `/api/superadmin/billing/users/:userId` | Detail billing user + recent applications | Sudah ada |
| Billing Management | `PATCH` | `/api/superadmin/billing/users/:userId/quotas` | Atur kuota, PAYG, kredit | Sudah ada |
| Billing Management | `PUT` | `/api/superadmin/billing/users/:userId/subscription` | Assign/renew subscription | Sudah ada |
| Keduanya | `GET` | `/api/superadmin/packages` | Sumber kuota paket untuk tampilan frontend | Sudah ada |

Catatan: frontend saat ini memakai `/api/superadmin/packages` sebagai koreksi tampilan kuota Free Plan karena response user/billing masih mengirim `monthlyQuota: 20`.

---

## 2. Temuan pengecekan production

Pengecekan terakhir terhadap API production:

- Total user: 9
- Job Seeker: 7
- Admin: 1
- Super Admin: 1
- Semua user saat ini: `FREE_PLAN`
- Subscription aktif: 0
- Aplikasi/lamaran: 0 di semua endpoint

### 2.1 Kuota Free Plan tidak konsisten

Response `/api/superadmin/users` dan `/api/superadmin/billing/users` mengirim:

```json
{
  "monthlyQuota": 20,
  "monthlyUsed": 0,
  "monthlyRemaining": 20
}
```

Tetapi kuota paket Free Plan di `/api/superadmin/packages` adalah:

```json
{
  "emailApplications": 5
}
```

Frontend akhirnya memakai kuota paket dari `/superadmin/packages`, bukan `profile.monthlyQuota`, sehingga tampilan menjadi:

```text
5 / 5 lamaran tersisa
```

Backend perlu memutuskan sumber resmi kuota:

1. `Profile.monthlyQuota`, atau
2. `benefitQuotas.EMAIL_APPLICATION`, atau
3. kuota paket aktif.

Frontend butuh satu sumber yang konsisten untuk list, detail, dan statistik.

### 2.2 Aplikasi/lamaran masih 0 di semua response

Response production saat ini:

```json
{
  "applications": {
    "total": 0,
    "byStatus": {
      "PENDING": 0,
      "SENT": 0,
      "REPLIED": 0,
      "FAILED": 0
    },
    "byChargeType": {
      "MONTHLY_QUOTA": 0,
      "PAYG": 0
    },
    "replyRate": 0,
    "lastApplicationAt": null
  }
}
```

Ini muncul di:

- `/api/superadmin/users`
- `/api/superadmin/users/stats`
- `/api/superadmin/billing/overview`
- `/api/superadmin/billing/users`

Perlu dipastikan apakah angka 0 ini memang benar-benar sesuai database, atau backend masih membaca tabel lama `applications` sementara Auto-Apply menyimpan data ke `job_applications`.

Dari source backend yang tersedia, statistik aplikasi membaca:

```text
prisma.application
```

Sedangkan fitur Auto-Apply memakai:

```text
job_applications
```

Jika production memiliki data di `job_applications`, maka endpoint superadmin **belum sinkron**.

---

## 3. Field yang dibutuhkan frontend

### 3.1 `GET /api/superadmin/users`

Sudah tersedia:

- `id`
- `email`
- `role`
- `tier`
- `billingStatus`
- `profile`
- `account`
- `subscription`
- `applications`
- `quotas`
- `counts`

Tambahan yang dibutuhkan:

| Field | Kebutuhan |
|---|---|
| `benefitQuotas` | Kuota benefit authoritative per user, minimal `EMAIL_APPLICATION` |
| `subscription.pendingPackage` | Untuk menampilkan downgrade terjadwal |
| `subscription.pendingStartAt` | Tanggal paket pending mulai aktif |
| `applications.byStatus.READ` | Auto-Apply punya status `READ`; saat ini frontend hanya menerima `PENDING/SENT/REPLIED/FAILED` |

Contoh tambahan yang diharapkan:

```json
{
  "quotas": {
    "monthlyQuota": 5,
    "monthlyUsed": 0,
    "monthlyRemaining": 5,
    "quotaResetAt": "2026-11-09T05:03:59.780Z",
    "paygBalance": 0,
    "creditBalance": 0,
    "monthlyTestQuota": 1,
    "monthlyTestUsed": 0,
    "monthlyTestRemaining": 1,
    "testQuotaResetAt": "2026-11-09T05:03:59.780Z"
  },
  "benefitQuotas": [
    {
      "code": "EMAIL_APPLICATION",
      "limit": 5,
      "used": 0,
      "remaining": 5,
      "freeLifetimeLimit": 0,
      "freeLifetimeUsed": 0,
      "freeLifetimeRemaining": 0,
      "resetAt": "2026-11-09T05:03:59.780Z"
    }
  ],
  "subscription": {
    "status": "ACTIVE",
    "pendingPackage": null,
    "pendingStartAt": null
  }
}
```

### 3.2 `GET /api/superadmin/users/stats`

Sudah dipakai frontend untuk card:

- Total user
- Job Seeker
- Admin
- Super Admin
- Email terverifikasi
- Total lamaran
- Status lamaran
- Reply rate
- User yang pernah melamar
- Rata-rata lamaran per user
- Lamaran terakhir
- Kuota bulanan vs PAYG

Yang perlu dipastikan backend:

| Pertanyaan | Kebutuhan |
|---|---|
| Sumber `applications` | `applications` atau `job_applications`? |
| Definisi `replyRate` | `REPLIED / total × 100`? |
| Status `READ` | Dihitung sebagai `SENT`, atau ditambahkan sebagai status sendiri? |
| `usersWithApplications` | Berdasarkan data lamaran yang benar? |
| `averagePerUser` | Total lamaran / total user? |

### 3.3 `GET /api/superadmin/billing/overview`

Field yang sudah tersedia dan dipakai:

- `users.activeSubscribers`
- `subscriptions.total`
- `subscriptions.expired`
- `subscriptions.cancelled`
- `subscriptions.expiring7Days`
- `subscriptions.expiring30Days`
- `revenue.activeSubscriptionValueIdr`
- `revenue.averageActiveSubscriptionValueIdr`
- `revenue.paygApplications`
- `revenue.paygConsumedValueIdr`
- `revenue.estimatedBillingValueIdr`
- `quotas.monthlyApplicationsUsed`
- `quotas.totalPaygBalance`
- `quotas.totalCreditBalance`
- `applications.byStatus`
- `applications.byChargeType`
- `applications.replyRate`

Pertanyaan untuk backend:

1. Apakah `subscriptions.total` menghitung semua row subscription, termasuk expired/cancelled?
2. Apakah data subscription yang sudah lewat `endDate` sudah diproses menjadi `EXPIRED` sebelum overview dibuat?
3. Apakah `monthlyApplicationsUsed` berasal dari field yang sama dengan kuota per user?
4. Apakah `totalPaygBalance` dan `totalCreditBalance` memang field yang berbeda di database?

### 3.4 `GET /api/superadmin/billing/users`

Sudah tersedia:

- `userId`
- `email`
- `role`
- `fullName`
- `tier`
- `billingStatus`
- `subscription`
- `quotas`
- `applications`
- `billing`
- `account`

Tambahan yang dibutuhkan:

- `benefitQuotas` atau kuota benefit authoritative
- `subscription.pendingPackage`
- `subscription.pendingStartAt`
- `applications.byStatus.READ`
- `paymentSummary` jika billing harus menampilkan pembayaran aktual

### 3.5 Detail user dan detail billing

Endpoint detail sudah menyediakan `recentApplications`.

Yang perlu dipastikan:

- Apakah `recentApplications` berasal dari `applications` atau `job_applications`?
- Apakah field status `READ` disertakan?
- Apakah `recentApplications` memiliki `chargeType` yang valid?

---

## 4. Utilitas/aksi yang dipakai frontend

Bagian ini adalah checklist lengkap untuk memastikan **semua aksi**, bukan hanya data tampilan, sudah didukung backend.

### 4.1 User Management — utilitas

| Utilitas | Endpoint | Parameter/body | Status yang dicek |
|---|---|---|---|
| Load daftar user | `GET /api/superadmin/users` | `search`, `role`, `tier`, `subscriptionStatus`, `emailVerified`, `onboardingCompleted`, `page`, `limit` | Sudah ada |
| Load statistik global | `GET /api/superadmin/users/stats` | — | Sudah ada |
| Load detail user | `GET /api/superadmin/users/:userId` | — | Sudah ada |
| Load recent applications | Termasuk response detail user | `recentApplications` | Sudah ada, perlu dicek sumber tabelnya |
| Ubah role user | `PATCH /api/superadmin/users/:userId/role` | `{ "role": "ADMIN" }` | Sudah ada |

Catatan role:

- Superadmin tidak boleh mengubah role dirinya sendiri.
- Superadmin terakhir tidak boleh diturunkan.
- Frontend perlu response role terbaru dan `updatedAt`.

### 4.2 Billing Management — utilitas

| Utilitas | Endpoint | Parameter/body | Status yang dicek |
|---|---|---|---|
| Load overview billing | `GET /api/superadmin/billing/overview` | — | Sudah ada |
| Load daftar billing user | `GET /api/superadmin/billing/users` | `search`, `billingStatus`, `tier`, `role`, `packageId`, `page`, `limit` | Sudah ada |
| Load detail billing user | `GET /api/superadmin/billing/users/:userId` | — | Sudah ada |
| Load recent applications | Termasuk response detail billing user | `recentApplications` | Sudah ada, perlu dicek sumber tabelnya |
| **Update kuota email/tes** | `PATCH /api/superadmin/billing/users/:userId/quotas` | `monthlyQuota`, `monthlyUsed`, `monthlyTestQuota`, `monthlyTestUsed` | Sudah ada |
| **Update saldo PAYG** | `PATCH /api/superadmin/billing/users/:userId/quotas` | `paygBalance` | Sudah ada |
| **Update saldo kredit AI** | `PATCH /api/superadmin/billing/users/:userId/quotas` | `creditBalance` | Sudah ada |
| **Update tanggal reset kuota** | `PATCH /api/superadmin/billing/users/:userId/quotas` | `quotaResetAt`, `testQuotaResetAt` | Sudah ada |
| **Assign/renew langganan** | `PUT /api/superadmin/billing/users/:userId/subscription` | `packageId`, `startDate`, `endDate`, `status`, `extendDays`, `resetUsage` | Sudah ada |

#### Body update kuota, PAYG, dan kredit

Frontend mengirim hanya field yang diubah, minimal satu field:

```json
{
  "monthlyQuota": 5,
  "monthlyUsed": 0,
  "monthlyTestQuota": 1,
  "monthlyTestUsed": 0,
  "paygBalance": 0,
  "creditBalance": 0,
  "quotaResetAt": "2026-11-01T00:00:00.000Z",
  "testQuotaResetAt": "2026-11-01T00:00:00.000Z"
}
```

Yang perlu dikonfirmasi backend:

1. Apakah update `monthlyQuota` juga memperbarui kuota benefit `EMAIL_APPLICATION` di `benefitQuotas`, atau hanya `Profile.monthlyQuota`?
2. Apakah update `creditBalance` mengubah `User.creditBalance`?
3. Apakah update `paygBalance` mengubah `Profile.paygBalance`?
4. Jika admin mengubah kuota Free Plan dari 5 ke nilai lain, apakah frontend akan melihat nilai baru dari endpoint baca setelahnya?
5. Apakah tanggal reset menggunakan timezone yang sama dengan frontend?
6. Apakah response mutation mengembalikan detail user terbaru?

#### Body assign/renew langganan

```json
{
  "packageId": "20000000-0000-4000-8000-000000000003",
  "startDate": "2026-11-09T00:00:00.000Z",
  "endDate": "2026-12-09T23:59:59.000Z",
  "status": "ACTIVE",
  "extendDays": 0,
  "resetUsage": true
}
```

Yang perlu dikonfirmasi backend:

1. Apakah assign/renew langsung mengubah `subscriptionTier`, kuota email, kuota tes, dan benefit quotas?
2. Apakah `resetUsage=true` mereset `monthlyUsed`, `monthlyTestUsed`, dan benefit usage?
3. Apakah `extendDays` diprioritaskan atau bertabrakan dengan `endDate`?
4. Apakah downgrade disimpan sebagai `pendingPackage` dan `pendingStartAt`, bukan langsung mengganti paket aktif?
5. Apakah response mutation mengembalikan detail billing user terbaru?

### 4.3 Utilitas yang belum ada di frontend / belum diminta backend

Saat ini frontend **belum** memiliki tombol untuk:

- melihat riwayat payment aktual per user
- refund payment
- membuat payment manual
- membatalkan pending downgrade
- reset password user
- menghapus user
- impersonate user

Jika backend membutuhkan salah satu utilitas tersebut, endpoint dan aturan aksesnya perlu ditambahkan terlebih dahulu.

---

## 5. Endpoint yang belum ada / perlu diputuskan

### 5.1 Payment history untuk Billing Management

Saat ini `billing/overview` adalah **estimasi**, bukan total pembayaran aktual dari tabel `payments`.

Jika Billing Management harus menampilkan pembayaran aktual, frontend membutuhkan endpoint atau field berikut:

**Opsi A — tambahan di overview:**

```json
{
  "payments": {
    "totalPaidIdr": 150000,
    "totalPendingIdr": 39000,
    "totalFailedIdr": 0,
    "totalRefundedIdr": 0,
    "lastPaidAt": "2026-11-09T05:00:00.000Z",
    "byStatus": {
      "PENDING": 1,
      "PAID": 5,
      "FAILED": 0,
      "EXPIRED": 0,
      "REFUNDED": 0
    }
  }
}
```

**Opsi B — endpoint baru:**

```http
GET /api/superadmin/billing/payments
```

Dengan filter:

```text
search
status
type (SUBSCRIPTION | CREDIT_TOPUP)
page
limit
```

Dan detail user:

```json
{
  "paymentSummary": {
    "totalPaidIdr": 79000,
    "lastPaidAt": "2026-11-09T05:00:00.000Z",
    "lastOrderId": "ORDER-...",
    "recentPayments": []
  }
}
```

### 5.2 Kuota benefit per user untuk superadmin

Frontend tidak bisa meminta `/benefits/me` untuk user lain karena endpoint tersebut hanya untuk user yang login.

Dibutuhkan salah satu:

- `benefitQuotas` di response `/superadmin/users` dan `/billing/users`
- endpoint baru:
  ```http
  GET /api/superadmin/users/:userId/benefits
  ```

Minimal kuota yang perlu tersedia:

```json
{
  "code": "EMAIL_APPLICATION",
  "limit": 5,
  "used": 0,
  "remaining": 5,
  "freeLifetimeLimit": 0,
  "freeLifetimeUsed": 0,
  "freeLifetimeRemaining": 0,
  "resetAt": "..."
}
```

---

## 6. Pertanyaan langsung untuk backend

Tolong jawab dengan status **sudah / belum / akan ditambahkan**:

1. Apakah `GET /api/superadmin/users/stats` membaca `applications` atau `job_applications`?
2. Apakah angka `applications.total = 0` di production memang benar dari database?
3. Apakah status `READ` pada `job_applications` ikut dihitung?
4. Apakah `monthlyQuota` seharusnya diambil dari `Profile` atau dari `benefitQuotas`/paket?
5. Apakah ada endpoint untuk mengambil kuota benefit user lain sebagai superadmin?
6. Apakah `billing/overview` boleh dianggap estimasi, atau akan ditambah data `payments` aktual?
7. Apakah ada endpoint payment history khusus superadmin?
8. Apakah subscription expiry sudah dijalankan sebelum data overview/list dikirim?
9. Apakah `pendingPackage` dan `pendingStartAt` bisa ditambahkan ke response user/billing?
10. Apakah `byChargeType` untuk Auto-Apply berasal dari field yang benar? `job_applications` tidak memiliki `chargeType` secara langsung.

---

## 7. Checklist verifikasi setelah backend update

- [ ] Free Plan menampilkan `5 / 5 lamaran tersisa`
- [ ] Tidak ada lagi `20 / 20` untuk Free Plan
- [ ] Total user di stats = total user di list
- [ ] Total lamaran di overview = total lamaran di list
- [ ] Status `PENDING/SENT/READ/REPLIED/FAILED` konsisten
- [ ] `replyRate` sesuai data lamaran
- [ ] `usersWithApplications` sesuai data
- [ ] `monthlyApplicationsUsed` sesuai total pemakaian user
- [ ] `paygBalance` dan `creditBalance` tidak tertukar
- [ ] Subscription expired langsung berstatus expired
- [ ] `pendingPackage` tampil jika downgrade terjadwal
- [ ] Billing aktual (jika diminta) sama dengan tabel `payments`
- [ ] Detail user dan detail billing menampilkan `recentApplications` yang sama dengan riwayat Auto-Apply
- [ ] Update role user berhasil dan langsung terlihat di list/detail
- [ ] Update kuota email/tes berhasil dan angka list/detail berubah
- [ ] Update saldo PAYG berhasil
- [ ] Update saldo kredit AI berhasil
- [ ] Update tanggal reset kuota berhasil
- [ ] Assign/renew langganan mengubah paket, tier, status, tanggal, dan kuota
- [ ] `resetUsage=true` mereset pemakaian bulanan dan tes

---

## 8. Prioritas

### P0 — wajib agar data tidak terlihat salah

- Sumber kuota email yang authoritative
- Update kuota harus mengubah sumber kuota yang benar-benar dipakai user, bukan hanya `Profile.monthlyQuota`
- Sumber data `applications` yang benar (`job_applications` vs `applications`)
- Status `READ` pada aplikasi
- Subscription effective status setelah expiry

### P1 — penting untuk kelengkapan billing

- `pendingPackage` dan `pendingStartAt`
- Payment summary/payment history aktual
- `benefitQuotas` di endpoint superadmin
- Pastikan update `creditBalance` dan `paygBalance` terpisah dan konsisten
- Pastikan assign/renew subscription memperbarui tier, kuota, dan benefit quotas secara sinkron

### P2 — opsional

- Endpoint terpisah `/api/superadmin/users/:userId/benefits`
- Endpoint terpisah `/api/superadmin/billing/payments`
- Filter tambahan untuk payment history
