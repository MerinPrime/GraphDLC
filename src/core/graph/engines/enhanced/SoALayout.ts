export namespace SoALayout {
    export namespace Node {
        export const FLAGS = 0;
        export const TYPE = 1;
        export const SIGNAL = 2;
        export const LAST_SIGNAL = 3;
        export const SIGNALS_COUNT = 4;
        export const BLOCKED_COUNT = 5;
        export const LINKS_COUNT = 6;
        export const DETECTORS_COUNT = 7;

        export const STRIDE = 8;

        export namespace Flags {
            export const IsEntryPoint = 1 << 0;
            export const IsAdditionalUpdate = 1 << 1;
            export const IsBreakpoint = 1 << 2;
            export const IsUpdated = 1 << 3;
            export const IsChanged = 1 << 4;
            export const IsReadHead = 1 << 5;
            export const IsCycleHead = 1 << 6;
            export const IsInCycle = 1 << 7;
        }
    }

    export namespace Extra8Node {
        export const HEAD_TYPE = 0;

        export const STRIDE = 1;
    }

    export namespace Extra32Node {
        export const CHUNK_IDX = 0;
        export const CYCLE_IDX = 1;
        export const CYCLE_OFFSET = 2;
        export const BLOCKED_LINK_IDX = 3;

        export const STRIDE = 4;
    }

    export namespace Links {
        export const STRIDE = 4;
    }

    export namespace Detectors {
        export const STRIDE = 4;
    }

    export namespace Chunk {
        export const FLAGS = 0;

        export const STRIDE = 1;

        export namespace Flags {
            export const IsDirty = 1 << 0;
            export const _UNUSED_1 = 1 << 1;
            export const _UNUSED_2 = 1 << 2;
            export const _UNUSED_3 = 1 << 3;
            export const _UNUSED_4 = 1 << 4;
            export const _UNUSED_5 = 1 << 5;
            export const _UNUSED_6 = 1 << 6;
            export const _UNUSED_7 = 1 << 7;
        }
    }
}
