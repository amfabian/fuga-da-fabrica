/**
 * ========================================================
 *  HudScene – Overlay com botões de execução e navegação
 * ========================================================
 *
 *  Roda por cima das outras cenas como overlay transparente.
 *  Contém:
 *    • Botão "▶ EXECUTAR"
 *    • Botão "↺ RESETAR"
 *    • Botões de navegação de nível ("◀ Nível" / "Nível ▶")
 *    • Atalho de teclado: teclas 1–9 para ir direto a um nível (debug)
 */

import Phaser from "phaser";
import { LEVELS } from "./SimulationScene.js";

export class HudScene extends Phaser.Scene {
    constructor() {
        super({ key: "HudScene" });
        this.isExecuting = false;
    }

    create() {
        const gameW = this.sys.game.config.width;
        const gameH = this.sys.game.config.height;

        // ---- Botão "EXECUTAR" (centro inferior) ----
        const btnW = 200;
        const btnH = 50;
        const btnX = gameW / 2;
        const btnY = gameH - 40;

        this.btnBg = this.add.rectangle(btnX, btnY, btnW, btnH, 0x27ae60);
        this.btnBg.setStrokeStyle(3, 0x1e8449);
        this.btnBg.setInteractive({ useHandCursor: true });

        this.btnLabel = this.add
            .text(btnX, btnY, "▶  EXECUTAR", {
                fontFamily: "monospace",
                fontSize: "18px",
                color: "#ffffff",
                fontStyle: "bold",
            })
            .setOrigin(0.5);

        // ---- Botão "RESETAR" (à direita do executar) ----
        const resetX = btnX + btnW / 2 + 80;
        this.resetBg = this.add.rectangle(resetX, btnY, 120, btnH, 0x7f8c8d);
        this.resetBg.setStrokeStyle(2, 0x636e72);
        this.resetBg.setInteractive({ useHandCursor: true });

        this.resetLabel = this.add
            .text(resetX, btnY, "↺ RESETAR", {
                fontFamily: "monospace",
                fontSize: "14px",
                color: "#ffffff",
            })
            .setOrigin(0.5);

        // ---- Botão "◀ Anterior" (à esquerda do executar) ----
        const prevX = btnX - btnW / 2 - 80;
        this.prevLevelBg = this.add.rectangle(prevX, btnY, 120, btnH, 0x34495e);
        this.prevLevelBg.setStrokeStyle(2, 0x2c3e50);
        this.prevLevelBg.setInteractive({ useHandCursor: true });
        this.prevLevelLabel = this.add
            .text(prevX, btnY, "◀ Anterior", {
                fontFamily: "monospace",
                fontSize: "12px",
                color: "#bbb",
            })
            .setOrigin(0.5);

        // ---- Botão "Próximo ▶" (à direita do resetar) ----
        const nextX = resetX + 60 + 70;
        this.nextLevelBg = this.add.rectangle(nextX, btnY, 120, btnH, 0x34495e);
        this.nextLevelBg.setStrokeStyle(2, 0x2c3e50);
        this.nextLevelBg.setInteractive({ useHandCursor: true });
        this.nextLevelLabel = this.add
            .text(nextX, btnY, "Próximo ▶", {
                fontFamily: "monospace",
                fontSize: "12px",
                color: "#bbb",
            })
            .setOrigin(0.5);

        // Visibilidade inicial dos botões de nível
        this._updateLevelButtons();

        // ---- Eventos ----

        this.btnBg.on("pointerover", () => {
            if (!this.isExecuting) this.btnBg.setFillStyle(0x2ecc71);
        });
        this.btnBg.on("pointerout", () => {
            if (!this.isExecuting) this.btnBg.setFillStyle(0x27ae60);
        });
        this.btnBg.on("pointerdown", () => {
            if (this.isExecuting) return;
            this._onExecute();
        });

        this.resetBg.on("pointerover", () =>
            this.resetBg.setFillStyle(0x95a5a6),
        );
        this.resetBg.on("pointerout", () =>
            this.resetBg.setFillStyle(0x7f8c8d),
        );
        this.resetBg.on("pointerdown", () => {
            if (this.isExecuting) return;
            this._onReset();
        });

        this.prevLevelBg.on("pointerover", () =>
            this.prevLevelBg.setFillStyle(0x4a6278),
        );
        this.prevLevelBg.on("pointerout", () =>
            this.prevLevelBg.setFillStyle(0x34495e),
        );
        this.prevLevelBg.on("pointerdown", () => {
            if (this.isExecuting) return;
            this._changeLevel(-1);
        });

        this.nextLevelBg.on("pointerover", () =>
            this.nextLevelBg.setFillStyle(0x4a6278),
        );
        this.nextLevelBg.on("pointerout", () =>
            this.nextLevelBg.setFillStyle(0x34495e),
        );
        this.nextLevelBg.on("pointerdown", () => {
            if (this.isExecuting) return;
            this._changeLevel(1);
        });

        // ---- Atalho de teclado: teclas 1–9 para pular direto a um nível (debug) ----
        // ---- Tecla R: recarregar o mapa do nível atual (rerandomizar) ----
        this.input.keyboard.on("keydown", (event) => {
            if (this.isExecuting) return;
            if (event.key === "r" || event.key === "R") {
                this._refreshMap();
                return;
            }
            const num = parseInt(event.key, 10);
            if (!isNaN(num) && num >= 1) {
                this._goToLevel(num);
            }
        });
    }

    /**
     * Atualiza a visibilidade dos botões de navegação de nível.
     */
    _updateLevelButtons() {
        const currentLevel = this.registry.get("currentLevel") || 1;
        const completedLevels = this.registry.get("completedLevels") || [];

        const showPrev = currentLevel > 1;
        this.prevLevelBg.setVisible(showPrev);
        this.prevLevelLabel.setVisible(showPrev);

        const totalLevels = Object.keys(LEVELS).length;
        const showNext =
            completedLevels.includes(currentLevel) &&
            currentLevel < totalLevels;
        this.nextLevelBg.setVisible(showNext);
        this.nextLevelLabel.setVisible(showNext);
    }

    /**
     * Chamado quando um nível é concluído com sucesso.
     */
    onLevelCompleted(levelNum) {
        const completedLevels = this.registry.get("completedLevels") || [];
        if (!completedLevels.includes(levelNum)) {
            completedLevels.push(levelNum);
            this.registry.set("completedLevels", completedLevels);
        }
        this._updateLevelButtons();
    }

    async _onExecute() {
        this.isExecuting = true;
        this.btnBg.setFillStyle(0x636e72);
        this.btnLabel.setText("⏳ Executando...");

        const logicScene = this.scene.get("LogicScene");
        await logicScene.executeProgram();

        this.isExecuting = false;
        this.btnBg.setFillStyle(0x27ae60);
        this.btnLabel.setText("▶  EXECUTAR");
    }

    _onReset() {
        const simulationScene = this.scene.get("SimulationScene");
        simulationScene.resetRobot();
    }

    /**
     * Troca de nível (delta = -1 para anterior, +1 para próximo).
     */
    _changeLevel(delta) {
        const totalLevels = Object.keys(LEVELS).length;
        const currentLevel = this.registry.get("currentLevel") || 1;
        const newLevel = currentLevel + delta;

        if (newLevel < 1 || newLevel > totalLevels) return;

        this._goToLevel(newLevel);
    }

    /**
     * Recarrega o mapa do nível atual (rerandomiza posições).
     * Atalho de debug: tecla R.
     */
    _refreshMap() {
        const currentLevel = this.registry.get("currentLevel") || 1;
        const simulationScene = this.scene.get("SimulationScene");
        simulationScene.loadLevel(currentLevel);

        const logicScene = this.scene.get("LogicScene");
        logicScene.rebuildForLevel();
    }

    /**
     * Vai diretamente para um nível específico.
     * Usado pelos botões de navegação e pelo atalho de teclado (debug).
     * @param {number} levelNum - Número do nível (1-based)
     */
    _goToLevel(levelNum) {
        const currentLevel = this.registry.get("currentLevel") || 1;
        if (levelNum === currentLevel) return;

        const totalLevels = Object.keys(LEVELS).length;
        if (levelNum < 1 || levelNum > totalLevels) return;

        const simulationScene = this.scene.get("SimulationScene");
        simulationScene.loadLevel(levelNum);

        const logicScene = this.scene.get("LogicScene");
        logicScene.rebuildForLevel();

        this._updateLevelButtons();
    }
}
