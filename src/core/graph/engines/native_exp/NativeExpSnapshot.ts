import type { ISnapshot } from '../core/types/ISnapshot';

export interface NativeExpSnapshot extends ISnapshot {
    tick: number;
    data: Uint8Array;
}
