/**
 * ========================================================
 *  LogicScene – Área de Lógica / Canvas de Montagem
 *               (metade direita da tela)
 * ========================================================
 *
 *  Responsável por:
 *    • Exibir o nó fixo [INÍCIO]
 *    • Fornecer uma "paleta" de nós arrastáveis
 *    • Gerenciar drag & drop de nós
 *    • Conectar portas via fios (click na porta de saída,
 *      depois click na porta de entrada)
 *    • Suportar nós com múltiplas saídas (ex: check_sensor)
 *    • Expor o grafo para execução
 */

import Phaser from "phaser";
import { NodeFactory } from "../nodes/NodeFactory.js";
import { Wire } from "../nodes/Wire.js";
import { GraphExecutor } from "./GraphExecutor.js";
import { LEVELS } from "./SimulationScene.js";

export class LogicScene extends Phaser.Scene {
    constructor() {
        super({ key: "LogicScene" });

        /** Lista de todos os nós no canvas */
        this.nodes = [];

        /**
         * Estado de conexão pendente.
         * { node, portType, outputKey }
         * outputKey é null para saída única, ou a chave da
         * saída nomeada (ex: 'livre', 'bloqueado').
         */
        this.pendingConnection = null;

        /** Linha temporária ao conectar */
        this.tempWireGraphics = null;

        /** Lista de fios */
        this.wires = [];

        /** Grupo de objetos da paleta */
        this.paletteObjects = [];

        /** Grupo de objetos de instrução */
        this.instructionObjects = [];
    }

    create() {
        const gameW = this.sys.game.config.width;
        const halfW = gameW / 2;
        const fullH = this.sys.game.config.height;

        // ---- Limitar a câmera à metade direita da tela ----
        this.cameras.main.setViewport(halfW, 0, halfW, fullH);

        // Fundo levemente diferente para distinguir a área
        const bg = this.add.rectangle(
            halfW / 2,
            fullH / 2,
            halfW,
            fullH,
            0x0f0f23,
        );
        bg.setAlpha(0.5);

        // Título
        this.add
            .text(halfW / 2, 30, "LÓGICA", {
                fontFamily: "monospace",
                fontSize: "22px",
                color: "#f1c40f",
            })
            .setOrigin(0.5);

        // Gráfica temporária para fios sendo arrastados
        this.tempWireGraphics = this.add.graphics();

        // ---- Criar o nó [INÍCIO] fixo ----
        this.startNode = NodeFactory.createStartNode(this, 80, 150);
        this.nodes.push(this.startNode);

        // ---- Paleta dinâmica ----
        this._buildPalette();

        // ---- Instruções dinâmicas ----
        this._buildInstructions();

        // ---- Configurar interação de conexão de portas ----
        this._setupPortInteraction();

        // ---- Configurar deleção de nós via clique direito ----
        this._setupNodeDeletion();
    }

    // ======================== TROCA DE NÍVEL ========================

    rebuildForLevel() {
        // Remover todos os nós exceto o INÍCIO
        for (const node of this.nodes) {
            if (node !== this.startNode) {
                node.destroy();
            }
        }
        // Desconectar o INÍCIO
        this.startNode.disconnect();
        this.nodes = [this.startNode];

        // Remover fios
        for (const wire of this.wires) {
            wire.destroy();
        }
        this.wires = [];

        // Reconstruir paleta e instruções
        this._buildPalette();
        this._buildInstructions();
    }

    // ======================== PALETA (DINÂMICA) ========================

    _buildPalette() {
        for (const obj of this.paletteObjects) {
            obj.destroy();
        }
        this.paletteObjects = [];

        const halfW = this.sys.game.config.width / 2;
        const paletteY = 80;

        const levelNum = this.registry.get("currentLevel") || 1;
        const level = LEVELS[levelNum];
        const available = level ? level.availableNodes : ["move_forward"];

        // Fundo da paleta
        const paletteBg = this.add.rectangle(
            halfW / 2,
            paletteY,
            halfW - 40,
            50,
            0x1a1a3e,
        );
        paletteBg.setStrokeStyle(1, 0x3a3a5c);
        paletteBg.setAlpha(0.8);
        this.paletteObjects.push(paletteBg);

        const paletteLabel = this.add
            .text(20, paletteY, "Paleta:", {
                fontFamily: "monospace",
                fontSize: "13px",
                color: "#888",
            })
            .setOrigin(0, 0.5);
        this.paletteObjects.push(paletteLabel);

        // Definições de cada tipo de nó na paleta
        const nodeDefs = {
            move_forward: {
                label: "+ MOVER\nFRENTE",
                color: 0x2980b9,
                hoverColor: 0x3498db,
                type: "move_forward",
                width: 80,
            },
            turn_right: {
                label: "+ GIRAR\nDIREITA",
                color: 0xe67e22,
                hoverColor: 0xf39c12,
                type: "turn_right",
                width: 80,
            },
            turn_left: {
                label: "+ GIRAR\nESQUERDA",
                color: 0xe67e22,
                hoverColor: 0xf39c12,
                type: "turn_left",
                width: 80,
            },
            check_sensor: {
                label: "+ VERIFICAR\nSENSOR",
                color: 0x8e44ad,
                hoverColor: 0x9b59b6,
                type: "check_sensor",
                width: 80,
            },
        };

        let btnX = 130;
        const btnH = 44;
        const btnGap = 10;

        for (const nodeType of available) {
            const def = nodeDefs[nodeType];
            if (!def) continue;

            const btnW = def.width || 80;

            const bg = this.add.rectangle(
                btnX,
                paletteY,
                btnW,
                btnH,
                def.color,
            );
            bg.setStrokeStyle(2, def.color - 0x111111);
            bg.setInteractive({ useHandCursor: true });

            const label = this.add
                .text(btnX, paletteY, def.label, {
                    fontFamily: "monospace",
                    fontSize: "10px",
                    color: "#ffffff",
                    fontStyle: "bold",
                    align: "center",
                })
                .setOrigin(0.5);

            bg.on("pointerdown", (pointer) => {
                this._spawnAndDragNode(def.type, pointer);
            });
            bg.on("pointerover", () => bg.setFillStyle(def.hoverColor));
            bg.on("pointerout", () => bg.setFillStyle(def.color));

            this.paletteObjects.push(bg, label);
            btnX += btnW + btnGap;
        }
    }

    /**
     * Cria um nó na posição do ponteiro e inicia o arraste.
     */
    _spawnAndDragNode(type, pointer) {
        const spawnX = pointer.worldX;
        const spawnY = pointer.worldY;

        let node;
        switch (type) {
            case "move_forward":
                node = NodeFactory.createMoveForwardNode(this, spawnX, spawnY);
                break;
            case "turn_right":
                node = NodeFactory.createTurnRightNode(this, spawnX, spawnY);
                break;
            case "turn_left":
                node = NodeFactory.createTurnLeftNode(this, spawnX, spawnY);
                break;
            case "check_sensor":
                node = NodeFactory.createCheckSensorNode(this, spawnX, spawnY);
                break;
            default:
                return;
        }
        this.nodes.push(node);
        node.body.emit("pointerdown", pointer);
    }

    // ======================== INSTRUÇÕES (DINÂMICAS) ========================

    _buildInstructions() {
        for (const obj of this.instructionObjects) {
            obj.destroy();
        }
        this.instructionObjects = [];

        const fullH = this.sys.game.config.height;
        const halfW = this.sys.game.config.width / 2;
        const levelNum = this.registry.get("currentLevel") || 1;
        const level = LEVELS[levelNum];
        const instructions = level ? level.instructions : [];

        instructions.forEach((text, i) => {
            const t = this.add
                .text(halfW - 20, fullH - 160 + i * 20, text, {
                    fontFamily: "monospace",
                    fontSize: "11px",
                    color: "#666",
                })
                .setOrigin(1, 0.5);
            this.instructionObjects.push(t);
        });
    }

    // ======================== CONEXÃO DE PORTAS ========================

    _setupPortInteraction() {
        // Escutar cliques em qualquer objeto interativo da cena
        this.input.on("gameobjectdown", (_pointer, gameObject) => {
            const portType = gameObject.getData("portType");
            const ownerNode = gameObject.getData("ownerNode");

            if (!portType || !ownerNode) return;

            if (portType === "output") {
                // Identificar se é saída nomeada ou única
                const outputKey = gameObject.getData("outputKey") || null;

                // Remover conexão existente nesta saída
                if (outputKey) {
                    // Saída nomeada
                    if (ownerNode.connectedOutputs.has(outputKey)) {
                        ownerNode.disconnectOutput(outputKey);
                        this.wires = this.wires.filter(
                            (w) =>
                                !(
                                    w.sourceNode === ownerNode &&
                                    w.sourceOutputKey === outputKey
                                ),
                        );
                    }
                } else {
                    // Saída única
                    if (ownerNode.connectedTo) {
                        ownerNode.disconnect();
                        this.wires = this.wires.filter(
                            (w) => w.sourceNode !== ownerNode,
                        );
                    }
                }

                this.pendingConnection = {
                    node: ownerNode,
                    portType: "output",
                    outputKey,
                };

                // Feedback visual: destacar a porta
                gameObject.setFillStyle(0x00ff00);
            } else if (portType === "input" && this.pendingConnection) {
                // Completar conexão na porta de entrada
                const sourceNode = this.pendingConnection.node;
                const targetNode = ownerNode;
                const outputKey = this.pendingConnection.outputKey;

                // Evitar auto-conexão
                if (sourceNode === targetNode) {
                    this._cancelPendingConnection();
                    return;
                }

                // Evitar conectar a um nó que já tem entrada
                if (targetNode.connectedFrom) {
                    const prevSource = targetNode.connectedFrom;

                    // Se o nó anterior usa múltiplas saídas
                    if (prevSource.outputs) {
                        for (const [k, n] of prevSource.connectedOutputs) {
                            if (n === targetNode) {
                                prevSource.disconnectOutput(k);
                                this.wires = this.wires.filter(
                                    (w) =>
                                        !(
                                            w.sourceNode === prevSource &&
                                            w.sourceOutputKey === k
                                        ),
                                );
                            }
                        }
                    } else {
                        prevSource.disconnect();
                        this.wires = this.wires.filter(
                            (w) => w.targetNode !== targetNode,
                        );
                    }
                }

                // Criar conexão no grafo
                if (outputKey) {
                    sourceNode.connectOutputTo(outputKey, targetNode);
                } else {
                    sourceNode.connectTo(targetNode);
                }

                // Criar fio visual (passa a chave da saída)
                const wire = new Wire(this, sourceNode, targetNode, outputKey);
                this.wires.push(wire);

                // Resetar estado
                this._cancelPendingConnection();
            }
        });

        // Cancelar conexão pendente ao clicar no fundo
        this.input.on("pointerdown", (pointer) => {
            const go = this.input.hitTestPointer(pointer);
            if (go.length === 0 && this.pendingConnection) {
                this._cancelPendingConnection();
            }
        });

        // Linha temporária enquanto conexão está pendente
        this.input.on("pointermove", (pointer) => {
            this.tempWireGraphics.clear();

            if (!this.pendingConnection) return;

            // Determinar posição de origem (saída nomeada ou única)
            let from;
            if (this.pendingConnection.outputKey) {
                from = this.pendingConnection.node.getOutputPortPositionByKey(
                    this.pendingConnection.outputKey,
                );
            } else {
                from = this.pendingConnection.node.getOutputPortPosition();
            }
            if (!from) return;

            const toX = pointer.worldX;
            const toY = pointer.worldY;

            this.tempWireGraphics.lineStyle(2, 0xf1c40f, 0.5);
            this.tempWireGraphics.beginPath();
            this.tempWireGraphics.moveTo(from.x, from.y);
            this.tempWireGraphics.lineTo(toX, toY);
            this.tempWireGraphics.strokePath();
        });
    }

    _cancelPendingConnection() {
        if (this.pendingConnection) {
            const node = this.pendingConnection.node;
            const outputKey = this.pendingConnection.outputKey;

            if (outputKey) {
                // Restaurar cor da porta nomeada
                const port = node.outputPortsMap.get(outputKey);
                if (port) {
                    const outputDef = node.outputs?.find(
                        (o) => o.key === outputKey,
                    );
                    port.setFillStyle(outputDef?.color || 0x2ecc71);
                }
            } else if (node.outputPort) {
                node.outputPort.setFillStyle(0x2ecc71);
            }
        }
        this.pendingConnection = null;
        this.tempWireGraphics.clear();
    }

    // ======================== DELEÇÃO DE NÓS ========================

    /**
     * Configura clique direito (contextmenu) para deletar nós.
     * O nó [INÍCIO] não pode ser deletado.
     */
    _setupNodeDeletion() {
        // Desabilitar o menu de contexto nativo do navegador sobre o canvas
        this.sys.game.canvas.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        });

        this.input.on("gameobjectdown", (_pointer, gameObject) => {
            // Só reagir ao botão direito do mouse
            if (_pointer.rightButtonDown()) {
                const ownerNode = gameObject.getData("ownerNode");
                if (ownerNode && ownerNode !== this.startNode) {
                    this._deleteNode(ownerNode);
                }
            }
        });
    }

    /**
     * Remove um nó do canvas, desconectando-o de todos os vizinhos
     * e destruindo os fios associados.
     * @param {import('../nodes/FlowNode.js').FlowNode} node
     */
    _deleteNode(node) {
        // Remover fios que têm este nó como source ou target
        this.wires = this.wires.filter((w) => {
            if (w.sourceNode === node || w.targetNode === node) {
                w.destroy();
                return false;
            }
            return true;
        });

        // Remover o nó da lista
        this.nodes = this.nodes.filter((n) => n !== node);

        // Destruir o nó (desconecta vizinhos internamente)
        node.destroy();
    }

    // ======================== EXECUÇÃO ========================

    async executeProgram() {
        const simulationScene = this.scene.get("SimulationScene");
        simulationScene.resetRobot();

        const result = await GraphExecutor.execute(
            this.startNode,
            simulationScene,
        );

        if (result.success) {
            console.log(
                `✅ Programa executado com sucesso! ${result.steps} passos.`,
            );

            // Notificar HudScene
            const hudScene = this.scene.get("HudScene");
            if (hudScene && hudScene.onLevelCompleted) {
                hudScene.onLevelCompleted(simulationScene.currentLevel);
            }

            simulationScene.showResultPopup({
                title: "✅ Objetivo Alcançado!",
                message: `Parabéns! Você completou o nível em ${result.steps} passos.`,
                color: 0x2ecc71,
            });
        } else {
            console.log(
                `❌ Programa executado (${result.steps} passos) mas não alcançou o objetivo.`,
            );

            // Mensagem específica por nível
            let errorMsg =
                "O robô não chegou até a bateria.\nRevise seu fluxo e tente novamente.";

            if (simulationScene.currentLevel === 3) {
                const atGoal =
                    simulationScene.robotGridX === simulationScene.goalGridX &&
                    simulationScene.robotGridY === simulationScene.goalGridY;
                const allVerified = simulationScene.obstacles.every((o) =>
                    simulationScene.verifiedObstacles.has(`${o.x},${o.y}`),
                );

                if (atGoal && !allVerified) {
                    errorMsg =
                        "Você chegou à bateria, mas não verificou\ntodas as caixas com o sensor!\nUse VERIFICAR SENSOR sobre cada caixa.";
                } else if (!atGoal && !allVerified) {
                    errorMsg =
                        "O robô não chegou à bateria e não\nverificou todas as caixas.\nRevise seu fluxo e tente novamente.";
                }
            }

            simulationScene.showResultPopup({
                title: "❌ Falha na Missão",
                message: errorMsg,
                color: 0xe74c3c,
            });
        }

        return result;
    }
}
