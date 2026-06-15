export namespace SoALayout {
    export namespace Node {
        export const FLAGS = 0;
        export const TYPE = 1;
        export const SIGNAL = 2;
        export const LAST_SIGNAL = 3;
        export const SIGNALS_COUNT = 4;
        export const BLOCKED_COUNT = 5;
        export const EDGES_COUNT = 6;
        export const DETECTORS_COUNT = 7;

        export const STRIDE = 8;

        export namespace Flags {
            export const IsEntryPoint = 1 << 0;
            export const IsAdditionalUpdate = 1 << 1;
            export const IsBreakpoint = 1 << 2;
            export const IsUpdated = 1 << 3;
            export const IsChanged = 1 << 4;
            export const UNUSED = 1 << 5;
            export const IsCycleHead = 1 << 6;
            export const IsInCycle = 1 << 7;
        }
    }
}
