#[repr(C)]
#[derive(Clone, Copy, Default, Debug, PartialEq, Eq)]
pub struct PathTarget {
    pub target_node: u32,
    pub delay: u32,
}

#[repr(C)]
#[derive(Clone, Copy, Default, Debug, PartialEq, Eq)]
pub struct PathInternalNode {
    pub node_idx: u32,
    pub dist: u32,
}

pub struct PathState {
    pub index: u32,
    pub source_idx: u32,
    pub max_delay: u32,
    pub targets_start: u32,
    pub targets_count: u32,

    pub input_active: bool,
    pub last_on_tick: u64,

    pub capacity: usize,
    pub mask: usize,
    pub pulses: Vec<(u64, u64)>,
    pub head: usize,
    pub tail: usize,
}

impl PathState {
    pub fn new(
        index: u32,
        source_idx: u32,
        max_delay: u32,
        targets_start: u32,
        targets_count: u32,
    ) -> Self {
        let capacity = (max_delay as usize + 4).max(16).next_power_of_two();
        let mask = capacity - 1;
        PathState {
            index,
            source_idx,
            max_delay,
            targets_start,
            targets_count,
            input_active: false,
            last_on_tick: u64::MAX,
            capacity,
            mask,
            pulses: vec![(0, 0); capacity],
            head: 0,
            tail: 0,
        }
    }

    pub fn empty() -> Self {
        PathState {
            index: 0,
            source_idx: 0,
            max_delay: 0,
            targets_start: 0,
            targets_count: 0,
            input_active: false,
            last_on_tick: u64::MAX,
            capacity: 0,
            mask: 0,
            pulses: Vec::new(),
            head: 0,
            tail: 0,
        }
    }

    #[inline(always)]
    pub fn is_valid(&self) -> bool {
        self.capacity > 0
    }

    #[inline(always)]
    pub fn clear(&mut self) {
        self.head = 0;
        self.tail = 0;
        self.input_active = false;
        self.last_on_tick = u64::MAX;
    }

    #[inline(always)]
    pub fn push_pulse(&mut self, start: u64, end: u64) {
        if self.capacity == 0 {
            return;
        }
        let idx = self.tail & self.mask;
        unsafe {
            *self.pulses.get_unchecked_mut(idx) = (start, end);
        }
        self.tail += 1;
        if self.tail - self.head > self.capacity {
            self.head = self.tail - self.capacity;
        }
    }

    #[inline(always)]
    pub fn record_edge(&mut self, tick: u64, is_active: bool) {
        if is_active {
            self.input_active = true;
            self.last_on_tick = tick;
        } else {
            self.input_active = false;
            if self.last_on_tick != u64::MAX {
                let start = self.last_on_tick;
                let end = tick;
                let idx = self.tail & self.mask;
                unsafe {
                    *self.pulses.get_unchecked_mut(idx) = (start, end);
                }
                self.tail += 1;
                if self.tail - self.head > self.capacity {
                    self.head = self.tail - self.capacity;
                }
            }
        }
    }

    #[inline(always)]
    pub fn prune(&mut self, tick: u64) {
        let threshold = tick.saturating_sub(self.max_delay as u64);
        while self.head < self.tail {
            let (_, pulse_end) = unsafe { *self.pulses.get_unchecked(self.head & self.mask) };
            if pulse_end < threshold {
                self.head += 1;
            } else {
                break;
            }
        }
        if self.head == self.tail {
            self.head = 0;
            self.tail = 0;
        }
    }

    #[inline(always)]
    pub fn remove_pulse_at(&mut self, input_tick: u64) -> bool {
        if self.input_active && self.last_on_tick != u64::MAX && input_tick >= self.last_on_tick {
            let start = self.last_on_tick;
            if input_tick > start {
                self.push_pulse(start, input_tick);
            }
            self.last_on_tick = input_tick + 1;
            return true;
        }

        let mut i = self.head;
        while i < self.tail {
            let idx = i & self.mask;
            let (start, end) = unsafe { *self.pulses.get_unchecked(idx) };
            if input_tick >= start && input_tick < end {
                if end - start <= 1 {
                    let mut j = i;
                    while j + 1 < self.tail {
                        let cur_idx = j & self.mask;
                        let next_idx = (j + 1) & self.mask;
                        unsafe {
                            *self.pulses.get_unchecked_mut(cur_idx) =
                                *self.pulses.get_unchecked(next_idx);
                        }
                        j += 1;
                    }
                    self.tail -= 1;
                    return true;
                } else if input_tick == start {
                    unsafe {
                        *self.pulses.get_unchecked_mut(idx) = (start + 1, end);
                    }
                    return true;
                } else if input_tick == end - 1 {
                    unsafe {
                        *self.pulses.get_unchecked_mut(idx) = (start, end - 1);
                    }
                    return true;
                } else {
                    unsafe {
                        *self.pulses.get_unchecked_mut(idx) = (start, input_tick);
                    }
                    self.push_pulse(input_tick + 1, end);
                    return true;
                }
            }
            i += 1;
        }
        false
    }

    #[inline(always)]
    pub fn is_signal_active_at(&mut self, tick: u64, dist: u32) -> bool {
        let input_tick = tick.saturating_sub(dist as u64);

        if self.input_active && self.last_on_tick != u64::MAX && input_tick >= self.last_on_tick {
            return true;
        }

        self.prune(tick);

        let mut i = self.head;
        while i < self.tail {
            let idx = i & self.mask;
            let (start, end) = unsafe { *self.pulses.get_unchecked(idx) };
            if input_tick >= start && input_tick < end {
                return true;
            }
            i += 1;
        }

        false
    }
}
