import React, { useEffect, useRef } from 'react'

/**
 * PlanParticleLogo - loading graphic for plan generation.
 *
 * A cloud of dots drifts around, converges to trace the outline of the PropPath
 * logo, holds for a beat, then scatters and re-forms - looping until the plan
 * lands. Rendered on a canvas (devicePixelRatio-aware, responsive via
 * ResizeObserver). Always the PropPath mark - not the per-company logo.
 */

// PropPath mark (Frame 6.svg), viewBox 0 0 683 683. Curves and the interior
// sparkle are sampled at runtime via SVGPathElement.getPointAtLength.
const LOGO_PATH =
  'M332.267 132.388C338.328 127.853 346.658 127.873 352.698 132.435L546.246 278.63C550.5 281.843 553 286.865 553 292.196V396.732C553 404.464 546.732 410.732 539 410.732H358.5C357.892 410.732 357.292 410.764 356.7 410.827C372.7 379.396 401.405 355.701 436.231 346.324L456 341.002L436.231 335.679C392.869 324.004 358.997 290.132 347.322 246.77L342 227.002L336.678 246.77C325.003 290.132 291.131 324.004 247.769 335.679L228 341.002L247.769 346.324C291.131 357.999 325.003 391.871 336.678 435.233L341.5 453.144V548.005C341.5 553.774 334.914 557.067 330.3 553.606L138.3 409.606C136.833 408.506 135.631 407.053 134.372 405.721C131.662 402.855 130 398.988 130 394.732V292.244C130 286.886 132.526 281.842 136.815 278.632L332.267 132.388Z'

const PARTICLE_COUNT = 460
const COLORS = ['#7C3AED', '#8B5CF6', '#A78BFA']

// Cycle timing (ms): scatter -> assemble -> hold -> disperse, then repeat.
// Slowed right down so the swarm drifts and settles gently.
const T_ASSEMBLE = 2600
const T_HOLD = 1900
const T_DISPERSE = 2400
const CYCLE = T_ASSEMBLE + T_HOLD + T_DISPERSE

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

/**
 * Sample `n` points spread evenly by arc-length along the logo path (outline +
 * interior sparkle), returned normalised to a 0..1 box that preserves aspect.
 */
function sampleLogo(n: number): { pts: [number, number][]; aspect: number } {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  el.setAttribute('d', LOGO_PATH)
  const total = el.getTotalLength()

  const raw: [number, number][] = []
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (let i = 0; i < n; i++) {
    const p = el.getPointAtLength((total * i) / n)
    raw.push([p.x, p.y])
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  const w = maxX - minX || 1
  const h = maxY - minY || 1
  const span = Math.max(w, h)
  // Normalise into a centered 0..1 box, longest side = 1.
  const pts = raw.map(([x, y]): [number, number] => [
    (x - minX) / span + (span - w) / (2 * span),
    (y - minY) / span + (span - h) / (2 * span),
  ])
  return { pts, aspect: w / h }
}

interface Particle {
  hx: number; hy: number
  sx: number; sy: number
  nsx: number; nsy: number
  r: number
  color: string
  phase: number
}

export const PlanParticleLogo: React.FC<{ className?: string }> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let particles: Particle[] = []
    let width = 0
    let height = 0
    let raf = 0
    const start = performance.now()
    const normalized = sampleLogo(PARTICLE_COUNT)

    const randomScatter = (): [number, number] => {
      const ang = Math.random() * Math.PI * 2
      const rad = Math.pow(Math.random(), 0.6)
      return [
        width / 2 + Math.cos(ang) * rad * width * 0.55,
        height / 2 + Math.sin(ang) * rad * height * 0.62,
      ]
    }

    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Fit the (already aspect-correct, longest side = 1) logo box into the
      // canvas with padding, centered.
      const size = Math.min(width, height) * 0.82
      const ox = (width - size) / 2
      const oy = (height - size) / 2

      particles = normalized.pts.map((p, i) => {
        const [s0x, s0y] = randomScatter()
        const [s1x, s1y] = randomScatter()
        return {
          hx: ox + p[0] * size,
          hy: oy + p[1] * size,
          sx: s0x, sy: s0y,
          nsx: s1x, nsy: s1y,
          r: 1.3 + Math.random() * 1.5,
          color: COLORS[i % COLORS.length],
          phase: Math.random() * Math.PI * 2,
        }
      })
    }

    let lastCycle = 0
    const frame = (now: number) => {
      const elapsed = now - start
      const cycleIndex = Math.floor(elapsed / CYCLE)
      const tInCycle = elapsed % CYCLE

      if (cycleIndex !== lastCycle) {
        lastCycle = cycleIndex
        for (const p of particles) {
          p.sx = p.nsx; p.sy = p.nsy
          const [nx, ny] = randomScatter()
          p.nsx = nx; p.nsy = ny
        }
      }

      ctx.clearRect(0, 0, width, height)

      for (const p of particles) {
        let x: number, y: number, alpha: number
        if (tInCycle < T_ASSEMBLE) {
          const u = easeInOut(tInCycle / T_ASSEMBLE)
          x = p.sx + (p.hx - p.sx) * u
          y = p.sy + (p.hy - p.sy) * u
          alpha = 0.35 + 0.65 * u
        } else if (tInCycle < T_ASSEMBLE + T_HOLD) {
          const h = (tInCycle - T_ASSEMBLE) / T_HOLD
          x = p.hx + Math.sin(now / 320 + p.phase) * 0.6
          y = p.hy + Math.cos(now / 360 + p.phase) * 0.6
          alpha = 1 - 0.15 * h
        } else {
          const u = easeInOut((tInCycle - T_ASSEMBLE - T_HOLD) / T_DISPERSE)
          x = p.hx + (p.nsx - p.hx) * u
          y = p.hy + (p.nsy - p.hy) * u
          alpha = 0.85 - 0.6 * u
        }

        ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(x, y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      raf = requestAnimationFrame(frame)
    }

    build()
    raf = requestAnimationFrame(frame)

    const ro = new ResizeObserver(build)
    ro.observe(canvas)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className={className} style={{ width: '100%', height: '100%', display: 'block' }} />
}
