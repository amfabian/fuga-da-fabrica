/**
 * ========================================================
 *  FlowNode – Representação de um nó no grafo visual
 * ========================================================
 *
 *  Cada nó possui:
 *    • id          – Identificador único
 *    • type        – 'start' | 'move_forward' | 'turn_right' | 'check_sensor'
 *    • hasInput    – Se possui porta de entrada
 *    • hasOutput   – Se possui porta de saída (saída única/padrão)
 *    • outputs     – Array de saídas nomeadas para nós com ramificação
 *                    [{key, label, color}]
 *
 *  Conexões (saída única):
 *    • connectedTo  – Referência direta ao próximo nó no fluxo
 *    • outputWire   – Referência ao fio que sai deste nó
 *    • inputWire    – Referência ao fio que entra neste nó
 *
 *  Conexões (múltiplas saídas):
 *    • connectedOutputs – Map(key → targetNode)
 *    • outputWiresMap   – Map(key → Wire)
 *    • outputPortsMap   – Map(key → portCircle)
 */

let _nodeIdCounter = 0;

export class FlowNode {
    /**
     * @param {Phaser.Scene} scene - A cena Phaser dona deste nó
     * @param {number} x - Posição X no mundo
     * @param {number} y - Posição Y no mundo
     * @param {string} type - Tipo do nó
     * @param {object} options - { hasInput, hasOutput, label, draggable,
     *                             nodeWidth, nodeHeight, outputs }
     */
    constructor(scene, x, y, type, options = {}) {
        this.scene = scene;
        this.id = _nodeIdCounter++;
        this.type = type;

        this.hasInput = options.hasInput ?? true;
        this.hasOutput = options.hasOutput ?? true;
        this.draggable = options.draggable ?? true;
        this.label = options.label ?? type.toUpperCase();
        this.nodeWidth = options.nodeWidth ?? 80;
        this.nodeHeight = options.nodeHeight ?? 50;

        /**
         * Saídas nomeadas (para nós de ramificação como check_sensor).
         * Se definido, substitui a porta de saída única.
         * @type {Array<{key: string, label: string, color?: number}>|null}
         */
        this.outputs = options.outputs || null;

        /** Conexões do grafo (saída única) */
        this.connectedTo = null;
        this.connectedFrom = null;
        this.outputWire = null;
        this.inputWire = null;

        /** Conexões do grafo (múltiplas saídas) */
        this.connectedOutputs = new Map();
        this.outputWiresMap = new Map();
        this.outputPortsMap = new Map();

        /** Posição lógica */
        this.x = x;
        this.y = y;

        /** Criar representação gráfica */
        this._createVisual(scene, x, y);
    }

    // ======================== VISUAL ========================

    _createVisual(scene, x, y) {
        const NODE_W = this.nodeWidth;
        const NODE_H = this.nodeHeight;
        const PORT_RADIUS = 7;

        // Cores por tipo
        const colors = {
            start: { fill: 0x27ae60, stroke: 0x1e8449, text: "#ffffff" },
            move_forward: { fill: 0x2980b9, stroke: 0x1f6fa5, text: "#ffffff" },
            turn_right: { fill: 0xe67e22, stroke: 0xd35400, text: "#ffffff" },
            turn_left: { fill: 0xe67e22, stroke: 0xd35400, text: "#ffffff" },
            check_sensor: { fill: 0x8e44ad, stroke: 0x7d3c98, text: "#ffffff" },
        };
        const c = colors[this.type] || colors.move_forward;

        // Container principal
        this.container = scene.add.container(x, y);

        // Corpo do nó
        this.body = scene.add.rectangle(0, 0, NODE_W, NODE_H, c.fill);
        this.body.setStrokeStyle(2, c.stroke);
        this.container.add(this.body);

        // Texto do rótulo (posição ajustada para nós com múltiplas saídas)
        const labelX = this.outputs ? -10 : 0;
        const label = scene.add
            .text(labelX, 0, this.label, {
                fontFamily: "monospace",
                fontSize: "10px",
                color: c.text,
                fontStyle: "bold",
                align: "center",
            })
            .setOrigin(0.5);
        this.container.add(label);

        // Porta de ENTRADA (círculo à esquerda)
        if (this.hasInput) {
            this.inputPort = scene.add.circle(
                -NODE_W / 2,
                0,
                PORT_RADIUS,
                0xe74c3c,
            );
            this.inputPort.setStrokeStyle(2, 0xc0392b);
            this.inputPort.setInteractive({ useHandCursor: true });
            this.container.add(this.inputPort);

            this.inputPort.setData("portType", "input");
            this.inputPort.setData("ownerNode", this);
        }

        // ---- PORTAS DE SAÍDA ----
        if (this.outputs && this.outputs.length > 0) {
            // Múltiplas saídas nomeadas (ex: check_sensor → Livre / Bloqueado)
            const numOutputs = this.outputs.length;
            const spacing = NODE_H / (numOutputs + 1);

            this.outputs.forEach((output, i) => {
                const portY = -NODE_H / 2 + spacing * (i + 1);
                const portColor = output.color || 0x2ecc71;

                const port = scene.add.circle(
                    NODE_W / 2,
                    portY,
                    PORT_RADIUS,
                    portColor,
                );
                port.setStrokeStyle(2, portColor - 0x111111);
                port.setInteractive({ useHandCursor: true });
                this.container.add(port);

                port.setData("portType", "output");
                port.setData("outputKey", output.key);
                port.setData("ownerNode", this);

                this.outputPortsMap.set(output.key, port);

                // Rótulo ao lado da porta
                const lbl = scene.add
                    .text(NODE_W / 2 - PORT_RADIUS - 4, portY, output.label, {
                        fontFamily: "monospace",
                        fontSize: "8px",
                        color: "#ddd",
                    })
                    .setOrigin(1, 0.5);
                this.container.add(lbl);
            });
        } else if (this.hasOutput) {
            // Saída única (padrão)
            this.outputPort = scene.add.circle(
                NODE_W / 2,
                0,
                PORT_RADIUS,
                0x2ecc71,
            );
            this.outputPort.setStrokeStyle(2, 0x27ae60);
            this.outputPort.setInteractive({ useHandCursor: true });
            this.container.add(this.outputPort);

            this.outputPort.setData("portType", "output");
            this.outputPort.setData("ownerNode", this);
        }

        // Tornar arrastável
        if (this.draggable) {
            this.body.setInteractive({ useHandCursor: true });

            let dragOffsetX = 0;
            let dragOffsetY = 0;
            let isDragging = false;

            this.body.on("pointerdown", (pointer) => {
                isDragging = true;
                dragOffsetX = this.container.x - pointer.worldX;
                dragOffsetY = this.container.y - pointer.worldY;
            });

            scene.input.on("pointermove", (pointer) => {
                if (!isDragging) return;

                const newX = pointer.worldX + dragOffsetX;
                const newY = pointer.worldY + dragOffsetY;

                this.container.x = newX;
                this.container.y = newY;
                this.x = newX;
                this.y = newY;

                // Atualizar fios (saída única)
                if (this.outputWire) this.outputWire.updatePositions();
                if (this.inputWire) this.inputWire.updatePositions();

                // Atualizar fios (múltiplas saídas)
                for (const wire of this.outputWiresMap.values()) {
                    wire.updatePositions();
                }
            });

            scene.input.on("pointerup", () => {
                isDragging = false;
            });
        }

        this.body.setData("ownerNode", this);
    }

    // ======================== CONEXÃO (SAÍDA ÚNICA) ========================

    /** Retorna a posição mundial da porta de saída única. */
    getOutputPortPosition() {
        if (!this.outputPort) return null;
        return {
            x: this.container.x + this.outputPort.x,
            y: this.container.y + this.outputPort.y,
        };
    }

    /** Retorna a posição mundial da porta de entrada. */
    getInputPortPosition() {
        if (!this.hasInput) return null;
        return {
            x: this.container.x + this.inputPort.x,
            y: this.container.y + this.inputPort.y,
        };
    }

    /** Conecta este nó ao nó destino (saída única). */
    connectTo(targetNode) {
        this.connectedTo = targetNode;
        targetNode.connectedFrom = this;
    }

    /** Desconecta a saída única. */
    disconnect() {
        if (this.connectedTo) {
            this.connectedTo.connectedFrom = null;
            this.connectedTo.inputWire = null;
            this.connectedTo = null;
        }
        if (this.outputWire) {
            this.outputWire.destroy();
            this.outputWire = null;
        }
    }

    // ======================== CONEXÃO (MÚLTIPLAS SAÍDAS) ========================

    /**
     * Retorna a posição mundial de uma porta de saída nomeada.
     * @param {string} key - Chave da saída (ex: 'livre', 'bloqueado')
     */
    getOutputPortPositionByKey(key) {
        const port = this.outputPortsMap.get(key);
        if (!port) return null;
        return {
            x: this.container.x + port.x,
            y: this.container.y + port.y,
        };
    }

    /**
     * Conecta uma saída nomeada ao nó destino.
     * @param {string} key - Chave da saída
     * @param {FlowNode} targetNode - Nó destino
     */
    connectOutputTo(key, targetNode) {
        this.connectedOutputs.set(key, targetNode);
        targetNode.connectedFrom = this;
    }

    /**
     * Desconecta uma saída nomeada.
     * @param {string} key - Chave da saída
     */
    disconnectOutput(key) {
        const target = this.connectedOutputs.get(key);
        if (target) {
            target.connectedFrom = null;
            target.inputWire = null;
            this.connectedOutputs.delete(key);
        }
        const wire = this.outputWiresMap.get(key);
        if (wire) {
            wire.destroy();
            this.outputWiresMap.delete(key);
        }
    }

    // ======================== DESTRUIÇÃO ========================

    /** Remove totalmente o nó e suas conexões. */
    destroy() {
        // Desconectar de quem nos alimenta
        if (this.connectedFrom) {
            const prev = this.connectedFrom;
            if (prev.outputs) {
                for (const [key, node] of prev.connectedOutputs) {
                    if (node === this) {
                        prev.disconnectOutput(key);
                    }
                }
            } else {
                prev.disconnect();
            }
        }

        // Desconectar saída única
        this.disconnect();

        // Desconectar todas as saídas nomeadas
        for (const key of [...this.connectedOutputs.keys()]) {
            this.disconnectOutput(key);
        }

        this.container.destroy();
    }
}
