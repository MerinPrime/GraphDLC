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

export function instantiateRustEngine(
    importObject: WebAssembly.Imports = {},
): RustEngineExports {
    const wasmBytes = decodeBase64(wasmBase64);
    const module = new WebAssembly.Module(wasmBytes);
    const instance = new WebAssembly.Instance(module, importObject);
    return instance.exports as RustEngineExports;
}
