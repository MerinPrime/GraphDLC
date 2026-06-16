static mut RNG_STATE: u64 = 123456789;

#[inline(always)]
pub fn next_random() -> f64 {
    unsafe {
        RNG_STATE = RNG_STATE
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);

        let val = (RNG_STATE >> 11) & 0x1F_FFFF_FFFF_FFFF;

        (val as f64) / 9007199254740992.0
    }
}

#[inline(always)]
pub fn reset_rng() {
    unsafe {
        RNG_STATE = 123456789;
    }
}
