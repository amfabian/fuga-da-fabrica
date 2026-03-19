/**
 * ========================================================
 *  NodeFactory – Fábrica de nós para o canvas de lógica
 * ========================================================
 *
 *  Centraliza a criação de nós com as configurações corretas
 *  para cada tipo, incluindo o nó de sensor com ramificação.
 */

import { FlowNode } from "./FlowNode.js";

export class NodeFactory {
    /**
     * Cria o nó fixo [INÍCIO] – apenas saída, não arrastável.
     */
    static createStartNode(scene, x, y) {
        return new FlowNode(scene, x, y, "start", {
            hasInput: false,
            hasOutput: true,
            label: "INÍCIO",
            draggable: false,
        });
    }

    /**
     * Cria um nó arrastável [MOVER FRENTE] – entrada e saída.
     */
    static createMoveForwardNode(scene, x, y) {
        return new FlowNode(scene, x, y, "move_forward", {
            hasInput: true,
            hasOutput: true,
            label: "MOVER\nFRENTE",
            draggable: true,
        });
    }

    /**
     * Cria um nó arrastável [GIRAR DIREITA 90°] – entrada e saída.
     */
    static createTurnRightNode(scene, x, y) {
        return new FlowNode(scene, x, y, "turn_right", {
            hasInput: true,
            hasOutput: true,
            label: "GIRAR\nDIREITA",
            draggable: true,
        });
    }

    /**
     * Cria um nó arrastável [GIRAR ESQUERDA 90°] – entrada e saída.
     */
    static createTurnLeftNode(scene, x, y) {
        return new FlowNode(scene, x, y, "turn_left", {
            hasInput: true,
            hasOutput: true,
            label: "GIRAR\nESQUERDA",
            draggable: true,
        });
    }

    /**
     * Cria um nó arrastável [VERIFICAR SENSOR FRONTAL].
     *
     * Este nó possui:
     *   • 1 porta de entrada
     *   • 2 portas de saída nomeadas:
     *       - "livre"    (Verdadeiro) – caminho livre à frente
     *       - "bloqueado" (Falso)     – obstáculo à frente
     *
     * É um nó de lógica pura (não gera animação).
     * O GraphExecutor inspeciona o estado do robô e decide
     * qual saída seguir.
     */
    static createCheckSensorNode(scene, x, y) {
        return new FlowNode(scene, x, y, "check_sensor", {
            hasInput: true,
            hasOutput: false, // não usa saída única
            label: "VERIFICAR\nSENSOR",
            draggable: true,
            nodeWidth: 120,
            nodeHeight: 60,
            outputs: [
                { key: "livre", label: "Livre", color: 0x2ecc71 },
                { key: "bloqueado", label: "Bloq.", color: 0xe74c3c },
            ],
        });
    }
}
