"use client"

import { useState, useCallback, useEffect } from "react"
import { 
  Zap, FileArchive, Loader2, X, Printer, FileText
} from "lucide-react"
import { QR_TEMPLATES } from "@/lib/templates"
import { checkAccessibility, downloadBatchAsZip, downloadBatchAsPDF } from "@/lib/export"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TemplateTabProps {
  text: string
  setText: (t: string) => void
  dotColor: string
  bgColor: string
  dotStyle: "rounded" | "circle" | "square"
  eccLevel: "L" | "M" | "Q" | "H"
  gradientEnabled: boolean
  gradientTo: string
  framed: boolean
  qrSize: number
}

export default function TemplateTab({ text, setText, dotColor, bgColor, dotStyle, eccLevel, gradientEnabled, gradientTo, framed, qrSize }: TemplateTabProps) {
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null)
  const [templateData, setTemplateData] = useState<Record<string, string>>({})
  const [showAll, setShowAll] = useState<Record<string, boolean>>({})
  const [accessibility, setAccessibility] = useState<{
    passed: boolean
    issues: string[]
    contrast: number
  } | null>(null)

  // Batch generation state
  const [batchMode, setBatchMode] = useState(false)
  const [batchInput, setBatchInput] = useState("")
  const [batchProgress, setBatchProgress] = useState(0)
  const [batchGenerating, setBatchGenerating] = useState(false)
  const [batchExportFormat, setBatchExportFormat] = useState<'zip' | 'pdf'>('zip')

  // Check accessibility when colors change
  useEffect(() => {
    const result = checkAccessibility(dotColor, bgColor, qrSize)
    setAccessibility(result)
  }, [dotColor, bgColor, qrSize])

  const handleBatchGenerate = useCallback(async () => {
    if (!batchInput.trim() || batchGenerating) return
    
    const texts = batchInput.trim().split('\n').map(t => t.trim()).filter(Boolean)
    if (texts.length === 0) return
    
    setBatchGenerating(true)
    setBatchProgress(0)
    
    try {
      if (batchExportFormat === 'pdf') {
        await downloadBatchAsPDF(texts, {
          dotColor,
          bgColor,
          dotStyle,
          qrSize,
          eccLevel,
          gradientEnabled,
          gradientTo,
          framed,
        }, (current, total) => {
          setBatchProgress(Math.round((current / total) * 100))
        })
      } else {
        await downloadBatchAsZip(texts, {
          dotColor,
          bgColor,
          dotStyle,
          qrSize,
          eccLevel,
          gradientEnabled,
          gradientTo,
          framed,
          prefix: "qrkuy"
        }, (current, total) => {
          setBatchProgress(Math.round((current / total) * 100))
        })
      }
    } catch (error) {
      console.error("Batch generation error:", error)
      alert("Gagal generate batch QR: " + (error as Error).message)
    } finally {
      setBatchGenerating(false)
      setBatchProgress(0)
    }
  }, [batchInput, batchGenerating, dotColor, bgColor, dotStyle, qrSize, eccLevel, gradientEnabled, gradientTo, framed, batchExportFormat])

  const handleTemplateSelect = useCallback((template: typeof QR_TEMPLATES[0]) => {
    setActiveTemplate(template.id)
    const initialData: Record<string, string> = {}
    template.fields.forEach(f => {
      initialData[f.key] = f.default || ''
    })
    setTemplateData(initialData)
  }, [])

  const buildFromTemplate = useCallback((template: typeof QR_TEMPLATES[0], data: Record<string, string>) => {
    try {
      const url = template.build(data)
      setText(url)
      setActiveTemplate(null)
      setTemplateData({})
    } catch (e) {
      console.error('Template build error:', e)
    }
  }, [setText])

  // Categorize templates
  const categories: Record<string, string[]> = {
    'Konektivitas': ['wifi', 'social', 'whatsapp', 'email', 'sms', 'tel', 'geo'],
    'Bisnis': ['vcard', 'event'],
    'Konten': ['url'],
  }

  const getCategory = (id: string) => {
    for (const [cat, ids] of Object.entries(categories)) {
      if (ids.includes(id)) return cat
    }
    return 'Lainnya'
  }

  const groupedTemplates = QR_TEMPLATES.reduce((acc, t) => {
    const cat = getCategory(t.id)
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(t)
    return acc
  }, {} as Record<string, typeof QR_TEMPLATES>)

  const categoryColors: Record<string, string> = {
    'Konektivitas': 'shadow-[4px_4px_0px_0px_#a0e3ff]',
    'Bisnis': 'shadow-[4px_4px_0px_0px_#d0f0c0]',
    'Konten': 'shadow-[4px_4px_0px_0px_#ffaacc]',
  }

  return (
    <div className="space-y-4">
      {/* Accessibility Check */}
      {accessibility && (
        <div className={`border-2 border-black p-3 font-bold text-xs ${accessibility.passed ? "bg-[#d0f0c0]" : "bg-[#ff6b6b]"} shadow-[3px_3px_0px_0px_#000]`}>
          <span>
            {accessibility.passed
              ? `✓ WCAG AA — Kontras ${accessibility.contrast}:1`
              : `✗ Aksesibilitas — ${accessibility.issues[0]}`}
          </span>
        </div>
      )}

      {/* Print Button - only show when text exists */}
      {text && (
        <button onClick={() => window.print()}
          className="w-full flex items-center justify-center gap-2 border-2 border-black bg-[#e0b0ff] py-3 font-black text-sm uppercase shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
        ><Printer size={16} /> Print QR</button>
      )}

      {/* Template Categories */}
      <div className="space-y-4">
        {Object.entries(groupedTemplates).map(([category, templates]) => (
          <Card key={category} className={`${categoryColors[category] || 'shadow-[4px_4px_0px_0px_#000]'}`}>
            <CardHeader className="flex flex-row items-center justify-between p-3">
              <CardTitle className="text-xs font-black uppercase tracking-wider">{category}</CardTitle>
              {templates.length > 3 && (
                <button
                  onClick={() => setShowAll(s => ({ ...s, [category]: !s[category] }))}
                  className="text-xs font-black uppercase border-2 border-black bg-white px-2 py-1 hover:shadow-[2px_2px_0px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                >
                  {showAll[category] ? "Tutup" : `+${templates.length - 3}`}
                </button>
              )}
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {templates.slice(0, showAll[category] ? undefined : 3).map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`relative p-3 border-2 border-black text-left transition-all ${
                      activeTemplate === template.id
                        ? "bg-black text-[#fee440] shadow-[3px_3px_0px_0px_#fee440]"
                        : "bg-white shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{template.icon}</span>
                      <span className="font-black text-sm">{template.label}</span>
                    </div>
                    <p className={`text-xs font-bold line-clamp-1 ${activeTemplate === template.id ? "text-[#fee440]/70" : "text-black/50"}`}>
                      {template.description}
                    </p>
                    {activeTemplate === template.id && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#fee440] border-2 border-black flex items-center justify-center">
                        <span className="text-black text-[8px] font-black">✓</span>
                      </div>
                    )}
                  </button>
                ))}
                {templates.length > 3 && !showAll[category] && (
                  <button
                    onClick={() => setShowAll(s => ({ ...s, [category]: true }))}
                    className="col-span-full text-center text-xs font-black border-2 border-black bg-[#e0e0e0] py-2 hover:bg-[#fee440] transition-colors shadow-[2px_2px_0px_0px_#000]"
                  >
                    +{templates.length - 3} template lagi...
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Template Form */}
      {activeTemplate && (
        <Card className="border-2 border-black shadow-[4px_4px_0px_0px_#fee440] bg-[#fee440]/20">
          <CardHeader className="flex flex-row items-center justify-between p-3">
            <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
              <span className="text-lg">{QR_TEMPLATES.find(t => t.id === activeTemplate)?.icon}</span>
              {QR_TEMPLATES.find(t => t.id === activeTemplate)?.label}
            </CardTitle>
            <button
              onClick={() => setActiveTemplate(null)}
              className="border-2 border-black bg-white p-1 hover:bg-[#ff6b6b] transition-colors"
            >
              <X size={14} />
            </button>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            {QR_TEMPLATES.find(t => t.id === activeTemplate)?.fields.map((field) => (
              <div key={field.key} className="space-y-1">
                <span className="text-xs font-black uppercase tracking-wider block">{field.label} {field.required && <span className="text-red-500">*</span>}</span>
                {field.type === 'select' ? (
                  <div className="border-2 border-black bg-white">
                    <select
                      value={templateData[field.key] || field.default || ''}
                      onChange={(e) => setTemplateData({...templateData, [field.key]: e.target.value})}
                      className="w-full border-0 bg-transparent px-3 py-2 text-xs font-bold focus:outline-none"
                    >
                      {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={templateData[field.key] || ''}
                    onChange={(e) => setTemplateData({...templateData, [field.key]: e.target.value})}
                    placeholder={field.placeholder}
                    className="w-full border-2 border-black bg-white px-3 py-2 text-xs font-bold placeholder:text-black/30 focus:outline-none focus:shadow-[2px_2px_0px_0px_#000] resize-none"
                    rows={3}
                  />
                ) : (
                  <input
                    type={field.type || 'text'}
                    value={templateData[field.key] || ''}
                    onChange={(e) => setTemplateData({...templateData, [field.key]: e.target.value})}
                    placeholder={field.placeholder}
                    className="w-full border-2 border-black bg-white px-3 py-2 text-xs font-bold placeholder:text-black/30 focus:outline-none focus:shadow-[2px_2px_0px_0px_#000]"
                    step={field.step}
                  />
                )}
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button 
                className="flex-1 flex items-center justify-center border-2 border-black bg-[#fee440] px-3 py-2 font-black text-xs uppercase shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all"
                onClick={() => buildFromTemplate(QR_TEMPLATES.find(t => t.id === activeTemplate)!, templateData)}
              >
                <Zap className="w-3 h-3 mr-1" /> Buat QR
              </button>
              <button className="flex-1 border-2 border-black bg-white px-3 py-2 font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all" onClick={() => setActiveTemplate(null)}>
                Batal
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Generation */}
      <Card className="shadow-[4px_4px_0px_0px_#e0b0ff]">
        <CardHeader className="flex flex-row items-center justify-between p-3">
          <CardTitle className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
            <Zap size={14} /> Batch Generate
          </CardTitle>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={batchMode} onChange={(e) => setBatchMode(e.target.checked)} className="sr-only peer" />
            <div className="w-10 h-5 bg-white border-2 border-black peer-checked:bg-[#fee440] after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-black after:w-3.5 after:h-3 after:transition-all peer-checked:after:translate-x-5"></div>
          </label>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {batchMode ? (
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider block">Paste banyak baris (satu QR per baris)</span>
              <textarea
                value={batchInput}
                onChange={(e) => setBatchInput(e.target.value)}
                placeholder={"https://site1.com\nhttps://site2.com\nHello World\nWIFI:S:MyWiFi;T:WPA;P:password;;"}
                className="w-full border-2 border-black bg-white px-3 py-2 text-xs font-bold placeholder:text-black/30 focus:outline-none focus:shadow-[2px_2px_0px_0px_#000] font-mono resize-none h-32"
              />
              {/* Format selector */}
              <div className="flex gap-2 items-center">
                <span className="text-xs font-black uppercase">Format:</span>
                <button
                  onClick={() => setBatchExportFormat('zip')}
                  className={`flex-1 flex items-center justify-center gap-1 border-2 border-black px-3 py-2 font-black text-xs uppercase transition-all ${
                    batchExportFormat === 'zip'
                      ? "bg-[#fee440] shadow-[2px_2px_0px_0px_#000]"
                      : "bg-white shadow-[1px_1px_0px_0px_#000] opacity-60"
                  }`}
                >
                  <FileArchive size={14} /> ZIP
                </button>
                <button
                  onClick={() => setBatchExportFormat('pdf')}
                  className={`flex-1 flex items-center justify-center gap-1 border-2 border-black px-3 py-2 font-black text-xs uppercase transition-all ${
                    batchExportFormat === 'pdf'
                      ? "bg-[#fee440] shadow-[2px_2px_0px_0px_#000]"
                      : "bg-white shadow-[1px_1px_0px_0px_#000] opacity-60"
                  }`}
                >
                  <FileText size={14} /> PDF
                </button>
              </div>
              <div className="flex gap-2">
                <button 
                  className="flex-1 flex items-center justify-center border-2 border-black bg-[#e0b0ff] px-3 py-2 font-black text-xs uppercase shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all disabled:opacity-50"
                  disabled={batchGenerating || !batchInput.trim()}
                  onClick={handleBatchGenerate}
                >
                  {batchGenerating ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> {batchProgress}%</>
                  ) : (
                    <>{batchExportFormat === 'pdf' ? <><FileText className="w-3 h-3 mr-1" /> Generate as PDF</> : <><FileArchive className="w-3 h-3 mr-1" /> Generate All as ZIP</>}</>
                  )}
                </button>
                <button className="border-2 border-black bg-white px-3 py-2 font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all" onClick={() => { setBatchMode(false); setBatchInput("") }}>
                  Batal
                </button>
              </div>
              {batchProgress > 0 && batchProgress < 100 && (
                <div className="h-2 bg-white border-2 border-black overflow-hidden">
                  <div className="h-full bg-black transition-all" style={{ width: `${batchProgress}%` }} />
                </div>
              )}
            </div>
          ) : (
            <button className="w-full flex items-center justify-center border-2 border-black bg-white px-3 py-2 font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all" onClick={() => setBatchMode(true)}>
              <Zap className="w-3 h-3 mr-1" /> Generate Multiple QR Codes
            </button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
