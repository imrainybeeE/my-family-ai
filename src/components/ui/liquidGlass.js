// Liquid Glass: real refraction for the floating layer, not just blur.
// Any element with data-liquid gets an SVG filter built for its exact size and corner radius and applied as
// backdrop-filter: url(#…). The filter bends what is behind the glass through a convex edge (Snell's law, n = 1.5),
// frosts it a little, lifts its colour and paints a specular rim lit from the top left.
// Chromium only (WebKit and Gecko cannot run SVG filters in backdrop-filter); elsewhere the frosted .glass stays.
//
// Attributes: data-liquid (any value), data-liquid-bezel (px, default 16), data-liquid-strength (max bend in px,
// default 22), data-liquid-frost (blur px, default 1.5), data-liquid-sat (saturation, default 1.6).

const NS = 'http://www.w3.org/2000/svg'
let svg = null
let seq = 0
const maps = new Map() // cache: size and shape -> { disp, spec, max }

export const liquidSupported = () => {
  try {
    if (window.matchMedia('(prefers-reduced-transparency: reduce)').matches) return false
    return Boolean(navigator.userAgentData?.brands?.some((b) => /Chromium|Google Chrome/.test(b.brand)))
  } catch { return false }
}

/* Signed distance from a point to a rounded rectangle centred in w x h (negative inside) */
function sdf(px, py, w, h, r) {
  const qx = Math.abs(px - w / 2) - (w / 2 - r)
  const qy = Math.abs(py - h / 2) - (h / 2 - r)
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
}

/* Convex squircle surface: flat in the middle, curving down to the edge */
const surface = (t) => Math.pow(1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 4), 0.25)

/* How far a vertical ray bends through the surface at depth t of the bezel (0 = edge, 1 = flat) */
function bend(t) {
  const d = 0.001
  const slope = ((surface(t + d) - surface(t - d)) / (2 * d)) * 0.9 // rise per px: the glass is 0.9 bezels thick
  const a1 = Math.atan(slope)
  const a2 = Math.asin(Math.sin(a1) / 1.5)
  return (0.35 + surface(t)) * Math.tan(a1 - a2)
}

function buildMaps(w, h, r, bezel) {
  const key = `${w}x${h}r${r}b${bezel}${document.documentElement.dataset.theme === 'dark' ? 'd' : ''}`
  if (maps.has(key)) return maps.get(key)
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  // Displacement at CSS resolution (it is interpolated); the rim at device resolution so it stays crisp
  const dc = document.createElement('canvas')
  dc.width = w; dc.height = h
  const dctx = dc.getContext('2d')
  const disp = dctx.createImageData(w, h)
  const sc = document.createElement('canvas')
  sc.width = Math.round(w * dpr); sc.height = Math.round(h * dpr)
  const sctx = sc.getContext('2d')
  const spec = sctx.createImageData(sc.width, sc.height)

  // The bend profile across the bezel, normalised to its peak
  const steps = 128
  const profile = Array.from({ length: steps + 1 }, (_, i) => bend(i / steps))
  const peak = Math.max(...profile.map(Math.abs)) || 1
  const lx = -0.42, ly = -0.91 // light from the top left

  // Distance to the edge and the outward normal at a point (scale: pixels per CSS px)
  const field = (px, py, scale = 1) => {
    const x = px / scale, y = py / scale
    const s = sdf(x, y, w, h, r)
    const dist = -s
    if (dist <= 0) return null
    // Outward normal from the distance field's gradient
    const gx = sdf(x + 0.5, y, w, h, r) - sdf(x - 0.5, y, w, h, r)
    const gy = sdf(x, y + 0.5, w, h, r) - sdf(x, y - 0.5, w, h, r)
    const gl = Math.hypot(gx, gy) || 1
    return { dist, nx: gx / gl, ny: gy / gl }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const f = field(x + 0.5, y + 0.5)
      let dx = 0, dy = 0
      if (f && f.dist < bezel) {
        const m = profile[Math.round((f.dist / bezel) * steps)] / peak
        dx = -f.nx * m // sample inward: a convex edge magnifies toward the rim
        dy = -f.ny * m
      }
      disp.data[i] = 128 + dx * 127
      disp.data[i + 1] = 128 + dy * 127
      disp.data[i + 2] = 128
      disp.data[i + 3] = 255
    }
  }
  // On a dark page a white rim reads twice as bright: half the light there
  const rimK = document.documentElement.dataset.theme === 'dark' ? 0.5 : 1
  for (let y = 0; y < sc.height; y++) {
    for (let x = 0; x < sc.width; x++) {
      const i = (y * sc.width + x) * 4
      const f = field(x + 0.5, y + 0.5, dpr)
      if (!f) continue
      const facing = f.nx * lx + f.ny * ly
      // A thin bright line on the lit edge, a fainter one opposite (light caught inside the glass), a soft inner sheen
      const line = Math.max(0, 1 - f.dist / 1.6)
      const sheen = Math.max(0, 1 - f.dist / (bezel * 0.9)) * 0.08
      // Quiet: a hairline of light, not a bevel (about 12% peak once the tint is over it)
      const a = (line * 0.35 + sheen) * (Math.pow(Math.max(0, facing), 1.4) + 0.25 * Math.pow(Math.max(0, -facing), 1.6))
      spec.data[i] = 255; spec.data[i + 1] = 255; spec.data[i + 2] = 255
      spec.data[i + 3] = Math.min(255, a * rimK * 255)
    }
  }
  dctx.putImageData(disp, 0, 0)
  sctx.putImageData(spec, 0, 0)
  const out = { disp: dc.toDataURL(), spec: sc.toDataURL() }
  if (maps.size > 24) maps.clear()
  maps.set(key, out)
  return out
}

function el(name, attrs, parent) {
  const n = document.createElementNS(NS, name)
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v)
  parent?.append(n)
  return n
}

function host() {
  if (svg) return svg
  svg = el('svg', { width: 0, height: 0, 'aria-hidden': 'true', style: 'position:absolute;width:0;height:0;overflow:hidden', 'color-interpolation-filters': 'sRGB' })
  el('defs', {}, svg)
  document.body.append(svg)
  return svg
}

/** Build or rebuild the filter for one element. Returns a cleanup function. */
function attach(node) {
  const id = `lg-${++seq}`
  const filter = el('filter', { id, x: 0, y: 0, filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' }, host().firstChild)
  const blur = el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 1.5, result: 'frost' }, filter)
  const dimg = el('feImage', { x: 0, y: 0, preserveAspectRatio: 'none', result: 'map' }, filter)
  const dmap = el('feDisplacementMap', { in: 'frost', in2: 'map', xChannelSelector: 'R', yChannelSelector: 'G', result: 'bent' }, filter)
  const sat = el('feColorMatrix', { in: 'bent', type: 'saturate', values: 1.6, result: 'lifted' }, filter)
  const simg = el('feImage', { x: 0, y: 0, preserveAspectRatio: 'none', result: 'rim' }, filter)
  el('feComposite', { in: 'rim', in2: 'lifted', operator: 'over' }, filter)

  let raf = 0
  let last = ''
  const update = () => {
    raf = 0
    const w = node.offsetWidth, h = node.offsetHeight
    if (!w || !h) return
    const cs = getComputedStyle(node)
    const r = Math.min(parseFloat(cs.borderTopLeftRadius) || 0, w / 2, h / 2)
    const bezel = Math.min(Number(node.dataset.liquidBezel) || 16, r || 16, Math.min(w, h) / 2)
    const strength = Number(node.dataset.liquidStrength) || 22
    const key = `${w}|${h}|${r}|${bezel}|${strength}|${document.documentElement.dataset.theme || ''}`
    if (key !== last) {
      last = key
      const m = buildMaps(w, h, Math.round(r), Math.round(bezel))
      for (const f of [filter, dimg, simg]) { f.setAttribute('width', w); f.setAttribute('height', h) }
      dimg.setAttribute('href', m.disp)
      simg.setAttribute('href', m.spec)
      dmap.setAttribute('scale', (strength * 2).toFixed(1))
    }
    blur.setAttribute('stdDeviation', node.dataset.liquidFrost ?? 1.5)
    sat.setAttribute('values', node.dataset.liquidSat ?? 1.6)
    node.style.backdropFilter = `url(#${id})`
    node.dataset.lg = ''
  }
  const ro = new ResizeObserver(() => { if (!raf) raf = requestAnimationFrame(update) })
  ro.observe(node)
  update()
  return () => {
    ro.disconnect()
    cancelAnimationFrame(raf)
    filter.remove()
    node.style.backdropFilter = ''
    delete node.dataset.lg
  }
}

/** Watch the document: every [data-liquid] element gets glass while it exists. Call once at start-up. */
export function startLiquidGlass() {
  if (!liquidSupported()) return
  // Not data-liquid: that would make the page itself a glass element, rebuilt full-size on every height change
  document.documentElement.dataset.liquidOn = ''
  const live = new Map()
  const scan = () => {
    for (const n of document.querySelectorAll('[data-liquid]')) if (!live.has(n)) live.set(n, attach(n))
    for (const [n, off] of live) if (!n.isConnected || !n.hasAttribute('data-liquid')) { off(); live.delete(n) }
  }
  let queued = false
  // Rescan only when glass can have come or gone: a data-liquid attribute changed, or added or removed nodes hold glass
  const holdsGlass = (n) => n.nodeType === 1 && (n.hasAttribute('data-liquid') || n.querySelector('[data-liquid]'))
  new MutationObserver((records) => {
    if (queued) return
    const relevant = records.some((r) => r.type === 'attributes' || [...r.addedNodes].some(holdsGlass) || [...r.removedNodes].some(holdsGlass))
    if (!relevant) return
    queued = true
    requestAnimationFrame(() => { queued = false; scan() })
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-liquid'] })
  scan()
}
