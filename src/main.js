/**
 * ========================================================
 *  Fuga da Fábrica – Objeto de Aprendizagem
 *  Ensino de Lógica de Programação e Robótica
 * ========================================================
 *
 *  Arquitetura de cenas:
 *    • SplashScene       – tela inicial com animação   (splash)
 *    • SimulationScene  – grid 5×5 + robô + bateria  (metade esquerda)
 *    • LogicScene        – canvas de nós e fios        (metade direita)
 *    • HudScene          – botão "Executar" (overlay)
 *
 *  A SplashScene é a primeira cena carregada. Ao clicar em
 *  "INICIAR SIMULAÇÃO", ela inicia a SimulationScene, que por
 *  sua vez lança LogicScene e HudScene em paralelo.
 */

import Phaser from "phaser";
import { SplashScene } from "./scenes/SplashScene.js";
import { SimulationScene } from "./scenes/SimulationScene.js";
import { LogicScene } from "./scenes/LogicScene.js";
import { HudScene } from "./scenes/HudScene.js";

/** Dimensões fixas do jogo */
const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;

const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: "phaser-container",
    backgroundColor: "#e8edf3",
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [SplashScene, SimulationScene, LogicScene, HudScene],
};

const game = new Phaser.Game(config);

export { GAME_WIDTH, GAME_HEIGHT };
