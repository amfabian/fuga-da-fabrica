/**
 * ========================================================
 *  SplashScene – Tela Inicial / Splash Screen
 * ========================================================
 *
 *  Primeira cena carregada pelo Phaser. Exibe:
 *    • Fundo animado com "fluxo de dados" (nós + fios + luzes)
 *    • Título do jogo com efeito de sombra
 *    • Botão interativo "INICIAR SIMULAÇÃO"
 *
 *  Ao clicar no botão, a cena faz um fade out de 1 segundo
 *  e inicia a SimulationScene, que por sua vez lança as
 *  cenas paralelas (LogicScene e HudScene).
 *
 *  TRANSIÇÃO DE CENAS NO PHASER:
 *    O Phaser inicia automaticamente apenas a PRIMEIRA cena
 *    do array config.scene. As demais ficam registradas mas
 *    dormentes. Usamos this.scene.start('SimulationScene')
 *    para iniciar a cena do jogo, o que automaticamente
 *    encerra a SplashScene.
 */

import Phaser from "phaser";

/** Quantidade de nós decorativos no fundo */
const BG_NODE_COUNT = 18;

/** Quantidade de "pulsos de dados" correndo pelos fios */
const PULSE_COUNT = 12;

export class SplashScene extends Phaser.Scene {
    constructor() {
        super({ key: "SplashScene" });
    }

    create() {
        const W = this.sys.game.config.width;
        const H = this.sys.game.config.height;

        // ============================================================
        //  1. FUNDO ANIMADO – "Fluxo de Dados"
        // ============================================================

        // Criar nós espalhados aleatoriamente pela tela
        this.bgNodes = [];
        for (let i = 0; i < BG_NODE_COUNT; i++) {
            this.bgNodes.push({
                x: Phaser.Math.Between(60, W - 60),
                y: Phaser.Math.Between(60, H - 60),
            });
        }

        // Construir arestas (fios) conectando nós próximos
        this.bgEdges = [];
        const MAX_DIST = 320;
        for (let i = 0; i < this.bgNodes.length; i++) {
            for (let j = i + 1; j < this.bgNodes.length; j++) {
                const a = this.bgNodes[i];
                const b = this.bgNodes[j];
                const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
                if (dist < MAX_DIST) {
                    this.bgEdges.push({ from: a, to: b, dist });
                }
            }
        }

        // Desenhar os fios (linhas finas)
        this.wireGraphics = this.add.graphics();
        this.wireGraphics.lineStyle(1, 0x8899aa, 0.4);
        for (const edge of this.bgEdges) {
            this.wireGraphics.lineBetween(
                edge.from.x,
                edge.from.y,
                edge.to.x,
                edge.to.y,
            );
        }

        // Desenhar os nós (círculos pequenos)
        for (const node of this.bgNodes) {
            const circle = this.add.circle(node.x, node.y, 4, 0x7788aa, 0.6);
            // Pulso suave nos nós
            this.tweens.add({
                targets: circle,
                alpha: { from: 0.3, to: 0.8 },
                scale: { from: 0.8, to: 1.3 },
                duration: Phaser.Math.Between(1500, 3000),
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut",
                delay: Phaser.Math.Between(0, 2000),
            });
        }

        // Criar "pulsos de dados" que correm pelos fios
        this.pulses = [];
        for (let i = 0; i < PULSE_COUNT; i++) {
            const edge =
                this.bgEdges[Phaser.Math.Between(0, this.bgEdges.length - 1)];
            const color = Phaser.Math.RND.pick([
                0xf1c40f, 0x2ecc71, 0x3498db, 0xe74c3c, 0x9b59b6,
            ]);
            const pulse = this.add.circle(edge.from.x, edge.from.y, 3, color);
            pulse.setAlpha(0.9);

            this._animatePulse(pulse);
            this.pulses.push(pulse);
        }

        // ============================================================
        //  2. TÍTULO DO JOGO
        // ============================================================

        // Sombra do título (offset leve)
        this.add
            .text(W / 2 + 3, 113, "Fuga da Fábrica", {
                fontFamily: "monospace",
                fontSize: "56px",
                fontStyle: "bold",
                color: "#000000",
            })
            .setOrigin(0.5)
            .setAlpha(0.15);

        // Título principal
        const title = this.add
            .text(W / 2, 110, "Fuga da Fábrica", {
                fontFamily: "monospace",
                fontSize: "56px",
                fontStyle: "bold",
                color: "#b8860b",
            })
            .setOrigin(0.5)
            .setAlpha(0);

        // Fade in do título
        this.tweens.add({
            targets: title,
            alpha: 1,
            y: 100,
            duration: 1000,
            ease: "Power2",
        });

        // Subtítulo
        const subtitle = this.add
            .text(W / 2, 160, "Programação Visual e Robótica", {
                fontFamily: "monospace",
                fontSize: "18px",
                color: "#1a6b5a",
            })
            .setOrigin(0.5)
            .setAlpha(0);

        this.tweens.add({
            targets: subtitle,
            alpha: 0.8,
            duration: 1200,
            delay: 400,
            ease: "Power2",
        });

        // ============================================================
        //  3. BOTÃO "INICIAR SIMULAÇÃO"
        // ============================================================

        const btnW = 320;
        const btnH = 64;
        const btnX = W / 2;
        const btnY = H / 2 + 40;

        // Container para agrupar corpo + texto do botão
        const btnContainer = this.add.container(btnX, btnY);
        btnContainer.setAlpha(0);

        // Corpo do botão
        const btnBg = this.add.rectangle(0, 0, btnW, btnH, 0x27ae60);
        btnBg.setStrokeStyle(3, 0x1e8449);
        btnBg.setInteractive({ useHandCursor: true });
        btnContainer.add(btnBg);

        // Texto do botão
        const btnLabel = this.add
            .text(0, 0, "▶  INICIAR SIMULAÇÃO", {
                fontFamily: "monospace",
                fontSize: "20px",
                color: "#ffffff",
                fontStyle: "bold",
            })
            .setOrigin(0.5);
        btnContainer.add(btnLabel);

        // Fade in do botão (com delay)
        this.tweens.add({
            targets: btnContainer,
            alpha: 1,
            duration: 800,
            delay: 800,
            ease: "Power2",
        });

        // Animação de "pulso" contínuo no botão (escala)
        this.tweens.add({
            targets: btnContainer,
            scaleX: 1.04,
            scaleY: 1.04,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
            delay: 1600,
        });

        // ---- Estados interativos do botão ----

        // Hover: brilho + escala maior
        btnBg.on("pointerover", () => {
            btnBg.setFillStyle(0x2ecc71);
            btnContainer.setScale(1.08);
        });

        // Pointer out: volta ao normal
        btnBg.on("pointerout", () => {
            btnBg.setFillStyle(0x27ae60);
            btnContainer.setScale(1);
        });

        // Click: afunda + transição
        btnBg.on("pointerdown", () => {
            btnContainer.setScale(0.95);
        });

        btnBg.on("pointerup", () => {
            btnContainer.setScale(1);
            this._startGame();
        });

        // ============================================================
        //  4. CRÉDITOS / RODAPÉ
        // ============================================================

        this.add
            .text(W / 2, H - 30, "Objeto de Aprendizagem – Mestrado", {
                fontFamily: "monospace",
                fontSize: "12px",
                color: "#6b7a8d",
            })
            .setOrigin(0.5);

        // ============================================================
        //  5. ÍCONE DECORATIVO DO ROBÔ (centro, acima do botão)
        // ============================================================

        this._createMiniRobot(W / 2, btnY - 100);
    }

    // ======================== ANIMAÇÃO DE PULSO NOS FIOS ========================

    /**
     * Anima um "pulso de dados" correndo por fios aleatórios.
     * Quando chega ao destino, escolhe outro fio aleatório e repete.
     */
    _animatePulse(pulse) {
        const edge =
            this.bgEdges[Phaser.Math.Between(0, this.bgEdges.length - 1)];

        // Posição de partida: um dos extremos do fio
        const reverse = Math.random() > 0.5;
        const startNode = reverse ? edge.to : edge.from;
        const endNode = reverse ? edge.from : edge.to;

        pulse.setPosition(startNode.x, startNode.y);

        const duration = Phaser.Math.Between(800, 2000);

        this.tweens.add({
            targets: pulse,
            x: endNode.x,
            y: endNode.y,
            duration,
            ease: "Linear",
            onComplete: () => {
                // Repetir para outro fio aleatório
                this._animatePulse(pulse);
            },
        });
    }

    // ======================== MINI ROBÔ DECORATIVO ========================

    /**
     * Cria uma versão pequena do robô do jogo como ícone decorativo.
     */
    _createMiniRobot(x, y) {
        const container = this.add.container(x, y);

        // Corpo
        const body = this.add.rectangle(0, 0, 60, 60, 0x3498db);
        body.setStrokeStyle(2, 0x2980b9);

        // Olhos
        const eyeL = this.add.circle(-15, -12, 7, 0xffffff);
        const eyeR = this.add.circle(15, -12, 7, 0xffffff);
        const pupilL = this.add.circle(-13, -12, 3.5, 0x2c3e50);
        const pupilR = this.add.circle(17, -12, 3.5, 0x2c3e50);

        // Antena
        const antenna = this.add.rectangle(0, -37, 4, 14, 0xe74c3c);
        const antennaTip = this.add.circle(0, -45, 5, 0xe74c3c);

        // Seta de direção
        const arrow = this.add.triangle(36, 0, 0, -10, 14, 0, 0, 10, 0xf1c40f);
        arrow.setStrokeStyle(1, 0xd4ac0d);

        container.add([
            body,
            eyeL,
            eyeR,
            pupilL,
            pupilR,
            antenna,
            antennaTip,
            arrow,
        ]);

        // Animação flutuante
        this.tweens.add({
            targets: container,
            y: y - 8,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut",
        });

        return container;
    }

    // ======================== TRANSIÇÃO ========================

    /**
     * Inicia a transição para o jogo.
     *
     * TRANSIÇÃO DE CENAS DO PHASER:
     *   1. cameras.main.fadeOut() → escurece a tela em 1 segundo
     *   2. Ao terminar o fade, this.scene.start() é chamado
     *   3. scene.start('SimulationScene') encerra esta SplashScene
     *      e inicia a SimulationScene, que no seu create() lança
     *      as demais cenas paralelas (LogicScene, HudScene)
     */
    _startGame() {
        // Evitar cliques duplos
        this.input.enabled = false;

        // Fade out escuro de 1 segundo
        this.cameras.main.fadeOut(1000, 0, 0, 0);

        // Quando o fade terminar, iniciar a cena do jogo
        this.cameras.main.once("camerafadeoutcomplete", () => {
            this.scene.start("SimulationScene");
        });
    }
}
