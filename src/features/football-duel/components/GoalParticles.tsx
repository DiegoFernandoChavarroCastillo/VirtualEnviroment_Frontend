import React, { useEffect, useState } from 'react';
import Particles from '@tsparticles/react';
import type { Container, ISourceOptions } from '@tsparticles/engine';

interface GoalParticlesProps {
  active: boolean;
}

const GoalParticles: React.FC<GoalParticlesProps> = ({ active }) => {
  const [init, setInit] = useState(true);

  const particlesLoaded = async (container?: Container): Promise<void> => {
    if (container) {
      if (active) {
        await container.play();
      } else {
        await container.pause();
      }
    }
  };

  const options: ISourceOptions = {
    autoPlay: active,
    fullScreen: { enable: false },
    fpsLimit: 60,
    particles: {
      number: { value: active ? 40 : 0 },
      color: { value: ['#e67e22', '#c0392b', '#f1c40f', '#27ae60', '#2980b9'] },
      shape: { type: ['circle', 'star', 'confetti'] },
      opacity: { value: { min: 0.4, max: 1 } },
      size: { value: { min: 2, max: 6 } },
      move: {
        enable: true,
        speed: { min: 2, max: 6 },
        direction: 'top',
        outModes: { default: 'out' },
      },
      collisions: { enable: false },
    },
    detectRetina: true,
  };

  if (!init) return null;

  return (
    <Particles
      id="goal-particles"
      options={options}
      particlesLoaded={particlesLoaded}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}
    />
  );
};

export default GoalParticles;
