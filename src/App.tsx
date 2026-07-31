import { lazy, Suspense, useState, useEffect, useRef } from "react"
import { QrCode, History, Wand2, Download, Copy, Check, Upload, Heart, Sparkles, Image, XCircle, Share, Link, CopyCheck, ClipboardPasteIcon, Camera, AlertCircle, FileText, X, Globe, Trash2, CheckCircle, FileArchive, Printer, Moon, Sun, Code, ChevronDown } from "lucide-react"

const HistoryTab = lazy(() => import("@/components/HistoryTab"))
const TemplateTab = lazy(() => import("@/components/TemplateTab"))
const ScanTab = lazy(() => import("@/components/ScanTab"))

// Type declaration for Barcode Detection API
interface BarcodeDetectorOptions {
  formats?: BarcodeFormat[]
}
interface BarcodeDetector {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>
}
interface DetectedBarcode {
  rawValue: string
  boundingBox: DOMRectReadOnly
  cornerPoints: Point2D[]
  format: BarcodeFormat
}
type BarcodeFormat = "qr_code" | "aztec" | "data_matrix" | "code_128" | "code_39" | "ean_13" | "ean_8" | "upc_a" | "upc_e" | "pdf417"
interface Point2D { x: number; y: number }

declare global {
  interface Window {
    BarcodeDetector?: new (options?: BarcodeDetectorOptions) => BarcodeDetector
  }
  interface MediaTrackCapabilities {
    torch?: boolean
  }
  interface MediaTrackConstraintSet {
    torch?: boolean
  }
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { drawQR } from "@/lib/qr"
import type { EccLevel } from "@/lib/qr"
import { exportSVG, downloadSVG, downloadPDF, checkAccessibility } from "@/lib/export"
import { COLOR_BLIND_PALETTES, QR_THEMES } from "@/lib/templates"
// jsQR for image scanning fallback
import jsQR from "jsqr"

// Sync text to URL search param
function syncURLParam(key: string, value: string) {
  const url = new URL(window.location.href)
  if (value) {
    url.searchParams.set(key, value)
  } else {
    url.searchParams.delete(key)
  }
  window.history.replaceState({}, "", url.toString())
}

// Parse config from URL search params
function parseURLConfig(): Partial<{
  text: string
  dotColor: string
  bgColor: string
  dotStyle: DotStyle
  qrSize: number
  eccLevel: EccLevel
  gradientEnabled: boolean
  gradientTo: string
  framed: boolean
  useHeart: boolean
  textLogo: string
}> {
  const p = new URLSearchParams(window.location.search)
  const cfg: ReturnType<typeof parseURLConfig> = {}
  if (p.has("text")) cfg.text = p.get("text")!
  if (p.has("fg")) cfg.dotColor = p.get("fg")!
  if (p.has("bg")) cfg.bgColor = p.get("bg")!
  if (p.has("style")) {
    const s = p.get("style")!
    if (["rounded", "circle", "square"].includes(s)) cfg.dotStyle = s as DotStyle
  }
  if (p.has("size")) {
    const n = parseInt(p.get("size")!)
    if (!isNaN(n) && n >= 100 && n <= 1000) cfg.qrSize = n
  }
  if (p.has("ecc")) {
    const e = p.get("ecc")!
    if (["L", "M", "Q", "H"].includes(e)) cfg.eccLevel = e as EccLevel
  }
  if (p.has("grad")) {
    cfg.gradientEnabled = true
    cfg.gradientTo = p.get("grad")!
  }
  if (p.has("frame")) cfg.framed = p.get("frame") === "1"
  if (p.has("heart")) cfg.useHeart = p.get("heart") === "1"
  if (p.has("logo")) cfg.textLogo = p.get("logo")!
  return cfg
}

type DotStyle = "rounded" | "circle" | "square"
type Tab = "generate" | "history" | "scan" | "template"

interface HistoryEntry {
  text: string
  date: string
  dotColor?: string
  bgColor?: string
  dotStyle?: DotStyle
  qrSize?: number
  eccLevel?: EccLevel
  gradientEnabled?: boolean
  gradientTo?: string
  framed?: boolean
  useHeart?: boolean
  textLogo?: string
  bgImage?: string
  [key: string]: unknown
}

const presets = [
  { label: "Black", fg: "#000000", bg: "#ffffff" },
  { label: "Pink", fg: "#e84393", bg: "#ffaacc" },
  { label: "Purple", fg: "#6c3fc5", bg: "#e0b0ff" },
  { label: "Blue", fg: "#1d3557", bg: "#a0e3ff" },
  { label: "Green", fg: "#1b5e20", bg: "#d0f0c0" },
  { label: "Orange", fg: "#d35400", bg: "#ffd1a9" },
  { label: "Red", fg: "#c0392b", bg: "#ff6b6b" },
  { label: "Yellow", fg: "#2d3436", bg: "#fee440" },
]

const shapes: { id: DotStyle; label: string }[] = [
  { id: "rounded", label: "Rounded" },
  { id: "circle", label: "Circle" },
  { id: "square", label: "Square" },
]

function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [val, setVal] = useState<T>(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial } catch { return initial }
  })
  useEffect(() => { localStorage.setItem(key, JSON.stringify(val)) }, [key, val])
  const set = (v: T | ((prev: T) => T)) => {
    if (typeof v === 'function') {
      setVal((prev) => (v as (prev: T) => T)(prev))
    } else {
      setVal(v)
    }
  }
  return [val, set]
}

// Recent colors manager
function useRecentColors() {
  const [recentColors, setRecentColors] = useLocalStorage<string[]>("qrkuy-recent-colors", [])
  
  const addRecentColor = (fg: string, bg: string) => {
    const pair = `${fg}|${bg}`
    setRecentColors((prev: string[]) => {
      const filtered = prev.filter(p => p !== pair)
      return [pair, ...filtered].slice(0, 8) // keep last 8
    })
  }
  
  const clearRecentColors = () => setRecentColors([])
  
  return { recentColors, addRecentColor, clearRecentColors }
}

export default function App() {
  const [text, setText] = useState(() => new URLSearchParams(window.location.search).get("text") || "")
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [dotColor, setDotColor] = useState("#000000")
  const [bgColor, setBgColor] = useState("#ffffff")
  const [dotStyle, setDotStyle] = useState<DotStyle>("rounded")
  const [useHeart, setUseHeart] = useState(false)
  const [logoImage, setLogoImage] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [qrSize, setQrSize] = useState(300)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<Tab>("generate")
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>("qrkuy-history", [])
  const [copied, setCopied] = useState(false)
  const [textCopied, setTextCopied] = useState(false)
  const [eccLevel, setEccLevel] = useState<EccLevel>("M")
  const [gradientEnabled, setGradientEnabled] = useState(false)
  const [gradientTo, setGradientTo] = useState("#e84393")
  const [framed, setFramed] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [showEmbed, setShowEmbed] = useState(false)
  const [accessibility, setAccessibility] = useState<{ passed: boolean; issues: string[]; contrast: number } | null>(null)
  const [qrSvg, setQrSvg] = useState("")
  const [textLogo, setTextLogo] = useState("")
  const [fileName, setFileName] = useState("")
  const [urlMetadata, setUrlMetadata] = useState<{ domain: string; favicon: string } | null>(null)
  const [bgImage, setBgImage] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLInputElement>(null)
  const bgImageRef = useRef<HTMLInputElement>(null)
  const didAutoGen = useRef(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const genCount = useLocalStorage<number>("qrkuy-gen-count", 0)
  const genFnRef = useRef<() => Promise<void>>(async () => {})
  const { recentColors, addRecentColor, clearRecentColors } = useRecentColors()

  // Dark mode
  const [darkMode, setDarkMode] = useLocalStorage<boolean>("qrkuy-dark-mode", 
    window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false
  )

  // Apply dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode)
  }, [darkMode])

  // Scanner state
  const [scanning, setScanning] = useState(false)
  const [scannedText, setScannedText] = useState("")
  const [scanError, setScanError] = useState("")
  const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null)
  const [streamRef, setStreamRef] = useState<MediaStream | null>(null)
  const [barcodeDetector, setBarcodeDetector] = useState<BarcodeDetector | null>(null)
  const [torchEnabled, setTorchEnabled] = useState(false)
  const scanIntervalRef = useRef<number | null>(null)
  const [imageScanning, setImageScanning] = useState(false)

  // Auto-generate if text pre-filled from URL param — also parse full config
  useEffect(() => {
    if (didAutoGen.current) return
    didAutoGen.current = true

    const cfg = parseURLConfig()
    if (cfg.dotColor) setDotColor(cfg.dotColor)
    if (cfg.bgColor) setBgColor(cfg.bgColor)
    if (cfg.dotStyle) setDotStyle(cfg.dotStyle)
    if (cfg.qrSize) setQrSize(cfg.qrSize)
    if (cfg.eccLevel) setEccLevel(cfg.eccLevel)
    if (cfg.gradientEnabled) setGradientEnabled(true)
    if (cfg.gradientTo) setGradientTo(cfg.gradientTo)
    if (cfg.framed) setFramed(true)
    if (cfg.useHeart) setUseHeart(true)
    if (cfg.textLogo) setTextLogo(cfg.textLogo)

    if (cfg.text || text.trim()) {
      if (cfg.text) setText(cfg.text)
      setTimeout(generateQR, 300)
    }
  }, [])

  // Global keyboard shortcut: Ctrl+K or Cmd+K -> focus input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Initialize BarcodeDetector if available
  useEffect(() => {
    if (window.BarcodeDetector) {
      try {
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] })
        setBarcodeDetector(detector)
      } catch (e) {
        console.warn("BarcodeDetector init failed:", e)
      }
    }
  }, [])

  // Scan loop
  useEffect(() => {
    if (!scanning || !videoRef || !barcodeDetector) return
    let active = true

    const scanFrame = async () => {
      if (!active || !videoRef || !barcodeDetector) return
      try {
        if (videoRef.readyState === videoRef.HAVE_ENOUGH_DATA) {
          const barcodes = await barcodeDetector.detect(videoRef)
          if (barcodes.length > 0) {
            const value = barcodes[0].rawValue
            setScannedText(value)
            setScanError("")
            stopScanning()
            return
          }
        }
      } catch (e) {
        // Ignore detection errors, keep scanning
      }
      if (active) scanIntervalRef.current = requestAnimationFrame(scanFrame)
    }
    scanIntervalRef.current = requestAnimationFrame(scanFrame)
    return () => { active = false; if (scanIntervalRef.current) cancelAnimationFrame(scanIntervalRef.current) }
  }, [scanning, videoRef, barcodeDetector])

  const startScanning = async () => {
    if (scanning) return
    setScanError("")
    setScannedText("")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      setStreamRef(stream)
      if (videoRef) {
        videoRef.srcObject = stream
        await videoRef.play()
      }
      setScanning(true)
    } catch (e) {
      setScanError("Tidak bisa akses kamera. Izinkan izin kamera di browser.")
    }
  }

  const stopScanning = () => {
    setScanning(false)
    if (streamRef) {
      streamRef.getTracks().forEach(t => t.stop())
      setStreamRef(null)
    }
    if (videoRef) videoRef.srcObject = null
    if (scanIntervalRef.current) cancelAnimationFrame(scanIntervalRef.current)
  }

  const toggleTorch = async () => {
    if (!streamRef) return
    const track = streamRef.getVideoTracks()[0]
    if (!track) return
    try {
      const capabilities = track.getCapabilities?.()
      if (capabilities?.torch) {
        await track.applyConstraints({ advanced: [{ torch: !torchEnabled }] })
        setTorchEnabled(!torchEnabled)
      }
    } catch (e) {
      console.warn("Torch toggle failed:", e)
    }
  }

  const useScannedText = () => {
    if (scannedText.trim()) {
      setText(scannedText.trim())
      setTab("generate")
      setTimeout(generateQR, 300)
      setScannedText("")
    }
  }

  const clearScannedText = () => {
    setScannedText("")
    setScanError("")
  }

  const handleImageScan = async (file: File) => {
    setScanError("")
    try {
      const bitmap = await createImageBitmap(file)
      let value: string | null = null

      if (barcodeDetector) {
        try {
          const barcodes = await barcodeDetector.detect(bitmap)
          if (barcodes.length > 0) value = barcodes[0].rawValue
        } catch {}
      }

      if (!value) {
        const canvas = document.createElement("canvas")
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!
        ctx.drawImage(bitmap, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const result = jsQR(imageData.data, imageData.width, imageData.height)
        if (result) value = result.data
      }

      if (value) {
        setScannedText(value)
      } else {
        setScanError("QR code tidak ditemukan di gambar")
      }
    } catch {
      setScanError("Gagal memproses gambar")
    }
  }

  async function generateQR() {
    if (!text.trim()) { setError("ISI DULU TEKSNYA!"); return }
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    setError("")
    setLoading(true)
    syncURLParam("text", text.trim())
    try {
      const dataUrl = await drawQR(text, dotColor, bgColor, dotStyle, useHeart, qrSize, eccLevel, logoImage, gradientEnabled, gradientTo, framed, textLogo, bgImage)
      setQrDataUrl(dataUrl)
      const svg = await exportSVG(text, dotColor, bgColor, dotStyle, qrSize, eccLevel, logoImage, useHeart, framed, gradientEnabled, gradientTo, textLogo)
      setQrSvg(svg)
      setAccessibility(checkAccessibility(dotColor, bgColor, qrSize))
      
      const entry: HistoryEntry = {
        text: text.trim(),
        date: new Date().toLocaleString("id-ID"),
        dotColor,
        bgColor,
        dotStyle,
        qrSize,
        eccLevel,
        gradientEnabled,
        gradientTo,
        framed,
        useHeart,
        textLogo,
        bgImage: bgImage || undefined,
      }
      setHistory([entry, ...history.filter(h => h.text !== entry.text)].slice(0, 20))
      addRecentColor(dotColor, bgColor)
      // bump gen counter
      const [count] = genCount
      const [, setCount] = genCount
      setCount(count + 1)
    } catch {
      setError("GAGAL BUAT QR!")
    }
    setLoading(false)
  }
  // Sync genFnRef so debounce always calls latest generateQR
  genFnRef.current = generateQR

  // Debounced auto-generate on text/option changes
  useEffect(() => {
    if (!didAutoGen.current) return // skip first auto-gen from URL param
    const trimmed = text.trim()
    if (!trimmed) return
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      genFnRef.current()
    }, 600)
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current) }
  }, [text, dotColor, bgColor, dotStyle, qrSize, eccLevel, gradientEnabled, gradientTo, framed, useHeart, textLogo, logoImage, bgImage])

  // Fetch URL metadata when text looks like URL
  useEffect(() => {
    const trimmed = text.trim()
    const isUrl = /^https?:\/\//i.test(trimmed)
    if (!isUrl) { setUrlMetadata(null); return }
    try {
      const url = new URL(trimmed)
      const domain = url.hostname.replace(/^www\./, '')
      // Try to get favicon from Google's favicon service (most reliable cross-origin)
      const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
      setUrlMetadata({ domain, favicon })
    } catch { setUrlMetadata(null) }
  }, [text])

  function download() {
    if (!qrDataUrl) return
    const a = document.createElement("a")
    a.download = `${fileName || `qrkuy-${text.replace(/[^a-z0-9]/gi, "-").slice(0, 20) || "qrcode"}`}.png`
    a.href = qrDataUrl; a.click()
  }

  async function copyImage() {
    const blob = await (await fetch(qrDataUrl)).blob()
    try { await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]) }
    catch { await navigator.clipboard.writeText(text) }
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  async function shareQR() {
    const blob = await (await fetch(qrDataUrl)).blob()
    const fileNameSafe = fileName || `qrkuy-${text.replace(/[^a-z0-9]/gi, "-").slice(0, 20) || "qrcode"}`
    const file = new File([blob], `${fileNameSafe}.png`, { type: "image/png" })
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: "QRkuy", text, files: [file] })
    } else {
      // fallback: just copy text
      await navigator.clipboard.writeText(text)
      setTextCopied(true); setTimeout(() => setTextCopied(false), 2000)
    }
  }

  function copyText() {
    navigator.clipboard.writeText(text)
    setTextCopied(true); setTimeout(() => setTextCopied(false), 2000)
  }

  function buildShareURL(): string {
    const url = new URL(window.location.href.split('?')[0], window.location.origin)
    const p = url.searchParams
    const q = text.trim()
    if (q) p.set("text", q)
    if (dotColor !== "#000000") p.set("fg", dotColor)
    if (bgColor !== "#ffffff") p.set("bg", bgColor)
    if (dotStyle !== "rounded") p.set("style", dotStyle)
    if (qrSize !== 300) p.set("size", String(qrSize))
    if (eccLevel !== "M") p.set("ecc", eccLevel)
    if (gradientEnabled && gradientTo) p.set("grad", gradientTo)
    if (framed) p.set("frame", "1")
    if (useHeart) p.set("heart", "1")
    if (textLogo) p.set("logo", textLogo)
    return url.toString()
  }

  async function downloadAsSVG() {
    if (!qrDataUrl) return
    try {
      const svg = await exportSVG(text, dotColor, bgColor, dotStyle, qrSize, eccLevel, logoImage, useHeart, framed, gradientEnabled, gradientTo)
      await downloadSVG(svg, `${fileName || `qrkuy-${text.replace(/[^a-z0-9]/gi, "-").slice(0, 20) || "qrcode"}`}.svg`)
    } catch (e) {
      console.error("SVG export failed:", e)
    }
  }

  async function downloadAsPDF() {
    if (!qrDataUrl) return
    try {
      const svg = await exportSVG(text, dotColor, bgColor, dotStyle, qrSize, eccLevel, logoImage, useHeart, framed, gradientEnabled, gradientTo)
      await downloadPDF(svg, qrSize, `${fileName || `qrkuy-${text.replace(/[^a-z0-9]/gi, "-").slice(0, 20) || "qrcode"}`}.pdf`)
    } catch (e) {
      console.error("PDF export failed:", e)
    }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setLogoImage(reader.result as string)
      setUseHeart(false)
      setTextLogo("")
    }
    reader.readAsDataURL(file)
  }

  function handleBgImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setBgImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  function clearBgImage() {
    setBgImage(null)
    if (bgImageRef.current) bgImageRef.current.value = ""
  }

  function clearLogo() {
    setLogoImage(null)
    if (logoRef.current) logoRef.current.value = ""
  }

  function pickHistory(item: HistoryEntry) {
    setText(item.text)
    if (item.dotColor) setDotColor(item.dotColor)
    if (item.bgColor) setBgColor(item.bgColor)
    if (item.dotStyle) setDotStyle(item.dotStyle)
    if (item.qrSize) setQrSize(item.qrSize)
    if (item.eccLevel) setEccLevel(item.eccLevel)
    if (item.gradientEnabled !== undefined) setGradientEnabled(item.gradientEnabled)
    if (item.gradientTo) setGradientTo(item.gradientTo)
    if (item.framed !== undefined) setFramed(item.framed)
    if (item.useHeart !== undefined) setUseHeart(item.useHeart)
    if (item.textLogo) setTextLogo(item.textLogo)
    if (item.bgImage !== undefined) setBgImage(item.bgImage)
    setTab("generate"); setTimeout(generateQR, 300)
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0] dark:bg-[#0f0f0f] font-medium">
      {/* ===== HEADER ===== */}
      <header className="border-b-4 border-black bg-[#fee440] dark:bg-[#1d3557]">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-black text-[#fee440] flex items-center justify-center font-black text-xl border-2 border-black shadow-[3px_3px_0px_0px_#fff] dark:shadow-[3px_3px_0px_0px_#1d3557]">
              <QrCode size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">QRkuy<X size={20} className="inline text-[#e84393] -ml-1" /></h1>
              <p className="text-xs font-bold uppercase tracking-widest text-black/60 dark:text-white/60">QR Code Generator Brutalist</p>
            </div>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center gap-2 px-3 py-2 border-2 border-black bg-white dark:bg-black dark:text-[#fee440] font-black text-sm uppercase shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* ===== TABS ===== */}
            <div className="mx-auto max-w-5xl px-4 sm:px-6 mt-6">
              <div className="flex flex-wrap gap-2">
                {([
                  { key: "generate" as const, label: "Buat", icon: QrCode },
                  { key: "template" as const, label: "Template", icon: FileText },
                  { key: "history" as const, label: "Riwayat", icon: History },
                  { key: "scan" as const, label: "Scan", icon: Camera },
                ]).map(t => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                                      className={`flex items-center gap-2 px-5 py-2.5 font-black text-sm uppercase border-2 border-black dark:border-white transition-all
                                        ${tab === t.key
                                          ? "bg-black dark:bg-white text-[#fee440] dark:text-black shadow-[3px_3px_0px_0px_#fee440] dark:shadow-[3px_3px_0px_0px_#1d3557]"
                                          : "bg-white dark:bg-[#1a1a1a] dark:text-white text-black shadow-[3px_3px_0px_0px_#a0e3ff] hover:shadow-[1px_1px_0px_0px_#a0e3ff] hover:translate-x-[2px] hover:translate-y-[2px] dark:shadow-[3px_3px_0px_0px_#1d3557] dark:hover:shadow-[1px_1px_0px_0px_#1d3557]"
                                        }`}>
                                      <t.icon size={16} /> {t.label}
                                    </button>
                ))}
              </div>
            </div>

      {/* ===== MAIN ===== */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6">

        {/* ===== GENERATE ===== */}
        {tab === "generate" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">

              {/* Input */}
              <Card className="shadow-[4px_4px_0px_0px_#a0e3ff] dark:shadow-[4px_4px_0px_0px_#1d3557]">
                <CardHeader><CardTitle className="text-base flex items-center gap-2 dark:text-white"><Sparkles size={16} /> Teks / URL</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input ref={inputRef} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && generateQR()}
                        placeholder="https://contoh.com atau teks bebas..."
                        aria-label="Teks atau URL untuk QR code"
                        className="w-full border-2 border-black dark:border-white bg-white dark:bg-[#1a1a1a] dark:text-white px-3 py-2.5 pr-10 text-sm font-bold placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:shadow-[2px_2px_0px_0px_#000]"
                      />
                      {text && (
                        <button onClick={() => setText("")} aria-label="Hapus teks"
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white transition-colors"
                        ><XCircle size={18} /></button>
                      )}
                    </div>
                    <button onClick={() => setText(["https://portogweh.vercel.app","https://github.com/ranggacey","HELLO WORLD!","I ❤️ QRKUY"][Math.floor(Math.random()*4)])}
                      aria-label="Isi contoh teks acak"
                      className="border-2 border-black dark:border-white bg-[#fee440] px-3 py-2 hover:shadow-[2px_2px_0px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                    ><Wand2 size={20} /></button>
                    <button onClick={async () => { try { const t = await navigator.clipboard.readText(); setText(t) } catch {} }}
                      aria-label="Tempel dari clipboard"
                      className="border-2 border-black dark:border-white bg-[#a0e3ff] px-3 py-2 hover:shadow-[2px_2px_0px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
                      title="Tempel dari clipboard"
                    ><ClipboardPasteIcon size={20} /></button>
                  </div>
                  {/* Info: char count + URL detect + favicon preview */}
                  {text && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs font-bold text-black/40 dark:text-white/40 border border-black/20 dark:border-white/20 px-1.5 py-0.5">
                        {text.length} char
                      </span>
                      {/^https?:\/\//i.test(text.trim()) && (
                        <span className="text-xs font-bold text-[#1b5e20] bg-[#d0f0c0] border border-black px-1.5 py-0.5 flex items-center gap-1">
                          <Globe size={10} /> URL
                        </span>
                      )}
                      {urlMetadata && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-black/60 dark:text-white/60 border border-black/20 dark:border-white/20 px-1.5 py-0.5">
                          <img src={urlMetadata.favicon} alt="" className="w-4 h-4" crossOrigin="anonymous" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          {urlMetadata.domain}
                        </span>
                      )}
                      <span className="text-xs font-bold text-black/30 dark:text-white/30 border border-black/20 dark:border-white/20 px-1.5 py-0.5 ml-auto" title="Ctrl+K / Cmd+K untuk fokus input">
                        ⌘K
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Colors */}
              <Card className="shadow-[4px_4px_0px_0px_#ffaacc] dark:shadow-[4px_4px_0px_0px_#1d3557]">
                <CardHeader><CardTitle className="text-base flex items-center gap-2 dark:text-white"><Image size={16} /> Warna</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {presets.map((p, i) => (
                      <button key={p.label} onClick={() => { setDotColor(p.fg); setBgColor(p.bg) }}
                        className={`w-10 h-10 border-2 border-black dark:border-white transition-all shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#fff] hover:scale-105`}
                        style={{ backgroundColor: p.bg }} title={p.label}
                      >
                        <div className="w-4 h-4 border border-black dark:border-white mx-auto" style={{ backgroundColor: p.fg }} />
                      </button>
                    ))}
                  </div>
                  {/* Recent colors */}
                  {recentColors.length > 0 && (
                    <div className="border-2 border-black dark:border-white bg-white dark:bg-[#1a1a1a] p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider dark:text-white">Warna Terakhir</span>
                        <button onClick={clearRecentColors} className="text-[10px] font-bold text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white underline">Hapus</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recentColors.map((pair, idx) => {
                          const [fg, bg] = pair.split('|')
                          return (
                            <button key={idx} onClick={() => { setDotColor(fg); setBgColor(bg) }}
                              className="w-10 h-10 border-2 border-black transition-all shadow-[2px_2px_0px_0px_#000] hover:scale-105"
                              style={{ backgroundColor: bg }} title={`FG: ${fg} | BG: ${bg}`}
                            >
                              <div className="w-4 h-4 border border-black mx-auto" style={{ backgroundColor: fg }} />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 border-2 border-black bg-white px-3 py-2">
                      <span className="text-xs font-black uppercase">QR</span>
                      <input type="color" value={dotColor} onChange={e => setDotColor(e.target.value)} className="h-7 w-full cursor-pointer border-0 bg-transparent p-0" />
                    </div>
                    <div className="flex items-center gap-2 border-2 border-black bg-white px-3 py-2">
                      <span className="text-xs font-black uppercase">BG</span>
                      <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="h-7 w-full cursor-pointer border-0 bg-transparent p-0" />
                    </div>
                  </div>
                  {/* Color-blind safe palettes */}
                  <div className="border-2 border-black bg-white p-3 space-y-2">
                    <span className="text-xs font-black uppercase tracking-wider block">Palet Color-Blind Safe</span>
                    <div className="flex flex-wrap gap-1">
                      {COLOR_BLIND_PALETTES.map((p, i) => (
                        <button key={i} onClick={() => { setDotColor(p.colors[0]); setBgColor(p.colors[1] || '#ffffff') }}
                          className="border-2 border-black px-2 py-1 text-[10px] font-bold uppercase hover:shadow-[2px_2px_0px_0px_#000] transition-all"
                          title={p.label}
                        >{p.label.split(' ')[0]}</button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Background Image */}
              <Card className="shadow-[4px_4px_0px_0px_#a0e3ff] dark:shadow-[4px_4px_0px_0px_#1d3557]">
                <CardHeader><CardTitle className="text-base flex items-center gap-2 dark:text-white"><Image size={16} /> Latar Belakang</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs font-bold text-black/60 dark:text-white/60">Tambah gambar di belakang QR code</p>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => bgImageRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 border-2 border-black dark:border-white bg-white dark:bg-[#1a1a1a] text-xs font-black hover:shadow-[2px_2px_0px_0px_#a0e3ff] transition-all"
                    ><Upload size={14} /> Upload Gambar</button>
                    {bgImage && (
                      <button onClick={clearBgImage}
                        className="flex items-center gap-2 px-3 py-2 border-2 border-black bg-[#ff6b6b] text-xs font-black shadow-[2px_2px_0px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                      ><Trash2 size={14} /> Hapus</button>
                    )}
                  </div>
                  {bgImage && (
                    <div className="flex items-center gap-2 border-2 border-black bg-[#a0e3ff] px-3 py-2 text-xs font-bold">
                      <Image size={14} /> Gambar latar aktif
                    </div>
                  )}
                  <input ref={bgImageRef} type="file" accept="image/*" onChange={handleBgImageUpload} className="hidden" />
                </CardContent>
              </Card>

              {/* Options */}
              <Card className="shadow-[4px_4px_0px_0px_#d0f0c0] dark:shadow-[4px_4px_0px_0px_#1d3557]">
                <CardHeader><CardTitle className="text-base flex items-center gap-2 dark:text-white"><Sparkles size={16} /> Opsi</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-xs font-black uppercase mb-2 block tracking-wider dark:text-white">Bentuk Dot</label>
                                        <div className="flex gap-1">
                                          {shapes.map(s => (
                                            <button key={s.id} onClick={() => setDotStyle(s.id)}
                                              className={`px-3 py-1.5 border-2 border-black dark:border-white text-xs font-black transition-all ${dotStyle === s.id ? "bg-black dark:bg-white text-white dark:text-black shadow-[2px_2px_0px_0px_#fee440]" : "bg-white dark:bg-[#1a1a1a] dark:text-white hover:shadow-[2px_2px_0px_0px_#a0e3ff]"}`}
                                            >{s.label}</button>
                                          ))}
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-xs font-black uppercase mb-2 block tracking-wider dark:text-white">Logo</label>
                                        <div className="flex items-center gap-2">
                                          <input type="file" accept="image/png, image/jpeg, image/svg+xml" ref={logoRef} onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                              const reader = new FileReader();
                                              reader.onload = (ev) => {
                                                setLogoImage(ev.target?.result as string);
                                                setUseHeart(false);
                                                setTextLogo("");
                                              }
                                              reader.readAsDataURL(e.target.files[0]);
                                            }
                                          }} className="hidden" />
                                          <button onClick={() => logoRef.current?.click()} className="px-3 py-1.5 border-2 border-black dark:border-white text-xs font-black transition-all bg-white dark:bg-[#1a1a1a] dark:text-white hover:shadow-[2px_2px_0px_0px_#a0e3ff]">
                                            <Upload size={14} className="inline mr-1" /> Upload
                                          </button>
                                          {logoImage && (
                                            <button onClick={() => setLogoImage(null)} className="p-2 border-2 border-black dark:border-white text-xs font-black transition-all bg-red-400 text-black hover:bg-red-500">
                                              <X size={14} />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-xs font-black uppercase mb-2 block tracking-wider dark:text-white">Logo</label>
                                        <div className="flex items-center gap-2">
                                          <input type="file" accept="image/png, image/jpeg, image/svg+xml" ref={logoRef} onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                              const reader = new FileReader();
                                              reader.onload = (ev) => {
                                                setLogoImage(ev.target?.result as string);
                                                setUseHeart(false);
                                                setTextLogo("");
                                              }
                                              reader.readAsDataURL(e.target.files[0]);
                                            }
                                          }} className="hidden" />
                                          <button onClick={() => logoRef.current?.click()} className="px-3 py-1.5 border-2 border-black dark:border-white text-xs font-black transition-all bg-white dark:bg-[#1a1a1a] dark:text-white hover:shadow-[2px_2px_0px_0px_#a0e3ff]">
                                            <Upload size={14} className="inline mr-1" /> Upload
                                          </button>
                                          {logoImage && (
                                            <button onClick={() => setLogoImage(null)} className="p-2 border-2 border-black dark:border-white text-xs font-black transition-all bg-red-400 text-black hover:bg-red-500">
                                              <X size={14} />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-xs font-black uppercase mb-2 block tracking-wider dark:text-white">Ukuran</label>
                                        <div className="space-y-2">
                                          <input type="range" min="100" max="1000" step="50" value={qrSize} onChange={e => setQrSize(Number(e.target.value))}
                                            className="w-full h-2 border-2 border-black dark:border-white bg-white dark:bg-[#1a1a1a] accent-[#fee440] cursor-pointer appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#fee440]"
                                          />
                                          <div className="flex items-center justify-between gap-1">
                                            <span className="text-xs font-bold text-black/40 dark:text-white/40 min-w-[4ch]">{qrSize}px</span>
                                            <div className="flex gap-1">
                                              {[100, 200, 300, 400, 500, 800].map(n => (
                                                <button key={n} onClick={() => setQrSize(n)}
                                                  className={`px-1.5 py-0.5 border-2 border-black dark:border-white text-[10px] font-bold transition-all ${qrSize === n ? "bg-black dark:bg-white text-white dark:text-black" : "bg-white dark:bg-[#1a1a1a] dark:text-white hover:bg-[#fee440]"}`}
                                                >{n}</button>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-xs font-black uppercase mb-2 block tracking-wider dark:text-white">Recovery</label>
                                        <select value={eccLevel} onChange={e => setEccLevel(e.target.value as EccLevel)}
                                          className="w-full border-2 border-black dark:border-white bg-white dark:bg-[#1a1a1a] dark:text-white px-3 py-2 text-sm font-bold focus:outline-none focus:shadow-[2px_2px_0px_0px_#000]"
                                        >
                                          <option value="L">Low (7%)</option>
                                          <option value="M">Medium (15%)</option>
                                          <option value="Q">Quartile (25%)</option>
                                          <option value="H">High (30%)</option>
                                        </select>
                                      </div>
                                    </div>
                                    {/* QR Themes */}
                                    <div className="border-2 border-black dark:border-white bg-white dark:bg-[#1a1a1a] p-4 space-y-3">
                                      <span className="text-xs font-black uppercase tracking-wider block dark:text-white">Tema Siap Pakai</span>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {QR_THEMES.map((theme) => (
                                          <button
                                            key={theme.label}
                                            onClick={() => {
                                              setDotColor(theme.fg)
                                              setBgColor(theme.bg)
                                              setDotStyle(theme.dotStyle)
                                              if (theme.gradientEnabled) { setGradientEnabled(true); setGradientTo(theme.gradientTo!) }
                                              else setGradientEnabled(false)
                                              if (theme.framed) setFramed(true)
                                              else setFramed(false)
                                              if (theme.useHeart) { setUseHeart(true); setLogoImage(null); setTextLogo("") }
                                            }}
                                            className="text-left border-2 border-black dark:border-white p-2 text-[10px] font-bold uppercase hover:shadow-[2px_2px_0px_0px_#000] transition-all"
                                          >
                                            <div className="flex items-center gap-2 mb-1">
                                              <div className="w-6 h-6 border border-black shrink-0" style={{ background: `linear-gradient(135deg, ${theme.fg}, ${theme.gradientTo || theme.fg})` }} />
                                              <span className="dark:text-white truncate">{theme.label}</span>
                                            </div>
                                            <p className="text-[9px] font-bold text-black/40 dark:text-white/40 truncate">{theme.description}</p>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    {/* Custom Presets */}
                                    {(() => {
                                      const [customPresets, setCustomPresets] = useLocalStorage<Array<{name: string; dotColor: string; bgColor: string; dotStyle: DotStyle; gradientEnabled: boolean; gradientTo: string; framed: boolean; useHeart: boolean; textLogo: string}>>("qrkuy-custom-presets", [])
                                      const [presetName, setPresetName] = useState("")
                                      const [showPresetInput, setShowPresetInput] = useState(false)
                                      const savePreset = () => {
                                        if (!presetName.trim()) return
                                        const preset = { name: presetName.trim(), dotColor, bgColor, dotStyle, gradientEnabled, gradientTo, framed, useHeart, textLogo }
                                        setCustomPresets([preset, ...customPresets.filter(p => p.name !== preset.name)])
                                        setPresetName("")
                                        setShowPresetInput(false)
                                      }
                                      const deletePreset = (name: string) => setCustomPresets(customPresets.filter(p => p.name !== name))
                                      const loadPreset = (p: typeof customPresets[0]) => {
                                        setDotColor(p.dotColor); setBgColor(p.bgColor); setDotStyle(p.dotStyle)
                                        setGradientEnabled(p.gradientEnabled); setGradientTo(p.gradientTo); setFramed(p.framed)
                                        setUseHeart(p.useHeart); setTextLogo(p.textLogo); setLogoImage(null)
                                      }
                                      return (
                                        <div className="border-2 border-black dark:border-white bg-white dark:bg-[#1a1a1a] p-4 space-y-3">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-black uppercase tracking-wider dark:text-white">Preset Kustom</span>
                                            <button onClick={() => setShowPresetInput(!showPresetInput)}
                                              className="text-[10px] font-bold px-2 py-1 border border-black dark:border-white hover:bg-[#fee440] transition-all"
                                            >+ Simpan</button>
                                          </div>
                                          {showPresetInput && (
                                            <div className="flex gap-2">
                                              <input value={presetName} onChange={e => setPresetName(e.target.value)} onKeyDown={e => e.key === "Enter" && savePreset()}
                                                placeholder="Nama preset..." maxLength={20}
                                                className="flex-1 border-2 border-black dark:border-white bg-white dark:bg-[#1a1a1a] dark:text-white px-2 py-1 text-xs font-bold focus:outline-none"
                                              />
                                              <button onClick={savePreset} className="px-3 py-1 bg-black dark:bg-white text-[#fee440] dark:text-black text-xs font-black border-2 border-black dark:border-white">SAVE</button>
                                            </div>
                                          )}
                                          {customPresets.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                              {customPresets.map((p, i) => (
                                                <div key={i} className="flex items-center gap-1 border-2 border-black dark:border-white px-2 py-1">
                                                  <button onClick={() => loadPreset(p)} className="flex items-center gap-1.5 hover:text-[#e84393] transition-colors">
                                                    <div className="w-4 h-4 border border-black" style={{ background: `linear-gradient(135deg, ${p.dotColor}, ${p.gradientTo || p.dotColor})` }} />
                                                    <span className="text-[10px] font-bold dark:text-white">{p.name}</span>
                                                  </button>
                                                  <button onClick={() => deletePreset(p.name)} className="text-black/40 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400 ml-1" aria-label="Hapus preset">×</button>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-[10px] font-bold text-black/40 dark:text-white/40">Belum ada preset. Simpan konfigurasi favoritmu!</p>
                                          )}
                                        </div>
                                      )
                                    })()}

                                    {/* Gradient Toggle */}
                                    <div className="border-2 border-black dark:border-white bg-white dark:bg-[#1a1a1a] p-4 space-y-3">
                                      <label className="flex items-center justify-between cursor-pointer"> 
                                        <span className="text-xs font-black uppercase tracking-wider dark:text-white">Gradient QR</span>
                                        <button onClick={() => setGradientEnabled(!gradientEnabled)}
                                          className={`relative w-10 h-5 border-2 border-black dark:border-white transition-all ${gradientEnabled ? "bg-[#fee440]" : "bg-white dark:bg-[#1a1a1a]"}`}
                                        >
                                          <span className={`absolute top-0.5 w-3.5 h-3 bg-black transition-all ${gradientEnabled ? "left-5" : "left-0.5"}`} />
                                        </button>
                                      </label>
                                      {gradientEnabled && (
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1 flex items-center gap-2 border-2 border-black dark:border-white bg-white dark:bg-[#1a1a1a] px-3 py-1.5">
                                            <span className="text-xs font-black uppercase dark:text-white">Ke</span>
                                            <input type="color" value={gradientTo} onChange={e => setGradientTo(e.target.value)}
                                              className="h-7 w-full cursor-pointer border-0 bg-transparent p-0" />
                                          </div>
                                          <div className="w-8 h-8 border-2 border-black dark:border-white" style={{ background: `linear-gradient(135deg, ${dotColor}, ${gradientTo})` }} />
                                        </div>
                                      )}
                                    </div>

                                    {/* Brutalist Frame Toggle */}
                                    <div className="border-2 border-black dark:border-white bg-white dark:bg-[#1a1a1a] p-4">
                                      <label className="flex items-center justify-between cursor-pointer">
                                        <span className="text-xs font-black uppercase tracking-wider flex items-center gap-2 dark:text-white"><Sparkles size={14} /> Frame Brutalist</span>
                                        <button onClick={() => setFramed(!framed)}
                                          className={`relative w-10 h-5 border-2 border-black dark:border-white transition-all ${framed ? "bg-[#fee440]" : "bg-white dark:bg-[#1a1a1a]"}`}
                                        >
                                          <span className={`absolute top-0.5 w-3.5 h-3 bg-black transition-all ${framed ? "left-5" : "left-0.5"}`} />
                                        </button>
                                      </label>
                                    </div>

                                    {/* Logo / Heart */}
                                    <div className="border-2 border-black dark:border-white bg-white dark:bg-[#1a1a1a] p-4 space-y-3">
                                      <label className="text-xs font-black uppercase tracking-wider block dark:text-white">Gambar Tengah (opsional)</label>
                                    <div className="flex flex-wrap gap-2">
                                      <button onClick={() => { setUseHeart(!useHeart); if (!useHeart) { setLogoImage(null); setTextLogo("") } }}
                                        className={`flex items-center gap-2 px-3 py-2 border-2 border-black text-xs font-black transition-all ${useHeart ? "bg-black text-white shadow-[2px_2px_0px_0px_#fee440]" : "bg-white hover:shadow-[2px_2px_0px_0px_#ffaacc]"}`}
                                      ><Heart size={14} /> {useHeart ? "Aktif" : "Hati"}</button>
                                      <button onClick={() => logoRef.current?.click()}
                                        className="flex items-center gap-2 px-3 py-2 border-2 border-black bg-white text-xs font-black hover:shadow-[2px_2px_0px_0px_#a0e3ff] transition-all"
                                      ><Upload size={14} /> Upload Gambar</button>
                                      {(logoImage || useHeart || textLogo) && (
                                        <button onClick={() => { setLogoImage(null); setUseHeart(false); setTextLogo("") }}
                                          className="flex items-center gap-2 px-3 py-2 border-2 border-black bg-[#ff6b6b] text-xs font-black shadow-[2px_2px_0px_0px_#000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                                        ><Trash2 size={14} /> Hapus</button>
                                      )}
                                    </div>
                                    {/* Text Logo */}
                                    <div className="flex items-center gap-2 border-2 border-black dark:border-white bg-white dark:bg-[#1a1a1a] px-3 py-2">
                                      <span className="text-[10px] font-black uppercase tracking-wider dark:text-white shrink-0">Teks</span>
                                      <input value={textLogo} onChange={e => { setTextLogo(e.target.value); if (e.target.value) { setUseHeart(false); setLogoImage(null) } }}
                                        placeholder="QRkuy"
                                        maxLength={8}
                                        className="flex-1 border-0 bg-transparent px-1 py-0.5 text-sm font-bold focus:outline-none dark:text-white placeholder:text-black/30"
                                      />
                                      <span className="text-[9px] font-bold text-black/40">{textLogo.length}/8</span>
                                    </div>
                                    <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    {logoImage && (
                      <div className="flex items-center gap-2 border-2 border-black bg-[#d0f0c0] px-3 py-2 text-xs font-bold">
                        <Image size={14} /> Gambar terupload
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {error && (
                <div className="border-2 border-black bg-[#ff6b6b] px-4 py-3 font-black text-sm shadow-[3px_3px_0px_0px_#000]">
                  ⚠ {error}
                </div>
              )}

              <button onClick={generateQR} disabled={loading}
                className="w-full border-3 border-black bg-[#fee440] py-4 font-black text-lg uppercase shadow-[5px_5px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[5px] active:translate-y-[5px] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >{loading ? "⏳" : <Sparkles size={20} />} {loading ? "Memproses..." : "Buat QR Code"}</button>
            </div>

            {/* Result */}
            <div className="lg:sticky lg:top-6 self-start">
              <Card className="shadow-[4px_4px_0px_0px_#e0b0ff] border-3 border-black">
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><QrCode size={16} /> Hasil</CardTitle></CardHeader>
                <CardContent>
                  {qrDataUrl ? (
                    <div className="space-y-4 animate-fade-up">
                      {/* Accessibility Indicator */}
                      {accessibility && (
                        <div className={`p-3 border-2 text-xs font-bold ${accessibility.passed ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700"}`}>
                          <div className="flex items-center gap-2">
                            {accessibility.passed ? (
                              <CheckCircle className="text-green-500" size={14} />
                            ) : (
                              <AlertCircle className="text-red-500" size={14} />
                            )}
                            {accessibility.passed
                              ? `WCAG AA ✓ — Kontras ${accessibility.contrast}:1`
                              : `WCAG AA ✗ — ${accessibility.issues[0]}`}
                          </div>
                          {!accessibility.passed && (
                            <ul className="mt-1 ml-6 space-y-1">
                              {accessibility.issues.map((issue, i) => (
                                <li key={i} className="flex items-center gap-1">
                                  <XCircle size={10} className="text-red-400" />
                                  {issue}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                      <div className="aspect-square max-w-[280px] mx-auto border-3 border-black bg-white p-3 shadow-[4px_4px_0px_0px_#000]">
                        <img src={qrDataUrl} alt={`QR Code untuk: ${text}`} className="w-full h-full object-contain" />
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex items-center gap-2 border-2 border-black dark:border-white bg-white dark:bg-[#1a1a1a] px-3 py-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider dark:text-white shrink-0">Nama File</span>
                          <input value={fileName} onChange={e => setFileName(e.target.value)}
                            placeholder={`qrkuy-${text.replace(/[^a-z0-9]/gi, "-").slice(0, 20) || "qrcode"}`}
                            maxLength={40}
                            className="flex-1 border-0 bg-transparent px-1 py-0.5 text-xs font-bold focus:outline-none dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={download}
                            className="flex items-center justify-center gap-2 border-2 border-black bg-[#a0e3ff] py-3 font-black text-sm uppercase shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                          ><Download size={16} /> Download</button>
                          <button onClick={copyImage}
                            className="flex items-center justify-center gap-2 border-2 border-black bg-[#d0f0c0] py-3 font-black text-sm uppercase shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                          >{copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Salin Gambar</>}</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={shareQR}
                            className="flex items-center justify-center gap-2 border-2 border-black bg-[#fee440] py-3 font-black text-sm uppercase shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                          ><Share size={16} /> Share</button>
                          <button onClick={copyText}
                            className="flex items-center justify-center gap-2 border-2 border-black bg-[#e0b0ff] py-3 font-black text-sm uppercase shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                          >{textCopied ? <><Check size={16} /> Copied</> : <><Link size={16} /> Salin Teks</>}</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={downloadAsSVG}
                            className="flex items-center justify-center gap-2 border-2 border-black bg-[#ffaacc] py-3 font-black text-sm uppercase shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                          ><FileText size={16} /> SVG</button>
                          <button onClick={downloadAsPDF}
                            className="flex items-center justify-center gap-2 border-2 border-black bg-[#ffd1a9] py-3 font-black text-sm uppercase shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                          ><FileArchive size={16} /> PDF</button>
                        </div>
                        <button onClick={() => window.print()}
                          className="flex items-center justify-center gap-2 border-2 border-black bg-[#e0b0ff] py-3 font-black text-sm uppercase shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                        ><Printer size={16} /> Print</button>
                        {/* Embed snippet */}
                        <div className="border-2 border-black dark:border-white bg-white dark:bg-[#1a1a1a]">
                          <button onClick={() => setShowEmbed(!showEmbed)}
                            className="w-full flex items-center justify-between px-3 py-2.5 font-black text-xs uppercase tracking-wider dark:text-white"
                          >
                            <span className="flex items-center gap-2"><Code size={14} /> Embed</span>
                            <ChevronDown size={14} className={`transition-transform ${showEmbed ? 'rotate-180' : ''}`} />
                          </button>
                          {showEmbed && (
                            <div className="border-t-2 border-black dark:border-white p-3 space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-wider text-black/50 dark:text-white/50">HTML / Markdown</label>
                              <div className="space-y-1">
                                <button onClick={() => {
                                  const snippet = `<img src="${qrDataUrl}" alt="QR Code: ${text}" width="${qrSize}" height="${qrSize}" />`
                                  navigator.clipboard.writeText(snippet)
                                  setCopied(true); setTimeout(() => setCopied(false), 2000)
                                }}
                                  className="w-full text-left text-[10px] font-mono border-2 border-black bg-[#f0f0f0] dark:bg-[#0f0f0f] dark:text-white p-2 break-all truncate hover:bg-[#fee440] transition-colors"
                                >&lt;img src="qrkuy-qr.png" alt="QR" width="{qrSize}" height="{qrSize}" /&gt;</button>
                                <button onClick={() => {
                                  const md = `![QR Code](${qrDataUrl})`
                                  navigator.clipboard.writeText(md)
                                  setCopied(true); setTimeout(() => setCopied(false), 2000)
                                }}
                                  className="w-full text-left text-[10px] font-mono border-2 border-black bg-[#f0f0f0] dark:bg-[#0f0f0f] dark:text-white p-2 break-all truncate hover:bg-[#fee440] transition-colors"
                                >![QR Code](qrkuy-qr.png)</button>
                              </div>
                              <p className="text-[9px] text-black/40 dark:text-white/40 font-bold">Klik snippet buat copy ke clipboard</p>
                            </div>
                          )}
                        </div>
                        <button onClick={() => { navigator.clipboard.writeText(buildShareURL()); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000) }}
                          className="flex items-center justify-center gap-2 border-2 border-black bg-[#ffd1a9] py-3 font-black text-sm uppercase shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                        >{linkCopied ? <><Check size={16} /> Copied</> : <><CopyCheck size={16} /> Salin Link QR</>}</button>
                      </div>
                      <div className="border-2 border-black bg-white px-3 py-2">
                        <p className="text-xs font-bold break-all line-clamp-2">{text}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-black/20">
                      <QrCode size={64} className="mb-3" />
                      <p className="text-sm font-black uppercase">Hasil muncul disini</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ===== HISTORY ===== */}
        {tab === "history" && (
          <Suspense fallback={<div className="py-16 text-center animate-pulse"><History size={48} className="mx-auto mb-3 text-black/20" /><p className="font-black uppercase text-black/20">Loading...</p></div>}>
            <HistoryTab history={history} onPick={pickHistory} onClear={() => setHistory([])} onDeleteItem={(i) => setHistory(history.filter((_, idx) => idx !== i))} />
          </Suspense>
        )}

        {/* ===== SCAN ===== */}
        {tab === "scan" && (
          <Suspense fallback={<div className="py-16 text-center animate-pulse"><Camera size={48} className="mx-auto mb-3 text-black/20" /><p className="font-black uppercase text-black/20">Loading...</p></div>}>
            <ScanTab
              scanning={scanning}
              scannedText={scannedText}
              scanError={scanError}
              torchEnabled={torchEnabled}
              startScanning={startScanning}
              stopScanning={stopScanning}
              toggleTorch={toggleTorch}
              useScannedText={useScannedText}
              videoRef={videoRef}
              setVideoRef={setVideoRef}
              imageScanning={imageScanning}
              setImageScanning={setImageScanning}
              handleImageScan={handleImageScan}
              clearScannedText={clearScannedText}
            />
          </Suspense>
        )}

        {/* ===== TEMPLATE ===== */}
        {tab === "template" && (
          <Suspense fallback={<div className="py-16 text-center animate-pulse"><FileText size={48} className="mx-auto mb-3 text-black/20" /><p className="font-black uppercase text-black/20">Loading...</p></div>}>
            <TemplateTab text={text} setText={setText} dotColor={dotColor} bgColor={bgColor} dotStyle={dotStyle} eccLevel={eccLevel} gradientEnabled={gradientEnabled} gradientTo={gradientTo} framed={framed} qrSize={qrSize} />
          </Suspense>
        )}

      </main>

      <footer className="border-t-4 border-black bg-[#fee440]">
        <div className="mx-auto max-w-5xl px-4 py-4 text-center">
          <p className="text-sm font-black uppercase">
            Dibuat oleh{" "}
            <a href="https://github.com/ranggacey" className="underline decoration-2 underline-offset-4 hover:bg-black hover:text-[#fee440] px-1 transition-colors">@ranggacey</a>
            {" "} dengan 🔥
          </p>
        </div>
      </footer>
    </div>
  )
}
