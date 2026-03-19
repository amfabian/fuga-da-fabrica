/**
 * ========================================================
 *  GraphExecutor – Travessia e execução do grafo de nós
 * ========================================================
 *
 *  Responsável por:
 *    1. Encontrar o nó [INÍCIO] no grafo
 *    2. Percorrer a cadeia de nós via connectedTo (saída única)
 *       OU connectedOutputs (ramificação condicional)
 *    3. Para cada nó, executar a ação correspondente
 *       no SimulationScene
 *
 *  FLUXO DE DADOS:
 *    Um objeto `msg` é criado no nó INÍCIO com o estado
 *    inicial do robô (x, y, direction). Esse objeto é
 *    passado de nó em nó pela cadeia de conexões.
 *
 *  RAMIFICAÇÃO CONDICIONAL (Nível 3+):
 *    Nós do tipo `check_sensor` possuem múltiplas saídas.
 *    O executor verifica a caixa na posição ATUAL do robô
 *    e escolhe a saída 'livre' ou 'bloqueado'.
 */

export class GraphExecutor {
    /**
     * Executa o grafo a partir do nó de início.
     *
     * @param {import('../nodes/FlowNode.js').FlowNode} startNode
     * @param {import('./SimulationScene.js').SimulationScene} simulationScene
     * @returns {Promise<{steps: number, success: boolean}>}
     */
    static async execute(startNode, simulationScene) {
        let current = startNode;
        let steps = 0;

        // Objeto de estado passado de nó em nó
        let msg = {
            x: simulationScene.robotGridX,
            y: simulationScene.robotGridY,
            direction: simulationScene.robotDir,
        };

        // Limite de segurança contra loops infinitos
        const MAX_STEPS = 100;

        // -------------------------------------------------------
        // PASSO ZERO: iluminar o nó INÍCIO antes de tudo
        // -------------------------------------------------------
        GraphExecutor._flashNode(current);
        await GraphExecutor._delay(500);
        GraphExecutor._unflashNode(current);

        // -------------------------------------------------------
        // TRAVESSIA DO GRAFO:
        // -------------------------------------------------------
        while (steps < MAX_STEPS) {
            const nextNode = GraphExecutor._resolveNext(
                current,
                msg,
                simulationScene,
            );

            if (!nextNode) break;

            current = nextNode;
            steps++;

            // Destacar o nó atual antes de executar a ação
            GraphExecutor._flashNode(current);
            await GraphExecutor._delay(250);

            // Despachar ação com base no tipo do nó
            switch (current.type) {
                case "move_forward":
                    msg = await simulationScene.moveForward(msg);
                    break;

                case "turn_right":
                    msg = await simulationScene.turnRight(msg);
                    break;

                case "turn_left":
                    msg = await simulationScene.turnLeft(msg);
                    break;

                case "check_sensor":
                    // Nó de lógica pura – NÃO gera animação.
                    await GraphExecutor._delay(300);
                    break;

                default:
                    console.warn(`Tipo de nó desconhecido: ${current.type}`);
                    break;
            }

            // Restaurar cor original após a ação
            GraphExecutor._unflashNode(current);
        }

        // Verificar se o nível foi concluído
        const success = simulationScene.checkLevelComplete();

        return { steps, success };
    }

    // ======================== RESOLUÇÃO DO PRÓXIMO NÓ ========================

    /**
     * Determina o próximo nó a ser visitado na travessia.
     *
     * Para nós com saída única: retorna current.connectedTo
     * Para nós com múltiplas saídas (check_sensor): avalia
     * a condição e retorna o nó conectado à saída correspondente.
     *
     * @param {import('../nodes/FlowNode.js').FlowNode} current
     * @param {object} msg - Estado atual {x, y, direction}
     * @param {import('./SimulationScene.js').SimulationScene} simulationScene
     * @returns {import('../nodes/FlowNode.js').FlowNode|null}
     */
    static _resolveNext(current, msg, simulationScene) {
        // ---- Nó com múltiplas saídas (ramificação) ----
        if (
            current.type === "check_sensor" &&
            current.connectedOutputs.size > 0
        ) {
            // Verificar o sensor na posição ATUAL do robô
            const key = simulationScene.checkSensorAtCurrentPos();

            console.log(
                `🔍 Sensor em (${msg.x},${msg.y}) → ${key.toUpperCase()}`,
            );

            return current.connectedOutputs.get(key) || null;
        }

        // ---- Nó com saída única (padrão) ----
        return current.connectedTo || null;
    }

    // ======================== UTILIDADES ========================

    /** Delay assíncrono para dar tempo visual à verificação do sensor. */
    static _delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Destaca o nó com cor amarela para indicar execução.
     */
    static _flashNode(node) {
        if (!node.body) return;
        node._originalFillColor = node.body.fillColor;
        node.body.setFillStyle(0xf39c12); // amarelo destaque
        node.body.setStrokeStyle(3, 0xf1c40f);
    }

    /**
     * Restaura a cor original do nó após a execução.
     */
    static _unflashNode(node) {
        if (!node.body || node._originalFillColor === undefined) return;
        node.body.setFillStyle(node._originalFillColor);
        node.body.setStrokeStyle(2, node._originalFillColor - 0x111111);
        delete node._originalFillColor;
    }
}
