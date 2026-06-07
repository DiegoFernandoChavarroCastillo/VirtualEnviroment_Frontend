import { GameConfig } from '../types/arena-shooter.types';

let _config: GameConfig | null = null;

export function setGameConfig(config: GameConfig) {
  _config = config;
}

export function getGameConfig(): GameConfig | null {
  return _config;
}
