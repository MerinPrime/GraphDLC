import { CELL_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { Game } from '@logic-arrows/player/game';
import type { PlayerMapAction } from '@logic-arrows/player/player-map-action';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';
import {
    UndoRedoHighlightMode,
    UndoRedoHighlightSetting,
} from '../settings/UndoRedoHighlightSetting';

type ChangeKind = 'deleted' | 'modified' | 'new';

interface HighlightCell {
    x: number;
    y: number;
    kind: ChangeKind;
}

interface HighlightState {
    startTime: number;
    duration: number;
    cells: HighlightCell[];
    bbox: { minX: number; minY: number; maxX: number; maxY: number };
}

let activeHighlight: HighlightState | null = null;

function handleHistoryAction(
    game: Game,
    action: PlayerMapAction,
    isUndo: boolean,
): void {
    const mode = UndoRedoHighlightSetting.value;
    if (mode === UndoRedoHighlightMode.OFF) return;
    if (!action?.changedArrows || action.changedArrows.size === 0) return;

    const cells: HighlightCell[] = [];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    action.changedArrows.forEach(([oldData, newData], key) => {
        const commaIdx = key.indexOf(',');
        if (commaIdx === -1) return;
        const x = parseInt(key.slice(0, commaIdx), 10);
        const y = parseInt(key.slice(commaIdx + 1), 10);
        if (Number.isNaN(x) || Number.isNaN(y)) return;

        const fromData = isUndo ? newData : oldData;
        const toData = isUndo ? oldData : newData;

        let kind: ChangeKind = 'modified';
        if (toData.type === 0) {
            kind = 'deleted';
        } else if (fromData.type === 0) {
            kind = 'new';
        } else {
            kind = 'modified';
        }

        cells.push({ x, y, kind });
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    });

    if (cells.length === 0) return;

    activeHighlight = {
        startTime: performance.now(),
        duration: 3000,
        cells,
        bbox: { minX, minY, maxX, maxY },
    };

    game.screenUpdated = true;

    if (mode === UndoRedoHighlightMode.ON_ZOOM) {
        game.focusOnBox(minX, minY, maxX, maxY, 3, 0.05);
    }
}

function drawHighlight(game: Game): void {
    if (!activeHighlight) return;

    const now = performance.now();
    const elapsed = now - activeHighlight.startTime;

    if (elapsed >= activeHighlight.duration) {
        activeHighlight = null;
        return;
    }

    game.screenUpdated = true;

    const alpha = 0.3;

    const render = (game as any).render;
    if (!render?.isReady()) return;

    const offsetX = (game.offset[0] * game.scale) / CELL_SIZE;
    const offsetY = (game.offset[1] * game.scale) / CELL_SIZE;
    const cellSize = game.scale + 0.05 * game.scale;

    const deletedCells: HighlightCell[] = [];
    const modifiedCells: HighlightCell[] = [];
    const newCells: HighlightCell[] = [];

    for (const cell of activeHighlight.cells) {
        if (cell.kind === 'deleted') {
            deletedCells.push(cell);
        } else if (cell.kind === 'new') {
            newCells.push(cell);
        } else {
            modifiedCells.push(cell);
        }
    }

    if (deletedCells.length > 0) {
        render.setSolidColor(0.95, 0.25, 0.25, alpha);
        for (const cell of deletedCells) {
            const cx = cell.x * game.scale + offsetX;
            const cy = cell.y * game.scale + offsetY;
            render.drawSolidColorRect(cx, cy, cellSize, cellSize);
        }
    }
    if (newCells.length > 0) {
        render.setSolidColor(0.25, 0.85, 0.3, alpha);
        for (const cell of newCells) {
            const cx = cell.x * game.scale + offsetX;
            const cy = cell.y * game.scale + offsetY;
            render.drawSolidColorRect(cx, cy, cellSize, cellSize);
        }
    }
    if (modifiedCells.length > 0) {
        render.setSolidColor(0.25, 0.55, 1.0, alpha);
        for (const cell of modifiedCells) {
            const cx = cell.x * game.scale + offsetX;
            const cy = cell.y * game.scale + offsetY;
            render.drawSolidColorRect(cx, cy, cellSize, cellSize);
        }
    }
}

export const PatchGame: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch('Game', (_module: typeof Game) => {
        return class Game extends _module {
            public undoChanges(action: PlayerMapAction): void {
                super.undoChanges(action);
                handleHistoryAction(this, action, true);
            }

            public redoChanges(action: PlayerMapAction): void {
                super.redoChanges(action);
                handleHistoryAction(this, action, false);
            }

            public draw(): void {
                super.draw();
                drawHighlight(this);
            }
        };
    });
};
