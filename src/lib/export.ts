import { drawQR, type DotStyle, type EccLevel, type CornerStyle } from "./qr"

export async function exportSVG(
  text: string,
  dotColor: string,
  bgColor: string,
  dotStyle: "rounded" | "circle" | "square",
  qrSize: number,
  eccLevel: "L" | "M" | "Q" | "H",
  logoImage?: string | null,
  includeLogo: boolean = false,
  framed: boolean = false,
  gradientEnabled?: boolean,
  gradientTo?: string,
  textLogo?: string,
  cornerStyle: CornerStyle = "square",
  transparentBg: boolean = false,
  quietZone: number = 4
): Promise<string> {
  const mod = await import("qrcode-generator")
  const QRCode: any = mod.default || mod
  const qr = QRCode(0, eccLevel)
  qr.addData(text)
  qr.make()

  const mc = qr.getModuleCount()
  const quiet = quietZone
  const ms = Math.floor(qrSize / (mc + quiet * 2))
  const off = (qrSize - mc * ms) / 2

  const useGrad = gradientEnabled && gradientTo
  let fillColor = dotColor

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${qrSize}" height="${qrSize}" viewBox="0 0 ${qrSize} ${qrSize}">`
  if (useGrad) {
    svg += `<defs><linearGradient id="qrGrad" x1="0" y1="0" x2="${qrSize}" y2="${qrSize}"><stop offset="0%" stop-color="${dotColor}"/><stop offset="100%" stop-color="${gradientTo}"/></linearGradient></defs>`
    fillColor = "url(#qrGrad)"
  }
  if (!transparentBg) {
    svg += `<rect width="${qrSize}" height="${qrSize}" fill="${bgColor}"/>`
  }

  if (framed) {
    svg += `<rect x="4" y="4" width="${qrSize - 8}" height="${qrSize - 8}" stroke="#000" stroke-width="8" fill="none"/>`
    const corners = [[0, 0], [qrSize - 16, 0], [0, qrSize - 16], [qrSize - 16, qrSize - 16]]
    for (const [cx, cy] of corners) {
      svg += `<rect x="${cx}" y="${cy}" width="16" height="16" fill="#fee440" stroke="#000" stroke-width="3"/>`
    }
  }

  for (let r = 0; r < mc; r++) {
    for (let c = 0; c < mc; c++) {
      // Skip modules that are part of the finder patterns if we're drawing them separately
      if (cornerStyle !== "square") {
        if ((r < 7 && c < 7) || (r < 7 && c >= mc - 7) || (r >= mc - 7 && c < 7)) {
          continue;
        }
      }
      if (qr.isDark(r, c)) {
        const x = off + c * ms
        const y = off + r * ms
        const pad = Math.max(1, Math.floor(ms * 0.1))
        const w = ms - pad * 2

        if (dotStyle === "circle") {
          svg += `<circle cx="${x + ms / 2}" cy="${y + ms / 2}" r="${w / 2}" fill="${fillColor}"/>`
        } else if (dotStyle === "rounded") {
          const rad = w / 3
          const rx = x + pad
          const ry = y + pad
          svg += `<path d="M${rx + rad},${ry} L${rx + w - rad},${ry} Q${rx + w},${ry} ${rx + w},${ry + rad} L${rx + w},${ry + w - rad} Q${rx + w},${ry + w} ${rx + w - rad},${ry + w} L${rx + rad},${ry + w} Q${rx},${ry + w} ${rx},${ry + w - rad} L${rx},${ry + rad} Q${rx},${ry} ${rx + rad},${ry} Z" fill="${fillColor}"/>`
        } else {
          svg += `<rect x="${x + pad}" y="${y + pad}" width="${w}" height="${w}" fill="${fillColor}"/>`
        }
      }
    }
  }

  // Draw custom corner/eye patterns (finder patterns)
  if (cornerStyle !== "square") {
    const eyeSize = 7 * ms
    const eyePositions = [
      { x: off, y: off }, // top-left
      { x: off + (mc - 7) * ms, y: off }, // top-right
      { x: off, y: off + (mc - 7) * ms }, // bottom-left
    ]
    
    for (const pos of eyePositions) {
      svg += drawCornerEyeSVG(pos.x, pos.y, eyeSize, ms, cornerStyle, fillColor, bgColor, transparentBg)
    }
  }

  if (textLogo) {
    const cx = qrSize / 2
    const cy = qrSize / 2
    const r = ms * 2.5
    svg += `<circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="${bgColor}" stroke="${useGrad ? 'url(#qrGrad)' : dotColor}" stroke-width="2"/>`
    svg += `<clipPath id="textLogoClip"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`
    const safe = textLogo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    svg += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="${useGrad ? 'url(#qrGrad)' : dotColor}" font-family="sans-serif" font-weight="bold" font-size="${r * 0.7}" clip-path="url(#textLogoClip)">${safe}</text>`
  } else if (includeLogo || logoImage) {
    const cx = qrSize / 2
    const cy = qrSize / 2
    const r = ms * 2.5
    svg += `<circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="${bgColor}" stroke="${useGrad ? 'url(#qrGrad)' : dotColor}" stroke-width="2"/>`
    if (logoImage) {
      const s = r * 1.2
      svg += `<clipPath id="logoClip"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`
      svg += `<image href="${logoImage}" x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" clip-path="url(#logoClip)"/>`
    } else if (includeLogo) {
      const s = r * 0.6
      svg += `<path d="M${cx},${cy + s * 0.35} C${cx + s * 1.1},${cy - s * 0.4} ${cx + s * 0.5},${cy - s * 1} ${cx},${cy - s * 0.45} C${cx - s * 0.5},${cy - s * 1} ${cx - s * 1.1},${cy - s * 0.4} ${cx},${cy + s * 0.35} Z" fill="${fillColor}"/>`
    }
  }

  svg += `</svg>`
  return svg
}

function drawCornerEyeSVG(ex: number, ey: number, eyeSize: number, ms: number, style: CornerStyle, fillColor: string, bgColor: string, transparentBg: boolean): string {
    const unit = ms
    const centerX = ex + 3.5 * unit
    const centerY = ey + 3.5 * unit
    const outerR = 3.5 * unit
    const innerR = 1.5 * unit
    let eyeSvg = ''

    const holeFill = transparentBg ? "white" : bgColor
    
    if (style === "rounded") {
      const rad = outerR * 0.5
      // Outer rounded square path
      eyeSvg += `<path d="M${ex + rad},${ey} H${ex + eyeSize - rad} Q${ex + eyeSize},${ey} ${ex + eyeSize},${ey + rad} V${ey + eyeSize - rad} Q${ex + eyeSize},${ey + eyeSize} ${ex + eyeSize - rad},${ey + eyeSize} H${ex + rad} Q${ex},${ey + eyeSize} ${ex},${ey + eyeSize - rad} V${ey + rad} Q${ex},${ey} ${ex + rad},${ey} Z" fill="${fillColor}"/>`
      // Inner circle hole (background color)
      eyeSvg += `<circle cx="${centerX}" cy="${centerY}" r="${innerR}" fill="${holeFill}"/>`
      // Center dot
      eyeSvg += `<circle cx="${centerX}" cy="${centerY}" r="${innerR * 0.6}" fill="${fillColor}"/>`
    } else if (style === "dot") {
        // Circular eye - outer ring
        eyeSvg += `<circle cx="${centerX}" cy="${centerY}" r="${outerR}" fill="${fillColor}"/>`
        // Inner hole
        eyeSvg += `<circle cx="${centerX}" cy="${centerY}" r="${innerR * 1.3}" fill="${holeFill}"/>`
        // Center dot
        eyeSvg += `<circle cx="${centerX}" cy="${centerY}" r="${innerR * 0.7}" fill="${fillColor}"/>`
    } else if (style === "extra-rounded") {
        const rad = outerR
        // Outer rounded square path (almost circle)
        eyeSvg += `<path d="M${ex + rad},${ey} H${ex + eyeSize - rad} Q${ex + eyeSize},${ey} ${ex + eyeSize},${ey + rad} V${ey + eyeSize - rad} Q${ex + eyeSize},${ey + eyeSize} ${ex + eyeSize - rad},${ey + eyeSize} H${ex + rad} Q${ex},${ey + eyeSize} ${ex},${ey + eyeSize - rad} V${ey + rad} Q${ex},${ey} ${ex + rad},${ey} Z" fill="${fillColor}"/>`

        const innerSize = 3 * unit
        const innerX = centerX - innerSize / 2
        const innerY = centerY - innerSize / 2
        const innerRad = innerSize * 0.5
        // Inner rounded square
        eyeSvg += `<path d="M${innerX + innerRad},${innerY} H${innerX + innerSize - innerRad} Q${innerX + innerSize},${innerY} ${innerX + innerSize},${innerY + innerRad} V${innerY + innerSize - innerRad} Q${innerX + innerSize},${innerY + innerSize} ${innerX + innerSize - innerRad},${innerY + innerSize} H${innerX + innerRad} Q${innerX},${innerY + innerSize} ${innerX},${innerY + innerSize - innerRad} V${innerY + innerRad} Q${innerX},${innerY} ${innerX + innerRad},${innerY} Z" fill="${holeFill}"/>`
        
        // Center dot
        eyeSvg += `<circle cx="${centerX}" cy="${centerY}" r="${innerR * 0.6}" fill="${fillColor}"/>`
    }
    return eyeSvg
}


export async function exportPDF(
  svg: string,
  qrSize: number,
): Promise<Blob> {
  const jsPDF = (await import("jspdf")).default
  const orientation = qrSize > 500 ? "l" : "p"
  const doc = new jsPDF({
    orientation,
    unit: "px",
    format: [qrSize + 40, qrSize + 60],
  })
  // Embed SVG as inline image via canvas
  const canvas = document.createElement("canvas")
  canvas.width = qrSize
  canvas.height = qrSize
  const ctx = canvas.getContext("2d")!
  const img = document.createElement("img")
  img.src = "data:image/svg+xml," + encodeURIComponent(svg)
  await new Promise<void>((res, rej) => {
    img.onload = () => res()
    img.onerror = () => rej()
  })
  ctx.drawImage(img, 0, 0, qrSize, qrSize)
  const png = canvas.toDataURL("image/png")
  doc.addImage(png, "PNG", 20, 30, qrSize, qrSize)
  return doc.output("blob")
}

export async function downloadPDF(svg: string, qrSize: number, fileName: string = 'qrkuy-qr.pdf'): Promise<void> {
  const pdfBlob = await exportPDF(svg, qrSize)
  const url = URL.createObjectURL(pdfBlob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function downloadSVG(svg: string, fileName: string = 'qrkuy-qr.svg'): Promise<void> {
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function batchGenerate(
  texts: string[],
  options: {
    dotColor: string
    bgColor: string
    dotStyle: "rounded" | "circle" | "square"
    qrSize: number
    eccLevel: "L" | "M" | "Q" | "H"
    includeLogo?: boolean
    logoImage?: string | null
    gradientEnabled?: boolean
    gradientTo?: string
    framed?: boolean
    textLogo?: string
  },
  onProgress: (current: number, total: number) => void
): Promise<string[]> {
  const results: string[] = []
  
  for (let i = 0; i < texts.length; i++) {
    const dataUrl = await drawQR(
      texts[i],
      options.dotColor,
      options.bgColor,
      options.dotStyle,
      options.includeLogo || false,
      options.qrSize,
      options.eccLevel,
      options.logoImage || null,
      options.gradientEnabled,
      options.gradientTo,
      options.framed,
      options.textLogo,
    )
    results.push(dataUrl)
    onProgress(i + 1, texts.length)
  }
  
  return results
}

export function parseCSV(csvText: string): string[] {
  const lines = csvText.trim().split('\n')
  return lines.map(line => {
    const match = line.match(/^"(.*)"$/)?.[1] || line.split(',')[0]
    return match.trim()
  }).filter(Boolean)
}

export function downloadBatch(dataUrls: string[], prefix: string = 'qrkuy') {
  dataUrls.forEach((dataUrl, i) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${prefix}-${String(i + 1).padStart(4, '0')}.png`
    a.click()
  })
}

export async function createAnimatedQR(
  texts: string[],
  options: {
    dotColor: string
    bgColor: string
    dotStyle: "rounded" | "circle" | "square"
    qrSize: number
    eccLevel: "L" | "M" | "Q" | "H"
    frameDelay: number // ms
  }
): Promise<Blob> {
  const frames: string[] = []
  
  for (const text of texts) {
    const dataUrl = await drawQR(
      text,
      options.dotColor,
      options.bgColor,
      options.dotStyle,
      false,
      options.qrSize,
      options.eccLevel
    )
    frames.push(dataUrl)
  }
  
  // Create GIF using canvas
  // For simplicity, return first frame - full GIF needs gif.js or similar
  return await (await fetch(frames[0])).blob()
}

export async function downloadBatchAsZip(
  texts: string[],
  options: {
    dotColor: string
    bgColor: string
    dotStyle: "rounded" | "circle" | "square"
    qrSize: number
    eccLevel: "L" | "M" | "Q" | "H"
    includeLogo?: boolean
    logoImage?: string | null
    gradientEnabled?: boolean
    gradientTo?: string
    framed?: boolean
    prefix?: string
    textLogo?: string
  },
  onProgress: (current: number, total: number) => void
): Promise<void> {
  const JSZip = (await import("jszip")).default
  const zip = new JSZip()
  
  for (let i = 0; i < texts.length; i++) {
    const dataUrl = await drawQR(
      texts[i],
      options.dotColor,
      options.bgColor,
      options.dotStyle,
      options.includeLogo || false,
      options.qrSize,
      options.eccLevel,
      options.logoImage || null,
      options.gradientEnabled,
      options.gradientTo,
      options.framed,
      options.textLogo,
    )
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    
    const fileName = `${options.prefix || 'qrkuy'}-${String(i + 1).padStart(4, '0')}.png`
    zip.file(fileName, blob)
    
    onProgress(i + 1, texts.length)
  }
  
  const zipBlob = await zip.generateAsync({ type: "blob" })
  
  // Trigger download
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${options.prefix || 'qrkuy'}-batch-${Date.now()}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function downloadBatchAsPDF(
  texts: string[],
  options: {
    dotColor: string
    bgColor: string
    dotStyle: "rounded" | "circle" | "square"
    qrSize: number
    eccLevel: "L" | "M" | "Q" | "H"
    includeLogo?: boolean
    logoImage?: string | null
    gradientEnabled?: boolean
    gradientTo?: string
    framed?: boolean
    textLogo?: string
  },
  onProgress: (current: number, total: number) => void
): Promise<void> {
  const jsPDF = (await import("jspdf")).default
  
  // Calculate grid layout based on QR count
  const count = texts.length
  const cols = count <= 4 ? 2 : count <= 9 ? 3 : 4
  const rows = Math.ceil(count / cols)
  
  // Scale QR to fit page (A4: 595 x 842 px)
  const pageWidth = 595
  const pageHeight = 842
  const margin = 20
  const spacing = 10
  
  // Calculate QR size that fits in grid
  const availableWidth = pageWidth - margin * 2
  const availableHeight = pageHeight - margin * 2 - 40 // 40 for title
  const qrWidth = (availableWidth - spacing * (cols - 1)) / cols
  const qrHeight = (availableHeight - spacing * (rows - 1)) / rows
  const displaySize = Math.min(qrWidth, qrHeight, 150) // Max 150px per QR
  
  const doc = new jsPDF({
    orientation: "p",
    unit: "px",
    format: "a4",
  })
  
  // Add title
  doc.setFontSize(14)
  doc.setFont("helvetica", "bold")
  doc.text(`QRkuy Batch - ${count} QR Codes`, pageWidth / 2, margin + 10, { align: "center" })
  
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i]
    
    // Generate QR as data URL
    const dataUrl = await drawQR(
      text,
      options.dotColor,
      options.bgColor,
      options.dotStyle,
      options.includeLogo || false,
      options.qrSize,
      options.eccLevel,
      options.logoImage || null,
      options.gradientEnabled,
      options.gradientTo,
      options.framed,
      options.textLogo,
    )
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = margin + col * (displaySize + spacing)
    const y = margin + 40 + row * (displaySize + spacing + 20) // Extra 20 for label
    
    // Add QR image
    doc.addImage(dataUrl, "PNG", x, y, displaySize, displaySize)
    
    // Add text label (truncated)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    const label = text.length > 25 ? text.slice(0, 22) + "..." : text
    doc.text(label, x + displaySize / 2, y + displaySize + 10, { align: "center" })
    
    // Add new page if needed (but not after last item)
    if ((i + 1) % (cols * rows) === 0 && i < texts.length - 1) {
      doc.addPage()
    }
    
    onProgress(i + 1, texts.length)
  }
  
  const pdfBlob = doc.output("blob")
  const url = URL.createObjectURL(pdfBlob)
  const a = document.createElement("a")
  a.href = url
  a.download = `qrkuy-batch-${Date.now()}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl)
  return response.blob()
}

export function checkAccessibility(
  dotColor: string,
  bgColor: string,
  qrSize: number
): { passed: boolean; issues: string[]; contrast: number } {
  // Calculate luminance
  const luminance = (color: string) => {
    const hex = color.replace('#', '')
    const r = parseInt(hex.slice(0, 2), 16) / 255
    const g = parseInt(hex.slice(2, 4), 16) / 255
    const b = parseInt(hex.slice(4, 6), 16) / 255
    const srgb = [r, g, b].map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
  }

  const L1 = luminance(dotColor)
  const L2 = luminance(bgColor)
  const contrast = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)

  const issues: string[] = []
  if (contrast < 4.5) {
    issues.push(`Kontras terlalu rendah (${contrast.toFixed(2)}:1) - minimum 4.5:1 untuk WCAG AA`)
  }
  if (qrSize < 200) {
    issues.push('Ukuran QR < 200px - sulit discan dari jarak jauh')
  }
  if (qrSize > 1000) {
    issues.push('Ukuran QR > 1000px - file terlalu besar untuk share')
  }

  return {
    passed: issues.length === 0,
    issues,
    contrast: Number(contrast.toFixed(2))
  }
}