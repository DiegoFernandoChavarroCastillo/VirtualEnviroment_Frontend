import { useCallback } from 'react';
import useSound from 'use-sound';

/**
 * Hook centralizado de sonidos para el Arena Shooter.
 *
 * Sonidos disponibles:
 *  - playShoot        → arma normal o escopeta
 *  - playRocket       → disparo del rocket launcher
 *  - playExplosion    → explosión del cohete al impactar
 *  - playItemCollected → recogida de un ítem (arma, escudo, etc.)
 */
export const useArenaSound = () => {
  const [playShootRaw] = useSound('/sounds/shoot.mp3', {
    volume: 0.45,
    interrupt: false,
  });

  const [playRocketRaw] = useSound('/sounds/rocket.mp3', {
    volume: 0.55,
    interrupt: false,
  });

  const [playExplosionRaw] = useSound('/sounds/explosion.mp3', {
    volume: 0.65,
    interrupt: false,
  });

  const [playItemCollectedRaw] = useSound('/sounds/itemCollected.mp3', {
    volume: 0.6,
    interrupt: false,
  });

  const playShoot = useCallback(() => {
    playShootRaw();
  }, [playShootRaw]);

  const playRocket = useCallback(() => {
    playRocketRaw();
  }, [playRocketRaw]);

  const playExplosion = useCallback(() => {
    playExplosionRaw();
  }, [playExplosionRaw]);

  const playItemCollected = useCallback(() => {
    playItemCollectedRaw();
  }, [playItemCollectedRaw]);

  return { playShoot, playRocket, playExplosion, playItemCollected };
};
