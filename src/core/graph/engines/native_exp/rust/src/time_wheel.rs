pub const WHEEL_SIZE: usize = 2048;
pub const WHEEL_MASK: usize = WHEEL_SIZE - 1;
pub const INLINE_BUCKET_CAP: usize = 32;

pub struct WheelBucket {
    pub len: u32,
    pub inline: [u32; INLINE_BUCKET_CAP],
    pub spill: Vec<u32>,
}

impl Default for WheelBucket {
    fn default() -> Self {
        WheelBucket {
            len: 0,
            inline: [0; INLINE_BUCKET_CAP],
            spill: Vec::new(),
        }
    }
}

pub struct TimeWheel {
    pub buckets: Vec<WheelBucket>,
}

impl TimeWheel {
    pub fn new() -> Self {
        let mut buckets = Vec::with_capacity(WHEEL_SIZE);
        for _ in 0..WHEEL_SIZE {
            buckets.push(WheelBucket::default());
        }
        TimeWheel { buckets }
    }

    #[inline(always)]
    pub fn clear(&mut self) {
        for b in &mut self.buckets {
            b.len = 0;
            b.spill.clear();
        }
    }

    #[inline(always)]
    pub fn has_pending(&self) -> bool {
        self.buckets.iter().any(|b| b.len > 0)
    }

    #[inline(always)]
    pub fn schedule_raw(&mut self, slot: usize, value: u32) {
        unsafe {
            let b = self.buckets.get_unchecked_mut(slot);
            let len = b.len as usize;
            if len < INLINE_BUCKET_CAP {
                *b.inline.get_unchecked_mut(len) = value;
            } else {
                b.spill.push(value);
            }
            b.len = (len + 1) as u32;
        }
    }

    #[inline(always)]
    pub fn schedule_active(&mut self, target_idx: u32, is_active: bool, at_tick: u32) {
        let slot = (at_tick as usize) & WHEEL_MASK;
        let delta = if is_active { 1u32 } else { 0xFFu32 };
        let value = (target_idx << 8) | delta;
        self.schedule_raw(slot, value);
    }

    #[inline(always)]
    pub fn schedule(&mut self, target_idx: u32, delta: i32, at_tick: u32) {
        self.schedule_active(target_idx, delta > 0, at_tick);
    }

    pub fn cancel(&mut self, target_idx: u32, is_active: bool, at_tick: u32) -> bool {
        let slot = (at_tick as usize) & WHEEL_MASK;
        let delta = if is_active { 1u32 } else { 0xFFu32 };
        let target_value = (target_idx << 8) | delta;
        let b = unsafe { self.buckets.get_unchecked_mut(slot) };
        let inline_len = (b.len as usize).min(INLINE_BUCKET_CAP);
        for i in 0..inline_len {
            if b.inline[i] == target_value {
                if let Some(spill_val) = b.spill.pop() {
                    b.inline[i] = spill_val;
                } else {
                    let last_inline_idx = inline_len - 1;
                    b.inline[i] = b.inline[last_inline_idx];
                }
                b.len -= 1;
                return true;
            }
        }
        if let Some(pos) = b.spill.iter().position(|&x| x == target_value) {
            b.spill.swap_remove(pos);
            b.len -= 1;
            return true;
        }
        false
    }
}
