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
    pub last_on_tick: u32,

    pub capacity: usize,
    pub mask: usize,
    pub pulses: Vec<u64>,
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
            last_on_tick: u32::MAX,
            capacity,
            mask,
            pulses: vec![0; capacity],
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
            last_on_tick: u32::MAX,
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
        self.last_on_tick = u32::MAX;
    }

    #[inline(always)]
    pub fn push_pulse(&mut self, start: i32, end: i32) {
        if self.capacity == 0 {
            return;
        }
        let idx = self.tail & self.mask;
        unsafe {
            *self.pulses.get_unchecked_mut(idx) =
                ((end as u32 as u64) << 32) | (start as u32 as u64);
        }
        self.tail += 1;
        if self.tail - self.head > self.capacity {
            self.head = self.tail - self.capacity;
        }
    }

    #[inline(always)]
    pub fn record_edge(&mut self, tick: u32, is_active: bool) {
        if is_active {
            self.input_active = true;
            self.last_on_tick = tick;
        } else {
            self.input_active = false;
            if self.last_on_tick != u32::MAX {
                let start = self.last_on_tick as i32;
                let end = tick as i32;
                let idx = self.tail & self.mask;
                unsafe {
                    *self.pulses.get_unchecked_mut(idx) =
                        ((end as u32 as u64) << 32) | (start as u32 as u64);
                }
                self.tail += 1;
                if self.tail - self.head > self.capacity {
                    self.head = self.tail - self.capacity;
                }
            }
        }
    }

    #[inline(always)]
    pub fn prune(&mut self, tick: u32) {
        let threshold = (tick as i32) - (self.max_delay as i32);
        while self.head < self.tail {
            let pulse = unsafe { *self.pulses.get_unchecked(self.head & self.mask) };
            let pulse_end = (pulse >> 32) as u32 as i32;
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
    pub fn remove_pulse_at(&mut self, input_tick: i32) -> bool {
        if self.input_active && self.last_on_tick != u32::MAX && input_tick >= (self.last_on_tick as i32) {
            let start = self.last_on_tick as i32;
            if input_tick > start {
                self.push_pulse(start, input_tick);
            }
            self.last_on_tick = (input_tick + 1) as u32;
            return true;
        }

        let mut i = self.head;
        while i < self.tail {
            let idx = i & self.mask;
            let pulse = unsafe { *self.pulses.get_unchecked(idx) };
            let start = pulse as u32 as i32;
            let end = (pulse >> 32) as u32 as i32;
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
                    let new_pulse = ((end as u32 as u64) << 32) | ((start + 1) as u32 as u64);
                    unsafe {
                        *self.pulses.get_unchecked_mut(idx) = new_pulse;
                    }
                    return true;
                } else if input_tick == end - 1 {
                    let new_pulse = (((end - 1) as u32 as u64) << 32) | (start as u32 as u64);
                    unsafe {
                        *self.pulses.get_unchecked_mut(idx) = new_pulse;
                    }
                    return true;
                } else {
                    let left = ((input_tick as u32 as u64) << 32) | (start as u32 as u64);
                    unsafe {
                        *self.pulses.get_unchecked_mut(idx) = left;
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
    pub fn is_signal_active_at(&mut self, tick: u32, dist: u32) -> bool {
        let input_tick = (tick as i32) - (dist as i32);

        if self.input_active && self.last_on_tick != u32::MAX && input_tick >= (self.last_on_tick as i32) {
            return true;
        }

        self.prune(tick);

        let mut i = self.head;
        while i < self.tail {
            let idx = i & self.mask;
            let pulse = unsafe { *self.pulses.get_unchecked(idx) };
            let start = pulse as u32 as i32;
            let end = (pulse >> 32) as u32 as i32;
            if input_tick >= start && input_tick < end {
                return true;
            }
            i += 1;
        }

        false
    }
}
