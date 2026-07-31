export type QRTemplates = 
  | 'url' 
  | 'wifi' 
  | 'vcard' 
  | 'event' 
  | 'email' 
  | 'sms' 
  | 'tel' 
  | 'geo' 
  | 'whatsapp' 
  | 'social'
  | 'qris'
  | 'crypto'
  | 'lightning'

export interface TemplateField {
  key: string
  label: string
  type: 'text' | 'email' | 'tel' | 'url' | 'textarea' | 'select' | 'number' | 'color'
  required?: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
  default?: string
  step?: string
}

export interface QRTemplate {
  id: QRTemplates
  label: string
  icon: string
  description: string
  fields: TemplateField[]
  build: (data: Record<string, string>) => string
}

export const QR_TEMPLATES: QRTemplate[] = [
  {
    id: 'lightning',
    label: 'Lightning Invoice',
    icon: '⚡️',
    description: 'Bitcoin Lightning invoice QR for fast payments',
    fields: [
      { key: 'invoice', label: 'Invoice', type: 'text', required: true, placeholder: 'lnbc1...'}
    ],
    build: ({ invoice }) => `lightning:${invoice}`,
  },
  {
    id: 'url',
    label: 'Website/URL',
    icon: '🌐',
    description: 'Link ke website, landing page, dsb',
    fields: [
      { key: 'url', label: 'URL', type: 'url', required: true, placeholder: 'https://example.com' },
    ],
    build: ({ url }) => url,
  },
  {
    id: 'wifi',
    label: 'WiFi',
    icon: '📶',
    description: 'Koneksi WiFi otomatis (Android/iOS)',
    fields: [
      { key: 'ssid', label: 'Nama WiFi (SSID)', type: 'text', required: true, placeholder: 'MyWiFi' },
      { key: 'password', label: 'Password', type: 'text', required: false, placeholder: 'password123' },
      { key: 'encryption', label: 'Enkripsi', type: 'select', required: true, default: 'WPA', options: [
        { value: 'WPA', label: 'WPA/WPA2/WPA3' },
        { value: 'WEP', label: 'WEP' },
        { value: 'nopass', label: 'Tanpa Password' },
      ]},
      { key: 'hidden', label: 'Hidden SSID', type: 'select', default: 'false', options: [
        { value: 'false', label: 'Tidak' },
        { value: 'true', label: 'Ya' },
      ]},
    ],
    build: ({ ssid, password, encryption, hidden }) => 
      `WIFI:T:${encryption};S:${ssid};P:${password || ''};H:${hidden};;`,
  },
  {
    id: 'vcard',
    label: 'vCard (Kontak)',
    icon: '👤',
    description: 'Simpan kontak ke phonebook',
    fields: [
      { key: 'name', label: 'Nama Lengkap', type: 'text', required: true, placeholder: 'John Doe' },
      { key: 'phone', label: 'Telepon', type: 'tel', placeholder: '+628123456789' },
      { key: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com' },
      { key: 'org', label: 'Perusahaan', type: 'text', placeholder: 'PT. Contoh' },
      { key: 'title', label: 'Jabatan', type: 'text', placeholder: 'Software Engineer' },
      { key: 'address', label: 'Alamat', type: 'textarea', placeholder: 'Jl. Contoh No. 123' },
      { key: 'url', label: 'Website', type: 'url', placeholder: 'https://example.com' },
      { key: 'note', label: 'Catatan', type: 'textarea', placeholder: 'Catatan tambahan' },
    ],
    build: (data) => {
      const escape = (s: string) => s.replace(/[,\n;]/g, c => ({ ',': '\\,', '\n': '\\n', ';': '\\;' }[c]!))
      const parts = ['BEGIN:VCARD', 'VERSION:3.0']
      if (data.name) parts.push(`FN:${escape(data.name)}`)
      if (data.phone) parts.push(`TEL:${escape(data.phone)}`)
      if (data.email) parts.push(`EMAIL:${escape(data.email)}`)
      if (data.org) parts.push(`ORG:${escape(data.org)}`)
      if (data.title) parts.push(`TITLE:${escape(data.title)}`)
      if (data.address) parts.push(`ADR:${escape(data.address)}`)
      if (data.url) parts.push(`URL:${escape(data.url)}`)
      if (data.note) parts.push(`NOTE:${escape(data.note)}`)
      parts.push('END:VCARD')
      return parts.join('\n')
    },
  },
  {
    id: 'event',
    label: 'Event/Kalender',
    icon: '📅',
    description: 'Tambah ke kalender (iCal/Google Calendar)',
    fields: [
      { key: 'title', label: 'Judul Event', type: 'text', required: true, placeholder: 'Meeting Team' },
      { key: 'description', label: 'Deskripsi', type: 'textarea', placeholder: 'Agenda meeting...' },
      { key: 'location', label: 'Lokasi', type: 'text', placeholder: 'Ruang Rapat A / Zoom' },
      { key: 'start', label: 'Mulai', type: 'text', required: true, placeholder: '2026-08-15T10:00:00' },
      { key: 'end', label: 'Selesai', type: 'text', required: true, placeholder: '2026-08-15T11:00:00' },
      { key: 'timezone', label: 'Timezone', type: 'text', default: 'Asia/Jakarta', placeholder: 'Asia/Jakarta' },
    ],
    build: (data) => {
      const fmt = (d: string) => d.replace(/[-:]/g, '').replace('T', 'T') + 'Z'
      return [
        'BEGIN:VEVENT',
        `SUMMARY:${data.title}`,
        data.description ? `DESCRIPTION:${data.description}` : '',
        data.location ? `LOCATION:${data.location}` : '',
        `DTSTART:${fmt(data.start)}`,
        `DTEND:${fmt(data.end)}`,
        `TZID:${data.timezone || 'UTC'}`,
        'END:VEVENT',
      ].filter(Boolean).join('\n')
    },
  },
  {
    id: 'email',
    label: 'Email',
    icon: '📧',
    description: 'Buka email client dengan isi terisi',
    fields: [
      { key: 'to', label: 'Ke', type: 'email', required: true, placeholder: 'recipient@example.com' },
      { key: 'cc', label: 'CC', type: 'email', placeholder: 'cc@example.com' },
      { key: 'subject', label: 'Subjek', type: 'text', placeholder: 'Halo!' },
      { key: 'body', label: 'Isi', type: 'textarea', placeholder: 'Halo, ini pesan dari QR...' },
    ],
    build: ({ to, cc, subject, body }) => {
      const params = new URLSearchParams()
      if (cc) params.set('cc', cc)
      if (subject) params.set('subject', subject)
      if (body) params.set('body', body)
      return `mailto:${to}${params.toString() ? '?' + params.toString() : ''}`
    },
  },
  {
    id: 'sms',
    label: 'SMS',
    icon: '💬',
    description: 'Buka aplikasi SMS dengan nomor & pesan',
    fields: [
      { key: 'phone', label: 'Nomor Tujuan', type: 'tel', required: true, placeholder: '+628123456789' },
      { key: 'body', label: 'Pesan', type: 'textarea', placeholder: 'Halo dari QRkuy!' },
    ],
    build: ({ phone, body }) => `sms:${phone}${body ? '?body=' + encodeURIComponent(body) : ''}`,
  },
  {
    id: 'tel',
    label: 'Telepon',
    icon: '📞',
    description: 'Buka dialer dengan nomor terisi',
    fields: [
      { key: 'phone', label: 'Nomor Telepon', type: 'tel', required: true, placeholder: '+628123456789' },
    ],
    build: ({ phone }) => `tel:${phone}`,
  },
  {
    id: 'geo',
    label: 'Lokasi (Maps)',
    icon: '📍',
    description: 'Buka Google Maps / Apple Maps di koordinat',
    fields: [
      { key: 'lat', label: 'Latitude', type: 'number', required: true, placeholder: '-6.2088', step: 'any' },
      { key: 'lng', label: 'Longitude', type: 'number', required: true, placeholder: '106.8456', step: 'any' },
      { key: 'label', label: 'Label', type: 'text', placeholder: 'Kantor Saya' },
      { key: 'query', label: 'Query Pencarian', type: 'text', placeholder: 'Jl. Sudirman, Jakarta' },
    ],
    build: ({ lat, lng, label, query }) => {
      const coords = `${lat},${lng}`
      if (query) return `geo:0,0?q=${encodeURIComponent(query)}`
      return label ? `geo:${coords}?q=${encodeURIComponent(label)}@${coords}` : `geo:${coords}`
    },
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: '💚',
    description: 'Buka chat WhatsApp dengan pesan otomatis',
    fields: [
      { key: 'phone', label: 'Nomor (dengan kode negara)', type: 'tel', required: true, placeholder: '628123456789' },
      { key: 'message', label: 'Pesan Otomatis', type: 'textarea', placeholder: 'Halo, saya mau tanya...' },
    ],
    build: ({ phone, message }) => `https://wa.me/${phone.replace(/\D/g, '')}${message ? '?text=' + encodeURIComponent(message) : ''}`,
  },
  {
    id: 'social',
    label: 'Media Sosial',
    icon: '📱',
    description: 'Link ke profil sosial media',
    fields: [
      { key: 'platform', label: 'Platform', type: 'select', required: true, default: 'instagram', options: [
        { value: 'instagram', label: 'Instagram' },
        { value: 'twitter', label: 'X (Twitter)' },
        { value: 'linkedin', label: 'LinkedIn' },
        { value: 'tiktok', label: 'TikTok' },
        { value: 'github', label: 'GitHub' },
        { value: 'youtube', label: 'YouTube' },
        { value: 'facebook', label: 'Facebook' },
      ]},
      { key: 'username', label: 'Username', type: 'text', required: true, placeholder: 'username' },
    ],
    build: ({ platform, username }) => {
      const urls: Record<string, string> = {
        instagram: `https://instagram.com/${username}`,
        twitter: `https://x.com/${username}`,
        linkedin: `https://linkedin.com/in/${username}`,
        tiktok: `https://tiktok.com/@${username}`,
        github: `https://github.com/${username}`,
        youtube: `https://youtube.com/@${username}`,
        facebook: `https://facebook.com/${username}`,
      }
      return urls[platform] || `https://${platform}.com/${username}`
    },
  },
  {
    id: 'qris',
    label: 'QRIS (Pembayaran)',
    icon: '💳',
    description: 'QRIS payment QR — scan dengan apps bank/e-wallet',
    fields: [
      { key: 'merchantId', label: 'Merchant ID', type: 'text', required: true, placeholder: 'ID merchant dari provider' },
      { key: 'amount', label: 'Jumlah (Rp)', type: 'number', required: false, placeholder: '50000' },
      { key: 'merchantName', label: 'Nama Merchant', type: 'text', required: false, placeholder: 'Toko Saya' },
    ],
    build: ({ merchantId, amount, merchantName }) => {
      // QRIS MPM Static format: 01= merchantPAN | 02= CRC | 03= no | 58= ID | 59= merchantName | 60= city | 61= postal | 62= addnData
      const parts = ['000201', '010211', `0203${merchantId}`, '5303604', '5405' + (amount || ''), `5900${merchantName || 'Merchant'}`, '6110SEMARANG', '62070803', '6304']
      // Simple checksum: CRC16/XModem of all bytes (excluding CRC), hex uppercase
      const crc = (str: string) => {
        let crc = 0xFFFF
        for (let i = 0; i < str.length; i++) {
          crc ^= str.charCodeAt(i) << 8
          for (let j = 0; j < 8; j++) crc = (crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)
        }
        return ((crc >>> 0).toString(16).toUpperCase().padStart(4, '0'))
      }
      const payload = parts.join('')
      return payload + crc(payload)
    },
  },
  {
    id: 'crypto',
    label: 'Crypto Wallet',
    icon: '₿',
    description: 'Bitcoin/Ethereum/Tether address — scan untuk transfer',
    fields: [
      { key: 'crypto', label: 'Kripto', type: 'select', required: true, default: 'BTC', options: [
        { value: 'BTC', label: 'Bitcoin (BTC)' },
        { value: 'ETH', label: 'Ethereum (ETH)' },
        { value: 'USDT', label: 'USDT (TRC20)' },
        { value: 'USDT_ETH', label: 'USDT (ERC20)' },
      ]},
      { key: 'address', label: 'Alamat Wallet', type: 'text', required: true, placeholder: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' },
      { key: 'amount', label: 'Jumlah (opsional)', type: 'number', required: false, placeholder: '0.01' },
    ],
    build: ({ crypto, address, amount }) => {
      // Crypto URI schemes per BIP-21 / EIP-681
      if (crypto === 'BTC') {
        return `bitcoin:${address}${amount ? '?amount=' + amount : ''}`
      }
      if (crypto === 'ETH' || crypto === 'USDT_ETH') {
        return `ethereum:${address}${amount ? '?value=' + (parseFloat(amount) * 1e18).toString() : ''}`
      }
      if (crypto === 'USDT') {
        // TRC20 USDT uses standard address format
        return `trx:${address}${amount ? '?amount=' + amount : ''}`
      }
      return address
    },
  },
]

// Pre-made QR theme presets (full look: colors + dotStyle + gradient + frame + heart)
export interface QRTheme {
  label: string
  fg: string
  bg: string
  dotStyle: 'rounded' | 'circle' | 'square'
  gradientEnabled?: boolean
  gradientTo?: string
  framed?: boolean
  useHeart?: boolean
  description: string
}

export const QR_THEMES: QRTheme[] = [
  { label: 'Brutalist', fg: '#000000', bg: '#ffffff', dotStyle: 'rounded', framed: true, description: 'Hitam-putih klasik + frame' },
  { label: 'Retro Pink', fg: '#e84393', bg: '#ffe0eb', dotStyle: 'circle', useHeart: true, description: 'Imut-imut pink + hati' },
  { label: 'Ocean Blue', fg: '#1d3557', bg: '#a0e3ff', dotStyle: 'rounded', gradientEnabled: true, gradientTo: '#457b9d', description: 'Biru gradasi kalem' },
  { label: 'Forest', fg: '#1b5e20', bg: '#d0f0c0', dotStyle: 'square', framed: true, description: 'Hijau alam + frame' },
  { label: 'Neon Nights', fg: '#6c3fc5', bg: '#1a1a2e', dotStyle: 'circle', gradientEnabled: true, gradientTo: '#e94560', framed: true, description: 'Dark mode neon vibe' },
  { label: 'Sunset', fg: '#d35400', bg: '#fee440', dotStyle: 'rounded', gradientEnabled: true, gradientTo: '#e84393', description: 'Oren ke pink gradasi' },
  { label: 'Monochrome', fg: '#000000', bg: '#ffffff', dotStyle: 'square', description: 'Minimalis polos' },
  { label: 'Coffee', fg: '#3e2723', bg: '#d7ccc8', dotStyle: 'rounded', framed: true, description: 'Coklat earthy aesthetic' },
  { label: 'Cyberpunk', fg: '#00ff41', bg: '#0d0221', dotStyle: 'circle', gradientEnabled: true, gradientTo: '#ff00ff', framed: true, description: 'Neon green-magenta' },
  { label: 'Royal', fg: '#6c3fc5', bg: '#ffffff', dotStyle: 'circle', useHeart: true, framed: true, description: 'Ungu elegan + hati + frame' },
]
// Color blind safe palettes (WCAG AA compliant)
export const COLOR_BLIND_PALETTES = [
  { label: 'Default', colors: ['#000000', '#1a1a2e', '#16213e', '#0f3460', '#e94560'] },
  { label: 'Protanopia/Deuteranopia Safe', colors: ['#000000', '#004949', '#009292', '#ff6db6', '#ffb6db'] },
  { label: 'Tritanopia Safe', colors: ['#000000', '#006ddb', '#920000', '#db6d00', '#24ff24'] },
  { label: 'High Contrast (WCAG AAA)', colors: ['#000000', '#ffffff', '#0000ff', '#ff0000', '#ffff00'] },
  { label: 'Blue-Yellow Safe', colors: ['#000000', '#004c99', '#0099cc', '#ffff33', '#ffcc00'] },
  { label: 'Red-Green Safe', colors: ['#000000', '#0072b2', '#009e73', '#d55e00', '#cc79a7'] },
]