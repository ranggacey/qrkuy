export type DotStyle = "rounded" | "circle" | "square"
export type EccLevel = "L" | "M" | "Q" | "H"
export type CornerStyle = "square" | "rounded" | "dot" | "extra-rounded"

export interface QROptions {
  text: string
  dotColor: string
  bgColor: string
  dotStyle: DotStyle
  includeLogo: boolean
  qrSize: number
  eccLevel: EccLevel
  logoImage?: string | null
  gradientEnabled?: boolean
  gradientTo?: string
  framed?: boolean
  textLogo?: string
  bgImage?: string | null
  cornerStyle?: CornerStyle
  transparentBg?: boolean
  quietZone?: number
}

export interface QRMeta {
  version: number
  maxCapacity: { L: number; M: number; Q: number; H: number }
  currentCapacity: number
  utilizationPercent: number
}

function getQRVersion(text: string, eccLevel: EccLevel): number {
  const mod = require("qrcode-generator")
  const QRCode: any = mod.default || mod
  const qr = QRCode(0, eccLevel)
  qr.addData(text)
  qr.make()
  return qr.getModuleCount() ? Math.ceil((qr.getModuleCount() - 17) / 4) + 1 : 1
}

function getCapacity(version: number, eccLevel: EccLevel): number {
  const capacities: Record<number, Record<EccLevel, number>> = {
    1: { L: 41, M: 34, Q: 27, H: 17 },
    2: { L: 77, M: 63, Q: 48, H: 34 },
    3: { L: 127, M: 101, Q: 77, H: 58 },
    4: { L: 187, M: 149, Q: 111, H: 82 },
    5: { L: 255, M: 202, Q: 144, H: 106 },
    6: { L: 322, M: 255, Q: 178, H: 139 },
    7: { L: 370, M: 293, Q: 207, H: 154 },
    8: { L: 461, M: 365, Q: 259, H: 202 },
    9: { L: 552, M: 432, Q: 312, H: 235 },
    10: { L: 652, M: 513, Q: 364, H: 288 },
    11: { L: 772, M: 604, Q: 427, H: 331 },
    12: { L: 883, M: 691, Q: 489, H: 374 },
    13: { L: 1022, M: 796, Q: 580, H: 427 },
    14: { L: 1101, M: 871, Q: 621, H: 468 },
    15: { L: 1250, M: 991, Q: 703, H: 530 },
    16: { L: 1408, M: 1082, Q: 775, H: 602 },
    17: { L: 1548, M: 1212, Q: 876, H: 674 },
    18: { L: 1725, M: 1346, Q: 948, H: 746 },
    19: { L: 1903, M: 1500, Q: 1063, H: 813 },
    20: { L: 2061, M: 1600, Q: 1159, H: 919 },
    21: { L: 2232, M: 1708, Q: 1224, H: 969 },
    22: { L: 2409, M: 1872, Q: 1358, H: 1056 },
    23: { L: 2620, M: 2059, Q: 1468, H: 1108 },
    24: { L: 2812, M: 2188, Q: 1588, H: 1228 },
    25: { L: 3057, M: 2395, Q: 1718, H: 1286 },
    26: { L: 3283, M: 2544, Q: 1804, H: 1425 },
    27: { L: 3517, M: 2701, Q: 1933, H: 1501 },
    28: { L: 3669, M: 2857, Q: 2085, H: 1581 },
    29: { L: 3909, M: 3035, Q: 2181, H: 1677 },
    30: { L: 4158, M: 3289, Q: 2358, H: 1782 },
    31: { L: 4417, M: 3486, Q: 2473, H: 1897 },
    32: { L: 4686, M: 3693, Q: 2670, H: 2022 },
    33: { L: 4965, M: 3909, Q: 2805, H: 2157 },
    34: { L: 5253, M: 4134, Q: 2949, H: 2301 },
    35: { L: 5529, M: 4343, Q: 3081, H: 2361 },
    36: { L: 5836, M: 4588, Q: 3244, H: 2524 },
    37: { L: 6153, M: 4775, Q: 3417, H: 2625 },
    38: { L: 6479, M: 5039, Q: 3599, H: 2735 },
    39: { L: 6743, M: 5313, Q: 3791, H: 2927 },
    40: { L: 7089, M: 5596, Q: 3993, H: 3057 },
  }
  return capacities[version]?.[eccLevel] || capacities[40][eccLevel]
}

export async function getQRMeta(text: string, eccLevel: EccLevel): Promise<QRMeta> {
  const version = await getQRVersion(text, eccLevel)
  const maxCap = getCapacity(version, eccLevel)
  const currentLen = text.length
  return {
    version,
    maxCapacity: { L: getCapacity(version, "L"), M: getCapacity(version, "M"), Q: getCapacity(version, "Q"), H: getCapacity(version, "H") },
    currentCapacity: currentLen,
    utilizationPercent: Math.min(100, Math.round((currentLen / maxCap) * 100))
  }
}

export async function drawQR(
  text: string,
  dotColor: string,
  bgColor: string,
  dotStyle: DotStyle,
  includeLogo: boolean,
  qrSize: number,
  eccLevel: EccLevel = "M",
  logoImage?: string | null,
  gradientEnabled?: boolean,
  gradientTo?: string,
  framed?: boolean,
  textLogo?: string,
  bgImage?: string | null,
  cornerStyle: CornerStyle = "square",
  transparentBg: boolean = false,
  quietZone: number = 4
): Promise<string> {
  const mod = await import("qrcode-generator")
  const QRCode: any = mod.default || mod
  const qr = QRCode(0, eccLevel)
  qr.addData(text)
  qr.make()

  const canvas = document.createElement("canvas")
  canvas.width = qrSize; canvas.height = qrSize
  const ctx = canvas.getContext("2d")!
  const mc = qr.getModuleCount()
  const quiet = quietZone
  const ms = Math.floor(qrSize / (mc + quiet * 2))
  const off = (qrSize - mc * ms) / 2

  if (!transparentBg) {
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, qrSize, qrSize)
  }

  // Draw background image if provided
  if (bgImage) {
    const img = document.createElement("img")
    img.src = bgImage
    await new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res() })
    // Cover fit: fill entire canvas with the image, cropping as needed
    const imgRatio = img.width / img.height
    const canvasRatio = qrSize / qrSize
    let drawW, drawH, drawX, drawY
    if (imgRatio > canvasRatio) {
      drawH = qrSize; drawW = img.width * (qrSize / img.height); drawX = (qrSize - drawW) / 2; drawY = 0
    } else {
      drawW = qrSize; drawH = img.height * (qrSize / img.width); drawX = 0; drawY = (qrSize - drawH) / 2
    }
    ctx.drawImage(img, drawX, drawY, drawW, drawH)
    // Overlay semi-transparent bg color for better QR readability
    ctx.fillStyle = bgColor + 'cc' // 80% opacity hex
    ctx.fillRect(0, 0, qrSize, qrSize)
  }

  // Prepare gradient fill if enabled
  let fillFn: (x: number, y: number, w: number) => string | CanvasGradient
  if (gradientEnabled && gradientTo) {
    const grad = ctx.createLinearGradient(0, 0, qrSize, qrSize)
    grad.addColorStop(0, dotColor)
    grad.addColorStop(1, gradientTo)
    fillFn = () => grad
  } else {
    fillFn = () => dotColor
  }

  for (let r = 0; r < mc; r++) {
    for (let c = 0; c < mc; c++) {
      if (qr.isDark(r, c)) {
        const x = off + c * ms, y = off + r * ms
        const pad = Math.max(1, Math.floor(ms * 0.1))
        const w = ms - pad * 2
        ctx.fillStyle = fillFn(x, y, w)
        if (dotStyle === "circle") {
          ctx.beginPath(); ctx.arc(x + ms / 2, y + ms / 2, w / 2, 0, Math.PI * 2); ctx.fill()
        } else if (dotStyle === "rounded") {
          const rad = w / 3; const rx = x + pad, ry = y + pad
          ctx.beginPath()
          ctx.moveTo(rx + rad, ry); ctx.lineTo(rx + w - rad, ry)
          ctx.quadraticCurveTo(rx + w, ry, rx + w, ry + rad)
          ctx.lineTo(rx + w, ry + w - rad); ctx.quadraticCurveTo(rx + w, ry + w, rx + w - rad, ry + w)
          ctx.lineTo(rx + rad, ry + w); ctx.quadraticCurveTo(rx, ry + w, rx, ry + w - rad)
          ctx.lineTo(rx, ry + rad); ctx.quadraticCurveTo(rx, ry, rx + rad, ry)
          ctx.closePath(); ctx.fill()
        } else {
          ctx.fillRect(x + pad, y + pad, w, w)
        }
      }
    }
  }

  // Draw custom corner/eye patterns (finder patterns)
  if (cornerStyle !== "square") {
    const eyeSize = 7 * ms // 7x7 modules for each eye
    const eyeOffset = off - quiet * ms
    const eyePositions = [
      { x: eyeOffset, y: eyeOffset }, // top-left
      { x: off + (mc - 7) * ms, y: eyeOffset }, // top-right
      { x: eyeOffset, y: off + (mc - 7) * ms }, // bottom-left
    ]
    
    ctx.fillStyle = fillFn(0, 0, 0)
    
    for (const pos of eyePositions) {
      drawCornerEye(ctx, pos.x, pos.y, eyeSize, ms, cornerStyle)
    }
  }

  function drawCornerEye(ctx: CanvasRenderingContext2D, ex: number, ey: number, eyeSize: number, ms: number, style: CornerStyle) {
    const unit = ms
    const centerX = ex + 3 * unit
    const centerY = ey + 3 * unit
    const outerR = 3 * unit
    const innerR = 1.5 * unit
    
    if (style === "rounded") {
      // Outer rounded square
      ctx.beginPath()
      const rad = outerR * 0.3
      ctx.moveTo(ex + rad, ey)
      ctx.lineTo(ex + eyeSize - rad, ey)
      ctx.quadraticCurveTo(ex + eyeSize, ey, ex + eyeSize, ey + rad)
      ctx.lineTo(ex + eyeSize, ey + eyeSize - rad)
      ctx.quadraticCurveTo(ex + eyeSize, ey + eyeSize, ex + eyeSize - rad, ey + eyeSize)
      ctx.lineTo(ex + rad, ey + eyeSize)
      ctx.quadraticCurveTo(ex, ey + eyeSize, ex, ey + eyeSize - rad)
      ctx.lineTo(ex, ey + rad)
      ctx.quadraticCurveTo(ex, ey, ex + rad, ey)
      ctx.closePath()
      ctx.fill()
      
      // Inner hole (white/background)
      if (!transparentBg) ctx.fillStyle = bgColor
      else ctx.clearRect(0, 0, qrSize, qrSize), ctx.fillStyle = "transparent"
      ctx.beginPath()
      ctx.arc(centerX, centerY, innerR, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = fillFn(0, 0, 0)
      
      // Center dot
      ctx.beginPath()
      ctx.arc(centerX, centerY, innerR * 0.5, 0, Math.PI * 2)
      ctx.fill()
    } else if (style === "dot") {
      // Circular eye - outer ring
      ctx.beginPath()
      ctx.arc(centerX, centerY, outerR, 0, Math.PI * 2)
      ctx.fill()
      
      // Inner hole
      if (!transparentBg) ctx.fillStyle = bgColor
      ctx.beginPath()
      ctx.arc(centerX, centerY, innerR, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = fillFn(0, 0, 0)
      
      // Center dot
      ctx.beginPath()
      ctx.arc(centerX, centerY, innerR * 0.5, 0, Math.PI * 2)
      ctx.fill()
    } else if (style === "extra-rounded") {
      // Very rounded (almost circular) outer with rounded inner
      ctx.beginPath()
      const rad = outerR * 0.5
      ctx.moveTo(ex + rad, ey)
      ctx.lineTo(ex + eyeSize - rad, ey)
      ctx.quadraticCurveTo(ex + eyeSize, ey, ex + eyeSize, ey + rad)
      ctx.lineTo(ex + eyeSize, ey + eyeSize - rad)
      ctx.quadraticCurveTo(ex + eyeSize, ey + eyeSize, ex + eyeSize - rad, ey + eyeSize)
      ctx.lineTo(ex + rad, ey + eyeSize)
      ctx.quadraticCurveTo(ex, ey + eyeSize, ex, ey + eyeSize - rad)
      ctx.lineTo(ex, ey + rad)
      ctx.quadraticCurveTo(ex, ey, ex + rad, ey)
      ctx.closePath()
      ctx.fill()
      
      // Inner rounded square
      if (!transparentBg) ctx.fillStyle = bgColor
      ctx.beginPath()
      const innerSize = 3 * unit
      const innerX = centerX - innerSize / 2
      const innerY = centerY - innerSize / 2
      const innerRad = innerSize * 0.3
      ctx.moveTo(innerX + innerRad, innerY)
      ctx.lineTo(innerX + innerSize - innerRad, innerY)
      ctx.quadraticCurveTo(innerX + innerSize, innerY, innerX + innerSize, innerY + innerRad)
      ctx.lineTo(innerX + innerSize, innerY + innerSize - innerRad)
      ctx.quadraticCurveTo(innerX + innerSize, innerY + innerSize, innerX + innerSize - innerRad, innerY + innerSize)
      ctx.lineTo(innerX + innerRad, innerY + innerSize)
      ctx.quadraticCurveTo(innerX, innerY + innerSize, innerX, innerY + innerSize - innerRad)
      ctx.lineTo(innerX, innerY + innerRad)
      ctx.quadraticCurveTo(innerX, innerY, innerX + innerRad, innerY)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = fillFn(0, 0, 0)
      
      // Center dot
      ctx.beginPath()
      ctx.arc(centerX, centerY, innerR * 0.5, 0, Math.PI * 2)
      ctx.fill()
    }
    // "square" style uses default qrcode-generator rendering (already drawn above)
  }

  // Gradient border for center logo area
  const logoStrokeColor = dotColor

  // Draw brutalist frame around QR if enabled
  if (framed) {
    ctx.strokeStyle = "#000"
    ctx.lineWidth = 8
    ctx.strokeRect(4, 4, qrSize - 8, qrSize - 8)
    const corners = [
      [0, 0], [qrSize - 16, 0], [0, qrSize - 16], [qrSize - 16, qrSize - 16]
    ]
    for (const [cx, cy] of corners) {
      ctx.fillStyle = "#fee440"
      ctx.fillRect(cx, cy, 16, 16)
      ctx.strokeStyle = "#000"
      ctx.lineWidth = 3
      ctx.strokeRect(cx, cy, 16, 16)
    }
  }

  const cx = qrSize / 2, cy = qrSize / 2, r = ms * 2.5

  // Text logo (takes priority over image/icon logo)
  if (textLogo) {
    ctx.fillStyle = bgColor
    ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = logoStrokeColor; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.stroke()

    ctx.save()
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip()
    const maxW = r * 1.6
    let fs = r * 0.7
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillStyle = fillFn(cx, cy, 0)
    do {
      ctx.font = `bold ${fs}px sans-serif`
      const m = ctx.measureText(textLogo)
      if (m.width <= maxW) break
      fs -= 1
    } while (fs > 8)
    ctx.fillText(textLogo, cx, cy)
    ctx.restore()
  } else if (includeLogo || logoImage) {
    ctx.fillStyle = bgColor
    ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = logoStrokeColor; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(cx, cy, r + 4, 0, Math.PI * 2); ctx.stroke()

    if (logoImage) {
      const img = document.createElement("img")
      img.src = logoImage
      await new Promise<void>(res => { img.onload = () => res(); img.onerror = () => res() })
      const s = r * 1.2
      ctx.save()
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip()
      ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s)
      ctx.restore()
    } else if (includeLogo) {
      ctx.fillStyle = fillFn(cx, cy, 0)
      const s = r * 0.6
      ctx.beginPath()
      ctx.moveTo(cx, cy + s * 0.35)
      ctx.bezierCurveTo(cx + s * 1.1, cy - s * 0.4, cx + s * 0.5, cy - s * 1, cx, cy - s * 0.45)
      ctx.bezierCurveTo(cx - s * 0.5, cy - s * 1, cx - s * 1.1, cy - s * 0.4, cx, cy + s * 0.35)
      ctx.closePath(); ctx.fill()
    }
  }

  return canvas.toDataURL("image/png")
}
