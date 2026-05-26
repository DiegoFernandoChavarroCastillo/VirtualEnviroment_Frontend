import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useFootballSocket } from '../hooks/useFootballSocket';
import { useDuelSnapshot } from '../hooks/useDuelSnapshot';
import { useDuelPhysics } from '../hooks/useDuelPhysics';
import {
  FootballDuelState,
  MatchEndedPayload,
  ReturnToVirtualWorldPayload,
  MATCH_CANVAS_WIDTH,
  MATCH_CANVAS_HEIGHT,
  GOAL_AREAS,
  BALL_RADIUS,
  formatTime,
} from '../types/football-duel.types';
import confetti from 'canvas-confetti';
import ReactConfetti from 'react-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import GoalParticles from './GoalParticles';
import { getRandomSpawnPosition } from '@/shared/utils/spawnPosition';

// â”€â”€â”€ Field constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FIELD_MARGIN = 20;
const PLAYER_RADIUS = 20;
const FALLBACK_RETURN_DELAY_MS = 10_000;

// â”€â”€â”€ Mobile Joystick â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const JOY_RADIUS = 56;
const JOY_KNOB = 24;

interface DuelJoystickProps {
  onMove: (dx: number, dy: number) => void;
}

const DuelJoystick: React.FC<DuelJoystickProps> = ({ onMove }) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeId = useRef<number | null>(null);

  const calc = (cx: number, cy: number, clientX: number, clientY: number) => {
    const rawDx = clientX - cx;
    const rawDy = clientY - cy;
    const dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
    const max = JOY_RADIUS - JOY_KNOB;
    const clamped = Math.min(dist, max);
    const angle = Math.atan2(rawDy, rawDx);
    return {
      dx: dist > 0 ? (Math.cos(angle) * clamped) / max : 0,
      dy: dist > 0 ? (Math.sin(angle) * clamped) / max : 0,
      kx: Math.cos(angle) * clamped,
      ky: Math.sin(angle) * clamped,
    };
  };

  const setKnob = (kx: number, ky: number) => {
    if (knobRef.current) knobRef.current.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (activeId.current !== null) return;
    const t = e.changedTouches[0];
    activeId.current = t.identifier;
    const rect = baseRef.current!.getBoundingClientRect();
    const { dx, dy, kx, ky } = calc(rect.left + rect.width / 2, rect.top + rect.height / 2, t.clientX, t.clientY);
    setKnob(kx, ky); onMove(dx, dy);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const t = Array.from(e.changedTouches).find(x => x.identifier === activeId.current);
    if (!t) return;
    e.preventDefault();
    const rect = baseRef.current!.getBoundingClientRect();
    const { dx, dy, kx, ky } = calc(rect.left + rect.width / 2, rect.top + rect.height / 2, t.clientX, t.clientY);
    setKnob(kx, ky); onMove(dx, dy);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!Array.from(e.changedTouches).find(x => x.identifier === activeId.current)) return;
    activeId.current = null;
    setKnob(0, 0); onMove(0, 0);
  };

  return (
    <div
      ref={baseRef}
      className="relative select-none touch-none"
      style={{ width: JOY_RADIUS * 2, height: JOY_RADIUS * 2, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.25)' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      aria-label="Joystick de movimiento"
    >
      <div
        ref={knobRef}
        style={{
          position: 'absolute', top: '50%', left: '50%',
          width: JOY_KNOB * 2, height: JOY_KNOB * 2, borderRadius: '50%',
          background: 'rgba(255,255,255,0.9)', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          transform: 'translate(-50%, -50%)', pointerEvents: 'none',
        }}
      />
    </div>
  );
};

interface FootballDuelMatchProps {
  matchId: string;
  localPlayer: { userId: string; name: string; role: 1 | 2 };
  opponent: { userId: string; name: string };
  onMatchEnd: (spawnX: number, spawnY: number) => void;
}

type OverlayType = 'goal' | 'win' | 'lose' | 'draw' | null;

const FootballDuelMatch: React.FC<FootballDuelMatchProps> = ({
  matchId,
  localPlayer,
  opponent,
  onMatchEnd,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | undefined>(undefined);
  const keysRef = useRef<Record<string, boolean>>({});
  const joystickRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const kickPendingRef = useRef(false);

  const [isMobile, setIsMobile] = useState(false);
  const [overlay, setOverlay] = useState<OverlayType>(null);
  const [overlayText, setOverlayText] = useState('');
  const [score, setScore] = useState<Record<string, number>>({
    [localPlayer.userId]: 0,
    [opponent.userId]: 0,
  });
  const [timeRemaining, setTimeRemaining] = useState(180);
  const [matchEnded, setMatchEnded] = useState(false);
  const [showGoalParticles, setShowGoalParticles] = useState(false);
  const [showWinConfetti, setShowWinConfetti] = useState(false);

  // Spawn position received from server
  const spawnRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // â”€â”€ Initial positions based on role â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const initialX = localPlayer.role === 1 ? 200 : 600;
  const initialY = MATCH_CANVAS_HEIGHT / 2;

  // â”€â”€ Hooks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { pushSnapshot, getInterpolatedBall, getInterpolatedOpponent } = useDuelSnapshot();
  const { getLocalPlayerPos, applyInput, stepPhysics, reconcile } = useDuelPhysics({
    initialX,
    initialY,
  });

  const handleGoalScored = useCallback(
    (payload: { scorerId: string; score: Record<string, number> }) => {
      setScore({ ...payload.score });
      setOverlay('goal');
      setOverlayText('⚽ ¡GOL!');

      // Instant confetti burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#ef4444', '#f59e0b', '#ffffff', '#3b82f6']
      });

      setShowGoalParticles(true);
      setTimeout(() => {
        setOverlay(null);
        setShowGoalParticles(false);
      }, 2000);
    },
    [],
  );

  const handleMatchEnded = useCallback(
    (payload: MatchEndedPayload) => {
      console.log('[FootballDuelMatch] Match ended:', payload);
      setMatchEnded(true);
      setScore(payload.finalScore);

      if (payload.isDraw) {
        setOverlay('draw');
        setOverlayText('🤝 ¡Empate!');
      } else if (payload.winnerId === localPlayer.userId) {
        setOverlay('win');
        setOverlayText('🏆 ¡Ganaste!');
        setShowWinConfetti(true);
      } else {
        setOverlay('lose');
        setOverlayText(`😔 ¡Perdiste! Ganó ${payload.winnerName ?? 'el oponente'}`);
      }

      // Fallback: if returnToVirtualWorld doesn't arrive in 10 s, force return
      setTimeout(() => {
        if (!spawnRef.current) {
          console.log('[FootballDuelMatch] Fallback return triggered');
          const { x, y } = getRandomSpawnPosition();
          onMatchEnd(x, y);
        }
      }, FALLBACK_RETURN_DELAY_MS);
    },
    [localPlayer.userId, onMatchEnd],
  );

  const handleReturnToVirtualWorld = useCallback(
    (payload: ReturnToVirtualWorldPayload) => {
      console.log('[FootballDuelMatch] Return to virtual world:', payload);
      spawnRef.current = { x: payload.spawnX, y: payload.spawnY };
      onMatchEnd(payload.spawnX, payload.spawnY);
    },
    [onMatchEnd],
  );

  const handleMatchNotFound = useCallback((matchId: string) => {
    console.error('[FootballDuelMatch] Match not found:', matchId);
    const { x, y } = getRandomSpawnPosition();
    onMatchEnd(x, y);
  }, [onMatchEnd]);

  const { lastSnapshot, isConnected, emitPlayerInput } = useFootballSocket({
    matchId,
    onGoalScored: handleGoalScored,
    onMatchEnded: handleMatchEnded,
    onReturnToVirtualWorld: handleReturnToVirtualWorld,
    onMatchNotFound: handleMatchNotFound,
  });

  // â”€â”€ Sync snapshot into interpolation buffer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!lastSnapshot) return;
    pushSnapshot(lastSnapshot);

    // Server reconciliation for local player
    const serverPlayer = lastSnapshot.players.find((p) => p.userId === localPlayer.userId);
    if (serverPlayer) {
      reconcile({ x: serverPlayer.x, y: serverPlayer.y }, lastSnapshot.tick);
    }

    // Sync score and time from snapshot
    setScore({ ...lastSnapshot.score });
  }, [lastSnapshot, localPlayer.userId, pushSnapshot, reconcile]);

  // â”€â”€ Match timer (client-side countdown, synced by snapshots) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (matchEnded) return;
    const timer = setInterval(() => setTimeRemaining((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(timer);
  }, [matchEnded]);

  // â”€â”€ Keyboard listeners â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { keysRef.current[e.key] = true; };
    const onKeyUp = (e: KeyboardEvent) => { keysRef.current[e.key] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // â”€â”€ Main game loop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const loop = () => {
      if (!matchEnded) {
        // 1. Read input (keyboard + joystick)
        const keys = keysRef.current;
        const joy = joystickRef.current;
        const DEAD = 0.25;

        const kbDx = (keys.d || keys.ArrowRight ? 1 : 0) - (keys.a || keys.ArrowLeft ? 1 : 0);
        const kbDy = (keys.s || keys.ArrowDown ? 1 : 0) - (keys.w || keys.ArrowUp ? 1 : 0);
        const jDx = Math.abs(joy.dx) > DEAD ? Math.sign(joy.dx) : 0;
        const jDy = Math.abs(joy.dy) > DEAD ? Math.sign(joy.dy) : 0;

        const dx = kbDx !== 0 ? kbDx : jDx;
        const dy = kbDy !== 0 ? kbDy : jDy;

        if (dx !== 0 || dy !== 0) {
          // Normalise diagonal so the server applies consistent speed
          const mag = Math.sqrt(dx * dx + dy * dy);
          const ndx = dx / mag;
          const ndy = dy / mag;
          applyInput({ action: 'move', dx: ndx, dy: ndy });
          emitPlayerInput({ action: 'move', dx: ndx, dy: ndy });
        }

        if (keys[' '] || keys.Space || kickPendingRef.current) {
          emitPlayerInput({ action: 'kick' });
          kickPendingRef.current = false;
        }

        // 2. Step local physics
        stepPhysics();
      }

      // 3. Render
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [matchEnded, applyInput, emitPlayerInput, stepPhysics]);

  // â”€â”€ Canvas draw â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = Date.now();

    ctx.clearRect(0, 0, MATCH_CANVAS_WIDTH, MATCH_CANVAS_HEIGHT);

    // Field background with radial gradient
    const grassGradient = ctx.createRadialGradient(
      MATCH_CANVAS_WIDTH / 2, MATCH_CANVAS_HEIGHT / 2, 50,
      MATCH_CANVAS_WIDTH / 2, MATCH_CANVAS_HEIGHT / 2, MATCH_CANVAS_WIDTH / 1.2
    );
    grassGradient.addColorStop(0, '#3ba65e');
    grassGradient.addColorStop(1, '#1e5e34');
    ctx.fillStyle = grassGradient;
    ctx.fillRect(0, 0, MATCH_CANVAS_WIDTH, MATCH_CANVAS_HEIGHT);

    // Field lines
    drawField(ctx);

    // Interpolated ball
    const ball = getInterpolatedBall(now);
    drawBall(ctx, ball.x, ball.y);

    // Local player
    const localPos = getLocalPlayerPos();
    drawPlayer(ctx, localPos.x, localPos.y, '#f39c12', localPlayer.name, true);

    // Opponent (interpolated)
    const oppPos = getInterpolatedOpponent(now, opponent.userId);
    drawPlayer(ctx, oppPos.x, oppPos.y, '#3498db', opponent.name, false);
  };

  const drawField = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;

    // Outer boundary
    ctx.strokeRect(FIELD_MARGIN, FIELD_MARGIN, MATCH_CANVAS_WIDTH - FIELD_MARGIN * 2, MATCH_CANVAS_HEIGHT - FIELD_MARGIN * 2);

    // Centre line
    ctx.beginPath();
    ctx.moveTo(MATCH_CANVAS_WIDTH / 2, FIELD_MARGIN);
    ctx.lineTo(MATCH_CANVAS_WIDTH / 2, MATCH_CANVAS_HEIGHT - FIELD_MARGIN);
    ctx.stroke();

    // Centre circle
    ctx.beginPath();
    ctx.arc(MATCH_CANVAS_WIDTH / 2, MATCH_CANVAS_HEIGHT / 2, 50, 0, Math.PI * 2);
    ctx.stroke();

    // Goals
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(GOAL_AREAS.left.x, GOAL_AREAS.left.y, GOAL_AREAS.left.width, GOAL_AREAS.left.height);
    ctx.fillRect(GOAL_AREAS.right.x, GOAL_AREAS.right.y, GOAL_AREAS.right.width, GOAL_AREAS.right.height);

    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.strokeRect(GOAL_AREAS.left.x, GOAL_AREAS.left.y, GOAL_AREAS.left.width, GOAL_AREAS.left.height);
    ctx.strokeRect(GOAL_AREAS.right.x, GOAL_AREAS.right.y, GOAL_AREAS.right.width, GOAL_AREAS.right.height);
    
    // Net pattern in goals
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    for(let gx = 0; gx <= 20; gx += 5) {
        ctx.beginPath();
        ctx.moveTo(GOAL_AREAS.left.x + gx, GOAL_AREAS.left.y);
        ctx.lineTo(GOAL_AREAS.left.x + gx, GOAL_AREAS.left.y + GOAL_AREAS.left.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(GOAL_AREAS.right.x + gx, GOAL_AREAS.right.y);
        ctx.lineTo(GOAL_AREAS.right.x + gx, GOAL_AREAS.right.y + GOAL_AREAS.right.height);
        ctx.stroke();
    }
  };

  const drawBall = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.save();
    // Shiny ball effect
    const grad = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, BALL_RADIUS);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(1, '#ddd');
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Soccer ball pattern
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      const angle = (i * 2 * Math.PI) / 5;
      ctx.lineTo(x + Math.cos(angle) * BALL_RADIUS, y + Math.sin(angle) * BALL_RADIUS);
      ctx.stroke();
    }
    ctx.restore();
  };

  const drawPlayer = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    name: string,
    isLocal: boolean,
  ) => {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.arc(x, y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    if (isLocal) {
      const pulse = Math.sin(Date.now() / 200) * 2 + 3;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = pulse;
      ctx.shadowBlur = pulse * 2;
      ctx.shadowColor = '#FFD700';
      ctx.beginPath();
      ctx.arc(x, y, PLAYER_RADIUS + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px "DM Sans", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(name, x, y - PLAYER_RADIUS - 6);
    ctx.restore();
  };

  // â”€â”€ Scores â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const localScore = score[localPlayer.userId] ?? 0;
  const opponentScore = score[opponent.userId] ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 overflow-hidden font-['DM_Sans',_system-ui,_sans-serif] relative">
      {showWinConfetti && (
        <ReactConfetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={true}
          numberOfPieces={200}
          gravity={0.15}
        />
      )}

      {/* HUD */}
      <div className="relative flex items-center justify-between w-full max-w-[800px] px-8 py-4 bg-black/60 backdrop-blur-md rounded-t-2xl border-b border-white/10">
        {/* Player 1 score */}
        <div className="flex flex-col items-center min-w-[140px]">
          <span className="text-yellow-400 font-bold text-xs uppercase tracking-tighter mb-1 opacity-80">{localPlayer.name}</span>
          <motion.span 
            key={localScore}
            initial={{ scale: 1.5, color: '#fbbf24' }}
            animate={{ scale: 1, color: '#fff' }}
            className="text-white font-black text-5xl tabular-nums leading-none"
          >
            {localScore}
          </motion.span>
        </div>

        {/* Timer */}
        <div className="flex flex-col items-center">
          <span className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-1">Tiempo Restante</span>
          <div className="relative">
            <span className={`font-mono font-black text-3xl tabular-nums ${timeRemaining <= 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {formatTime(timeRemaining)}
            </span>
            {!isConnected && (
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-red-400 font-bold whitespace-nowrap animate-pulse">RECONECTANDO...</span>
            )}
          </div>
        </div>

        {/* Player 2 score */}
        <div className="flex flex-col items-center min-w-[140px]">
          <span className="text-blue-400 font-bold text-xs uppercase tracking-tighter mb-1 opacity-80">{opponent.name}</span>
          <motion.span 
             key={opponentScore}
             initial={{ scale: 1.5, color: '#60a5fa' }}
             animate={{ scale: 1, color: '#fff' }}
             className="text-white font-black text-5xl tabular-nums leading-none"
          >
            {opponentScore}
          </motion.span>
        </div>

        {/* Exit button â€” inside HUD, top-right corner */}
        {!matchEnded && (
          <button
            type="button"
            onClick={() => { const { x, y } = getRandomSpawnPosition(); onMatchEnd(x, y); }}
            className="absolute top-2 right-3 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/15 text-white/50 text-[11px] font-semibold hover:bg-red-600/80 hover:text-white hover:border-red-400 transition-all duration-150"
            aria-label="Abandonar partida y regresar al mapa"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Salir
          </button>
        )}
      </div>

      {/* Canvas */}
      <div className="relative w-full max-w-[800px] bg-black shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <canvas
          ref={canvasRef}
          width={MATCH_CANVAS_WIDTH}
          height={MATCH_CANVAS_HEIGHT}
          className="block w-full h-auto cursor-none"
          style={{ imageRendering: 'auto' }}
        />

        <GoalParticles active={showGoalParticles} />

        {/* Overlay */}
        <AnimatePresence>
          {overlay && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.5, filter: 'blur(10px)' }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            >
              <div
                className={`px-12 py-8 rounded-3xl text-center shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 backdrop-blur-sm ${
                  overlay === 'win'
                    ? 'bg-yellow-500/90 border-yellow-300 text-white'
                    : overlay === 'lose'
                    ? 'bg-red-600/90 border-red-400 text-white'
                    : overlay === 'draw'
                    ? 'bg-blue-600/90 border-blue-400 text-white'
                    : 'bg-green-500/90 border-green-300 text-white'
                }`}
              >
                <motion.p 
                  animate={{ scale: [1, 1.1, 1] }} 
                  transition={{ repeat: Infinity, duration: 0.5 }}
                  className="text-6xl font-black drop-shadow-lg"
                >
                  {overlayText}
                </motion.p>
                {(overlay === 'win' || overlay === 'lose' || overlay === 'draw') && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-sm mt-3 font-bold uppercase tracking-widest opacity-80"
                  >
                    Regresando al mapaâ€¦
                  </motion.p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      {isMobile ? (
        <div className="flex items-center justify-between w-full max-w-[800px] px-6 py-3 bg-black/40">
          <DuelJoystick onMove={(dx, dy) => { joystickRef.current = { dx, dy }; }} />
          <button
            type="button"
            className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/40 text-white text-2xl font-black active:bg-white/40 transition-colors select-none touch-none"
            onTouchStart={(e) => { e.preventDefault(); kickPendingRef.current = true; }}
            aria-label="Patear"
          >
            âš½
          </button>
        </div>
      ) : (
        <div className="mt-2 text-white/40 text-xs">
          WASD / â†‘â†“â†â†’ para mover &nbsp;Â·&nbsp; Espacio para patear
        </div>
      )}
    </div>
  );
};

export default FootballDuelMatch;
