export interface ParticleOptions {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // in frames or relative [0, 1]
  color: string;
  size: number;
  type?: 'spark' | 'smoke' | 'trail' | 'explosion';
}

export class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: string;

  constructor(opts: ParticleOptions) {
    this.x = opts.x;
    this.y = opts.y;
    this.vx = opts.vx;
    this.vy = opts.vy;
    this.life = opts.life;
    this.maxLife = opts.life;
    this.color = opts.color;
    this.size = opts.size;
    this.type = opts.type || 'spark';
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;

    // Slow down over time (friction)
    this.vx *= 0.98;
    this.vy *= 0.98;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;

    if (this.type === 'spark') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'trail') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'smoke') {
      ctx.beginPath();
      // El humo se expande a medida que desaparece
      const smokeSize = this.size * (1 + (1 - alpha) * 2);
      ctx.arc(this.x, this.y, smokeSize, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }

    ctx.restore();
  }
}

// ─── Shockwave ring (anillo de explosión, sin allocaciones por frame) ─────────

interface ShockwaveRing {
  x: number;
  y: number;
  maxRadius: number;
  currentRadius: number;
  life: number;
  maxLife: number;
}

// ─── Sistema de partículas ─────────────────────────────────────────────────────

export class ParticleSystem {
  particles: Particle[] = [];
  private shockwaves: ShockwaveRing[] = [];

  add(opts: ParticleOptions) {
    this.particles.push(new Particle(opts));
    // Cap particles for performance
    if (this.particles.length > 500) {
      this.particles.shift();
    }
  }

  emitExplosion(x: number, y: number, color: string, count = 20) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      this.add({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: Math.random() * 30 + 30,
        color,
        size: Math.random() * 3 + 1,
        type: 'spark',
      });
    }
  }

  /**
   * Explosión masiva de cohete: burst de 50 chispas + anillo de shockwave.
   * Capped a 500 partículas totales para rendimiento.
   */
  emitRocketExplosion(x: number, y: number, radius: number) {
    // Burst central de chispas (50 partículas)
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 7 + 2;
      const isOuter = i > 30;
      this.add({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: isOuter ? Math.random() * 20 + 15 : Math.random() * 40 + 30,
        color: isOuter ? '#ff6b35' : (Math.random() > 0.5 ? '#ff4500' : '#ffd700'),
        size: isOuter ? Math.random() * 2 + 1 : Math.random() * 4 + 2,
        type: 'spark',
      });
    }

    // Anillo de shockwave visual
    this.shockwaves.push({
      x,
      y,
      maxRadius: radius,
      currentRadius: 0,
      life: 25,
      maxLife: 25,
    });

    // Cap shockwaves
    if (this.shockwaves.length > 8) {
      this.shockwaves.shift();
    }
  }

  emitMuzzleFlash(x: number, y: number, angle: number) {
    for (let i = 0; i < 5; i++) {
      const spread = (Math.random() - 0.5) * 0.5;
      const speed = Math.random() * 3 + 1;
      this.add({
        x,
        y,
        vx: Math.cos(angle + spread) * speed,
        vy: Math.sin(angle + spread) * speed,
        life: 10,
        color: '#f1c40f',
        size: 2,
        type: 'spark',
      });
    }
  }

  /**
   * Muzzle flash especial para laser: partículas verdes rápidas
   */
  emitLaserMuzzleFlash(x: number, y: number, angle: number) {
    for (let i = 0; i < 8; i++) {
      const spread = (Math.random() - 0.5) * 0.3;
      const speed = Math.random() * 6 + 4;
      this.add({
        x,
        y,
        vx: Math.cos(angle + spread) * speed,
        vy: Math.sin(angle + spread) * speed,
        life: 8,
        color: Math.random() > 0.5 ? '#2ecc71' : '#27ae60',
        size: Math.random() * 2 + 1,
        type: 'spark',
      });
    }
  }

  /**
   * Muzzle flash especial para escopeta: dispersión más amplia y más partículas.
   */
  emitShotgunMuzzleFlash(x: number, y: number, angle: number) {
    for (let i = 0; i < 12; i++) {
      const spread = (Math.random() - 0.5) * 1.2;
      const speed = Math.random() * 5 + 2;
      this.add({
        x,
        y,
        vx: Math.cos(angle + spread) * speed,
        vy: Math.sin(angle + spread) * speed,
        life: 14,
        color: Math.random() > 0.5 ? '#f39c12' : '#e74c3c',
        size: Math.random() * 3 + 1,
        type: 'spark',
      });
    }
  }

  update() {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life--;
      sw.currentRadius = sw.maxRadius * (1 - sw.life / sw.maxLife);
      if (sw.life <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw particles
    for (const p of this.particles) {
      p.draw(ctx);
    }

    // Draw shockwave rings (ahora como círculos rellenos rojos con opacidad)
    for (const sw of this.shockwaves) {
      const alpha = Math.pow(sw.life / sw.maxLife, 0.5); // Fades a bit slower initially
      ctx.save();
      
      // Círculo rojo principal relleno
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = 'rgba(255, 30, 30, 1)';
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.currentRadius, 0, Math.PI * 2);
      ctx.fill();

      // Borde brillante rojo/naranja
      ctx.globalAlpha = alpha * 0.8;
      ctx.strokeStyle = 'rgba(255, 80, 30, 1)';
      ctx.lineWidth = 4 * alpha;
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(255, 60, 0, 0.8)';
      ctx.stroke();

      ctx.restore();
    }
  }
}
