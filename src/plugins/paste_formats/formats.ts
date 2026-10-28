import { CHUNK_SIZE } from '@logic-arrows/game-logic/game-constants';
import type { SelectedMap } from '@logic-arrows/game-logic/selected-map';
import { ArrowType } from 'src/core/utils/ArrowType';

export const BROWSER_VERSION = 0;
export const STEAM_VERSION_4 = 4;
export const STEAM_VERSION_5 = 5;

export const BUTTON_TYPE = ArrowType.BUTTON;
export const LAST_BROWSER_TYPE = ArrowType.WALL;
export const PLACEHOLDER_TYPE = ArrowType.QUESTION;
export const COMMAND_BLOCK_TYPE = 33;

interface LayoutFlags {
    hasData: boolean;
    rotation: number;
    flipped: boolean;
    extra: number;
}

type LayoutDecoder = (flags: number) => LayoutFlags;

const LAYOUT_DECODERS: Record<number, LayoutDecoder> = {
    [BROWSER_VERSION]: (flags) => ({
        hasData: false,
        rotation: flags & 0x03,
        flipped: (flags & 0x04) !== 0,
        extra: flags >> 3,
    }),
    [STEAM_VERSION_4]: (flags) => ({
        hasData: (flags & 0x01) !== 0,
        rotation: (flags >> 1) & 0x03,
        flipped: (flags & 0x08) !== 0,
        extra: flags >> 4,
    }),
    [STEAM_VERSION_5]: (flags) => ({
        hasData: (flags & 0x08) !== 0,
        rotation: flags & 0x03,
        flipped: (flags & 0x04) !== 0,
        extra: flags >> 4,
    }),
};

function normalizeCellForBrowser(
    type: number,
    rotation: number,
    flipped: boolean,
    version: number,
): { type: number; rotation: number; flipped: boolean } {
    if (
        version !== BROWSER_VERSION &&
        (type === BUTTON_TYPE || type > LAST_BROWSER_TYPE)
    ) {
        return { type: PLACEHOLDER_TYPE, rotation, flipped };
    }

    if (type > PLACEHOLDER_TYPE) {
        return { type: PLACEHOLDER_TYPE, rotation, flipped };
    }

    return {
        type,
        rotation,
        flipped,
    };
}

function decodeBase64(text: string): Uint8Array {
    let encoded = text.trim();

    if (encoded.startsWith('{')) {
        let json: { data?: unknown };

        try {
            json = JSON.parse(encoded);
        } catch {
            throw new Error('Malformed JSON save');
        }

        if (typeof json.data !== 'string') {
            throw new Error('JSON save does not contain a data string');
        }

        encoded = json.data;
    }

    const binary = atob(encoded.replace(/\s+/g, ''));
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}

async function decompress(bytes: Uint8Array): Promise<Uint8Array> {
    const buffer = bytes.slice().buffer as ArrayBuffer;

    for (const format of ['deflate', 'deflate-raw'] as const) {
        try {
            const stream = new Blob([buffer])
                .stream()
                .pipeThrough(new DecompressionStream(format));

            return new Uint8Array(await new Response(stream).arrayBuffer());
        } catch {
            // Try the next compression format.
        }
    }

    throw new Error('Failed to decompress map payload');
}

class BinaryReader {
    private offset = 0;

    public constructor(private readonly bytes: Uint8Array) {}

    public get remaining(): number {
        return this.bytes.length - this.offset;
    }

    public readByte(): number {
        if (this.offset >= this.bytes.length) {
            throw new Error('Unexpected end of map data');
        }

        return this.bytes[this.offset++];
    }

    public readWord(): number {
        return this.readByte() | (this.readByte() << 8);
    }

    public readCoordinate(): number {
        const value = this.readWord();

        return (value & 0x8000) !== 0 ? -(value & 0x7fff) : value;
    }

    public skip(count: number): void {
        if (count < 0 || count > this.remaining) {
            throw new Error('Unexpected end of map data');
        }

        this.offset += count;
    }
}

export async function loadInSelectedMap(
    selectedMap: SelectedMap,
    text: string,
    isCurrent: () => boolean = () => true,
): Promise<void> {
    const bytes = decodeBase64(text);

    if (bytes.length < 4) {
        throw new Error('Map payload is too short');
    }

    const version = bytes[0] | (bytes[1] << 8);
    const decoder = LAYOUT_DECODERS[version];

    if (!decoder) {
        throw new Error(`Unsupported map version: ${version}`);
    }

    let body: Uint8Array;

    if (version === BROWSER_VERSION) {
        body = bytes.subarray(2);
    } else if (bytes[2] === 1) {
        body = await decompress(bytes.subarray(3));
    } else if (bytes[2] === 0) {
        body = bytes.subarray(3);
    } else {
        throw new Error(`Unknown compression flag: ${bytes[2]}`);
    }

    if (!isCurrent()) return;

    const visitCells = (
        visit: (x: number, y: number, type: number, flags: number) => void,
    ): void => {
        const reader = new BinaryReader(body);
        const chunksCount = reader.readWord();

        for (let i = 0; i < chunksCount; i++) {
            const chunkX = reader.readCoordinate();
            const chunkY = reader.readCoordinate();
            const typeCount = reader.readByte() + 1;

            for (let j = 0; j < typeCount; j++) {
                const type = reader.readByte();
                const cellCount = reader.readByte() + 1;

                for (let k = 0; k < cellCount; k++) {
                    const position = reader.readByte();
                    const flags = reader.readByte();
                    const { hasData, extra } = decoder(flags);

                    if (hasData) {
                        const dataLength = reader.readWord();

                        if (type === COMMAND_BLOCK_TYPE && (extra & 1) !== 0) {
                            reader.skip(dataLength);
                        } else if (dataLength > 0) {
                            reader.skip(dataLength);
                        }
                    }

                    visit(
                        chunkX * CHUNK_SIZE + (position & 0x0f),
                        chunkY * CHUNK_SIZE + (position >> 4),
                        type,
                        flags,
                    );
                }
            }
        }
    };

    let minX = Infinity;
    let minY = Infinity;
    let placedCount = 0;

    visitCells((x, y, type) => {
        if (type === ArrowType.EMPTY) return;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        placedCount++;
    });

    if (placedCount === 0 || !Number.isFinite(minX) || !Number.isFinite(minY)) {
        throw new Error('No arrows found');
    }

    if (!isCurrent()) return;

    // @ts-expect-error
    selectedMap.tempMap.clear();
    // @ts-expect-error
    selectedMap.arrowsToPutOriginal.clear();
    // @ts-expect-error
    selectedMap.arrowsToPut.clear();
    // @ts-expect-error
    selectedMap.rotationState = 0;
    // @ts-expect-error
    selectedMap.flipState = false;

    visitCells((x, y, type, flags) => {
        if (type === ArrowType.EMPTY) return;

        const { rotation, flipped } = decoder(flags);
        const normalized = normalizeCellForBrowser(
            type,
            rotation,
            flipped,
            version,
        );

        const normX = x - minX;
        const normY = y - minY;

        // @ts-expect-error
        const [_, arrow] = selectedMap.tempMap.getOrCreateArrow(normX, normY);

        arrow.type = normalized.type;
        arrow.rotation = normalized.rotation;
        arrow.flipped = normalized.flipped;
        arrow.canBeEdited = true;

        const key = `${normX},${normY}`;
        // @ts-expect-error
        selectedMap.arrowsToPutOriginal.set(key, arrow);
        // @ts-expect-error
        selectedMap.arrowsToPut.set(key, arrow);
    });
}
