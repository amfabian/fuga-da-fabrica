/**
 * ========================================================
 *  SimulationScene – Área de Simulação (metade esquerda)
 * ========================================================
 *
 *  Responsável por:
 *    • Desenhar o grid 5×5
 *    • Posicionar o robô, a bateria e obstáculos
 *    • Gerenciar direção (facing) do robô: 0=direita, 90=baixo,
 *      180=esquerda, 270=cima
 *    • Expor moveForward() e turnRight() chamados pela
 *      travessia de grafo do GraphExecutor
 *    • Expor isObstacle() e isOutOfBounds() para o sensor
 *    • Aceitar configuração de nível via loadLevel()
 */

import Phaser from "phaser";

/** Constantes do grid */
const GRID_COLS = 5;
const GRID_ROWS = 5;
const CELL_SIZE = 80;
const GRID_LINE_COLOR = 0x3a3a5c;
const GRID_LINE_ALPHA = 0.8;

/**
 * Mapa de direção → delta de grid.
 *   0°   = direita  (+1, 0)
 *   90°  = baixo    ( 0,+1)
 *   180° = esquerda (-1, 0)
 *   270° = cima     ( 0,-1)
 */
const DIRECTION_DELTAS = {
    0: { dx: 1, dy: 0 },
    90: { dx: 0, dy: 1 },
    180: { dx: -1, dy: 0 },
    270: { dx: 0, dy: -1 },
};

/**
 * Definição dos níveis do jogo.
 * Cada nível configura posição do robô, direção inicial,
 * posição da bateria, obstáculos e nós disponíveis na paleta.
 */
export const LEVELS = {
    1: {
        robotX: 0,
        robotY: 2,
        robotDir: 0,
        goalX: 3,
        goalY: 2,
        obstacles: [],
        availableNodes: ["move_forward"],
        instructions: [
            '1. Clique em "+ MOVER FRENTE" para criar nós',
            "2. Clique na porta verde (●) de saída",
            "   depois na porta vermelha (●) de entrada",
            "   para conectá-los com um fio",
            '3. Conecte 3 nós "MOVER FRENTE" ao "INÍCIO"',
            '4. Clique em "▶ EXECUTAR" para rodar!',
        ],
    },
    2: {
        robotX: 1,
        robotY: 1,
        robotDir: 0,
        goalX: null, // randomizado em loadLevel
        goalY: null,
        obstacles: [],
        availableNodes: ["move_forward", "turn_right", "turn_left"],
        instructions: [
            '1. Use "MOVER FRENTE" e "GIRAR DIREITA"',
            "2. Mova para a direita, gire, e continue",
            "3. A bateria está em posição aleatória!",
            '4. Clique em "▶ EXECUTAR" para testar!',
        ],
    },
    3: {
        robotX: 1,
        robotY: 2,
        robotDir: 0, // virado para a DIREITA
        goalX: null, // randomizado em loadLevel
        goalY: null,
        obstacles: [], // randomizado em loadLevel
        /**
         * 5 variantes de mapa para o nível 3.
         * Cada variante define posição da bateria e duas caixas.
         * As cores (blocking/non-blocking) das caixas são trocadas aleatoriamente.
         */
        maps: [
            // Variante 1: caixas na coluna 3, bateria em (3,0)
            {
                goalX: 3,
                goalY: 0,
                boxes: [
                    { x: 3, y: 2 },
                    { x: 3, y: 1 },
                ],
            },
            // Variante 2: caixas na linha 2, bateria em (4,1)
            {
                goalX: 4,
                goalY: 1,
                boxes: [
                    { x: 3, y: 2 },
                    { x: 2, y: 1 },
                ],
            },
            // Variante 3: caixas escalonadas, bateria em (4,0)
            {
                goalX: 4,
                goalY: 0,
                boxes: [
                    { x: 3, y: 2 },
                    { x: 4, y: 2 },
                ],
            },
            // Variante 4: caixas lado a lado, bateria em (3,3)
            {
                goalX: 3,
                goalY: 3,
                boxes: [
                    { x: 3, y: 2 },
                    { x: 2, y: 3 },
                ],
            },
            // Variante 5: caixas diagonais, bateria em (4,3)
            {
                goalX: 4,
                goalY: 3,
                boxes: [
                    { x: 3, y: 2 },
                    { x: 3, y: 3 },
                ],
            },
        ],
        availableNodes: [
            "move_forward",
            "turn_right",
            "turn_left",
            "check_sensor",
        ],
        instructions: [
            '1. Use "VERIFICAR SENSOR" sobre as caixas',
            "2. O robô deve ESTAR SOBRE a caixa para",
            "   verificar se é verde (Livre) ou vermelha",
            "   (Bloq.)",
            "3. Verifique as DUAS caixas e chegue",
            "   à bateria para vencer!",
            '4. Clique em "▶ EXECUTAR" para testar!',
        ],
    },
};

export class SimulationScene extends Phaser.Scene {
    constructor() {
        super({ key: "SimulationScene" });

        /** Nível atual */
        this.currentLevel = 1;

        /** Obstáculos do nível atual: [{x, y, blocking}] */
        this.obstacles = [];

        /** Containers dos sprites de obstáculos */
        this.obstacleContainers = [];

        /** Conjunto de obstáculos verificados pelo sensor (chave: "x,y") */
        this.verifiedObstacles = new Set();
    }

    create() {
        // ---- Limitar a câmera à metade esquerda da tela ----
        const halfW = this.sys.game.config.width / 2;
        const fullH = this.sys.game.config.height;
        this.cameras.main.setViewport(0, 0, halfW, fullH);

        // Phaser só auto-inicia a primeira cena; lançar as demais
        this.scene.launch("LogicScene");
        this.scene.launch("HudScene");

        // Ponto de origem do grid (centralizado na metade esquerda)
        const gridTotalW = GRID_COLS * CELL_SIZE;
        const gridTotalH = GRID_ROWS * CELL_SIZE;
        this.gridOriginX = (halfW - gridTotalW) / 2;
        this.gridOriginY = (fullH - gridTotalH) / 2;

        this._drawGrid();

        // Carregar dados do nível
        const levelNum = this.registry.get("currentLevel") || 1;
        this.loadLevel(levelNum);

        // Texto de título
        this.add
            .text(halfW / 2, 30, "SIMULAÇÃO", {
                fontFamily: "monospace",
                fontSize: "22px",
                color: "#94e2d5",
            })
            .setOrigin(0.5);

        // Indicador de nível
        this.levelText = this.add
            .text(halfW / 2, 58, "", {
                fontFamily: "monospace",
                fontSize: "14px",
                color: "#888",
            })
            .setOrigin(0.5);
        this._updateLevelText();

        // Linha divisória na borda direita
        const divider = this.add.graphics();
        divider.lineStyle(2, 0x555577, 1);
        divider.lineBetween(halfW - 1, 0, halfW - 1, fullH);
    }

    // ======================== NÍVEIS ========================

    /**
     * Carrega a configuração de um nível e (re)cria robô, bateria e obstáculos.
     */
    loadLevel(levelNum) {
        const level = LEVELS[levelNum];
        if (!level) {
            console.warn(`Nível ${levelNum} não encontrado, usando nível 1.`);
            return this.loadLevel(1);
        }

        this.currentLevel = levelNum;
        this.registry.set("currentLevel", levelNum);

        // Posições iniciais do robô
        this.robotStartX = level.robotX;
        this.robotStartY = level.robotY;
        this.robotStartDir = level.robotDir;

        this.robotGridX = level.robotX;
        this.robotGridY = level.robotY;
        this.robotDir = level.robotDir;

        // Randomizar posição da bateria no nível 2:
        // A bateria deve estar em coluna e linha diferentes do robô,
        // acessível com exatamente uma virada à direita (X > robotX, Y > robotY).
        if (levelNum === 2 && level.goalX === null) {
            const rX = level.robotX;
            const rY = level.robotY;
            // Possíveis colunas: rX+1 até 4 ; Possíveis linhas: rY+1 até 4
            const possibleX = [];
            const possibleY = [];
            for (let c = rX + 1; c < 5; c++) possibleX.push(c);
            for (let r = rY + 1; r < 5; r++) possibleY.push(r);
            this.goalGridX =
                possibleX[Math.floor(Math.random() * possibleX.length)];
            this.goalGridY =
                possibleY[Math.floor(Math.random() * possibleY.length)];
        } else {
            this.goalGridX = level.goalX;
            this.goalGridY = level.goalY;
        }

        // Randomizar mapa do nível 3:
        // Escolhe uma das 5 variantes e troca aleatoriamente
        // qual caixa é bloqueante (vermelha) e qual é passável (verde).
        if (levelNum === 3 && level.maps) {
            const variant =
                level.maps[Math.floor(Math.random() * level.maps.length)];
            this.goalGridX = variant.goalX;
            this.goalGridY = variant.goalY;

            // Decidir aleatoriamente qual caixa é bloqueante
            const swapColors = Math.random() < 0.5;
            this.obstacles = variant.boxes.map((box, i) => ({
                x: box.x,
                y: box.y,
                blocking: swapColors ? i === 1 : i === 0,
            }));
        } else {
            // Obstáculos padrão (níveis sem randomização)
            this.obstacles = (level.obstacles || []).map((o) => ({
                ...o,
                blocking: o.blocking !== undefined ? o.blocking : true,
            }));
        }

        // Limpar sprites antigos
        if (this.batteryContainer) this.batteryContainer.destroy();
        if (this.robotContainer) this.robotContainer.destroy();
        if (this.popupContainer) {
            this.popupContainer.destroy();
            this.popupContainer = null;
        }

        // Limpar verificações de sensor
        this.verifiedObstacles = new Set();

        // Limpar obstáculos antigos
        for (const obs of this.obstacleContainers) {
            obs.destroy();
        }
        this.obstacleContainers = [];

        // Criar elementos do nível
        this._createObstacles();
        this._createBattery();
        this._createRobot();
        this._updateLevelText();
    }

    _updateLevelText() {
        if (this.levelText) {
            this.levelText.setText(`Nível ${this.currentLevel}`);
        }
    }

    // ======================== GRID ========================

    _drawGrid() {
        const g = this.add.graphics();

        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = this.gridOriginX + col * CELL_SIZE;
                const y = this.gridOriginY + row * CELL_SIZE;

                const shade = (row + col) % 2 === 0 ? 0x16213e : 0x1a1a2e;
                g.fillStyle(shade, 1);
                g.fillRect(x, y, CELL_SIZE, CELL_SIZE);

                g.lineStyle(1, GRID_LINE_COLOR, GRID_LINE_ALPHA);
                g.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            }
        }
    }

    // ======================== BATERIA ========================

    _createBattery() {
        const { x, y } = this._gridToPixel(this.goalGridX, this.goalGridY);

        this.batteryContainer = this.add.container(x, y);

        const body = this.add.rectangle(0, 0, 40, 56, 0x2ecc71);
        body.setStrokeStyle(2, 0x27ae60);

        const terminal = this.add.rectangle(0, -32, 18, 10, 0x27ae60);

        const bolt = this.add
            .text(0, 0, "⚡", { fontSize: "22px" })
            .setOrigin(0.5);

        this.batteryContainer.add([body, terminal, bolt]);
    }

    // ======================== OBSTÁCULOS ========================

    /**
     * Cria os sprites de obstáculo para o nível atual.
     */
    _createObstacles() {
        for (const obs of this.obstacles) {
            const { x, y } = this._gridToPixel(obs.x, obs.y);
            const container = this.add.container(x, y);

            if (obs.blocking) {
                // Caixa VERMELHA (bloqueante)
                const body = this.add.rectangle(0, 0, 55, 55, 0xc0392b);
                body.setStrokeStyle(3, 0x922b21);

                const g = this.add.graphics();
                g.lineStyle(2, 0xe74c3c, 0.6);
                g.lineBetween(-20, -20, 20, 20);
                g.lineBetween(20, -20, -20, 20);

                const icon = this.add
                    .text(0, 0, "🚫", { fontSize: "22px" })
                    .setOrigin(0.5);

                container.add([body, g, icon]);
            } else {
                // Caixa VERDE (não-bloqueante)
                const body = this.add.rectangle(0, 0, 55, 55, 0x27ae60);
                body.setStrokeStyle(3, 0x1e8449);

                const g = this.add.graphics();
                g.lineStyle(2, 0x2ecc71, 0.6);
                g.lineBetween(-20, -20, 20, 20);
                g.lineBetween(20, -20, -20, 20);

                const icon = this.add
                    .text(0, 0, "✅", { fontSize: "22px" })
                    .setOrigin(0.5);

                container.add([body, g, icon]);
            }

            this.obstacleContainers.push(container);
        }
    }

    // ======================== ROBÔ ========================

    _createRobot() {
        const { x, y } = this._gridToPixel(this.robotGridX, this.robotGridY);

        this.robotContainer = this.add.container(x, y);

        const body = this.add.rectangle(0, 0, 50, 50, 0x3498db);
        body.setStrokeStyle(2, 0x2980b9);

        const eyeL = this.add.circle(-12, -10, 6, 0xffffff);
        const eyeR = this.add.circle(12, -10, 6, 0xffffff);
        const pupilL = this.add.circle(-10, -10, 3, 0x1a1a2e);
        const pupilR = this.add.circle(14, -10, 3, 0x1a1a2e);

        const antenna = this.add.rectangle(0, -30, 4, 12, 0xe74c3c);
        const antennaTip = this.add.circle(0, -37, 4, 0xe74c3c);

        this.dirArrow = this.add.triangle(30, 0, 0, -8, 12, 0, 0, 8, 0xf1c40f);
        this.dirArrow.setStrokeStyle(1, 0xd4ac0d);

        this.robotContainer.add([
            body,
            eyeL,
            eyeR,
            pupilL,
            pupilR,
            antenna,
            antennaTip,
            this.dirArrow,
        ]);

        this.robotContainer.setAngle(this.robotDir);
    }

    // ======================== MOVIMENTAÇÃO ========================

    /**
     * Move o robô UMA casa na direção em que está virado.
     * Bloqueia se houver obstáculo ou borda do grid à frente.
     *
     * @param {object} msg - Objeto de estado { x, y, direction }
     * @returns {Promise<object>} msg atualizado
     */
    moveForward(msg) {
        return new Promise((resolve) => {
            const dir = this._normalizeDir(msg.direction);
            const delta = DIRECTION_DELTAS[dir];

            const nextX = this.robotGridX + delta.dx;
            const nextY = this.robotGridY + delta.dy;

            // Verifica se está dentro dos limites do grid
            if (this.isOutOfBounds(nextX, nextY)) {
                console.warn(
                    `Movimento bloqueado: fora do grid (${nextX}, ${nextY})`,
                );
                resolve(msg);
                return;
            }

            // Verifica se há obstáculo
            if (this.isObstacle(nextX, nextY)) {
                console.warn(
                    `Movimento bloqueado: obstáculo em (${nextX}, ${nextY})`,
                );
                resolve(msg);
                return;
            }

            this.robotGridX = nextX;
            this.robotGridY = nextY;
            msg.x = nextX;
            msg.y = nextY;

            const { x: targetX, y: targetY } = this._gridToPixel(nextX, nextY);

            this.tweens.add({
                targets: this.robotContainer,
                x: targetX,
                y: targetY,
                duration: 400,
                ease: "Power2",
                onComplete: () => {
                    resolve(msg);
                },
            });
        });
    }

    /**
     * Gira o robô 90° para a direita com animação tween.
     *
     * @param {object} msg - Objeto de estado
     * @returns {Promise<object>} msg atualizado
     */
    turnRight(msg) {
        return new Promise((resolve) => {
            const newDir = this._normalizeDir(msg.direction + 90);
            this.robotDir = newDir;
            msg.direction = newDir;

            this.tweens.add({
                targets: this.robotContainer,
                angle: this.robotContainer.angle + 90,
                duration: 300,
                ease: "Power2",
                onComplete: () => {
                    resolve(msg);
                },
            });
        });
    }

    /**
     * Gira o robô 90° para a esquerda com animação tween.
     *
     * @param {object} msg - Objeto de estado
     * @returns {Promise<object>} msg atualizado
     */
    turnLeft(msg) {
        return new Promise((resolve) => {
            const newDir = this._normalizeDir(msg.direction - 90);
            this.robotDir = newDir;
            msg.direction = newDir;

            this.tweens.add({
                targets: this.robotContainer,
                angle: this.robotContainer.angle - 90,
                duration: 300,
                ease: "Power2",
                onComplete: () => {
                    resolve(msg);
                },
            });
        });
    }

    /**
     * Reseta o robô para a posição inicial do nível atual.
     */
    resetRobot() {
        this.robotGridX = this.robotStartX;
        this.robotGridY = this.robotStartY;
        this.robotDir = this.robotStartDir;

        const { x, y } = this._gridToPixel(this.robotGridX, this.robotGridY);
        this.robotContainer.setPosition(x, y);
        this.robotContainer.setAngle(this.robotDir);

        if (this.popupContainer) {
            this.popupContainer.destroy();
            this.popupContainer = null;
        }

        // Limpar verificações de sensor ao resetar
        this.verifiedObstacles = new Set();
    }

    // ======================== CONSULTAS DE ESTADO (SENSOR) ========================

    /**
     * Verifica se há um obstáculo na coordenada de grid fornecida.
     * Chamado pelo GraphExecutor ao avaliar o nó check_sensor.
     *
     * @param {number} gridX
     * @param {number} gridY
     * @returns {boolean}
     */
    /**
     * Verifica se há um obstáculo BLOQUEANTE na coordenada de grid.
     * No nível 3, caixas NÃO bloqueiam o movimento do robô.
     */
    isObstacle(gridX, gridY) {
        // No nível 3, caixas não bloqueiam – o robô pode andar sobre elas
        if (this.currentLevel === 3) return false;
        return this.obstacles.some(
            (o) => o.x === gridX && o.y === gridY && o.blocking,
        );
    }

    /**
     * Retorna o obstáculo na posição do grid, ou null.
     */
    getBoxAt(gridX, gridY) {
        return (
            this.obstacles.find((o) => o.x === gridX && o.y === gridY) || null
        );
    }

    /**
     * Verifica o sensor na posição ATUAL do robô.
     * Marca o obstáculo como verificado.
     * Retorna 'bloqueado' se a caixa é vermelha, 'livre' se verde,
     * ou 'livre' se não há caixa.
     */
    checkSensorAtCurrentPos() {
        const box = this.getBoxAt(this.robotGridX, this.robotGridY);
        if (box) {
            this.verifiedObstacles.add(`${box.x},${box.y}`);
            return box.blocking ? "bloqueado" : "livre";
        }
        return "livre";
    }

    /**
     * Verifica se o nível foi concluído com sucesso.
     * Para o nível 3: o robô deve ter verificado TODOS os obstáculos
     * e estar na posição da bateria.
     * Para outros níveis: basta estar na bateria.
     */
    checkLevelComplete() {
        const atGoal =
            this.robotGridX === this.goalGridX &&
            this.robotGridY === this.goalGridY;

        if (this.currentLevel === 3) {
            const allVerified = this.obstacles.every((o) =>
                this.verifiedObstacles.has(`${o.x},${o.y}`),
            );
            return atGoal && allVerified;
        }

        return atGoal;
    }

    /**
     * Verifica se a coordenada está fora dos limites do grid 5×5.
     *
     * @param {number} gridX
     * @param {number} gridY
     * @returns {boolean}
     */
    isOutOfBounds(gridX, gridY) {
        return (
            gridX < 0 || gridX >= GRID_COLS || gridY < 0 || gridY >= GRID_ROWS
        );
    }

    // ======================== EVENTOS ========================

    /**
     * Exibe um popup centralizado com o resultado da execução.
     * O usuário deve clicar para fechar.
     *
     * @param {object} opts - { title, message, color, onClose }
     */
    showResultPopup({ title, message, color, onClose }) {
        // Remover popup anterior se existir
        if (this.popupContainer) {
            this.popupContainer.destroy();
            this.popupContainer = null;
        }

        const halfW = this.sys.game.config.width / 2;
        const fullH = this.sys.game.config.height;
        const centerX = halfW / 2;
        const centerY = fullH / 2;

        const popupW = 340;
        const popupH = 180;

        this.popupContainer = this.add.container(centerX, centerY);
        this.popupContainer.setDepth(100);

        // Fundo semi-transparente cobrindo toda a área
        const overlay = this.add.rectangle(0, 0, halfW, fullH, 0x000000, 0.5);
        overlay.setInteractive(); // bloqueia cliques abaixo
        this.popupContainer.add(overlay);

        // Corpo do popup
        const bg = this.add.rectangle(0, 0, popupW, popupH, 0x1a1a2e);
        bg.setStrokeStyle(3, color);
        this.popupContainer.add(bg);

        // Titulo
        const titleText = this.add
            .text(0, -popupH / 2 + 30, title, {
                fontFamily: "monospace",
                fontSize: "20px",
                color: Phaser.Display.Color.IntegerToColor(color).rgba,
                fontStyle: "bold",
                align: "center",
            })
            .setOrigin(0.5);
        this.popupContainer.add(titleText);

        // Mensagem
        const msgText = this.add
            .text(0, 10, message, {
                fontFamily: "monospace",
                fontSize: "13px",
                color: "#cccccc",
                align: "center",
                wordWrap: { width: popupW - 40 },
            })
            .setOrigin(0.5);
        this.popupContainer.add(msgText);

        // Botão "OK"
        const btnW = 100;
        const btnH = 34;
        const btnY = popupH / 2 - 30;

        const btnBg = this.add.rectangle(0, btnY, btnW, btnH, color);
        btnBg.setInteractive({ useHandCursor: true });
        this.popupContainer.add(btnBg);

        const btnLabel = this.add
            .text(0, btnY, "OK", {
                fontFamily: "monospace",
                fontSize: "14px",
                color: "#ffffff",
                fontStyle: "bold",
            })
            .setOrigin(0.5);
        this.popupContainer.add(btnLabel);

        // Hover
        btnBg.on("pointerover", () => btnBg.setAlpha(0.8));
        btnBg.on("pointerout", () => btnBg.setAlpha(1));

        // Fechar ao clicar
        btnBg.on("pointerdown", () => {
            this.popupContainer.destroy();
            this.popupContainer = null;
            if (onClose) onClose();
        });

        // Animação de entrada
        this.popupContainer.setScale(0.7);
        this.popupContainer.setAlpha(0);
        this.tweens.add({
            targets: this.popupContainer,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 300,
            ease: "Back.easeOut",
        });
    }

    // ======================== UTILIDADES ========================

    _normalizeDir(deg) {
        return ((deg % 360) + 360) % 360;
    }

    _gridToPixel(col, row) {
        return {
            x: this.gridOriginX + col * CELL_SIZE + CELL_SIZE / 2,
            y: this.gridOriginY + row * CELL_SIZE + CELL_SIZE / 2,
        };
    }
}
