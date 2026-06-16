pub struct CycleState {
    pub cycle_idx: u32,
    pub length: u32,
    pub state: Vec<u32>,
}

impl CycleState {
    pub fn new(cycle_idx: u32, length: u32) -> Self {
        let num_words = (length + 31) >> 5;
        CycleState {
            cycle_idx,
            length,
            state: vec![0; num_words as usize],
        }
    }

    #[inline(always)]
    pub fn clear(&mut self) {
        self.state.fill(0);
    }

    #[inline(always)]
    fn get_bit_pos(&self, tick: u32, offset: u32) -> (usize, u32) {
        let pos = (tick + offset) % self.length;
        ((pos >> 5) as usize, 1 << (pos & 31))
    }

    #[inline(always)]
    pub fn get_bit(&self, tick: u32, offset: u32) -> bool {
        let (word, mask) = self.get_bit_pos(tick, offset);
        (self.state[word] & mask) != 0
    }

    #[inline(always)]
    pub fn write_bit(&mut self, tick: u32, offset: u32) {
        let (word, mask) = self.get_bit_pos(tick, offset);
        self.state[word] |= mask;
    }

    #[inline(always)]
    pub fn clear_bit(&mut self, tick: u32, offset: u32) {
        let (word, mask) = self.get_bit_pos(tick, offset);
        self.state[word] &= !mask;
    }

    #[inline(always)]
    pub fn xor_bit(&mut self, tick: u32, offset: u32) {
        let (word, mask) = self.get_bit_pos(tick, offset);
        self.state[word] ^= mask;
    }
}
