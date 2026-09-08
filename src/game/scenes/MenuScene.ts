import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENES } from '../constants';
import { playMusic, fadeOutMusic } from '../utils/audio';

export class MenuScene extends Phaser.Scene {
  private starting = false;

  constructor() { super({ key: SCENES.MENU }); }

  public startGame() {
    if (this.starting) return;
    this.starting = true;
    fadeOutMusic(700);
    this.cameras.main.fadeOut(500, 0, 0, 0);

    let transitioned = false;
    const doTransition = () => {
      if (transitioned) return;
      transitioned = true;
      try {
        if (this.scene.isActive(SCENES.MENU) || this.scene.isPaused(SCENES.MENU)) {
          this.scene.start(SCENES.GAME);
        }
      } catch (e) {
        console.warn('Transition error:', e);
      }
    };

    this.cameras.main.once('camerafadeoutcomplete', doTransition);
    this.time.delayedCall(550, doTransition);
    setTimeout(doTransition, 600);
  }

  shutdown() {
    delete (window as any).triggerStartGame;
  }

  create() {
    this.starting = false;
    // Expose a reliable global hook so React can trigger game start
    // without depending on Phaser's scene.getScene() timing.
    (window as any).triggerStartGame = () => this.startGame();

    // Ensure React router is on '/' so the home buttons always render,
    // even when the page is hard-refreshed while the game was running.
    this.time.delayedCall(120, () => {
      (window as any).reactNavigate?.('/');
    });
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const W = this.scale.width;
    const H = this.scale.height;

    // ── Background: exact pixel art hospital image ───────────────────────────
    const bgKey = this.textures.exists('huap_pixelart')
      ? 'huap_pixelart'
      : this.textures.exists('huap_bg')
      ? 'huap_bg'
      : this.textures.exists('huap_pixel') ? 'huap_pixel' : null;

    if (bgKey) {
      const bg = this.add.image(cx, cy, bgKey).setOrigin(0.5).setDepth(0);
      bg.setDisplaySize(W, H);
    } else {
      this.add.rectangle(cx, cy, W, H, 0x071324).setDepth(0);
    }

    // ── Title overlay (clean & crisp at top) ──────────────────────────────────
    const titleY = 64;
    const title = this.add.text(cx, titleY, 'GESTOR ENF', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '42px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(4);
    title.setShadow(3, 3, '#000000', 0, true, true);

    const sub = this.add.text(cx, titleY + 42, 'Simulador de Gerência de Enfermagem II', {
      fontFamily: "'Segoe UI', 'Trebuchet MS', system-ui, sans-serif",
      fontSize: '16px', color: '#1abc9c',
    }).setOrigin(0.5).setDepth(4);
    sub.setShadow(2, 2, '#000000', 0, true, true);

    // ── Start 8-bit menu music ────────────────────────────────────────────────
    playMusic('menu');

    // ── Camera fade in ────────────────────────────────────────────────────────
    this.cameras.main.fadeIn(500);
  }
}
