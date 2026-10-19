pub struct Chunk {
    pub flags: u8,
    pub x: i32,
    pub y: i32,
    pub nodes: [u32; 256],
}

impl Chunk {
    pub const fn new() -> Self {
        Self {
            flags: 0,
            x: 0,
            y: 0,
            nodes: [u32::MAX; 256],
        }
    }
}

impl Default for Chunk {
    fn default() -> Self {
        Self::new()
    }
}
