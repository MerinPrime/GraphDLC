import { CELL_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { Game } from '@logic-arrows/player/game';
import type { PlayerMapAction } from '@logic-arrows/player/player-map-action';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';
import { VisualSelectionPlugin } from '../../visual_selection';
import { VisualSelectionSetting } from '../../visual_selection/settings/VisualSelectionSetting';
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

function renderCellGroup(
    render: any,
    game: Game,
    cells: HighlightCell[],
    r: number,
    g: number,
    b: number,
    alpha: number,
    offsetX: number,
    offsetY: number,
    cellSize: number,
    isVisualSelection: boolean,
): void {
    if (cells.length === 0) return;

    render.setSolidColor(r, g, b, alpha);

    if (isVisualSelection) {
        const set = new Set<string>();
        for (const cell of cells) {
            set.add(`${cell.x},${cell.y}`);
        }

        for (const cell of cells) {
            const left_side = !set.has(`${cell.x - 1},${cell.y}`);
            const top_side = !set.has(`${cell.x},${cell.y - 1}`);
            const right_side = !set.has(`${cell.x + 1},${cell.y}`);
            const bottom_side = !set.has(`${cell.x},${cell.y + 1}`);

            render.setSides([left_side, top_side, right_side, bottom_side]);
            const cx = cell.x * game.scale + offsetX;
            const cy = cell.y * game.scale + offsetY;
            render.drawSolidColorRect(cx, cy, cellSize, cellSize);
        }
    } else {
        for (const cell of cells) {
            const cx = cell.x * game.scale + offsetX;
            const cy = cell.y * game.scale + offsetY;
            render.drawSolidColorRect(cx, cy, cellSize, cellSize);
        }
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

    const isVisualSelection =
        VisualSelectionPlugin.isEnabled &&
        VisualSelectionSetting.value &&
        typeof render.setSides === 'function' &&
        typeof render.setFixedBorder === 'function';

    const offsetX = (game.offset[0] * game.scale) / CELL_SIZE;
    const offsetY = (game.offset[1] * game.scale) / CELL_SIZE;
    const alignCorrection = isVisualSelection ? 0.05 * game.scale : 0;
    const cellSize = game.scale + alignCorrection;

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

    if (isVisualSelection) {
        render.setShowBorder(true);
        render.setFixedBorder(false);
    } else {
        render.setShowBorder(true);
    }

    renderCellGroup(
        render,
        game,
        deletedCells,
        0.95,
        0.25,
        0.25,
        alpha,
        offsetX,
        offsetY,
        cellSize,
        isVisualSelection,
    );
    renderCellGroup(
        render,
        game,
        newCells,
        0.25,
        0.85,
        0.3,
        alpha,
        offsetX,
        offsetY,
        cellSize,
        isVisualSelection,
    );
    renderCellGroup(
        render,
        game,
        modifiedCells,
        0.25,
        0.55,
        1.0,
        alpha,
        offsetX,
        offsetY,
        cellSize,
        isVisualSelection,
    );

    if (isVisualSelection) {
        render.setFixedBorder(true);
        render.setSides([true, true, true, true]);
    } else {
        render.setShowBorder(true);
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
