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
  | 'mecard'
  | 'paypal'
  | 'upi'
  | 'bluetooth'
  | 'appstore'

export interface TemplateField {
  key: string
  label: string
  type: 'text' | 'email' | 'tel' | 'url' | 'textarea' | 'select' | 'number' | 'color' | 'datetime-local'
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
      const escape = (s: string) => s.replace(/[,\n;]/g, c => ({ ',': '\,', '\n': '\n', ';': '\;' }[c]!))
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
      { key: 'start', label: 'Mulai', type: 'datetime-local', required: true, placeholder: '2026-08-15T10:00' },
      { key: 'end', label: 'Selesai', type: 'datetime-local', required: true, placeholder: '2026-08-15T11:00' },
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
    build: (data) => {
      // QRIS MPM Static (EMVCo) — proper TLV encoder
      const tlv = (id: string, value: string) => {
        const len = value.length.toString().padStart(2, '0')
        return `${id}${len}${value}`
      }
      const merchantId = data.merchantId || ''
      const amount = data.amount ? (parseFloat(data.amount) * 100).toFixed(0).padStart(2, '0') : ''
      const merchantName = data.merchantName || ''
      const crc = (str: string) => {
        let crc = 0xFFFF
        for (let i = 0; i < str.length; i++) {
          crc ^= (str.charCodeAt(i) << 8) & 0xFFFF
          for (let j = 0; j < 8; j++) crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xFFFF
        }
        return ((crc >>> 0).toString(16).toUpperCase().padStart(4, '0'))
      }
      // EMVCo payload: 00=Payload Format Indicator, 01=Point of Initiation, 26=Merchant Account Info, 52=Category Code, 53=Currency(360 IDR), 54=Amount, 58=Country(ID), 59=Merchant Name, 60=Merchant City, 62=Additional Data, 63=CRC
      const parts = [
        tlv('00', '01'),
        tlv('01', amount ? '12' : '11'),
        tlv('26', tlv('00', 'ID') + tlv('01', merchantId)),
        tlv('52', '0000'),
        tlv('53', '360'),
      ]
      if (amount) parts.push(tlv('54', amount))
      parts.push(
        tlv('58', 'ID'),
        tlv('59', merchantName || 'QRKUY'),
        tlv('60', 'SEMARANG'),
      )
      const payload = parts.join('')
      return payload + tlv('63', crc(payload))
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
  {
    id: 'mecard',
          label: 'MeCard (Kontak Simple)',
          icon: '👤',
          description: 'Format kontak sederhana (lebih ringan dari vCard)',
          fields: [
            { key: 'name', label: 'Nama', type: 'text', required: true, placeholder: 'John Doe' },
            { key: 'phone', label: 'Telepon', type: 'tel', placeholder: '+628****6789' },
            { key: 'email', label: 'Email', type: 'email', placeholder: 'john@example.com' },
            { key: 'url', label: 'Website', type: 'url', placeholder: 'https://example.com' },
            { key: 'note', label: 'Catatan', type: 'textarea', placeholder: 'Catatan tambahan' },
          ],
          build: ({ name, phone, email, url, note }) => {
            const parts = ['MECARD:']
            if (name) parts.push(`N:${name}`)
            if (phone) parts.push(`TEL:${phone}`)
            if (email) parts.push(`EMAIL:${email}`)
            if (url) parts.push(`URL:${url}`)
            if (note) parts.push(`NOTE:${note}`)
            parts.push(';')
            return parts.join(';')
          },
        },
        {
          id: 'paypal',
          label: 'PayPal Payment',
          icon: '💙',
          description: 'Link pembayaran PayPal.Me atau PayPal checkout',
          fields: [
            { key: 'username', label: 'Username PayPal.Me', type: 'text', required: true, placeholder: 'username' },
            { key: 'amount', label: 'Jumlah (opsional)', type: 'number', required: false, placeholder: '10.00', step: '0.01' },
            { key: 'currency', label: 'Mata Uang', type: 'select', required: false, default: 'USD', options: [
              { value: 'USD', label: 'USD' },
              { value: 'IDR', label: 'IDR' },
              { value: 'EUR', label: 'EUR' },
              { value: 'SGD', label: 'SGD' },
            ]},
            { key: 'note', label: 'Catatan', type: 'text', placeholder: 'Pembayaran untuk...' },
          ],
          build: ({ username, amount, currency, note }) => {
            const params = new URLSearchParams()
            if (amount) params.set('amount', amount)
            if (currency && currency !== 'USD') params.set('currency', currency)
            if (note) params.set('note', note)
            return `https://paypal.me/${username}${params.toString() ? '?' + params.toString() : ''}`
          },
        },
        {
          id: 'upi',
          label: 'UPI (India Payment)',
          icon: '🇮🇳',
          description: 'Unified Payments Interface QR untuk pembayaran di India',
          fields: [
            { key: 'vpa', label: 'VPA / UPI ID', type: 'text', required: true, placeholder: 'user@bank' },
            { key: 'name', label: 'Nama Penerima', type: 'text', required: false, placeholder: 'Nama Merchant' },
            { key: 'amount', label: 'Jumlah (opsional)', type: 'number', required: false, placeholder: '100', step: '0.01' },
            { key: 'currency', label: 'Mata Uang', type: 'select', required: false, default: 'INR', options: [
              { value: 'INR', label: 'INR' },
            ]},
            { key: 'note', label: 'Deskripsi', type: 'text', placeholder: 'Pembayaran untuk...' },
          ],
          build: ({ vpa, name, amount, currency, note }) => {
            const params = new URLSearchParams()
            params.set('pa', vpa)
            if (name) params.set('pn', name)
            if (amount) params.set('am', amount)
            if (currency) params.set('cu', currency)
            if (note) params.set('tn', note)
            return `upi://pay?${params.toString()}`
          },
        },
        {
          id: 'bluetooth',
          label: 'Bluetooth Pairing',
          icon: '📶',
          description: 'QR code untuk pairing perangkat Bluetooth (menggunakan URI scheme)',
          fields: [
            { key: 'mac', label: 'MAC Address', type: 'text', required: true, placeholder: 'AA:BB:CC:DD:EE:FF' },
            { key: 'name', label: 'Nama Perangkat', type: 'text', required: false, placeholder: 'Speaker Saya' },
            { key: 'class', label: 'Class of Device', type: 'text', required: false, placeholder: '0x240404 (Audio)' },
          ],
          build: ({ mac, name, class: cod }) => {
            // Bluetooth pairing URI format (non-standard, for custom apps)
            const params = new URLSearchParams()
            params.set('mac', mac.replace(/[:-]/g, '').toUpperCase())
            if (name) params.set('name', name)
            if (cod) params.set('class', cod)
            return `bluetooth://pair?${params.toString()}`
          },
        },
        {
          id: 'appstore',
          label: 'App Store / Play Store',
          icon: '📲',
          description: 'Link langsung ke aplikasi di App Store (iOS) atau Play Store (Android)',
          fields: [
            { key: 'platform', label: 'Platform', type: 'select', required: true, default: 'ios', options: [
              { value: 'ios', label: 'iOS App Store' },
              { value: 'android', label: 'Google Play Store' },
            ]},
            { key: 'id', label: 'App ID / Bundle ID', type: 'text', required: true, placeholder: 'id123456789 atau com.example.app' },
            { key: 'name', label: 'Nama Aplikasi (opsional)', type: 'text', required: false, placeholder: 'Nama App' },
          ],
          build: ({ platform, id }) => {
            if (platform === 'ios') {
              // iOS App Store link
              return `https://apps.apple.com/app/id${id.replace(/^id/, '')}`
            }
            // Android Play Store link
            return `https://play.google.com/store/apps/details?id=${id}`
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