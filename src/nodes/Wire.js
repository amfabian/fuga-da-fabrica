/**
 * ========================================================
 *  Wire – Representação gráfica de um fio entre dois nós
 * ========================================================
 *
 *  Liga a porta de saída de um nó (source) à porta de
 *  entrada de outro nó (target). Desenhado como uma curva
 *  Bézier cúbica usando Graphics do Phaser.
 *
 *  Suporta tanto saída única (sourceOutputKey = null) quanto
 *  saídas nomeadas (sourceOutputKey = 'livre' | 'bloqueado').
 */

export class Wire {
    /**
     * @param {Phaser.Scene} scene
     * @param {import('./FlowNode.js').FlowNode} sourceNode
     * @param {import('./FlowNode.js').FlowNode} targetNode
     * @param {string|null} sourceOutputKey - Chave da saída nomeada (null = saída única)
     */
    constructor(scene, sourceNode, targetNode, sourceOutputKey = null) {
        this.scene = scene;
        this.sourceNode = sourceNode;
        this.targetNode = targetNode;
        this.sourceOutputKey = sourceOutputKey;

        this.graphics = scene.add.graphics();
        this.graphics.setDepth(-1);

        // Registrar referências cruzadas
        if (sourceOutputKey) {
            sourceNode.outputWiresMap.set(sourceOutputKey, this);
        } else {
            sourceNode.outputWire = this;
        }
        targetNode.inputWire = this;

        this.updatePositions();
    }

    /**
     * Redesenha o fio com base nas posições atuais das portas.
     */
    updatePositions() {
        this.graphics.clear();

        // Determinar posição de origem baseada no tipo de saída
        let from;
        if (this.sourceOutputKey) {
            from = this.sourceNode.getOutputPortPositionByKey(
                this.sourceOutputKey,
            );
        } else {
            from = this.sourceNode.getOutputPortPosition();
        }

        const to = this.targetNode.getInputPortPosition();

        if (!from || !to) return;

        // Cor do fio: baseada na saída nomeada, se houver
        let wireColor = 0xf1c40f; // amarelo padrão
        if (this.sourceOutputKey) {
            const outputDef = this.sourceNode.outputs?.find(
                (o) => o.key === this.sourceOutputKey,
            );
            if (outputDef?.color) {
                wireColor = outputDef.color;
            }
        }

        // Curva Bézier cúbica
        const dx = Math.abs(to.x - from.x) * 0.5;

        this.graphics.lineStyle(5, wireColor, 0.9);
        this.graphics.beginPath();
        this.graphics.moveTo(from.x, from.y);

        const cp1x = from.x + dx;
        const cp1y = from.y;
        const cp2x = to.x - dx;
        const cp2y = to.y;

        const steps = 30;
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const invT = 1 - t;

            const px =
                invT ** 3 * from.x +
                3 * invT ** 2 * t * cp1x +
                3 * invT * t ** 2 * cp2x +
                t ** 3 * to.x;
            const py =
                invT ** 3 * from.y +
                3 * invT ** 2 * t * cp1y +
                3 * invT * t ** 2 * cp2y +
                t ** 3 * to.y;

            this.graphics.lineTo(px, py);
        }

        this.graphics.strokePath();
    }

    /**
     * Remove o fio da cena.
     */
    destroy() {
        this.graphics.destroy();
    }
}
