use crate::chunk::Chunk;
use crate::consts::*;
use crate::cycle::CycleState;
use crate::node::Node;
use crate::path::{PathInternalNode, PathState, PathTarget};
use crate::rng::random_bool;
use crate::time_wheel::{TimeWheel, INLINE_BUCKET_CAP, WHEEL_MASK};
use std::collections::HashSet;

const REQUEUE_MASK: u8 =
    FLAG_IS_UPDATED | FLAG_IS_ADDITIONAL_UPDATE | FLAG_IS_READ_HEAD | FLAG_IS_REQUEUE_TYPE;

const fn build_state_lut() -> [u8; 8192] {
    let mut lut = [NODE_SIGNAL_NONE; 8192];
    let mut t = 0usize;
    while t < 16 {
        let mut sig = 0usize;
        while sig < 4 {
            let mut sc = 0usize;
            while sc < 8 {
                let cat = if sc == 0 {
                    0
                } else if sc == 1 {
                    1
                } else if (sc & 1) == 0 {
                    2
                } else {
                    3
                };
                let type_and_sig = t | (sig << 8);
                let idx = (type_and_sig << 3) | sc;
                let sig_u8 = sig as u8;
                lut[idx] = match t as u8 {
                    NODE_TYPE_PATH
                    | NODE_TYPE_BLOCKER
                    | NODE_TYPE_DETECTOR
                    | NODE_TYPE_DIRECTIONAL_BUTTON => {
                        if cat > 0 {
                            NODE_SIGNAL_ACTIVE
                        } else {
                            NODE_SIGNAL_NONE
                        }
                    }
                    NODE_TYPE_SOURCE => NODE_SIGNAL_ACTIVE,
                    NODE_TYPE_LOGIC_NOT => {
                        if cat == 0 {
                            NODE_SIGNAL_ACTIVE
                        } else {
                            NODE_SIGNAL_NONE
                        }
                    }
                    NODE_TYPE_LOGIC_AND => {
                        if cat >= 2 {
                            NODE_SIGNAL_ACTIVE
                        } else {
                            NODE_SIGNAL_NONE
                        }
                    }
                    NODE_TYPE_LOGIC_XOR => {
                        if (cat & 1) == 1 {
                            NODE_SIGNAL_ACTIVE
                        } else {
                            NODE_SIGNAL_NONE
                        }
                    }
                    NODE_TYPE_DELAY => {
                        if sig_u8 == NODE_SIGNAL_PENDING {
                            NODE_SIGNAL_ACTIVE
                        } else if cat > 0 {
                            if sig_u8 == NODE_SIGNAL_NONE {
                                NODE_SIGNAL_PENDING
                            } else {
                                sig_u8
                            }
                        } else {
                            NODE_SIGNAL_NONE
                        }
                    }
                    NODE_TYPE_IMPULSE => {
                        if sig_u8 == NODE_SIGNAL_NONE {
                            NODE_SIGNAL_ACTIVE
                        } else {
                            NODE_SIGNAL_PENDING
                        }
                    }
                    NODE_TYPE_LATCH => {
                        if cat >= 2 {
                            NODE_SIGNAL_ACTIVE
                        } else if cat == 1 {
                            NODE_SIGNAL_NONE
                        } else {
                            sig_u8
                        }
                    }
                    NODE_TYPE_FLIP_FLOP => {
                        if cat > 0 {
                            if sig_u8 == NODE_SIGNAL_ACTIVE {
                                NODE_SIGNAL_NONE
                            } else {
                                NODE_SIGNAL_ACTIVE
                            }
                        } else {
                            sig_u8
                        }
                    }
                    _ => NODE_SIGNAL_NONE,
                };
                sc += 1;
            }
            sig += 1;
        }
        t += 1;
    }
    lut
}

static STATE_LUT: [u8; 8192] = build_state_lut();

#[derive(Clone, Copy)]
pub struct NodeCold {
    pub chunk_idx: u32,
    pub pos_hash: u32,
    pub cycle_idx: u32,
    pub cycle_offset: u32,
    pub blocked_link: u32,
    pub detectors: [u32; 4],
    pub head_type: u8,
    pub is_in_cycle: bool,
    pub is_entry_point: bool,
    pub is_in_path: bool,
    pub path_idx: u32,
    pub path_distance: u32,
}

pub const DEFAULT_NODE_COLD: NodeCold = NodeCold {
    chunk_idx: 0,
    pos_hash: 0,
    cycle_idx: 0,
    cycle_offset: 0,
    blocked_link: u32::MAX,
    detectors: [0u32; 4],
    head_type: 0,
    is_in_cycle: false,
    is_entry_point: false,
    is_in_path: false,
    path_idx: u32::MAX,
    path_distance: 0,
};

pub struct GraphState {
    pub nodes: Vec<Node>,
    pub node_links: Vec<[u32; 4]>,
    pub node_paths: Vec<[u32; 4]>,
    pub node_paths_count: Vec<u8>,
    pub cold_nodes: Vec<NodeCold>,
    pub chunks: Vec<Chunk>,
    pub changed_nodes: Vec<u32>,
    pub temp_changed_nodes: Vec<u32>,
    pub cycles: Vec<Option<CycleState>>,
    pub has_paths: bool,
    pub paths: Vec<PathState>,
    pub all_path_targets: Vec<PathTarget>,
    pub time_wheel: TimeWheel,
    pub seed: u32,
    pub tick: u32,
    pub break_points: Vec<u32>,
    pub break_point: bool,
    pub break_point_node: u32,
    pub back_links: Vec<Vec<u32>>,
    pub detected_links: Vec<Option<u32>>,
    pub in_changed_list: Vec<u64>,
    pub has_external_marks: bool,
    pub has_blockers: bool,
    pub has_cycles: bool,
    pub render_signals: Vec<u8>,
    pub deferred_clears: Vec<(u32, u32)>,
    pub total_clear_heads: usize,
    pub cycle_chunks: Vec<u32>,
}

static mut STATE: Option<GraphState> = None;

pub fn get_state() -> &'static mut GraphState {
    unsafe {
        if STATE.is_none() {
            STATE = Some(GraphState::new());
        }
        STATE.as_mut().unwrap()
    }
}

#[inline(always)]
fn push_changed_unchecked(v: &mut Vec<u32>, idx: u32) {
    unsafe {
        let len = v.len();
        v.as_mut_ptr().add(len).write(idx);
        v.set_len(len + 1);
    }
}

impl GraphState {
    pub fn new() -> Self {
        GraphState {
            nodes: Vec::with_capacity(4096),
            node_links: Vec::with_capacity(4096),
            node_paths: Vec::with_capacity(4096),
            node_paths_count: Vec::with_capacity(4096),
            cold_nodes: Vec::with_capacity(4096),
            chunks: Vec::with_capacity(16),
            changed_nodes: Vec::with_capacity(4096),
            temp_changed_nodes: Vec::with_capacity(4096),
            cycles: Vec::with_capacity(64),
            has_paths: false,
            paths: Vec::with_capacity(64),
            all_path_targets: Vec::with_capacity(4096),
            time_wheel: TimeWheel::new(),
            seed: 0,
            tick: 0,
            break_points: Vec::with_capacity(64),
            break_point: false,
            break_point_node: 0,
            back_links: vec![Vec::new(); 4096],
            detected_links: vec![None; 4096],
            in_changed_list: vec![0; 64],
            has_external_marks: false,
            has_blockers: false,
            has_cycles: false,
            render_signals: vec![0; 4096],
            deferred_clears: Vec::with_capacity(4096),
            total_clear_heads: 0,
            cycle_chunks: Vec::with_capacity(64),
        }
    }

    pub fn clear(&mut self) {
        self.nodes.clear();
        self.node_links.clear();
        self.node_paths.clear();
        self.node_paths_count.clear();
        self.cold_nodes.clear();
        self.chunks.clear();
        self.changed_nodes.clear();
        self.temp_changed_nodes.clear();
        self.cycles.clear();
        self.cycle_chunks.clear();
        self.has_paths = false;
        self.paths.clear();
        self.all_path_targets.clear();
        self.time_wheel.clear();
        self.tick = 0;
        self.break_points.clear();
        self.break_point = false;
        self.back_links.clear();
        self.back_links.resize(4096, Vec::new());
        self.detected_links.clear();
        self.detected_links.resize(4096, None);
        self.in_changed_list.clear();
        self.in_changed_list.resize(64, 0);
        self.has_external_marks = false;
        self.has_blockers = false;
        self.has_cycles = false;
        self.render_signals.clear();
        self.render_signals.resize(4096, 0);
        self.deferred_clears.clear();
        self.total_clear_heads = 0;
    }

    pub fn ensure_node_capacity(&mut self, count: usize) {
        if self.nodes.len() < count {
            self.nodes.resize_with(count, || Node {
                node_type: 0,
                flags: 0,
                signal: 0,
                last_signal: 0,
                signals_count: 0,
                blocked_count: 0,
                links_count: 0,
                detectors_count: 0,
            });
            self.node_links.resize(count, [0u32; 4]);
            self.node_paths.resize(count, [0u32; 4]);
            self.node_paths_count.resize(count, 0);
            self.cold_nodes.resize(count, DEFAULT_NODE_COLD);
            if self.render_signals.len() < count {
                self.render_signals.resize(count, 0);
            }
            if self.back_links.len() < count {
                self.back_links.resize(count, Vec::new());
            }
            if self.detected_links.len() < count {
                self.detected_links.resize(count, None);
            }
            let words = (count + 63) / 64;
            if self.in_changed_list.len() < words {
                self.in_changed_list.resize(words, 0);
            }
        }
        if self.temp_changed_nodes.capacity() < count {
            self.temp_changed_nodes.reserve(count);
        }
        if self.changed_nodes.capacity() < count {
            self.changed_nodes.reserve(count);
        }
        if self.deferred_clears.capacity() < count {
            self.deferred_clears
                .reserve(count - self.deferred_clears.capacity());
        }
    }

    pub fn ensure_chunk_capacity(&mut self, count: usize) {
        if self.chunks.len() < count {
            self.chunks.resize_with(count, Chunk::new);
        }
    }

    pub fn register_chunk(&mut self, chunk_idx: u32, x: i32, y: i32) {
        self.ensure_chunk_capacity((chunk_idx + 1) as usize);
        let chunk = &mut self.chunks[chunk_idx as usize];
        chunk.x = x;
        chunk.y = y;
        chunk.flags |= CHUNK_FLAG_IS_DIRTY;
    }

    #[inline(always)]
    pub fn make_dirty_chunk(&mut self, chunk_idx: u32) {
        unsafe {
            let chunk = self.chunks.get_unchecked_mut(chunk_idx as usize);
            if chunk.flags & CHUNK_FLAG_IS_DIRTY == 0 {
                chunk.flags |= CHUNK_FLAG_IS_DIRTY;
            }
        }
    }

    #[inline(always)]
    pub fn mark_cycles_dirty_bulk(&mut self) {
        for i in 0..self.cycle_chunks.len() {
            let chunk_idx = self.cycle_chunks[i];
            self.make_dirty_chunk(chunk_idx);
        }
    }

    pub fn rebuild_cycle_chunks(&mut self) {
        let mut chunks = Vec::new();
        for cycle in &self.cycles {
            if let Some(ref c) = cycle {
                for &chunk_idx in &c.chunks {
                    if !chunks.contains(&chunk_idx) {
                        chunks.push(chunk_idx);
                    }
                }
            }
        }
        self.cycle_chunks = chunks;
    }

    #[inline(always)]
    pub fn make_undirty_chunk(&mut self, chunk_idx: u32) {
        unsafe {
            self.chunks.get_unchecked_mut(chunk_idx as usize).flags &= !CHUNK_FLAG_IS_DIRTY;
        }
    }

    pub fn get_node_signal(&self, node_idx: u32) -> u8 {
        if node_idx as usize >= self.nodes.len() {
            return NODE_SIGNAL_NONE;
        }
        let node = &self.nodes[node_idx as usize];
        let cold = &self.cold_nodes[node_idx as usize];
        if cold.is_in_cycle && cold.head_type == CYCLE_HEAD_TYPE_NONE {
            let cycle_idx = cold.cycle_idx;
            let cycle_offset = cold.cycle_offset;
            if let Some(ref cycle_state) = self.cycles[cycle_idx as usize] {
                let is_active = cycle_state.get_bit(self.tick, cycle_offset);
                if is_active {
                    return NODE_SIGNAL_ACTIVE;
                }
                return NODE_SIGNAL_NONE;
            }
            return NODE_SIGNAL_NONE;
        }
        if cold.is_in_path {
            let path_idx = cold.path_idx as usize;
            let path_dist = cold.path_distance;
            if path_idx < self.paths.len() {
                let path_state = unsafe {
                    let ptr = self.paths.as_ptr().add(path_idx) as *mut PathState;
                    &mut *ptr
                };
                if path_state.is_valid() {
                    let is_active = path_state.is_signal_active_at(self.tick, path_dist);
                    if is_active {
                        return NODE_SIGNAL_ACTIVE;
                    }
                    return NODE_SIGNAL_NONE;
                }
            }
            return NODE_SIGNAL_NONE;
        }
        node.signal
    }

    pub fn add_cycle(&mut self, cycle_idx: u32, length: u32) {
        self.has_cycles = true;
        let idx = cycle_idx as usize;
        if idx >= self.cycles.len() {
            self.cycles.resize_with(idx + 1, || None);
        }
        self.cycles[idx] = Some(CycleState::new(cycle_idx, length));
    }

    pub fn remove_cycle(&mut self, cycle_idx: u32) {
        let idx = cycle_idx as usize;
        if idx < self.cycles.len() {
            self.cycles[idx] = None;
            self.has_cycles = self.cycles.iter().any(|c| c.is_some());
        }
    }

    #[inline(always)]
    pub fn mark_node_as_changed_non_temp(&mut self, node_idx: u32) {
        if !self.has_external_marks {
            for &idx in &self.changed_nodes {
                self.in_changed_list[(idx >> 6) as usize] |= 1u64 << (idx & 63);
            }
            self.has_external_marks = true;
        }
        let word = (node_idx >> 6) as usize;
        let bit = 1u64 << (node_idx & 63);
        if self.in_changed_list[word] & bit != 0 {
            return;
        }
        self.in_changed_list[word] |= bit;
        self.changed_nodes.push(node_idx);
    }

    pub fn update_node_back_links(&mut self, node_idx: u32, new_links: &[u32]) {
        let (old_links, old_count) = if (node_idx as usize) < self.nodes.len() {
            let node = &self.nodes[node_idx as usize];
            (self.node_links[node_idx as usize], node.links_count as usize)
        } else {
            ([0u32; 4], 0)
        };

        for i in 0..old_count {
            let target_idx = old_links[i] as usize;
            if target_idx < self.nodes.len() && target_idx < self.back_links.len() {
                self.back_links[target_idx].retain(|&x| x != node_idx);
            }
        }

        for &target_idx in new_links {
            self.ensure_node_capacity((target_idx + 1) as usize);

            if (target_idx as usize) >= self.back_links.len() {
                self.back_links
                    .resize_with((target_idx + 1) as usize, Vec::new);
            }

            let back_links = &mut self.back_links[target_idx as usize];
            if !back_links.contains(&node_idx) {
                back_links.push(node_idx);
            }
        }
    }

    #[cold]
    #[inline(never)]
    fn clear_external_marks(&mut self) {
        for &idx in &self.changed_nodes {
            self.in_changed_list[(idx >> 6) as usize] &= !(1u64 << (idx & 63));
        }
        self.has_external_marks = false;
    }

    #[inline(always)]
    pub fn update_state(&mut self) {
        self.run_ticks_fast(1);
    }

    pub fn run_ticks_fast(&mut self, count: u32) {
        match (self.has_blockers, self.has_cycles, self.has_paths) {
            (false, false, false) => self.run_ticks_fast_impl::<false, false, false>(count),
            (true, false, false) => self.run_ticks_fast_impl::<true, false, false>(count),
            (false, true, false) => self.run_ticks_fast_impl::<false, true, false>(count),
            (true, true, false) => self.run_ticks_fast_impl::<true, true, false>(count),
            (false, false, true) => self.run_ticks_fast_impl::<false, false, true>(count),
            (true, false, true) => self.run_ticks_fast_impl::<true, false, true>(count),
            (false, true, true) => self.run_ticks_fast_impl::<false, true, true>(count),
            (true, true, true) => self.run_ticks_fast_impl::<true, true, true>(count),
        }
    }

    #[inline(always)]
    fn run_ticks_fast_impl<
        const HAS_BLOCKERS: bool,
        const HAS_CYCLES: bool,
        const HAS_PATHS: bool,
    >(
        &mut self,
        count: u32,
    ) {
        if self.has_external_marks {
            self.clear_external_marks();
        }

        let nodes_ptr = self.nodes.as_mut_ptr();
        let node_links_ptr = self.node_links.as_ptr();
        let node_paths_ptr = self.node_paths.as_ptr();
        let node_paths_count_ptr = self.node_paths_count.as_ptr();
        let cold_nodes_ptr = self.cold_nodes.as_mut_ptr();
        let all_path_targets_ptr = self.all_path_targets.as_ptr();
        let mut curr_ptr = self.changed_nodes.as_mut_ptr();
        let mut next_ptr = self.temp_changed_nodes.as_mut_ptr();
        let deferred_clears_base = self.deferred_clears.as_mut_ptr();
        let mut len = self.changed_nodes.len();
        let mut tick = self.tick;
        let mut swapped = false;

        for _ in 0..count {
            let mut write_ptr = next_ptr;

            if HAS_PATHS {
                let slot = (tick as usize) & WHEEL_MASK;
                let bucket = unsafe { self.time_wheel.buckets.get_unchecked_mut(slot) };
                let bucket_len = bucket.len as usize;
                if bucket_len != 0 {
                    let inline_len = bucket_len.min(INLINE_BUCKET_CAP);
                    for i in 0..inline_len {
                        let entry = unsafe { *bucket.inline.get_unchecked(i) };
                        let target_idx = (entry >> 8) as usize;
                        let delta = entry as u8;
                        let target = unsafe { &mut *nodes_ptr.add(target_idx) };
                        target.signals_count = target.signals_count.wrapping_add(delta);
                        let is_new = ((target.flags & FLAG_IS_CHANGED) == 0) as usize;
                        target.flags |= FLAG_IS_CHANGED;
                        unsafe {
                            *write_ptr = target_idx as u32;
                            write_ptr = write_ptr.add(is_new);
                        }
                    }
                    if bucket_len > INLINE_BUCKET_CAP {
                        for &entry in bucket.spill.iter() {
                            let target_idx = (entry >> 8) as usize;
                            let delta = entry as u8;
                            let target = unsafe { &mut *nodes_ptr.add(target_idx) };
                            target.signals_count = target.signals_count.wrapping_add(delta);
                            let is_new = ((target.flags & FLAG_IS_CHANGED) == 0) as usize;
                            target.flags |= FLAG_IS_CHANGED;
                            unsafe {
                                *write_ptr = target_idx as u32;
                                write_ptr = write_ptr.add(is_new);
                            }
                        }
                        bucket.spill.clear();
                    }
                    bucket.len = 0;
                }
            }

            let end_curr = unsafe { curr_ptr.add(len) };
            let mut read_curr = curr_ptr;
            let mut clear_ptr = deferred_clears_base;

            while read_curr < end_curr {
                let node_idx = unsafe { *read_curr };
                read_curr = unsafe { read_curr.add(1) };

                let node = unsafe { &mut *nodes_ptr.add(node_idx as usize) };

                let signal = node.signal;
                let flags = node.flags;

                let is_cycle_head = HAS_CYCLES && (flags & FLAG_IS_CYCLE_HEAD) != 0;

                if is_cycle_head {
                    let cold = unsafe { &*cold_nodes_ptr.add(node_idx as usize) };
                    let cycle_head_type = cold.head_type;
                    let blocked_count = node.blocked_count;
                    let is_active = signal == NODE_SIGNAL_ACTIVE;

                    if !is_active
                        && (blocked_count == 0 || cycle_head_type != CYCLE_HEAD_TYPE_CLEAR)
                    {
                        continue;
                    }

                    let cycle_idx = cold.cycle_idx;
                    let cycle_offset = cold.cycle_offset;

                    let cycle_state = unsafe {
                        self.cycles
                            .get_unchecked_mut(cycle_idx as usize)
                            .as_mut()
                            .unwrap_unchecked()
                    };
                    match cycle_head_type {
                        CYCLE_HEAD_TYPE_WRITE => {
                            cycle_state.write_bit(tick, cycle_offset);
                        }
                        CYCLE_HEAD_TYPE_XOR_WRITE => {
                            cycle_state.xor_bit(tick, cycle_offset);
                        }
                        CYCLE_HEAD_TYPE_CLEAR => unsafe {
                            *clear_ptr = (cycle_idx, cycle_offset);
                            clear_ptr = clear_ptr.add(1);
                        },
                        _ => {}
                    }

                    if node.flags & FLAG_IS_CHANGED == 0 {
                        node.flags |= FLAG_IS_CHANGED;
                        unsafe {
                            *write_ptr = node_idx;
                            write_ptr = write_ptr.add(1);
                        }
                    }
                    continue;
                }

                let last_signal = node.last_signal;
                let is_changed = last_signal != signal;

                if is_changed {
                    let node_type = node.type_id();
                    let is_active = signal == NODE_SIGNAL_ACTIVE;
                    let is_delayed = ((signal | last_signal) & 2 != 0)
                        && (((node_type == NODE_TYPE_DELAY) & (signal == NODE_SIGNAL_PENDING))
                            | ((!is_active) & (last_signal == NODE_SIGNAL_PENDING)));

                    if !is_delayed {
                        let links_count = node.links_count as usize;

                        if links_count != 0 {
                            let delta = ((is_active as u8) << 1).wrapping_sub(1);
                            let links = unsafe { &*node_links_ptr.add(node_idx as usize) };
                            let is_blocker = HAS_BLOCKERS && node_type == NODE_TYPE_BLOCKER;
                            if is_blocker {
                                let cold = unsafe { &*cold_nodes_ptr.add(node_idx as usize) };
                                let blocked_link_idx = cold.blocked_link;
                                for k in 0..links_count {
                                    let edge_idx = links[k] as usize;
                                    let edge = unsafe { &mut *nodes_ptr.add(edge_idx) };
                                    let mut flags = edge.flags;
                                    if edge_idx as u32 == blocked_link_idx {
                                        let new_blocked = edge.blocked_count.wrapping_add(delta);
                                        edge.blocked_count = new_blocked;
                                        if new_blocked > 0 {
                                            flags |= FLAG_IS_BLOCKED;
                                        } else {
                                            flags &= !FLAG_IS_BLOCKED;
                                        }
                                    } else {
                                        edge.signals_count = edge.signals_count.wrapping_add(delta);
                                    }
                                    let is_new = ((flags & FLAG_IS_CHANGED) == 0) as usize;
                                    edge.flags = flags | FLAG_IS_CHANGED;
                                    unsafe {
                                        *write_ptr = edge_idx as u32;
                                        write_ptr = write_ptr.add(is_new);
                                    }
                                }
                            } else {
                                for k in 0..links_count {
                                    let edge_idx = links[k] as usize;
                                    let edge = unsafe { &mut *nodes_ptr.add(edge_idx) };
                                    let is_new = ((edge.flags & FLAG_IS_CHANGED) == 0) as usize;
                                    edge.flags |= FLAG_IS_CHANGED;
                                    unsafe {
                                        *write_ptr = edge_idx as u32;
                                        write_ptr = write_ptr.add(is_new);
                                    }
                                    edge.signals_count = edge.signals_count.wrapping_add(delta);
                                }
                            }
                        }

                        if HAS_PATHS && (flags & FLAG_IS_PATH_SOURCE) != 0 {
                            let count =
                                unsafe { *node_paths_count_ptr.add(node_idx as usize) } as usize;
                            let paths = unsafe { &*node_paths_ptr.add(node_idx as usize) };
                            let delta = if is_active { 1u32 } else { 0xFFu32 };
                            for k in 0..count {
                                let path_idx = paths[k];
                                let path =
                                    unsafe { self.paths.get_unchecked_mut(path_idx as usize) };
                                if path.input_active == is_active {
                                    continue;
                                }
                                path.record_edge(tick, is_active);
                                let start = path.targets_start as usize;
                                let end = start + path.targets_count as usize;
                                for i in start..end {
                                    let pt = unsafe { *all_path_targets_ptr.add(i) };
                                    let slot = ((tick + pt.delay) as usize) & WHEEL_MASK;
                                    let value = (pt.target_node << 8) | delta;
                                    self.time_wheel.schedule_raw(slot, value);
                                }
                            }
                        }
                    }

                    let detectors_count = node.detectors_count as usize;

                    if detectors_count != 0 {
                        let cold = unsafe { &*cold_nodes_ptr.add(node_idx as usize) };
                        let detectors = &cold.detectors;
                        let sig_count = (signal != NODE_SIGNAL_NONE) as u8;

                        if detectors_count == 1 {
                            let detector_idx = unsafe { *detectors.get_unchecked(0) } as usize;
                            let detector = unsafe { &mut *nodes_ptr.add(detector_idx) };
                            detector.signals_count = sig_count;
                            let is_new = ((detector.flags & FLAG_IS_CHANGED) == 0) as usize;
                            detector.flags |= FLAG_IS_CHANGED;
                            unsafe {
                                *write_ptr = detector_idx as u32;
                                write_ptr = write_ptr.add(is_new);
                            }
                        } else {
                            for k in 0..detectors_count {
                                let detector_idx = detectors[k] as usize;
                                let detector = unsafe { &mut *nodes_ptr.add(detector_idx) };
                                detector.signals_count = sig_count;
                                let is_new = ((detector.flags & FLAG_IS_CHANGED) == 0) as usize;
                                detector.flags |= FLAG_IS_CHANGED;
                                unsafe {
                                    *write_ptr = detector_idx as u32;
                                    write_ptr = write_ptr.add(is_new);
                                }
                            }
                        }
                    }

                    node.last_signal = signal;
                }

                if (flags & REQUEUE_MASK) != 0 {
                    let should_requeue = if (flags & FLAG_IS_UPDATED) != 0 {
                        node.flags &= !FLAG_IS_UPDATED;
                        true
                    } else if is_changed && (flags & FLAG_IS_ADDITIONAL_UPDATE) != 0 {
                        true
                    } else if HAS_CYCLES && (flags & FLAG_IS_READ_HEAD) != 0 {
                        node.signals_count > 0
                    } else if (flags & FLAG_IS_REQUEUE_TYPE) != 0 {
                        if node.type_id() == NODE_TYPE_RANDOM {
                            node.signals_count > 0
                        } else {
                            signal != NODE_SIGNAL_NONE && node.signals_count == 0
                        }
                    } else {
                        false
                    };

                    if should_requeue {
                        let is_new = ((node.flags & FLAG_IS_CHANGED) == 0) as usize;
                        node.flags |= FLAG_IS_CHANGED;
                        unsafe {
                            *write_ptr = node_idx;
                            write_ptr = write_ptr.add(is_new);
                        }
                    }
                }
            }

            if HAS_CYCLES {
                let end_clear = clear_ptr;
                let mut read_clear = deferred_clears_base;
                while read_clear < end_clear {
                    let (c_idx, c_offset) = unsafe { *read_clear };
                    read_clear = unsafe { read_clear.add(1) };
                    let cycle_state = unsafe {
                        self.cycles
                            .get_unchecked_mut(c_idx as usize)
                            .as_mut()
                            .unwrap_unchecked()
                    };
                    cycle_state.clear_bit(tick, c_offset);
                }
            }

            let mut read_next = next_ptr;
            let mut keep_ptr = next_ptr;
            while read_next < write_ptr {
                let node_idx = unsafe { *read_next };
                read_next = unsafe { read_next.add(1) };
                let node = unsafe { &mut *nodes_ptr.add(node_idx as usize) };
                let dword = unsafe { *(node as *const Node as *const u32) };
                let flags = dword as u8;
                let type_and_signal = (dword >> 8) as u16;
                let last_signal = (dword >> 24) as u8;
                let signals_count = node.signals_count;

                let lut_index = ((type_and_signal as usize) << 3) | (signals_count as usize);
                let signal = if (flags
                    & (FLAG_IS_READ_HEAD | FLAG_IS_REQUEUE_TYPE | FLAG_IS_BLOCKED))
                    == 0
                {
                    unsafe { *STATE_LUT.get_unchecked(lut_index) }
                } else if (flags & FLAG_IS_BLOCKED) != 0 {
                    NODE_SIGNAL_NONE
                } else if HAS_CYCLES && (flags & FLAG_IS_READ_HEAD) != 0 {
                    if signals_count > 1 {
                        NODE_SIGNAL_ACTIVE
                    } else if signals_count == 0 {
                        NODE_SIGNAL_NONE
                    } else {
                        let cold = &self.cold_nodes[node_idx as usize];
                        let cycle_state = unsafe {
                            self.cycles
                                .get_unchecked(cold.cycle_idx as usize)
                                .as_ref()
                                .unwrap_unchecked()
                        };
                        cycle_state.get_bit(tick, cold.cycle_offset) as u8
                    }
                } else if (dword >> 8) as u8 == NODE_TYPE_RANDOM {
                    if signals_count > 0 && random_bool(self.seed, self.cold_nodes[node_idx as usize].pos_hash, tick) {
                        NODE_SIGNAL_ACTIVE
                    } else {
                        NODE_SIGNAL_NONE
                    }
                } else {
                    unsafe { *STATE_LUT.get_unchecked(lut_index) }
                };

                node.signal = signal;
                node.flags = flags & !FLAG_IS_CHANGED;

                let needs_phase1 =
                    (signal != last_signal) | ((flags & (REQUEUE_MASK | FLAG_IS_CYCLE_HEAD)) != 0);
                unsafe {
                    *keep_ptr = node_idx;
                    keep_ptr = keep_ptr.add(needs_phase1 as usize);
                }
            }

            len = unsafe { keep_ptr.offset_from(next_ptr) as usize };
            std::mem::swap(&mut curr_ptr, &mut next_ptr);
            swapped = !swapped;
            tick += 1;
        }

        self.tick = tick;
        if swapped {
            std::mem::swap(&mut self.changed_nodes, &mut self.temp_changed_nodes);
        }
        unsafe {
            self.changed_nodes.set_len(len);
            self.temp_changed_nodes.set_len(0);
        }
    }

    #[cold]
    #[inline(never)]
    pub fn check_breakpoints(&mut self) {
        let nodes_ptr = self.nodes.as_ptr();
        for &node_idx in &self.break_points {
            let node = unsafe { &*nodes_ptr.add(node_idx as usize) };

            if node.signal == NODE_SIGNAL_ACTIVE && node.last_signal == NODE_SIGNAL_NONE {
                self.break_point = true;
                self.break_point_node = node_idx;
                break;
            }
        }
    }

    #[inline(always)]
    fn update_node_signal(&self, node_idx: u32, node_ptr: *const Node, tick: u32) -> u8 {
        let node = unsafe { &*node_ptr };
        let signals_count = node.signals_count;
        let flags = node.flags;

        if (flags & (FLAG_IS_READ_HEAD | FLAG_IS_REQUEUE_TYPE)) != 0 {
            if (flags & FLAG_IS_READ_HEAD) != 0 {
                if signals_count > 1 {
                    return NODE_SIGNAL_ACTIVE;
                }
                if signals_count == 0 {
                    return NODE_SIGNAL_NONE;
                }

                let cold = &self.cold_nodes[node_idx as usize];
                let cycle_idx = cold.cycle_idx;
                let cycle_offset = cold.cycle_offset;

                if let Some(ref cycle_state) = self.cycles[cycle_idx as usize] {
                    let cycle_active = cycle_state.get_bit(tick, cycle_offset);
                    return if cycle_active {
                        NODE_SIGNAL_ACTIVE
                    } else {
                        NODE_SIGNAL_NONE
                    };
                }
                return node.signal;
            }

            if node.node_type == NODE_TYPE_RANDOM {
                return if signals_count > 0 && random_bool(self.seed, self.cold_nodes[node_idx as usize].pos_hash, tick) {
                    NODE_SIGNAL_ACTIVE
                } else {
                    NODE_SIGNAL_NONE
                };
            }
        }

        let lut_index = ((node.type_and_signal() as usize) << 3) | (signals_count as usize);
        unsafe { *STATE_LUT.get_unchecked(lut_index) }
    }

    pub fn full_node_state_calculate(&mut self, node_idx: u32) {
        let node_type = self.nodes[node_idx as usize].type_id();
        if node_type == NODE_TYPE_EMPTY {
            let n = &mut self.nodes[node_idx as usize];
            n.signal = NODE_SIGNAL_NONE;
            n.last_signal = NODE_SIGNAL_NONE;
            n.signals_count = 0;
            n.blocked_count = 0;
            n.flags &= !(FLAG_IS_BLOCKED | FLAG_IS_CHANGED | FLAG_IS_UPDATED);
            return;
        }
        let is_detector = node_type == NODE_TYPE_DETECTOR;

        let mut signals_count = 0;
        let mut blocked_count = 0;

        if is_detector {
            if let Some(detected_idx) = self.detected_links[node_idx as usize] {
                let detected_signal = self.nodes[detected_idx as usize].signal;
                signals_count = if detected_signal != NODE_SIGNAL_NONE {
                    1
                } else {
                    0
                };
            }
        }

        let back_links = &self.back_links[node_idx as usize];

        for &back_idx in back_links {
            let back_node = &self.nodes[back_idx as usize];
            let cold = &self.cold_nodes[back_idx as usize];
            let head_type = cold.head_type;
            let is_bypassed_head =
                head_type != CYCLE_HEAD_TYPE_NONE && head_type != CYCLE_HEAD_TYPE_READ;

            if is_bypassed_head {
                continue;
            }

            let back_last_signal = if cold.is_in_path {
                let path_idx = cold.path_idx as usize;
                let path_dist = cold.path_distance;
                if path_idx < self.paths.len() {
                    let path = unsafe {
                        let ptr = self.paths.as_ptr().add(path_idx) as *mut PathState;
                        &mut *ptr
                    };
                    let check_tick = self.tick.saturating_sub(1);
                    if path.is_valid() && path.is_signal_active_at(check_tick, path_dist) {
                        NODE_SIGNAL_ACTIVE
                    } else {
                        NODE_SIGNAL_NONE
                    }
                } else {
                    NODE_SIGNAL_NONE
                }
            } else {
                back_node.last_signal
            };

            if back_last_signal == NODE_SIGNAL_ACTIVE {
                let is_blocker = back_node.type_id() == NODE_TYPE_BLOCKER;
                let blocked_link = cold.blocked_link;
                if is_blocker && blocked_link == node_idx {
                    blocked_count += 1;
                } else if !is_detector {
                    signals_count += 1;
                }
            }
        }

        let n = &mut self.nodes[node_idx as usize];
        n.signals_count = signals_count;
        n.blocked_count = blocked_count;
        if blocked_count > 0 {
            n.flags |= FLAG_IS_BLOCKED;
        } else {
            n.flags &= !FLAG_IS_BLOCKED;
        }
        n.flags |= FLAG_IS_UPDATED;

        self.mark_node_as_changed_non_temp(node_idx);
    }

    pub fn on_cycle_build(
        &mut self,
        cycle_idx: u32,
        cycle_length: u32,
        cycle_nodes: &[u32],
        cycle_heads: &[u32],
    ) {
        self.add_cycle(cycle_idx, cycle_length);
        if let Some(ref mut cycle_state) = self.cycles[cycle_idx as usize] {
            cycle_state.clear();
        }

        let mut chunks = Vec::new();
        for &node_idx in cycle_nodes {
            let (cycle_offset, chunk_idx, is_active) = {
                let node = &self.nodes[node_idx as usize];
                let cold = &self.cold_nodes[node_idx as usize];
                (
                    cold.cycle_offset,
                    cold.chunk_idx,
                    node.signal == NODE_SIGNAL_ACTIVE,
                )
            };

            if chunk_idx != u32::MAX && !chunks.contains(&chunk_idx) {
                chunks.push(chunk_idx);
            }

            if is_active {
                if let Some(ref mut cycle_state) = self.cycles[cycle_idx as usize] {
                    cycle_state.write_bit(self.tick, cycle_offset);
                }
            }

            let node = &mut self.nodes[node_idx as usize];
            node.signal = NODE_SIGNAL_NONE;
            node.last_signal = NODE_SIGNAL_NONE;
            node.flags &= !FLAG_IS_UPDATED;
            self.make_dirty_chunk(chunk_idx);
        }

        if let Some(ref mut cycle_state) = self.cycles[cycle_idx as usize] {
            cycle_state.chunks = chunks;
        }
        self.rebuild_cycle_chunks();

        let mut removed: HashSet<u32> = HashSet::new();
        for &node_idx in cycle_nodes {
            let cold = &self.cold_nodes[node_idx as usize];
            let is_head =
                cold.head_type != CYCLE_HEAD_TYPE_NONE && cold.head_type != CYCLE_HEAD_TYPE_READ;
            if is_head {
                self.mark_node_as_changed_non_temp(node_idx);
            } else {
                removed.insert(node_idx);
            }
        }

        if !removed.is_empty() {
            self.changed_nodes.retain(|x| !removed.contains(x));
            self.temp_changed_nodes.retain(|x| !removed.contains(x));
            for &node_idx in &removed {
                self.nodes[node_idx as usize].flags &= !FLAG_IS_CHANGED;
                self.in_changed_list[(node_idx >> 6) as usize] &= !(1u64 << (node_idx & 63));
            }
        }

        for &head_idx in cycle_heads {
            let head_cold = &self.cold_nodes[head_idx as usize];
            if head_cold.cycle_idx == cycle_idx {
                continue;
            }
            if head_cold.head_type != CYCLE_HEAD_TYPE_NONE {
                self.mark_node_as_changed_non_temp(head_idx);
            }
        }

        let mut external_affected = HashSet::new();
        let cycle_nodes_set: HashSet<u32> = cycle_nodes.iter().copied().collect();

        for &node_idx in cycle_nodes {
            let node = &self.nodes[node_idx as usize];
            let count = node.links_count as usize;
            for &link_idx in &self.node_links[node_idx as usize][..count] {
                if !cycle_nodes_set.contains(&link_idx) {
                    external_affected.insert(link_idx);
                }
            }
        }

        for &head_idx in cycle_heads {
            external_affected.insert(head_idx);
            let node = &self.nodes[head_idx as usize];
            let count = node.links_count as usize;
            for &link_idx in &self.node_links[head_idx as usize][..count] {
                external_affected.insert(link_idx);
            }
        }

        for affected_idx in external_affected {
            self.full_node_state_calculate(affected_idx);
        }

        let clears_in_cycle = cycle_heads
            .iter()
            .filter(|&&h| self.cold_nodes[h as usize].head_type == CYCLE_HEAD_TYPE_CLEAR)
            .count();
        self.total_clear_heads += clears_in_cycle;
        if self.deferred_clears.capacity() < self.total_clear_heads {
            self.deferred_clears
                .reserve(self.total_clear_heads - self.deferred_clears.capacity());
        }
    }

    pub fn on_cycle_dismantle(&mut self, cycle_idx: u32, cycle_nodes: &[u32], cycle_heads: &[u32]) {
        let clears_in_cycle = cycle_heads
            .iter()
            .filter(|&&h| self.cold_nodes[h as usize].head_type == CYCLE_HEAD_TYPE_CLEAR)
            .count();
        self.total_clear_heads = self.total_clear_heads.saturating_sub(clears_in_cycle);
        for &node_idx in cycle_nodes {
            let idx = node_idx as usize;
            let chunk_idx = self.cold_nodes[idx].chunk_idx;
            let cycle_offset = self.cold_nodes[idx].cycle_offset;

            let is_active = if let Some(Some(ref cycle_state)) = self.cycles.get(cycle_idx as usize)
            {
                cycle_state.get_bit(self.tick, cycle_offset)
            } else {
                false
            };

            let node = &mut self.nodes[idx];
            if is_active {
                node.signal = NODE_SIGNAL_ACTIVE;
                node.last_signal = NODE_SIGNAL_NONE;
            } else {
                node.signal = NODE_SIGNAL_NONE;
                node.last_signal = NODE_SIGNAL_NONE;
            }

            let cold = &mut self.cold_nodes[idx];
            cold.is_in_cycle = false;
            cold.cycle_idx = 0;
            cold.cycle_offset = 0;

            self.make_dirty_chunk(chunk_idx);
            self.mark_node_as_changed_non_temp(node_idx);
        }

        for &head_idx in cycle_heads {
            let cold = &mut self.cold_nodes[head_idx as usize];
            if cold.cycle_idx == cycle_idx {
                cold.cycle_idx = 0;
                cold.cycle_offset = 0;
                self.nodes[head_idx as usize].flags &= !(FLAG_IS_CYCLE_HEAD | FLAG_IS_READ_HEAD);
            }
        }

        self.remove_cycle(cycle_idx);
        self.rebuild_cycle_chunks();

        let mut affected_nodes = HashSet::new();
        for &node_idx in cycle_nodes {
            let node = &self.nodes[node_idx as usize];
            let count = node.links_count as usize;
            for &link_idx in &self.node_links[node_idx as usize][..count] {
                affected_nodes.insert(link_idx);
            }
        }
        for &head_idx in cycle_heads {
            affected_nodes.insert(head_idx);
            let node = &self.nodes[head_idx as usize];
            let count = node.links_count as usize;
            for &link_idx in &self.node_links[head_idx as usize][..count] {
                affected_nodes.insert(link_idx);
            }
        }

        for affected_idx in affected_nodes {
            self.full_node_state_calculate(affected_idx);
        }
    }

    pub fn on_path_build(
        &mut self,
        path_idx: u32,
        source_idx: u32,
        max_delay: u32,
        targets: &[PathTarget],
        internal_nodes: &[PathInternalNode],
    ) {
        self.has_paths = true;
        let idx = path_idx as usize;
        if idx >= self.paths.len() {
            self.paths.resize_with(idx + 1, PathState::empty);
        }

        let targets_start = self.all_path_targets.len() as u32;
        let targets_count = targets.len() as u32;
        self.all_path_targets.extend_from_slice(targets);

        let mut path_state = PathState::new(
            path_idx,
            source_idx,
            max_delay,
            targets_start,
            targets_count,
        );

        if (source_idx as usize) < self.node_paths.len() {
            let cnt = self.node_paths_count[source_idx as usize] as usize;
            let mut found = false;
            for i in 0..cnt {
                if self.node_paths[source_idx as usize][i] == path_idx {
                    found = true;
                    break;
                }
            }
            if !found && cnt < 4 {
                self.node_paths[source_idx as usize][cnt] = path_idx;
                self.node_paths_count[source_idx as usize] += 1;
            }
        }
        if (source_idx as usize) < self.nodes.len() {
            self.nodes[source_idx as usize].flags |= FLAG_IS_PATH_SOURCE;
        }

        let mut first_nodes = [0u32; 4];
        let mut first_nodes_count = 0usize;
        for &node in internal_nodes {
            if node.dist == 1 && first_nodes_count < 4 {
                first_nodes[first_nodes_count] = node.node_idx;
                first_nodes_count += 1;
            }
        }

        if (source_idx as usize) < self.nodes.len() {
            let source_links = &mut self.node_links[source_idx as usize];
            let source_node = &mut self.nodes[source_idx as usize];
            let mut new_links = [0u32; 4];
            let mut new_count = 0;
            for i in 0..source_node.links_count as usize {
                let l = source_links[i];
                let mut found = false;
                for j in 0..first_nodes_count {
                    if first_nodes[j] == l {
                        found = true;
                        break;
                    }
                }
                if !found {
                    new_links[new_count] = l;
                    new_count += 1;
                }
            }
            *source_links = new_links;
            source_node.links_count = new_count as u8;
        }

        for i in 0..first_nodes_count {
            let fn_idx = first_nodes[i];
            if (fn_idx as usize) < self.back_links.len() {
                self.back_links[fn_idx as usize].retain(|&x| x != source_idx);
            }
        }

        let (source_was_active, source_is_active) = if (source_idx as usize) < self.nodes.len() {
            let n = &self.nodes[source_idx as usize];
            (n.last_signal == NODE_SIGNAL_ACTIVE, n.signal == NODE_SIGNAL_ACTIVE)
        } else {
            (false, false)
        };

        let mut has_active = source_was_active && source_is_active;
        let mut max_internal_dist = 0usize;
        for &node in internal_nodes {
            let dist_usize = node.dist as usize;
            if dist_usize > max_internal_dist {
                max_internal_dist = dist_usize;
            }
            if (node.node_idx as usize) < self.nodes.len()
                && self.nodes[node.node_idx as usize].signal == NODE_SIGNAL_ACTIVE
            {
                has_active = true;
            }
        }

        let mut dist_active = Vec::new();
        if has_active {
            dist_active.resize(max_internal_dist + 1, false);
            if source_was_active && source_is_active {
                dist_active[0] = true;
            }
            for &node in internal_nodes {
                if (node.node_idx as usize) < self.nodes.len()
                    && self.nodes[node.node_idx as usize].signal == NODE_SIGNAL_ACTIVE
                {
                    dist_active[node.dist as usize] = true;
                }
            }
        }

        let targets_delivered: Vec<bool> = targets
            .iter()
            .map(|pt| {
                for node in internal_nodes {
                    if node.dist == pt.delay {
                        let n_idx = node.node_idx as usize;
                        let count = self.nodes[n_idx].links_count as usize;
                        if self.node_links[n_idx][..count].contains(&pt.target_node) {
                            return self.nodes[n_idx].last_signal == NODE_SIGNAL_ACTIVE;
                        }
                    }
                }
                false
            })
            .collect();

        let mut internal_set = HashSet::new();
        for &node in internal_nodes {
            internal_set.insert(node.node_idx);
        }

        for &node in internal_nodes {
            let node_idx = node.node_idx as usize;
            let last_sig = self.nodes[node_idx].last_signal;
            let sig = self.nodes[node_idx].signal;
            let count = self.nodes[node_idx].links_count as usize;
            let links = &self.node_links[node_idx][..count];

            if last_sig == NODE_SIGNAL_ACTIVE && sig == NODE_SIGNAL_NONE {
                for &link in links {
                    if !internal_set.contains(&link) {
                        self.time_wheel.schedule(link, -1, self.tick);
                    }
                }
            }
        }

        for &node in internal_nodes {
            let node_idx = node.node_idx;
            let dist = node.dist;
            let chunk_idx = {
                let n = &mut self.nodes[node_idx as usize];
                n.flags &= !(FLAG_IS_CHANGED | FLAG_IS_UPDATED);
                let word = (node_idx >> 6) as usize;
                let bit = 1u64 << (node_idx & 63);
                if word < self.in_changed_list.len() && (self.in_changed_list[word] & bit) != 0 {
                    self.in_changed_list[word] &= !bit;
                    if let Some(pos) = self.changed_nodes.iter().position(|&x| x == node_idx) {
                        self.changed_nodes.swap_remove(pos);
                    }
                }
                n.signal = NODE_SIGNAL_NONE;
                n.last_signal = NODE_SIGNAL_NONE;
                n.signals_count = 0;
                self.cold_nodes[node_idx as usize].chunk_idx
            };

            let cold = &mut self.cold_nodes[node_idx as usize];
            cold.is_in_path = true;
            cold.path_idx = path_idx;
            cold.path_distance = dist;

            self.make_dirty_chunk(chunk_idx);
        }

        let current_tick = self.tick as i32;

        if has_active {
            let mut d_cont = 0usize;
            if dist_active[0] {
                while d_cont < max_internal_dist && dist_active[d_cont + 1] {
                    d_cont += 1;
                }
                path_state.record_edge(self.tick, true);
                path_state.last_on_tick = self.tick.saturating_sub(d_cont as u32);

                for (t_idx, &pt) in targets.iter().enumerate() {
                    let delay = pt.delay as i32;
                    let target_node = pt.target_node;
                    let on_tick = (path_state.last_on_tick as i32) + delay;

                    let already_delivered = targets_delivered[t_idx];

                    let should_schedule_on = if on_tick > current_tick {
                        true
                    } else if on_tick == current_tick {
                        !already_delivered
                    } else {
                        false
                    };

                    if should_schedule_on {
                        self.time_wheel.schedule(target_node, 1, on_tick as u32);
                    }
                }
            }

            let mut d = if dist_active[0] { d_cont + 1 } else { 1 };
            while d <= max_internal_dist {
                if dist_active[d] {
                    let d_start = d;
                    while d <= max_internal_dist && dist_active[d] {
                        d += 1;
                    }
                    let d_end = d - 1;

                    let start = current_tick - (d_end as i32);
                    let end = current_tick - (d_start as i32) + 1;
                    path_state.push_pulse(start, end);

                    for (t_idx, &pt) in targets.iter().enumerate() {
                        let delay = pt.delay as i32;
                        let target_node = pt.target_node;
                        let on_tick = start + delay;
                        let off_tick = end + delay;

                        let already_delivered = targets_delivered[t_idx];

                        let should_schedule_on = if on_tick > current_tick {
                            true
                        } else if on_tick == current_tick {
                            !already_delivered
                        } else {
                            false
                        };

                        if should_schedule_on {
                            self.time_wheel.schedule(target_node, 1, on_tick as u32);
                        }

                        if off_tick > current_tick {
                            self.time_wheel.schedule(target_node, -1, off_tick as u32);
                        }
                    }
                } else {
                    d += 1;
                }
            }
        }

        self.paths[idx] = path_state;
    }

    pub fn on_path_dismantle(
        &mut self,
        path_idx: u32,
        source_idx: u32,
        internal_nodes: &[u32],
        targets: &[u32],
        source_links: &[u32],
    ) {
        let idx = path_idx as usize;
        let mut active_internal_nodes = Vec::new();
        let mut was_active_internal_nodes = Vec::new();
        let mut cancel_events = Vec::new();

        if idx < self.paths.len() && self.paths[idx].is_valid() {
            let path = &mut self.paths[idx];
            for &node_idx in internal_nodes {
                let dist = self.cold_nodes[node_idx as usize].path_distance;
                if path.is_signal_active_at(self.tick, dist) {
                    active_internal_nodes.push(node_idx);
                }
                if self.tick > 0 && path.is_signal_active_at(self.tick - 1, dist) {
                    was_active_internal_nodes.push(node_idx);
                }
            }

            let start_t = path.targets_start as usize;
            let end_t = start_t + path.targets_count as usize;
            for t_i in start_t..end_t {
                let pt = self.all_path_targets[t_i];
                let target_node = pt.target_node;
                let delay = pt.delay;

                for p_idx in path.head..path.tail {
                    let pulse = path.pulses[p_idx & path.mask];
                    let start = pulse as u32 as i32;
                    let end = (pulse >> 32) as u32 as i32;

                    let on_tick = start + (delay as i32);
                    let off_tick = end + (delay as i32);

                    if on_tick >= (self.tick as i32) {
                        cancel_events.push((target_node, true, on_tick as u32));
                    }
                    if off_tick >= (self.tick as i32) {
                        cancel_events.push((target_node, false, off_tick as u32));
                    }
                }

                if path.input_active && path.last_on_tick != u32::MAX {
                    let on_tick = (path.last_on_tick as i32) + (delay as i32);
                    if on_tick >= (self.tick as i32) {
                        cancel_events.push((target_node, true, on_tick as u32));
                    }
                }
            }

            self.paths[idx] = PathState::empty();
            self.has_paths = self.paths.iter().any(|p| p.is_valid());
        }

        for (target_node, is_active, at_tick) in cancel_events {
            self.time_wheel.cancel(target_node, is_active, at_tick);
        }

        if (source_idx as usize) < self.node_paths.len() {
            let cnt = self.node_paths_count[source_idx as usize] as usize;
            let mut new_cnt = 0;
            for i in 0..cnt {
                let p = self.node_paths[source_idx as usize][i];
                if p != path_idx {
                    self.node_paths[source_idx as usize][new_cnt] = p;
                    new_cnt += 1;
                }
            }
            self.node_paths_count[source_idx as usize] = new_cnt as u8;
            if new_cnt == 0 && (source_idx as usize) < self.nodes.len() {
                self.nodes[source_idx as usize].flags &= !FLAG_IS_PATH_SOURCE;
            }
        }

        if (source_idx as usize) < self.nodes.len() {
            let links_arr = &mut self.node_links[source_idx as usize];
            let source_node = &mut self.nodes[source_idx as usize];
            let mut count = 0;
            for &l in source_links {
                if count < 4 {
                    links_arr[count] = l;
                    count += 1;
                }
            }
            source_node.links_count = count as u8;
            self.update_node_back_links(source_idx, &source_links[..count]);
        }

        for &node_idx in internal_nodes {
            if (node_idx as usize) < self.cold_nodes.len() {
                let cold = &mut self.cold_nodes[node_idx as usize];
                cold.is_in_path = false;
                cold.path_idx = u32::MAX;
                cold.path_distance = 0;
            }

            if (node_idx as usize) < self.nodes.len() {
                let is_empty = self.nodes[node_idx as usize].type_id() == NODE_TYPE_EMPTY;
                let is_active = !is_empty && active_internal_nodes.contains(&node_idx);
                let was_active = !is_empty && was_active_internal_nodes.contains(&node_idx);
                let chunk_idx = {
                    let n = &mut self.nodes[node_idx as usize];
                    n.signal = if is_active { NODE_SIGNAL_ACTIVE } else { NODE_SIGNAL_NONE };
                    n.last_signal = if was_active { NODE_SIGNAL_ACTIVE } else { NODE_SIGNAL_NONE };
                    n.flags |= FLAG_IS_UPDATED;
                    self.cold_nodes[node_idx as usize].chunk_idx
                };
                self.make_dirty_chunk(chunk_idx);
                if is_active != was_active {
                    self.mark_node_as_changed_non_temp(node_idx);
                }
            }
        }

        for &node_idx in internal_nodes {
            self.full_node_state_calculate(node_idx);
        }
    }
}
