import React, { useRef } from 'react';

interface VirtualJoystickProps {
  onMove: (dx: number, dy: number) => void;
  radius?: number;
  knobRadius?: number;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onMove,
  radius = 56,
  knobRadius = 24,
}) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activeTouchId = useRef<number | null>(null);

  const maxDist = radius - knobRadius;

  const calc = (cx: number, cy: number, clientX: number, clientY: number) => {
    const rawDx = clientX - cx;
    const rawDy = clientY - cy;
    const dist = Math.sqrt(rawDx * rawDx + rawDy * rawDy);
    const clamped = Math.min(dist, maxDist);
    const angle = Math.atan2(rawDy, rawDx);
    return {
      dx: dist > 0 ? (Math.cos(angle) * clamped) / maxDist : 0,
      dy: dist > 0 ? (Math.sin(angle) * clamped) / maxDist : 0,
      kx: Math.cos(angle) * clamped,
      ky: Math.sin(angle) * clamped,
    };
  };

  const setKnob = (kx: number, ky: number) => {
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (activeTouchId.current !== null) return;
    const t = e.changedTouches[0];
    activeTouchId.current = t.identifier;
    const rect = baseRef.current!.getBoundingClientRect();
    const { dx, dy, kx, ky } = calc(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      t.clientX,
      t.clientY,
    );
    setKnob(kx, ky);
    onMove(dx, dy);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const t = Array.from(e.changedTouches).find(x => x.identifier === activeTouchId.current);
    if (!t) return;
    e.preventDefault();
    const rect = baseRef.current!.getBoundingClientRect();
    const { dx, dy, kx, ky } = calc(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      t.clientX,
      t.clientY,
    );
    setKnob(kx, ky);
    onMove(dx, dy);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!Array.from(e.changedTouches).find(x => x.identifier === activeTouchId.current)) return;
    activeTouchId.current = null;
    setKnob(0, 0);
    onMove(0, 0);
  };

  return (
    <div
      ref={baseRef}
      style={{
        width: radius * 2,
        height: radius * 2,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.12)',
        border: '2px solid rgba(255,255,255,0.25)',
        position: 'relative',
        touchAction: 'none',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      aria-label="Joystick de movimiento"
    >
      <div
        ref={knobRef}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: knobRadius * 2,
          height: knobRadius * 2,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.9)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          transform: 'translate(-50%, -50%)',
          transition: 'transform 0.05s',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
