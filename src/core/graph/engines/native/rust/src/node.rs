pub struct Node {
    pub flags: u8,
    pub packed_type: u8,
    pub signal: u8,
    pub last_signal: u8,
    pub signals_count: u8,
    pub blocked_count: u8,

    pub links_count: u8,
    pub detectors_count: u8,

    pub chunk_idx: u32,
    pub cycle_idx: u32,
    pub cycle_offset: u32,
    pub blocked_link: u32,

    pub links: [u32; 4],
    pub detectors: [u32; 4],
}

impl Node {
    #[inline(always)]
    pub fn type_id(&self) -> u8 {
        self.packed_type >> 3
    }

    #[inline(always)]
    pub fn set_type_id(&mut self, type_id: u8) {
        self.packed_type = (self.packed_type & 0x07) | ((type_id & 0x1F) << 3);
    }

    #[inline(always)]
    pub fn head_type(&self) -> u8 {
        self.packed_type & 0x07
    }

    #[inline(always)]
    pub fn set_head_type(&mut self, head_type: u8) {
        self.packed_type = (self.packed_type & 0xF8) | (head_type & 0x07);
    }
}
