const CHUNK_SIZE = 16;

export const BROWSER_VERSION = 0;
export const STEAM_VERSION_4 = 4;
export const STEAM_VERSION_5 = 5;

export const BUTTON_TYPE = 21;
export const LAST_BROWSER_TYPE = 25;
export const PLACEHOLDER_TYPE = 26;
export const COMMAND_BLOCK_TYPE = 33;

export interface ArrowCell {
    x: number;
    y: number;
    type: number;
    rotation: number;
    flipped: boolean;
    data: number | null;
    extra: number;
}

export interface ParsedArrowMap {
    version: number;
    cells: ArrowCell[];
}

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

const TURNLESS_TYPES = new Set([2, 9, 21, 23, 25]);
const TWO_WAY_SPLITTER_TYPE = 6;
const MIRRORLESS_TYPES = new Set([
    1, 3, 4, 5, 8, 10, 12, 15, 16, 17, 18, 19, 20, 22, 24,
]);
const SIDEWAYS_TYPES = new Set([7, 11]);

export function normalizeOrientation(
    type: number,
    rotation: number,
    flipped: boolean,
): [number, boolean] {
    if (TURNLESS_TYPES.has(type)) return [0, false];
    if (type === TWO_WAY_SPLITTER_TYPE) return [rotation % 2, false];
    if (MIRRORLESS_TYPES.has(type)) return [rotation, false];
    if (SIDEWAYS_TYPES.has(type)) {
        return [flipped ? (rotation + 3) % 4 : rotation, false];
    }
    return [rotation, flipped];
}

export function normalizeCellForBrowser(
    type: number,
    rotation: number,
    flipped: boolean,
    version: number,
): { type: number; rotation: number; flipped: boolean } {
    if (
        version !== BROWSER_VERSION &&
        (type === BUTTON_TYPE || type > LAST_BROWSER_TYPE)
    ) {
        return { type: PLACEHOLDER_TYPE, rotation: 0, flipped: false };
    }
    if (type > PLACEHOLDER_TYPE) {
        return { type: PLACEHOLDER_TYPE, rotation: 0, flipped: false };
    }

    const [normRotation, normFlipped] = normalizeOrientation(
        type,
        rotation,
        flipped,
    );
    return { type, rotation: normRotation, flipped: normFlipped };
}

function decodeBase64(text: string): Uint8Array {
    const clean = text.replace(/\s+/g, '');
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

async function decompress(bytes: Uint8Array): Promise<Uint8Array> {
    for (const format of ['deflate', 'deflate-raw'] as const) {
        try {
            const stream = new Blob([bytes as any])
                .stream()
                .pipeThrough(new DecompressionStream(format));
            return new Uint8Array(await new Response(stream).arrayBuffer());
        } catch {}
    }
    throw new Error('Failed to decompress map payload');
}

function readBodyCells(body: Uint8Array, decoder: LayoutDecoder): ArrowCell[] {
    let index = 0;

    const readByte = (): number => {
        if (index >= body.length) throw new Error('Unexpected end of map data');
        return body[index++];
    };

    const readWord = (): number => readByte() | (readByte() << 8);

    const readCoordinate = (): number => {
        const val = readWord();
        return (val & 0x8000) !== 0 ? -(val & 0x7fff) : val;
    };

    const skipBytes = (count: number): void => {
        if (index + count > body.length) {
            throw new Error('Unexpected end of map data');
        }
        index += count;
    };

    const cells: ArrowCell[] = [];
    const chunkCount = readWord();

    for (let i = 0; i < chunkCount; i++) {
        const chunkX = readCoordinate();
        const chunkY = readCoordinate();
        const typeCount = readByte() + 1;

        for (let j = 0; j < typeCount; j++) {
            const type = readByte();
            const cellCount = readByte() + 1;

            for (let k = 0; k < cellCount; k++) {
                const position = readByte();
                const { hasData, rotation, flipped, extra } = decoder(
                    readByte(),
                );
                let data: number | null = null;

                if (hasData) {
                    data = readWord();
                    if (type === COMMAND_BLOCK_TYPE && (extra & 1) !== 0) {
                        skipBytes(data);
                    }
                }

                cells.push({
                    x: chunkX * CHUNK_SIZE + (position & 0x0f),
                    y: chunkY * CHUNK_SIZE + (position >> 4),
                    type,
                    rotation,
                    flipped,
                    data,
                    extra,
                });
            }
        }
    }

    return cells;
}

export async function readArrowsMap(text: string): Promise<ParsedArrowMap> {
    let encoded = text.trim();

    if (encoded.startsWith('{')) {
        let json: { data?: unknown };
        try {
            json = JSON.parse(encoded);
        } catch {
            throw new Error('Input appears to be JSON but is malformed');
        }
        if (typeof json.data !== 'string') {
            throw new Error('JSON save file does not contain a "data" string');
        }
        encoded = json.data;
    }

    const bytes = decodeBase64(encoded);
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
        throw new Error(`Unknown map compression flag: ${bytes[2]}`);
    }

    const cells = readBodyCells(body, decoder);
    return { version, cells };
}
