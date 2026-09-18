import * as Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENES } from '../constants';
import type { DialogueDef, GameState, NPCDef } from '../data/gameData';
import { MISSIONS } from '../data/gameData';
import { playSound } from '../utils/audio';
import { addErrorEntry } from '../utils/errorLog';

const BOX_H = 200;
const BOX_Y = GAME_HEIGHT - BOX_H - 24;
const CHAR_INTERVAL = 22;

interface DialogData {
  npcDef: NPCDef;
  dialogue: DialogueDef;
  state: GameState;
  onClose: (s: Partial<GameState>) => void;
}

export class DialogScene extends Phaser.Scene {
  private boxContainer!: Phaser.GameObjects.Container;
  private choiceArea!: Phaser.GameObjects.Container;
  private bodyText!: Phaser.GameObjects.Text;
  private choiceButtons: Phaser.GameObjects.Container[] = [];
  private cursor!: Phaser.GameObjects.Text;
  private npcDef!: NPCDef;
  private dialogue!: DialogueDef;
  private state!: GameState;
  private lines: string[] = [];
  private lineIdx = 0;
  private charIdx = 0;
  private charTimer = 0;
  private isTyping = false;
  private showingChoices = false;
  private overlay!: Phaser.GameObjects.Rectangle;
  private onClose!: (s: Partial<GameState>) => void;
  private inputReady = false;
  private lastAdvanceTime = 0;
  private domPointerdownListener?: (e: PointerEvent) => void;
  private hasChosen = false;
  private pendingStateUpdate: Partial<GameState> = {};

  constructor() { super({ key: SCENES.DIALOG, active: false }); }

  init(data: DialogData) {
    this.npcDef = data.npcDef;
    this.dialogue = data.dialogue;
    this.state = { ...data.state };
    this.onClose = data.onClose;
    this.lines = [...data.dialogue.text];
    this.lineIdx = 0;
    this.charIdx = 0;
    this.isTyping = false;
    this.showingChoices = false;
    this.hasChosen = false;
    this.pendingStateUpdate = {};
    this.choiceButtons = [];
  }

  create() {
    // Signal React overlay to hide mobile controls
    (window as any).dialogActive = true;
    window.dispatchEvent(new CustomEvent('dialogactive', { detail: { active: true } }));

    // Dimmer overlay
    this.overlay = this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.45);

    const W = Math.min(1200, this.scale.width - 40);
    const boxY = Math.max(BOX_H / 2 + 30, this.scale.height - BOX_H / 2 - 20);
    const boxX = this.scale.width / 2;

    this.boxContainer = this.add.container(0, 0);

    // ── Shadow + main box
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.35);
    shadow.fillRoundedRect(boxX - W / 2 + 8, boxY - BOX_H / 2 + 8, W, BOX_H, 20);

    const bg = this.add.graphics();
    bg.fillStyle(0x0d1f35, 1);
    bg.fillRoundedRect(boxX - W / 2, boxY - BOX_H / 2, W, BOX_H, 20);

    // Header accent
    const header = this.add.graphics();
    header.fillStyle(0x152840, 1);
    header.fillRoundedRect(boxX - W / 2, boxY - BOX_H / 2, W, 42, { tl: 20, tr: 20, bl: 0, br: 0 });

    // Border
    const border = this.add.graphics();
    border.lineStyle(3, 0x1abc9c, 1);
    border.strokeRoundedRect(boxX - W / 2, boxY - BOX_H / 2, W, BOX_H, 20);
    // Accent line under header
    border.lineStyle(2, 0x1abc9c, 0.4);
    border.lineBetween(boxX - W / 2 + 20, boxY - BOX_H / 2 + 42, boxX + W / 2 - 20, boxY - BOX_H / 2 + 42);

    // ── Name tag in header
    const nameX = boxX - W / 2 + 32;
    const nameY = boxY - BOX_H / 2 + 21;

    const roleColors: Record<string, string> = {
      doctor: '#3498db', nurse: '#2ecc71', technician: '#9b59b6',
      admin: '#f39c12', receptionist: '#1abc9c', other: '#bdc3c7',
    };
    const roleColor = roleColors[this.npcDef.role] || '#ffffff';

    const nameTxt = this.add.text(nameX, nameY, this.npcDef.name, {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '14px',
      color: roleColor,
    }).setOrigin(0, 0.5);

    const titleTxt = this.add.text(nameX + nameTxt.width + 16, nameY, `· ${this.npcDef.title}`, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#a0aec0',
    }).setOrigin(0, 0.5);

    // Close hint
    const closeHint = this.add.text(boxX + W / 2 - 16, nameY, '[ESC] Fechar', {
      fontFamily: 'monospace', fontSize: '13px', color: '#a0aec0',
    }).setOrigin(1, 0.5);

    // ── Body text
    const textX = nameX;
    const textY = boxY - BOX_H / 2 + 56;
    const textMaxW = W - 64;

    this.bodyText = this.add.text(textX, textY, '', {
      fontFamily: "'VT323', 'Courier New', monospace",
      fontSize: '28px',
      color: '#ecf0f1',
      wordWrap: { width: textMaxW },
      lineSpacing: 4,
    });

    // Cursor
    this.cursor = this.add.text(0, 0, '▼', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '14px',
      color: '#1abc9c',
    }).setVisible(false);
    this.tweens.add({ targets: this.cursor, alpha: 0, duration: 350, yoyo: true, repeat: -1 });

    // ── Matéria / Topic Badge Box above Dialogue Box
    const topicText = this.dialogue.topic || (this.npcDef as any).sector || 'Gerência Assistencial & Enfermagem';
    if (topicText) {
      const badgeY = boxY - BOX_H / 2 - 18;
      const badgeGraphics = this.add.graphics();

      const badgeTxt = this.add.text(boxX - W / 2 + 16, badgeY, `📚 CONTEÚDO: ${topicText.toUpperCase()}`, {
        fontFamily: "'Rajdhani', 'Press Start 2P', monospace",
        fontSize: '13px',
        color: '#f1c40f',
        fontStyle: '700',
      }).setOrigin(0, 0.5);

      const badgeW = badgeTxt.width + 24;
      const badgeH = 28;

      badgeGraphics.fillStyle(0x0a1829, 0.95);
      badgeGraphics.fillRoundedRect(boxX - W / 2 + 4, badgeY - badgeH / 2, badgeW, badgeH, 6);
      badgeGraphics.lineStyle(2, 0xf1c40f, 0.9);
      badgeGraphics.strokeRoundedRect(boxX - W / 2 + 4, badgeY - badgeH / 2, badgeW, badgeH, 6);

      badgeTxt.setPosition(boxX - W / 2 + 16, badgeY);

      this.boxContainer.add([badgeGraphics, badgeTxt]);
    }

    this.boxContainer.add([shadow, bg, header, border, nameTxt, titleTxt, closeHint, this.bodyText, this.cursor]);

    // Choice area (rendered separately, on top)
    this.choiceArea = this.add.container(0, 0).setDepth(10);

    // Input — gated by a short grace period so the keypress that opened the
    // dialog doesn't immediately skip the very first line (caused the
    // "NPC só diz uma frase" bug).
    this.inputReady = false;
    this.lastAdvanceTime = 0;
    this.time.delayedCall(300, () => { this.inputReady = true; });

    this.input.keyboard?.on('keydown-E', this.handleAdvance, this);
    this.input.keyboard?.on('keydown-SPACE', this.handleAdvance, this);
    this.input.keyboard?.on('keydown-ESC', this.handleEsc, this);

    this.domPointerdownListener = (e: PointerEvent) => {
      if ((e.target as HTMLElement)?.closest('.pointer-events-auto')) return;
      this.handleAdvance();
    };
    window.addEventListener('pointerdown', this.domPointerdownListener);

    // Animate in
    this.boxContainer.setAlpha(0).setY(30);
    this.tweens.add({ targets: this.boxContainer, alpha: 1, y: 0, duration: 300, ease: 'Back.easeOut' });

    this.startLine(0);
  }

  private startLine(idx: number) {
    this.lineIdx = idx;
    this.charIdx = 0;
    this.charTimer = 0;
    this.isTyping = true;
    this.lastAdvanceTime = Date.now();
    this.inputReady = false;
    this.time.delayedCall(160, () => { this.inputReady = true; });
    this.bodyText.setText('');
    this.cursor.setVisible(false);
    this.showingChoices = false;
  }

  update(_t: number, delta: number) {
    if (!this.isTyping) {
      if (!this.showingChoices && this.cursor.visible) {
        const bRect = this.bodyText.getBounds();
        this.cursor.setPosition(bRect.right + 4, bRect.bottom - 14);
      }
      return;
    }
    if (this.lineIdx >= this.lines.length) return;

    this.charTimer += delta;
    const currentLine = this.lines[this.lineIdx];

    let playedSound = false;
    while (this.charTimer >= CHAR_INTERVAL && this.charIdx <= currentLine.length) {
      this.charTimer -= CHAR_INTERVAL;
      const char = currentLine[this.charIdx];
      this.bodyText.setText(currentLine.substring(0, this.charIdx));
      this.charIdx++;
      if (char && char !== ' ' && !playedSound) {
        playSound('typewriter');
        playedSound = true;
      }
    }

    const bRect = this.bodyText.getBounds();
    this.cursor.setPosition(bRect.right + 4, bRect.bottom - 14);
    this.cursor.setVisible(true);

    if (this.charIdx > currentLine.length) {
      this.isTyping = false;
      this.bodyText.setText(currentLine);

      if (this.lineIdx >= this.lines.length - 1) {
        if (!this.hasChosen) {
          this.cursor.setVisible(false);
          this.time.delayedCall(180, () => this.showChoices());
        } else {
          this.cursor.setVisible(true);
        }
      }
    }
  }

  private handleAdvance() {
    if (this.showingChoices) return;
    if (!this.inputReady) return;

    const now = Date.now();
    if (now - this.lastAdvanceTime < 180) return;
    this.lastAdvanceTime = now;

    if (this.isTyping) {
      this.bodyText.setText(this.lines[this.lineIdx]);
      this.charIdx = this.lines[this.lineIdx].length + 1;
      this.isTyping = false;

      // Gate next click so this click ONLY completes the text without skipping to the next line
      this.inputReady = false;
      this.time.delayedCall(220, () => { this.inputReady = true; });

      if (this.lineIdx >= this.lines.length - 1) {
        if (!this.hasChosen) {
          this.cursor.setVisible(false);
          this.time.delayedCall(240, () => this.showChoices());
        } else {
          this.cursor.setVisible(true);
        }
      } else {
        this.cursor.setVisible(true);
      }
      return;
    }

    if (this.hasChosen) {
      this.closeDialog(this.pendingStateUpdate);
      return;
    }

    if (this.lineIdx < this.lines.length - 1) {
      this.startLine(this.lineIdx + 1);
    }
  }

  private handleEsc() {
    if (this.showingChoices) {
      this.selectChoice(this.dialogue.choices.length - 1);
    } else {
      this.closeDialog(this.pendingStateUpdate);
    }
  }

  private showChoices() {
    if (this.showingChoices) return;
    this.showingChoices = true;
    this.cursor.setVisible(false);

    const rawChoices = this.dialogue.choices;
    const choices = (rawChoices && rawChoices.length > 0) ? rawChoices : [{ text: 'Entendido / Continuar' }];
    const hasExplicitCorrect = choices.some((c: any) => (c as any).correct === true);

    (window as any).activeChoices = {
      topic: this.dialogue.topic || (this.npcDef as any).sector || 'Gerência Assistencial & Enfermagem',
      choices: choices.map((c: any, i) => ({
        text: c.text,
        index: i,
        correct: c.correct,
        hasExplicitCorrect,
        feedback: c.feedback,
      })),
      select: (idx: number) => {
        this.selectChoice(idx);
      }
    };
    window.dispatchEvent(new CustomEvent('showchoices'));
  }

  private selectChoice(idx: number) {
    if (this.hasChosen) return;
    this.hasChosen = true;

    (window as any).activeChoices = null;
    window.dispatchEvent(new CustomEvent('hidechoices'));

    const rawChoices = (this.dialogue.choices && this.dialogue.choices.length > 0) ? this.dialogue.choices : [{ text: 'Entendido / Continuar' }];
    const choice = rawChoices[idx] || rawChoices[0];

    const hasExplicitCorrect = rawChoices.some((c: any) => c.correct === true);
    const isCorrectChoice = (choice as any).correct === true || (!hasExplicitCorrect && (choice as any).correct !== false);
    const isIncorrectChoice = (choice as any).correct === true 
      ? false 
      : (!isCorrectChoice || ((choice as any).feedback && typeof (choice as any).feedback === 'string' && ((choice as any).feedback.includes('Incorreto') || (choice as any).feedback.includes('Perigoso') || (choice as any).feedback.includes('Ilegal'))));

    let stateUpdate: Partial<GameState> = {};

    if (choice.effect) {
      stateUpdate = choice.effect(this.state);
    }

    // Strictly enforce NO prestige gain on incorrect choices
    if (isIncorrectChoice) {
      const currentPrestige = this.state.prestige;
      let newPrestige = stateUpdate.prestige !== undefined ? stateUpdate.prestige : currentPrestige - 5;
      if (newPrestige >= currentPrestige) {
        newPrestige = Math.max(0, currentPrestige - 5);
      }
      stateUpdate.prestige = newPrestige;
    }

    // Process mission completion / advancement whenever a choice with missionEffect is selected
    if (choice.missionEffect) {
      const [missionId, actionType] = choice.missionEffect.split(':');
      const progress = { ...this.state.missionProgress };
      const completed = [...this.state.completedMissions];

      if (actionType === 'start') {
        progress[missionId] = 1;
      } else if (actionType?.startsWith('step')) {
        progress[missionId] = parseInt(actionType.replace('step', ''), 10);
      } else if (actionType === 'complete') {
        progress[missionId] = 2; // Mark as completed in progress too
        const mission = MISSIONS.find(m => m.id === missionId);
        if (mission && !completed.includes(missionId)) {
          completed.push(missionId);
          if (!isIncorrectChoice) {
            const basePrestige = stateUpdate.prestige ?? this.state.prestige;
            stateUpdate.prestige = basePrestige + mission.prestige;
            this.showPedagogyNote(mission.title, mission.pedagogy, mission.pedagogyRef, mission.prestige);
            try { playSound('success'); } catch {}
          } else {
            try { playSound('error'); } catch {}
          }
        }
      }

      stateUpdate.missionProgress = progress;
      stateUpdate.completedMissions = completed;
    }

    // Update relationship
    const rel = { ...this.state.relationships };
    rel[this.npcDef.id] = (rel[this.npcDef.id] ?? 0) + 1;
    stateUpdate.relationships = rel;

    // Apply updates locally to this.state
    const prevPrestige = this.state.prestige;
    this.state = { ...this.state, ...stateUpdate };
    this.pendingStateUpdate = stateUpdate;

    // Log error if choice is incorrect
    if (isIncorrectChoice) {
      const rightChoice = rawChoices.find((c: any) => c.correct === true) || rawChoices[0];
      addErrorEntry({
        sourceTitle: `Diálogo com ${this.npcDef.name} (${this.npcDef.title || 'Equipe HUAP'})`,
        category: (this.npcDef as any).sector || 'Gerência Assistencial',
        questionText: Array.isArray(this.dialogue.text) ? this.dialogue.text.join(' ') : (this.dialogue.text || 'Cenário gerencial apresentado no diálogo'),
        wrongAnswerText: choice.text,
        correctAnswerText: rightChoice ? rightChoice.text : 'Conduta recomendada conforme diretrizes de gerência',
        explanation: Array.isArray((choice as any).feedback) ? (choice as any).feedback.join(' ') : ((choice as any).feedback || 'Escolha em desacordo com as boas práticas e referenciais de gerência de enfermagem.'),
        pedagogyRef: 'Kurcgant (2016) / Marquis & Huston (2015)',
      });
    }

    // ── Log decision to server (for Professor View: Erros e Acertos) ──
    try {
      const session = (window as any).sessionRoom;
      const playerId = session?.playerId || sessionStorage.getItem("gestor_player_id") || "anon-student";
      const playerName = this.state.playerProfile?.name || "Estudante";
      const isCorrect = !isIncorrectChoice;
      const pointsEarned = isCorrect ? Math.max(0, (stateUpdate.prestige ?? prevPrestige) - prevPrestige) : Math.min(0, (stateUpdate.prestige ?? prevPrestige) - prevPrestige);
      const feedbackText = Array.isArray((choice as any).feedback) 
        ? (choice as any).feedback.join(' ') 
        : ((choice as any).feedback || (isCorrect ? 'Conduta adequada conforme protocolos de gerência.' : 'Decisão em desacordo com os referenciais.'));

      fetch('/api/rooms/GLOBAL/log-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          playerName,
          npcName: `${this.npcDef.name} (${this.npcDef.title || 'Equipe HUAP'})`,
          questionText: Array.isArray(this.dialogue.text) ? this.dialogue.text.join(' ') : (this.dialogue.text || 'Cenário gerencial'),
          selectedOption: choice.text,
          isCorrect,
          pointsEarned,
          feedback: feedbackText,
          category: (this.npcDef as any).sector || 'Gerência Assistencial'
        })
      }).catch(() => {});
    } catch (_) {}

    // Show feedback line instead of instantly closing
    this.showingChoices = false;
    this.choiceArea.removeAll(true);
    this.choiceButtons = [];
    
    // Choose appropriate feedback line — role-aware so it never feels generic
    const isMission = !!choice.missionEffect;
    const actionType = choice.missionEffect ? choice.missionEffect.split(':')[1] : null;
    let role = (this.npcDef as any).role as string | undefined;
    const nameLower = (this.npcDef.name || '').toLowerCase();
    const titleLower = ((this.npcDef.title as string) || '').toLowerCase();

    if (!role || role === 'other') {
      if (titleLower.includes('limpeza') || titleLower.includes('higieniz') || nameLower.includes('rita')) {
        role = 'cleaner';
      } else if (titleLower.includes('paciente') || nameLower.includes('moreira') || nameLower.includes('márcia') || nameLower.includes('zé') || nameLower.includes('silva') || nameLower.includes('joão')) {
        role = 'patient';
      } else if (titleLower.includes('acompanhante') || titleLower.includes('visitante') || titleLower.includes('mãe') || titleLower.includes('pai') || nameLower.includes('lucas') || nameLower.includes('laura') || nameLower.includes('felipe') || nameLower.includes('roberto')) {
        role = 'family';
      } else if (titleLower.includes('estudante') || titleLower.includes('estagiá') || nameLower.includes('tiago')) {
        role = 'student';
      } else if (titleLower.includes('segurança') || titleLower.includes('portaria') || nameLower.includes('paulo')) {
        role = 'security';
      }
    }

    const fallbackByRole: Record<string, { start: string[]; complete: string[]; idle: string[] }> = {
      doctor: {
        start: ['Conto com a sua liderança, enfermeira.', 'Ótima decisão clínica. Vamos alinhar com a equipe médica.'],
        complete: ['Excelente desfecho — protocolo conduzido com rigor técnico.', 'Resultado bem documentado. A equipe médica agradece.'],
        idle: ['Combinado. Qualquer intercorrência, me chame.', 'Perfeito, sigo confiante no plantão.'],
      },
      nurse: {
        start: ['Vou repassar para a equipe na próxima passagem de plantão.', 'Combinado! Já registro no livro de ocorrências.'],
        complete: ['Atividade concluída e anotada na evolução de enfermagem.', 'Pronto. Equipe alinhada e processo padronizado.'],
        idle: ['Combinado, gerente.', 'Qualquer coisa, eu sinalizo no posto.'],
      },
      technician: {
        start: ['Pode deixar comigo — vou alinhar com a CME.', 'Vou cuidar disso ainda neste turno.'],
        complete: ['Tudo certo, processo padronizado conforme RDC.', 'Material liberado dentro da norma. Obrigado!'],
        idle: ['Tudo certo por aqui.', 'Posso seguir com as rotinas então.'],
      },
      admin: {
        start: ['Excelente. Vou formalizar isso na próxima reunião do colegiado.', 'Ótimo, registro em ata e acompanho o indicador.'],
        complete: ['Resultado registrado nos indicadores institucionais.', 'Decisão alinhada à governança hospitalar. Bom trabalho.'],
        idle: ['Combinado.', 'Mantenha-me informada do progresso.'],
      },
      receptionist: {
        start: ['Anotei aqui na recepção, vou acompanhar.', 'Pode deixar! Já encaminho conforme o fluxo.'],
        complete: ['Pronto, fluxo de atendimento ajustado.', 'Tudo registrado no sistema do HUAP.'],
        idle: ['Combinado.', 'Qualquer dúvida, é só chamar aqui na recepção.'],
      },
      cleaner: {
        start: ['Pode deixar, vou higienizar a área imediatamente com os produtos adequados.', 'Certo! Mantendo a higienização do setor em dia.'],
        complete: ['Área higienizada e sinalizada com sucesso!', 'Piso limpo e seco. Obrigado pelo alerta.'],
        idle: ['Imagina, gerente! Trabalho em equipe pela higiene e segurança de todos no HUAP.', 'Por nada! Com licença, sigo com a rotina de limpeza.'],
      },
      patient: {
        start: ['Muito obrigado por me ouvir e me explicar, enfermeira.', 'Agradeço pelo carinho e pela atenção com meu tratamento.'],
        complete: ['Que alívio! Muito obrigado pelo cuidado, me sinto bem mais seguro aqui.', 'Deus abençoe toda a equipe de enfermagem do HUAP!'],
        idle: ['Muito obrigado pela atenção e pelo carinho!', 'Com o cuidado de vocês, me sinto muito bem acolhido aqui no hospital.'],
      },
      family: {
        start: ['Muito obrigado pelas orientações! Nos dá uma tranquilidade enorme.', 'Agradeço por explicar tudo com tanto carinho para nossa família.'],
        complete: ['Que notícia maravilhosa! Agradecemos de coração a toda a equipe.', 'Muito obrigado pelo cuidado exemplar com nosso familiar.'],
        idle: ['Muito obrigado pelo suporte e atenção à nossa família!', 'Saber que nosso familiar está em boas mãos nos deixa muito em paz.'],
      },
      student: {
        start: ['Perfeito, professora/gerente! Anotei para o meu relatório de estágio.', 'Certo! Vou aplicar essa orientação técnica no procedimento.'],
        complete: ['Atividade de estágio concluída! Muito obrigado pelo aprendizado.', 'Aprendi muito hoje. Muito obrigado pela mentoria no plantão!'],
        idle: ['Muito obrigado pelas orientações! Estou aprendendo muito na prática aqui no HUAP.', 'Ótimas dicas de enfermagem. Sigo acompanhando as rotinas!'],
      },
      security: {
        start: ['Entendido, gerente. Vou averiguar a movimentação imediatamente.', 'Certo! Reforçando o controle de acesso no setor.'],
        complete: ['Acesso normalizado e registro no livro de ocorrências feito.', 'Situação sob controle na portaria.'],
        idle: ['Tudo calmo e sob controle por aqui, enfermeira.', 'Segurança do HUAP a postos. Bom plantão!'],
      },
      other: {
        start: ['Obrigada pela atenção e pelo direcionamento.', 'Fico mais tranquila sabendo que vai resolver.'],
        complete: ['Muito obrigada por tudo!', 'Faz toda a diferença ter uma equipe atenciosa.'],
        idle: ['Muito obrigada pela atenção e bom trabalho!', 'Agradeço pelo suporte no plantão!'],
      },
    };

    const bucket = fallbackByRole[role || 'other'] || fallbackByRole.other;
    const pool = isMission
      ? (actionType === 'complete' ? bucket.complete : bucket.start)
      : bucket.idle;
    const pickFromPool = pool[Math.floor(Math.random() * pool.length)];

    const rawFb = (choice as any).feedback;
    const fbStr = Array.isArray(rawFb) ? rawFb.join(' ') : (typeof rawFb === 'string' ? rawFb : pickFromPool);

    this.lines = [fbStr];
    this.startLine(0);
    
    // Gated by a short grace period so touch release on choice button doesn't immediately advance
    this.inputReady = false;
    this.time.delayedCall(300, () => { this.inputReady = true; });
  }

  private showPedagogyNote(missionTitle: string, pedagogy: string, pedagogyRef: string, pts: number) {
    playSound('success');

    const W = Math.min(720, this.scale.width - 32);
    const centerX = this.scale.width / 2;
    const centerY = Math.max(110, this.scale.height / 2 - 50);

    // Create body text first to measure text height
    const bodyTxt = this.add.text(0, 0, pedagogy, {
      fontFamily: "'Segoe UI', 'Trebuchet MS', system-ui, sans-serif",
      fontSize: '19px',
      fontStyle: 'bold',
      color: '#ffffff',
      wordWrap: { width: W - 44 },
      lineSpacing: 4,
    });

    const headerH = 42;
    const paddingBottom = 32;
    const H = Math.max(160, headerH + bodyTxt.height + paddingBottom + (pedagogyRef ? 26 : 0));

    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.4);
    shadow.fillRoundedRect(-W / 2 + 6, -H / 2 + 6, W, H, 16);

    const bg = this.add.graphics();
    bg.fillStyle(0x0a2015, 0.98);
    bg.fillRoundedRect(-W / 2, -H / 2, W, H, 16);
    bg.lineStyle(3, 0x2ecc71, 1);
    bg.strokeRoundedRect(-W / 2, -H / 2, W, H, 16);

    const headerBg = this.add.graphics();
    headerBg.fillStyle(0x1a4030, 1);
    headerBg.fillRoundedRect(-W / 2, -H / 2, W, headerH, { tl: 16, tr: 16, bl: 0, br: 0 });

    const icon = this.add.text(-W / 2 + 16, -H / 2 + headerH / 2, '🎓', { fontSize: '22px' }).setOrigin(0, 0.5);

    const titleTxt = this.add.text(-W / 2 + 48, -H / 2 + headerH / 2,
      `JUSTIFICATIVA: ${missionTitle} (+${pts} pts)`, {
        fontFamily: "'Rajdhani', 'Segoe UI', sans-serif",
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#2ecc71',
      }).setOrigin(0, 0.5);

    bodyTxt.setPosition(-W / 2 + 22, -H / 2 + headerH + 14);

    const refTxt = this.add.text(-W / 2 + 22, H / 2 - 14, `📚 ${pedagogyRef}`, {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#34d399',
    }).setOrigin(0, 1);

    const c = this.add.container(centerX, centerY).setDepth(200);
    c.add([shadow, bg, headerBg, icon, titleTxt, bodyTxt, refTxt]);
    c.setScale(0.85).setAlpha(0);

    this.tweens.add({
      targets: c, scale: 1, alpha: 1, duration: 350, ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: c, alpha: 0, y: '-=20', duration: 500, delay: 5500,
          onComplete: () => c.destroy(),
        });
      },
    });
  }

  private closeDialog(stateUpdate: Partial<GameState>) {
    this.input.keyboard?.off('keydown-E', this.handleAdvance, this);
    this.input.keyboard?.off('keydown-SPACE', this.handleAdvance, this);
    this.input.keyboard?.off('keydown-ESC', this.handleEsc, this);
    this.input.off('pointerdown', this.handleAdvance, this);

    if (this.domPointerdownListener) {
      window.removeEventListener('pointerdown', this.domPointerdownListener);
      this.domPointerdownListener = undefined;
    }

    (window as any).activeChoices = null;
    window.dispatchEvent(new CustomEvent('hidechoices'));

    // Signal React overlay to restore mobile controls
    (window as any).dialogActive = false;
    window.dispatchEvent(new CustomEvent('dialogactive', { detail: { active: false } }));

    this.tweens.add({
      targets: [this.boxContainer, this.overlay, this.choiceArea],
      alpha: 0, y: '+=16', duration: 220,
      onComplete: () => {
        this.scene.stop();
        this.onClose(stateUpdate);
      },
    });
  }
}
