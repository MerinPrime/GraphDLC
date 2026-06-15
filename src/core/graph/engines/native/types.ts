export interface RustEngineExports extends WebAssembly.Exports {
    add(a: number, b: number): number;
}
