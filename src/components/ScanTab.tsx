import { useRef, useState } from "react"
import { Camera, XCircle, CheckCircle, Zap, Loader2, Sun, Upload, X, ClipboardPasteIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ScanTabProps {
  scanning: boolean
  scannedText: string
  scanError: string
  torchEnabled: boolean
  startScanning: () => void
  stopScanning: () => void
  toggleTorch: () => void
  useScannedText: () => void
  videoRef: HTMLVideoElement | null
  setVideoRef: (el: HTMLVideoElement | null) => void
  imageScanning: boolean
  setImageScanning: (v: boolean) => void
  handleImageScan: (file: File) => Promise<void>
  clearScannedText: () => void
}

export default function ScanTab({
  scanning,
  scannedText,
  scanError,
  torchEnabled,
  startScanning,
  stopScanning,
  toggleTorch,
  useScannedText,
  videoRef,
  setVideoRef,
  imageScanning,
  setImageScanning,
  handleImageScan,
  clearScannedText,
}: ScanTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [clipboardPasting, setClipboardPasting] = useState(false)

  const handleClipboardPaste = async () => {
    try {
      setClipboardPasting(true)
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const imageType = item.types.find(t => t.startsWith("image/"))
        if (imageType) {
          const blob = await item.getType(imageType)
          const file = new File([blob], "clipboard.png", { type: imageType })
          await handleImageScan(file)
          setClipboardPasting(false)
          return
        }
      }
      setClipboardPasting(false)
      alert("Clipboard gak ada gambar QR")
    } catch {
      setClipboardPasting(false)
      alert("Gagal baca clipboard. Butuh izin clipboard.")
    }
  }
  return (
    <Card className="shadow-[4px_4px_0px_0px_#000]">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Camera size={16} /> Scan QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Camera view */}
        <div className="relative border-4 border-black bg-black aspect-video flex items-center justify-center overflow-hidden">
          {scanning ? (
            <>
              <video
                ref={(el) => setVideoRef(el)}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
              />
              {/* Scan overlay */}
              <div className="absolute inset-0 border-[3px] border-[#fee440] opacity-60 pointer-events-none" />
              <div className="absolute top-3 left-3 right-3 flex justify-between">
                <span className="bg-black text-[#fee440] text-[10px] font-black px-2 py-1 uppercase tracking-wider">
                  Scanning...
                </span>
                <button
                  onClick={toggleTorch}
                  className="bg-black text-white p-1.5 border-2 border-white hover:bg-[#fee440] hover:text-black transition-colors"
                  title={torchEnabled ? "Matikan senter" : "Nyalakan senter"}
                >
                  <Sun size={16} className={torchEnabled ? "text-[#fee440]" : ""} />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center text-white/60 p-8">
              <Camera size={48} className="mx-auto mb-3 opacity-40" />
              <p className="font-black text-sm uppercase tracking-wider">Tekan Mulai Scan untuk membuka kamera</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {!scanning ? (
            <button
              onClick={startScanning}
              className="flex-1 flex items-center justify-center gap-2 border-3 border-black bg-[#fee440] py-3 font-black text-sm uppercase shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
            >
              <Zap size={18} /> Mulai Scan
            </button>
          ) : (
            <button
              onClick={stopScanning}
              className="flex-1 flex items-center justify-center gap-2 border-3 border-black bg-[#ff6b6b] py-3 font-black text-sm uppercase shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
            >
              <XCircle size={18} /> Stop Scan
            </button>
          )}
        </div>

        {/* Image Upload Scan & Clipboard */}
        <div className="flex gap-2">
          <button
            onClick={handleClipboardPaste}
            disabled={scanning || imageScanning || clipboardPasting}
            className="flex-1 flex items-center justify-center gap-2 border-2 border-black bg-[#d0f0c0] py-3 font-black text-sm uppercase shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all disabled:opacity-50"
          >
            <ClipboardPasteIcon size={18} /> {clipboardPasting ? "Memproses..." : "Paste dari Clipboard"}
          </button>
          <label
            className="flex-1 flex items-center justify-center gap-2 border-2 border-black bg-[#a0e3ff] py-3 font-black text-sm uppercase shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all cursor-pointer"
          >
            <Upload size={18} /> Upload Gambar
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) {
                  setImageScanning(true)
                  await handleImageScan(file)
                  setImageScanning(false)
                }
                if (fileInputRef.current) fileInputRef.current.value = ""
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={scanning || imageScanning}
            />
            {imageScanning && <Loader2 size={18} className="animate-spin" />}
          </label>
        </div>

        {/* Error */}
        {scanError && (
          <div className="border-2 border-black bg-[#ff6b6b] px-4 py-3 font-black text-sm shadow-[3px_3px_0px_0px_#000]">
            ⚠ {scanError}
          </div>
        )}

        {/* Scanned result */}
        {scannedText && (
          <div className="space-y-2">
            <div className="border-2 border-black bg-[#d0f0c0] px-4 py-3 font-bold text-sm shadow-[2px_2px_0px_0px_#000] flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600 shrink-0" />
              <span className="break-all flex-1">{scannedText}</span>
              <button
                onClick={clearScannedText}
                className="p-1 text-black/40 hover:text-black transition-colors"
                aria-label="Hapus hasil scan"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={useScannedText}
                className="flex-1 flex items-center justify-center gap-2 border-2 border-black bg-[#a0e3ff] py-2.5 font-black text-xs uppercase shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
              >
                <Zap size={14} /> Buat QR dari hasil scan
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(scannedText)}
                className="flex items-center justify-center gap-2 border-2 border-black bg-white py-2.5 px-4 font-black text-xs uppercase shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
              >
                Salin
              </button>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="border-2 border-black bg-white px-4 py-3 text-xs font-bold text-black/60">
          Gunakan kamera untuk memindai QR code. Membutuhkan izin kamera dan browser modern (Chrome 81+, Edge 81+, Safari 16.4+).
        </div>
      </CardContent>
    </Card>
  )
}
