#[inline(always)]
pub fn random_bool(seed: u32, pos_hash: u32, tick: u32) -> bool {
    let mut x = seed ^ pos_hash.wrapping_mul(0x9e37_79b9) ^ tick.wrapping_mul(0x85eb_ca6b);

    x ^= x >> 16;
    x = x.wrapping_mul(0x21f0_aaad);
    x ^= x >> 15;
    x = x.wrapping_mul(0x735a_2d97);
    x ^= x >> 15;

    x >> 31 != 0
}
