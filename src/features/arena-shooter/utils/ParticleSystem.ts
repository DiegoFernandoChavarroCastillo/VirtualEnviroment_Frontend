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
    } else {
      ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
    
    ctx.restore();
  }
}

export class ParticleSystem {
  particles: Particle[] = [];

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

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      p.draw(ctx);
    }
  }
}
