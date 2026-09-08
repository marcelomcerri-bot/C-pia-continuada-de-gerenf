import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, getDynamicGameSize } from './constants';
import { BootScene }   from './scenes/BootScene';
import { MenuScene }   from './scenes/MenuScene';
import { GameScene }   from './scenes/GameScene';
import { HUDScene }    from './scenes/HUDScene';
import { DialogScene } from './scenes/DialogScene';

export function createGameConfig(
  parent: HTMLElement,
  scaleMode: 'fit' | 'none' = 'fit'
): Phaser.Types.Core.GameConfig {
  const vw = window.visualViewport?.width || window.innerWidth || GAME_WIDTH;
  const vh = window.visualViewport?.height || window.innerHeight || GAME_HEIGHT;
  const initialSize = getDynamicGameSize(vw, vh);

  return {
    type: Phaser.AUTO,
    width: initialSize.width,
    height: initialSize.height,
    parent,
    backgroundColor: '#0a0a0f',
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
        fixedStep: false,
        fps: 60,
      },
    },
    scene: [BootScene, MenuScene, GameScene, HUDScene, DialogScene],
    scale: scaleMode === 'none'
      ? {
          mode: Phaser.Scale.NONE,
          width: initialSize.width,
          height: initialSize.height,
        }
      : {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: initialSize.width,
          height: initialSize.height,
          expandParent: true,
        },
    input: {
      keyboard: true,
      mouse: true,
      touch: true,
    },
  };
}
