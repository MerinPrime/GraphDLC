export const enum NodeSignal {
    NONE = 0,
    ACTIVE = 1,
    PENDING = 2,
    KEEP_SIGNAL = 3,
}

export const DebugNodeSignal = {
    [NodeSignal.NONE]: 'NONE',
    [NodeSignal.ACTIVE]: 'ACTIVE',
    [NodeSignal.PENDING]: 'PENDING',
    [NodeSignal.KEEP_SIGNAL]: 'KEEP_SIGNAL',
};
