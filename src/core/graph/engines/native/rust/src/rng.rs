static mut RNG_STATE: u64 = 123456789;
static mut RANDOM_BUFFER: u64 = 0;
static mut RANDOM_BUFFER_INDEX: u8 = 64;

#[inline(always)]
pub fn random_bool() -> bool {
    unsafe {
        if RANDOM_BUFFER_INDEX >= 64 {
            let mut x = RNG_STATE;
            x ^= x << 13;
            x ^= x >> 7;
            x ^= x << 17;
            RNG_STATE = x;
            RANDOM_BUFFER = x;
            RANDOM_BUFFER_INDEX = 0;
        }
        let bit = (RANDOM_BUFFER & 1) == 1;
        RANDOM_BUFFER >>= 1;
        RANDOM_BUFFER_INDEX += 1;
        bit
    }
}

pub fn reset_rng(state: u64) {
    unsafe {
        RNG_STATE = state;
        RANDOM_BUFFER = 0;
        RANDOM_BUFFER_INDEX = 64;
    }
}
