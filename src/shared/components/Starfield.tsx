import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  z: number
  size: number
  baseAlpha: number
  twinkleSpeed: number
  twinkleOffset: number
  color: 'white' | 'cyan' | 'violet'
}

interface ShootingStar {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
}

interface StarfieldProps {
  density?: number
  showShooting?: boolean
  showNebula?: boolean
}

export default function Starfield({
  density = 220,
  showShooting = true,
  showNebula = true,
}: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const starsRef = useRef<Star[]>([])
  const shootersRef = useRef<ShootingStar[]>([])
  const lastShooterRef = useRef<number>(0)
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const initStars = () => {
      const { w, h } = sizeRef.current
      const stars: Star[] = []
      const colors: Star['color'][] = ['white', 'white', 'white', 'white', 'cyan', 'violet']
      for (let i = 0; i < density; i++) {
        const z = Math.random()
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          z,
          size: 0.4 + z * 1.8,
          baseAlpha: 0.25 + z * 0.7,
          twinkleSpeed: 0.6 + Math.random() * 1.8,
          twinkleOffset: Math.random() * Math.PI * 2,
          color: colors[Math.floor(Math.random() * colors.length)],
        })
      }
      starsRef.current = stars
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      sizeRef.current = { w, h, dpr }
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      initStars()
    }

    const spawnShootingStar = (now: number) => {
      if (now - lastShooterRef.current < 2500 + Math.random() * 3500) return
      lastShooterRef.current = now
      const w = sizeRef.current.w
      const h = sizeRef.current.h
      const fromLeft = Math.random() < 0.5
      shootersRef.current.push({
        x: fromLeft ? -50 : w * (0.4 + Math.random() * 0.6),
        y: Math.random() * h * 0.45,
        vx: 6 + Math.random() * 4,
        vy: 2 + Math.random() * 2,
        life: 0,
        maxLife: 50 + Math.random() * 30,
      })
    }

    const drawNebula = () => {
      const { w, h } = sizeRef.current
      const t = performance.now() * 0.0001
      const grd1 = ctx.createRadialGradient(
        w * (0.25 + Math.sin(t) * 0.05),
        h * 0.3,
        0,
        w * 0.25,
        h * 0.3,
        Math.max(w, h) * 0.5,
      )
      grd1.addColorStop(0, 'rgba(34, 211, 238, 0.10)')
      grd1.addColorStop(0.4, 'rgba(34, 211, 238, 0.04)')
      grd1.addColorStop(1, 'rgba(34, 211, 238, 0)')
      ctx.fillStyle = grd1
      ctx.fillRect(0, 0, w, h)

      const grd2 = ctx.createRadialGradient(
        w * (0.78 + Math.cos(t * 1.3) * 0.04),
        h * 0.75,
        0,
        w * 0.78,
        h * 0.75,
        Math.max(w, h) * 0.55,
      )
      grd2.addColorStop(0, 'rgba(168, 85, 247, 0.13)')
      grd2.addColorStop(0.5, 'rgba(168, 85, 247, 0.04)')
      grd2.addColorStop(1, 'rgba(168, 85, 247, 0)')
      ctx.fillStyle = grd2
      ctx.fillRect(0, 0, w, h)
    }

    const draw = (now: number) => {
      const { w, h } = sizeRef.current
      ctx.clearRect(0, 0, w, h)

      if (showNebula) drawNebula()

      for (const s of starsRef.current) {
        const twinkle =
          0.55 + 0.45 * Math.sin((now * 0.001 * s.twinkleSpeed) + s.twinkleOffset)
        const alpha = s.baseAlpha * twinkle
        const x = s.x
        const y = s.y
        const r = s.size
        const [r0, g0, b0] =
          s.color === 'cyan'
            ? [34, 211, 238]
            : s.color === 'violet'
              ? [168, 85, 247]
              : [255, 255, 255]

        const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 4)
        grad.addColorStop(0, `rgba(${r0}, ${g0}, ${b0}, ${alpha})`)
        grad.addColorStop(0.4, `rgba(${r0}, ${g0}, ${b0}, ${alpha * 0.35})`)
        grad.addColorStop(1, `rgba(${r0}, ${g0}, ${b0}, 0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(x, y, r * 4, 0, Math.PI * 2)
        ctx.fill()
      }

      if (showShooting) spawnShootingStar(now)
      const next: ShootingStar[] = []
      for (const sh of shootersRef.current) {
        sh.x += sh.vx
        sh.y += sh.vy
        sh.life += 1
        const lifeRatio = 1 - sh.life / sh.maxLife
        if (lifeRatio <= 0 || sh.x > w + 100 || sh.y > h + 100) continue
        next.push(sh)
        const tailLen = 80
        const tailGrad = ctx.createLinearGradient(sh.x, sh.y, sh.x - sh.vx * tailLen / 6, sh.y - sh.vy * tailLen / 6)
        tailGrad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * lifeRatio})`)
        tailGrad.addColorStop(0.4, `rgba(34, 211, 238, ${0.5 * lifeRatio})`)
        tailGrad.addColorStop(1, 'rgba(34, 211, 238, 0)')
        ctx.strokeStyle = tailGrad
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(sh.x, sh.y)
        ctx.lineTo(sh.x - sh.vx * tailLen / 6, sh.y - sh.vy * tailLen / 6)
        ctx.stroke()
        ctx.fillStyle = `rgba(255, 255, 255, ${lifeRatio})`
        ctx.beginPath()
        ctx.arc(sh.x, sh.y, 2, 0, Math.PI * 2)
        ctx.fill()
      }
      shootersRef.current = next

      rafRef.current = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener('resize', resize)
    rafRef.current = requestAnimationFrame(draw)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(rafRef.current)
    }
  }, [density, showShooting, showNebula])

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-grid-faint bg-grid-32 opacity-30" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-cyan/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-neon-violet/60 to-transparent" />
    </div>
  )
}
