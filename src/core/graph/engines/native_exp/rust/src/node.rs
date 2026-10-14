#[repr(C)]
#[derive(Clone, Copy)]
pub struct Node {
    pub flags: u8,
    pub node_type: u8,
    pub signal: u8,
    pub last_signal: u8,
    pub signals_count: u8,
    pub blocked_count: u8,
    pub links_count: u8,
    pub detectors_count: u8,

    pub chunk_idx: u32,
    pub links: [u32; 4],
    pub pos_hash: u32,
}

impl Node {
    #[inline(always)]
    pub fn type_id(&self) -> u8 {
        self.node_type
    }

    #[inline(always)]
    pub fn set_type_id(&mut self, type_id: u8) {
        self.node_type = type_id;
    }
}
