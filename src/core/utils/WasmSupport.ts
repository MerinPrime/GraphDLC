export function isWasmSupported(): boolean {
    try {
        if (
            typeof WebAssembly === 'object' &&
            typeof WebAssembly.instantiate === 'function'
        ) {
            const module = new WebAssembly.Module(
                new Uint8Array([
                    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
                ]),
            );

            return module instanceof WebAssembly.Module;
        }
    } catch {}

    return false;
}
