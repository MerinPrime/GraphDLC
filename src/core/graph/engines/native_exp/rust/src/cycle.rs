pub struct CycleState {
    pub cycle_idx: u32,
    pub length: u32,
    pub words_ptr: *mut u32,
    pub state: Vec<u32>,
    pub chunks: Vec<u32>,
}

impl CycleState {
    pub fn new(cycle_idx: u32, length: u32) -> Self {
        let num_words = (length + 31) >> 5;
        let mut state = vec![0; num_words as usize];
        let words_ptr = state.as_mut_ptr();
        CycleState {
            cycle_idx,
            length,
            words_ptr,
            state,
            chunks: Vec::new(),
        }
    }

    #[inline(always)]
    pub fn clear(&mut self) {
        self.state.fill(0);
    }

    #[inline(always)]
    pub fn get_bit(&self, tick: u32, offset: u32) -> bool {
        let pos = (tick + offset) % self.length;
        let word = (pos >> 5) as usize;
        let mask = 1 << (pos & 31);
        unsafe { (*self.words_ptr.add(word) & mask) != 0 }
    }

    #[inline(always)]
    pub fn write_bit(&mut self, tick: u32, offset: u32) {
        let pos = (tick + offset) % self.length;
        let word = (pos >> 5) as usize;
        let mask = 1 << (pos & 31);
        unsafe { *self.words_ptr.add(word) |= mask; }
    }

    #[inline(always)]
    pub fn clear_bit(&mut self, tick: u32, offset: u32) {
        let pos = (tick + offset) % self.length;
        let word = (pos >> 5) as usize;
        let mask = 1 << (pos & 31);
        unsafe { *self.words_ptr.add(word) &= !mask; }
    }

    #[inline(always)]
    pub fn xor_bit(&mut self, tick: u32, offset: u32) {
        let pos = (tick + offset) % self.length;
        let word = (pos >> 5) as usize;
        let mask = 1 << (pos & 31);
        unsafe { *self.words_ptr.add(word) ^= mask; }
    }
}
