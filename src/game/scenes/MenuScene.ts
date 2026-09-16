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

    // ── Pre-declare all layout-dependent elements ──────────────────────────
    let bg: Phaser.GameObjects.Image | null = null;
    let gradient: Phaser.GameObjects.Graphics | null = null;
    let vignette: Phaser.GameObjects.Graphics | null = null;
    let particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
    let title: Phaser.GameObjects.Text | null = null;
    let subContainer: Phaser.GameObjects.Container | null = null;
    let bobTween1: Phaser.Tweens.Tween | null = null;
    let bobTween2: Phaser.Tweens.Tween | null = null;
    let glow1: Phaser.GameObjects.Image | null = null;
    let glow2: Phaser.GameObjects.Image | null = null;

    // ── Ambient Glowing Particles Texture (Dynamic circular glow canvas) ─────
    if (!this.textures.exists('bubble')) {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        grad.addColorStop(0.3, 'rgba(26, 188, 156, 0.6)'); // Beautiful glowing cyan/teal
        grad.addColorStop(1, 'rgba(26, 188, 156, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(8, 8, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      this.textures.addCanvas('bubble', canvas);
    }

    // ── Ultra-soft Sunlight Glow Texture (Dynamic large radial gradient) ──────
    if (!this.textures.exists('sun_glow')) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        grad.addColorStop(0, 'rgba(255, 230, 170, 0.45)');  // Golden core
        grad.addColorStop(0.2, 'rgba(26, 188, 156, 0.22)'); // Soft teal halo
        grad.addColorStop(1, 'rgba(26, 188, 156, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(128, 128, 128, 0, Math.PI * 2);
        ctx.fill();
      }
      this.textures.addCanvas('sun_glow', canvas);
    }

    const bgKey = this.textures.exists('huap_pixelart')
      ? 'huap_pixelart'
      : this.textures.exists('huap_bg')
      ? 'huap_bg'
      : this.textures.exists('huap_pixel') ? 'huap_pixel' : null;

    // ── Start bobbing tween helper (re-aligned to correct baseline on resize) 
    const startBobbing = (tY: number) => {
      if (bobTween1) bobTween1.remove();
      if (bobTween2) bobTween2.remove();

      if (title) {
        title.y = tY;
        bobTween1 = this.tweens.add({
          targets: title,
          y: tY + 3,
          duration: 3000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      }

      if (subContainer) {
        const sY = tY + 34;
        subContainer.y = sY;
        bobTween2 = this.tweens.add({
          targets: subContainer,
          y: sY + 3,
          duration: 3000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: 200
        });
      }
    };

    // ── Define the Master Resize Handler ────────────────────────────────────
    const handleResize = () => {
      const W = this.scale.width;
      const H = this.scale.height;
      const cx = W / 2;
      const cy = H / 2;

      // 1. Position & cover scale background centered (100% of original image visible, zero black bars)
      if (bgKey) {
        if (!bg) {
          bg = this.add.image(cx, cy, bgKey).setOrigin(0.5).setDepth(0);
          
          const scaleX = W / bg.width;
          const scaleY = H / bg.height;
          const baseScale = Math.max(scaleX, scaleY);
          
          // Cinematic camera fade and zoom-in on load
          bg.setScale(baseScale * 1.04);
          bg.setPosition(cx, cy);
          this.tweens.add({
            targets: bg,
            scale: baseScale,
            x: cx,
            y: cy,
            duration: 2500,
            ease: 'Power2.easeOut',
            onComplete: () => {
              if (!bg) return;
              this.tweens.add({
                targets: bg,
                scale: baseScale * 1.02,
                x: cx + 4,
                y: cy + 2,
                duration: 9000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
              });
            }
          });
        } else {
          this.tweens.killTweensOf(bg);
          bg.setPosition(cx, cy);
          const scaleX = W / bg.width;
          const scaleY = H / bg.height;
          const baseScale = Math.max(scaleX, scaleY);
          bg.setScale(baseScale);

          this.tweens.add({
            targets: bg,
            scale: baseScale * 1.02,
            x: cx + 4,
            y: cy + 2,
            duration: 9000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }
      }

      // 2. Clear overlays so 100% of the original art, colors and space are shown with no black overlays
      if (gradient) {
        gradient.clear();
      }
      if (vignette) {
        vignette.clear();
      }

      // 3. Position & configure main title text (comfortably up in the night sky)
      const titleY = 32;
      if (!title) {
        title = this.add.text(cx, titleY, 'GESTOR ENF', {
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '36px',
          color: '#ffffff',
        }).setOrigin(0.5).setDepth(4);
        title.setShadow(3, 3, '#000000', 4, true, true);
      } else {
        title.setPosition(cx, titleY);
      }

      // 4. Subtitle badge in the open night sky, well above the pediment and statue's face
      const subY = titleY + 34;
      if (!subContainer) {
        subContainer = this.add.container(cx, subY).setDepth(4);
        
        const subTextStr = 'Simulador de Gerência de Enfermagem II';
        const subText = this.add.text(0, 0, subTextStr, {
          fontFamily: "'Segoe UI', Roboto, system-ui, -apple-system, sans-serif",
          fontSize: '15px',
          color: '#5eead4',
          fontStyle: 'bold'
        }).setOrigin(0.5);
        subText.setShadow(1.5, 1.5, '#000000', 4, true, true);

        const pillW = Math.max(340, subText.width + 24);
        const pillH = 28;

        const bgPill = this.add.graphics();
        bgPill.fillStyle(0x0a192f, 0.4);
        bgPill.lineStyle(1, 0x14b8a6, 0.6);
        bgPill.fillRoundedRect(-pillW / 2, -pillH / 2, pillW, pillH, 14);
        bgPill.strokeRoundedRect(-pillW / 2, -pillH / 2, pillW, pillH, 14);

        subContainer.add(bgPill);
        subContainer.add(subText);
      } else {
        subContainer.setPosition(cx, subY);
      }

      // Restart bobbing tweens at new base positions
      startBobbing(titleY);

      // 6. Recreate particle emitter to scale correctly across new width/height boundaries
      if (particles) {
        particles.destroy();
      }
      particles = this.add.particles(0, 0, 'bubble', {
        x: { min: 0, max: W },
        y: { min: H + 10, max: H + 40 },
        frequency: 200,
        lifespan: { min: 6000, max: 12000 },
        speedY: { min: -40, max: -12 },
        speedX: { min: -6, max: 6 },
        scale: { start: 0.3, end: 1.1 },
        alpha: { start: 0.5, end: 0 },
        blendMode: 'ADD'
      }).setDepth(2);

      // 7. Ambient Glowing Sun Lights (Slow, hypnotic pulsating lens flares in the upper sky)
      if (!glow1) {
        glow1 = this.add.image(W * 0.82, 35, 'sun_glow').setOrigin(0.5).setDepth(1).setBlendMode('ADD');
        glow1.setScale(1.3);
        glow1.setAlpha(0.2);
        this.tweens.add({
          targets: glow1,
          alpha: { start: 0.15, to: 0.45 },
          scale: { start: 1.1, to: 1.45 },
          angle: 360,
          duration: 14000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      } else {
        glow1.setPosition(W * 0.82, 35);
      }

      if (!glow2) {
        glow2 = this.add.image(W * 0.14, 60, 'sun_glow').setOrigin(0.5).setDepth(1).setBlendMode('ADD');
        glow2.setScale(0.8);
        glow2.setAlpha(0.12);
        this.tweens.add({
          targets: glow2,
          alpha: { start: 0.08, to: 0.32 },
          scale: { start: 0.7, to: 0.95 },
          angle: -360,
          duration: 18000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        });
      } else {
        glow2.setPosition(W * 0.14, 60);
      }
    };

    // ── Execute master resize immediately to align and scale perfectly ──────
    handleResize();

    // ── Bind to Phaser scale manager resize event ───────────────────────────
    this.scale.on('resize', handleResize);

    // ── Clean up on scene shutdown ──────────────────────────────────────────
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', handleResize);
      if (bobTween1) bobTween1.remove();
      if (bobTween2) bobTween2.remove();
    });

    // ── Start 8-bit menu music ────────────────────────────────────────────────
    playMusic('menu');

    // ── Camera fade in ────────────────────────────────────────────────────────
    this.cameras.main.fadeIn(500);
  }
}
