export interface SymbolBbox {
  center_x: number
  center_y: number
  width: number
  height: number
  category: string
}

interface BboxAccum {
  minX: number
  minY: number
  maxX: number
  maxY: number
  category: string
}

function expandAccum(acc: BboxAccum, x: number, y: number): void {
  if (x < acc.minX) acc.minX = x
  if (x > acc.maxX) acc.maxX = x
  if (y < acc.minY) acc.minY = y
  if (y > acc.maxY) acc.maxY = y
}

function parsePathCoords(d: string, acc: BboxAccum): void {
  // Matches M and L commands: "M x,y" or "L x,y" (space or comma separated)
  const re = /[MLml]\s*([\d.+-]+)[,\s]\s*([\d.+-]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(d)) !== null) {
    expandAccum(acc, parseFloat(m[1]), parseFloat(m[2]))
  }
}

function parsePolygonCoords(points: string, acc: BboxAccum): void {
  // "x1,y1 x2,y2 ..." or "x1 y1 x2 y2 ..."
  const nums = points.trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n))
  for (let i = 0; i + 1 < nums.length; i += 2) {
    expandAccum(acc, nums[i], nums[i + 1])
  }
}

function parseLineCoords(attrs: string, acc: BboxAccum): void {
  const get = (name: string): number | null => {
    const m = new RegExp(`${name}="([^"]+)"`).exec(attrs)
    return m ? parseFloat(m[1]) : null
  }
  const x1 = get('x1'), y1 = get('y1'), x2 = get('x2'), y2 = get('y2')
  if (x1 !== null && y1 !== null) expandAccum(acc, x1, y1)
  if (x2 !== null && y2 !== null) expandAccum(acc, x2, y2)
}

function parseRectCoords(attrs: string, acc: BboxAccum): void {
  const get = (name: string): number | null => {
    const m = new RegExp(`${name}="([^"]+)"`).exec(attrs)
    return m ? parseFloat(m[1]) : null
  }
  const x = get('x') ?? 0
  const y = get('y') ?? 0
  const w = get('width')
  const h = get('height')
  if (w !== null && h !== null) {
    expandAccum(acc, x, y)
    expandAccum(acc, x + w, y + h)
  }
}

/**
 * SVG 텍스트에서 data-handle 별 bounding box를 추출한다.
 * filterCategories 가 주어지면 해당 카테고리만 처리.
 */
export function extractSymbolBboxes(
  svgText: string,
  filterCategories?: Set<string>,
): Map<string, SymbolBbox> {
  const accums = new Map<string, BboxAccum>()

  // Line-by-line scan (SVG elements are mostly single-line in DXF-generated files)
  const lines = svgText.split('\n')
  for (const line of lines) {
    const handleMatch   = /data-handle="([^"]+)"/.exec(line)
    const categoryMatch = /data-plantsim-category="([^"]+)"/.exec(line)
    if (!handleMatch) continue

    const handle   = handleMatch[1]
    const category = categoryMatch ? categoryMatch[1] : 'UNDEFINED'

    if (filterCategories && !filterCategories.has(category)) continue

    let acc = accums.get(handle)
    if (!acc) {
      acc = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, category }
      accums.set(handle, acc)
    }

    // <path d="..." ...>
    const pathDMatch = /\bd="([^"]+)"/.exec(line)
    if (pathDMatch) {
      parsePathCoords(pathDMatch[1], acc)
      continue
    }

    // <polygon points="..." ...>
    const polyMatch = /\bpoints="([^"]+)"/.exec(line)
    if (polyMatch) {
      parsePolygonCoords(polyMatch[1], acc)
      continue
    }

    // <line x1="..." ...>
    if (/<line\b/.test(line)) {
      parseLineCoords(line, acc)
      continue
    }

    // <rect x="..." ...>
    if (/<rect\b/.test(line)) {
      parseRectCoords(line, acc)
    }
  }

  const result = new Map<string, SymbolBbox>()
  for (const [handle, acc] of accums) {
    if (!isFinite(acc.minX) || !isFinite(acc.minY)) continue
    const w = acc.maxX - acc.minX
    const h = acc.maxY - acc.minY
    result.set(handle, {
      center_x: Math.round((acc.minX + w / 2) * 100) / 100,
      center_y: Math.round((acc.minY + h / 2) * 100) / 100,
      width:    Math.round(w * 100) / 100,
      height:   Math.round(h * 100) / 100,
      category: acc.category,
    })
  }
  return result
}
