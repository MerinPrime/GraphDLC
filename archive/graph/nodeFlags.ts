export const enum NodeFlags {
    EntryPoint = 0b1,
    AdditionalUpdate = 0b10,
    CycleHead = 0b100,
    Dirty = 0b1000,
    NotDirty = 0b11110111,
}