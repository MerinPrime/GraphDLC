import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { GameMap } from '@logic-arrows/game-logic/game-map';
import type { MapInfo } from '@logic-arrows/game-logic/map-info';
import type { Navigation } from '@logic-arrows/pages/navigation';
import type { NavigationActionType } from '@logic-arrows/pages/navigation-action-type';
import type { Backend } from '@logic-arrows/utils/backend';
import type { save } from '@logic-arrows/utils/save';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';

function decodeBase64ToBytes(text: string): Uint8Array {
    let clean = text.trim();
    if (clean.startsWith('{')) {
        try {
            const json = JSON.parse(clean);
            if (typeof json.data === 'string') clean = json.data;
        } catch {}
    }
    const binary = atob(clean.replace(/\s+/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function encodeBytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
}

export function mergeLoadWithOffset(
    map: GameMap,
    buffer: Uint8Array,
    offsetX = 0,
    offsetY = 0,
): void {
    if (buffer.length < 4) {
        throw new Error('Payload too small');
    }

    let index = 0;
    let version = buffer[index++];
    version |= buffer[index++] << 8;

    if (version !== 0) {
        throw new Error(`Unsupported save version: ${version}`);
    }

    let chunksCount = buffer[index++];
    chunksCount |= buffer[index++] << 8;

    for (let i = 0; i < chunksCount; i++) {
        let chunkX = buffer[index++];
        chunkX |= (buffer[index++] & 0x7f) << 8;
        if ((buffer[index - 1] & 0x80) !== 0) chunkX = -chunkX;

        let chunkY = buffer[index++];
        chunkY |= (buffer[index++] & 0x7f) << 8;
        if ((buffer[index - 1] & 0x80) !== 0) chunkY = -chunkY;

        const arrowsTypesCount = buffer[index++] + 1;

        for (let j = 0; j < arrowsTypesCount; j++) {
            const type = buffer[index++];
            const typeCount = buffer[index++] + 1;

            for (let k = 0; k < typeCount; k++) {
                const position = buffer[index++];
                const rotation = buffer[index++];

                const localX = position & 0xf;
                const localY = position >> 4;

                const globalX = chunkX * CHUNK_SIZE + localX + offsetX;
                const globalY = chunkY * CHUNK_SIZE + localY + offsetY;

                const targetChunkX = Math.floor(globalX / CHUNK_SIZE);
                const targetChunkY = Math.floor(globalY / CHUNK_SIZE);

                const targetX = globalX - targetChunkX * CHUNK_SIZE;
                const targetY = globalY - targetChunkY * CHUNK_SIZE;

                const chunk = map.getOrCreateChunk(targetChunkX, targetChunkY);

                const arrow = chunk.getArrow(targetX, targetY);
                arrow.type = type;
                arrow.rotation = rotation & 0x3;
                arrow.flipped = (rotation & 0x4) !== 0;
            }
        }
    }
}

export const PatchNavigation: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch(
        'Navigation',
        (_module: typeof Navigation) => {
            const _Backend =
                patchLoader.getDefinition<typeof Backend>('Backend');
            const _GameMap =
                patchLoader.getDefinition<typeof GameMap>('GameMap');
            const _save = patchLoader.getDefinition<typeof save>('save');

            const fetchMapAsync = (mapId: string): Promise<MapInfo> => {
                return new Promise((resolve, reject) => {
                    _Backend.val.getMap(mapId, (mapInfo: MapInfo) => {
                        if (mapInfo) resolve(mapInfo);
                        else reject(new Error(`Failed to load map: ${mapId}`));
                    });
                });
            };

            // @ts-expect-error
            return class Navigation extends _module {
                public goToPath(action: NavigationActionType): void {
                    if (window.location.pathname.startsWith('/map')) {
                        const mapId: string =
                            window.location.pathname.substring(5);
                        const url = new URL(window.location.href);
                        const mergeParams = url.searchParams.getAll('merge');

                        if (mergeParams.length === 0) {
                            _Backend.val.getMap(mapId, (mapInfo: MapInfo) =>
                                // @ts-expect-error
                                this.goToGame(action, mapInfo),
                            );
                            return;
                        }

                        (async () => {
                            try {
                                const mergeConfigs = mergeParams.map(
                                    (param) => {
                                        const [id, xStr, yStr] =
                                            param.split(':');
                                        return {
                                            id,
                                            offsetX:
                                                parseInt(xStr || '0', 10) || 0,
                                            offsetY:
                                                parseInt(yStr || '0', 10) || 0,
                                        };
                                    },
                                );

                                const mergedMapInfos = await Promise.all([
                                    fetchMapAsync(mapId),
                                    ...mergeConfigs.map((c) =>
                                        fetchMapAsync(c.id),
                                    ),
                                ]);
                                const mainMapInfo = mergedMapInfos[0];

                                const tempMap = new (
                                    _GameMap.val as new (
                                        isMain: boolean,
                                    ) => GameMap
                                )(false);

                                for (
                                    let i = 0;
                                    i < mergedMapInfos.length;
                                    i++
                                ) {
                                    const mapBytes = decodeBase64ToBytes(
                                        mergedMapInfos[i].data,
                                    );
                                    if (i === 0)
                                        mergeLoadWithOffset(tempMap, mapBytes);
                                    else
                                        mergeLoadWithOffset(
                                            tempMap,
                                            mapBytes,
                                            mergeConfigs[i - 1].offsetX,
                                            mergeConfigs[i - 1].offsetY,
                                        );
                                }

                                const savedData = _save.val(tempMap);
                                mainMapInfo.data = encodeBytesToBase64(
                                    Uint8Array.from(savedData),
                                );

                                // @ts-expect-error
                                this.goToGame(action, mainMapInfo);
                            } catch (err) {
                                console.error(
                                    'Failed to merge maps from URL query:',
                                    err,
                                );
                                _Backend.val.getMap(mapId, (mapInfo: MapInfo) =>
                                    // @ts-expect-error
                                    this.goToGame(action, mapInfo),
                                );
                            }
                        })();
                    }
                    //@ts-expect-error
                    else super.goToPath(action);
                }
            };
        },
    );
};
