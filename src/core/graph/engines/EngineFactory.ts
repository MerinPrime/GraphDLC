import type { GameMap } from '@logic-arrows/game-logic/game-map';
import {
    GraphEngine,
    GraphEngineSetting,
} from 'src/core/settings/instances/performance/GraphEngineSetting';
import type { Graph } from '../ast/Graph';
import { DefaultEngine } from './default/DefaultEngine';
import { SoAEngine } from './enhanced/SoAEngine';
import { NativeEngine } from './native/NativeEngine';
import { RawEngine } from './raw/RawEngine';

export namespace EngineFactory {
    export function create(graph: Graph, gameMap: GameMap) {
        switch (GraphEngineSetting.value) {
            case GraphEngine.ORIGINAL:
                return new DefaultEngine(graph, gameMap);
            case GraphEngine.STANDARD:
                return new RawEngine();
            case GraphEngine.ENHANCED:
                return new SoAEngine();
            case GraphEngine.NATIVE:
                return new NativeEngine();
        }
    }
}
