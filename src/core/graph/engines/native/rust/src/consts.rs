pub const FLAG_IS_ENTRY_POINT: u8 = 1 << 0;
pub const FLAG_IS_ADDITIONAL_UPDATE: u8 = 1 << 1;
pub const FLAG_IS_BREAKPOINT: u8 = 1 << 2;
pub const FLAG_IS_UPDATED: u8 = 1 << 3;
pub const FLAG_IS_CHANGED: u8 = 1 << 4;
pub const FLAG_IS_READ_HEAD: u8 = 1 << 5;
pub const FLAG_IS_CYCLE_HEAD: u8 = 1 << 6;
pub const FLAG_IS_IN_CYCLE: u8 = 1 << 7;

pub const NODE_TYPE_EMPTY: u8 = 0;
pub const NODE_TYPE_PATH: u8 = 1;
pub const NODE_TYPE_SOURCE: u8 = 2;
pub const NODE_TYPE_BLOCKER: u8 = 3;
pub const NODE_TYPE_DELAY: u8 = 4;
pub const NODE_TYPE_DETECTOR: u8 = 5;
pub const NODE_TYPE_IMPULSE: u8 = 6;
pub const NODE_TYPE_LOGIC_NOT: u8 = 7;
pub const NODE_TYPE_LOGIC_AND: u8 = 8;
pub const NODE_TYPE_LOGIC_XOR: u8 = 9;
pub const NODE_TYPE_LATCH: u8 = 10;
pub const NODE_TYPE_FLIP_FLOP: u8 = 11;
pub const NODE_TYPE_RANDOM: u8 = 12;
pub const NODE_TYPE_BUTTON: u8 = 13;
pub const NODE_TYPE_DIRECTIONAL_BUTTON: u8 = 14;

pub const NODE_SIGNAL_NONE: u8 = 0;
pub const NODE_SIGNAL_ACTIVE: u8 = 1;
pub const NODE_SIGNAL_PENDING: u8 = 2;
pub const NODE_SIGNAL_KEEP_SIGNAL: u8 = 3;

pub const CYCLE_HEAD_TYPE_NONE: u8 = 0;
pub const CYCLE_HEAD_TYPE_READ: u8 = 1;
pub const CYCLE_HEAD_TYPE_WRITE: u8 = 2;
pub const CYCLE_HEAD_TYPE_XOR_WRITE: u8 = 3;
pub const CYCLE_HEAD_TYPE_CLEAR: u8 = 4;

pub const CHUNK_FLAG_IS_DIRTY: u8 = 1 << 0;
