import type { ISnapshot } from '../core/types/ISnapshot';

export interface NativeSnapshot extends ISnapshot {
    tick: number;
    data: Uint8Array;
}
