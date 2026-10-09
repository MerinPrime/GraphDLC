import wasmBase64 from './rust/Cargo.toml';
import type { RustEngineExports } from './types';

function decodeBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

let rustExports: RustEngineExports | null = null;
let rustLoading: Promise<RustEngineExports> | null = null;

export function instantiateRustEngine(): RustEngineExports {
    const wasmBytes = decodeBase64(wasmBase64);
    const module = new WebAssembly.Module(wasmBytes);
    const instance = new WebAssembly.Instance(module, {});

    const exports = instance.exports as RustEngineExports;
    rustExports = exports;

    return exports;
}

export async function tryLoadRustEngine(): Promise<RustEngineExports> {
    if (rustExports) {
        return rustExports;
    }

    if (rustLoading) {
        return rustLoading;
    }

    rustLoading = (async () => {
        const wasmBytes = decodeBase64(wasmBase64);
        const module = await WebAssembly.compile(wasmBytes);
        const instance = await WebAssembly.instantiate(module, {});

        const exports = instance.exports as RustEngineExports;
        rustExports = exports;
        console.log('Rust engine loaded asynchronously');

        return exports;
    })();

    try {
        return await rustLoading;
    } finally {
        rustLoading = null;
    }
}

export function getRustEngine(): RustEngineExports {
    if (!rustExports) {
        throw new Error('Rust engine is not initialized');
    }

    return rustExports;
}
