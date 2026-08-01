# QRkuy 🔥

QR code generator modern dengan gaya brutalist — bikin QR keren dalam hitungan detik. Dibuat dengan React + TypeScript + Vite + Tailwind CSS v4.

## Fitur

### Generate
- **QR Code instan** — teks, URL, Wi-Fi, kontak, dan lainnya
- **Customisasi penuh**:
  - Warna dot & background (termasuk background transparan)
  - Bentuk dot: rounded, square, dot
  - Bentuk eye: square, rounded, dot, extra-rounded
  - Gradient, frame, logo teks, logo gambar (upload), hati ❤️
  - Quiet zone adjustable (0–10 module)
  - Ukuran & error correction level (L/M/Q/H)
- **Template siap pakai** (17+):
  - URL, Wi-Fi, WhatsApp, Email, SMS, Telepon, Geo
  - vCard, MeCard, Event
  - QRIS, Crypto (Bitcoin/Litecoin/Ethereum/TRON), Lightning Invoice, PayPal, UPI
  - Bluetooth pairing, App Store / Play Store
- **QR Themes** — preset warna siap pakai + **color-blind safe palettes** (WCAG AA)
- **Accessibility checker** — validasi kontras otomatis (WCAG AA 4.5:1)
- **QR capacity meter** — versi QR, % kapasitas terpakai, kapasitas max per ECC level

### Export
- PNG, SVG, PDF, Print
- Salin gambar ke clipboard, salin teks
- Share via Web Share API
- Embed snippet (HTML / Markdown)
- Link QR shareable — semua pengaturan disimpan di URL (`?text=...&fg=...&bg=...`)

### Batch
- Generate banyak QR sekaligus (satu per baris)
- **Upload CSV** untuk batch generation
- Export ZIP (JSZip) atau PDF (jsPDF)
- Progress bar real-time

### Scan
- Scan QR pakai kamera (Barcode Detection API)
- Torch / senter toggle
- Upload gambar QR untuk discan
- Paste QR dari clipboard
- Langsung buat QR baru dari hasil scan

### Lainnya
- Riwayat QR tersimpan di localStorage (hapus per item atau hapus semua)
- Dark mode
- URL params sync — bagikan link QR dengan semua pengaturan
- Responsive mobile-first

## Tech Stack

- **React 19** + TypeScript
- **Vite** (build cepat, lazy-loaded tabs)
- **Tailwind CSS v4**
- **qrcode-generator** — engine QR
- **jsQR** — scanning fallback
- **jszip** — batch ZIP export
- **jspdf** — PDF export
- **lucide-react** — icons

## Cara Pakai

```bash
npm install
npm run dev        # development
npm run build      # production build
npm run preview    # preview build
```

## URL Parameters

Semua pengaturan QR bisa dibagikan lewat URL:

| Param | Deskripsi |
|---|---|
| `text` | Konten QR |
| `fg` | Warna dot (hex) |
| `bg` | Warna background (hex) |
| `style` | Bentuk dot: `rounded`, `square`, `dot` |
| `corner` | Bentuk eye: `square`, `rounded`, `dot`, `extra-rounded` |
| `transp` | Background transparan (`1`) |
| `quiet` | Quiet zone (0–10) |
| `size` | Ukuran QR (px) |
| `ecc` | Error correction: `L`, `M`, `Q`, `H` |
| `grad` | Gradient color (hex) |
| `frame` | Frame (`1`) |
| `heart` | Hati (`1`) |
| `logo` | Teks logo |

Contoh:
```
https://qrkuy.vercel.app/?text=https://github.com/ranggacey&fg=%23000000&style=rounded&corner=dot
```

## Struktur

```
src/
├── App.tsx                 # Main app — generate, export, URL sync
├── lib/
│   ├── qr.ts               # QR engine wrapper — drawQR, getQRMeta, corner styles
│   ├── templates.ts        # Template & theme definitions
│   ├── export.ts           # Export helpers — SVG/PDF/PNG/ZIP, parseCSV, accessibility
│   └── utils.ts
└── components/
    ├── HistoryTab.tsx      # Riwayat QR
    ├── ScanTab.tsx         # Scan kamera/gambar/clipboard
    └── TemplateTab.tsx     # Template & batch generation
```

## Evolusi

Riwayat lengkap perkembangan ada di [`EVOLUTION.md`](EVOLUTION.md).

---

Dibuat oleh [@ranggacey](https://github.com/ranggacey) dengan 🔥
