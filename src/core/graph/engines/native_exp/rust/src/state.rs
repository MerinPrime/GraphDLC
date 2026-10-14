use crate::chunk::Chunk;
use crate::consts::*;
use crate::cycle::CycleState;
use crate::node::Node;
use crate::rng::random_bool;
use std::collections::HashSet;

const REQUEUE_FLAGS: u8 =
    FLAG_IS_UPDATED | FLAG_IS_ADDITIONAL_UPDATE | FLAG_IS_READ_HEAD | FLAG_IS_ENTRY_POINT;

const REQUEUE_TYPES: u64 = (1u64 << (NODE_TYPE_BUTTON as u32))
    | (1u64 << (NODE_TYPE_DIRECTIONAL_BUTTON as u32))
    | (1u64 << (NODE_TYPE_RANDOM as u32));

const fn build_state_lut() -> [u8; 4096] {
    let mut lut = [NODE_SIGNAL_NONE; 4096];
    let mut t = 0usize;
    while t < 32 {
        let mut sig = 0usize;
        while sig < 4 {
            let mut sc = 0usize;
            while sc < 32 {
                let cat = if sc == 0 {
                    0
                } else if sc == 1 {
                    1
                } else if (sc & 1) == 0 {
                    2
                } else {
                    3
                };
                let idx = (t << 7) | (sig << 5) | sc;
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

static STATE_LUT: [u8; 4096] = build_state_lut();

pub struct NodeCold {
    pub cycle_idx: u32,
    pub cycle_offset: u32,
    pub blocked_link: u32,
    pub detectors: [u32; 4],
    pub head_type: u8,
}

pub struct GraphState {
    pub nodes: Vec<Node>,
    pub cold_nodes: Vec<NodeCold>,
    pub chunks: Vec<Chunk>,
    pub changed_nodes: Vec<u32>,
    pub temp_changed_nodes: Vec<u32>,
    pub cycles: Vec<Option<CycleState>>,
    pub seed: u32,
    pub tick: u32,
    pub break_points: Vec<u32>,
    pub break_point: bool,
    pub break_point_node: u32,
    pub back_links: Vec<Vec<u32>>,
    pub detected_links: Vec<Option<u32>>,
    pub in_changed_list: Vec<u64>,
    pub has_external_marks: bool,
    pub render_signals: Vec<u8>,
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
            cold_nodes: Vec::with_capacity(4096),
            chunks: Vec::with_capacity(16),
            changed_nodes: Vec::with_capacity(4096),
            temp_changed_nodes: Vec::with_capacity(4096),
            cycles: Vec::with_capacity(64),
            seed: 0,
            tick: 0,
            break_points: Vec::with_capacity(64),
            break_point: false,
            break_point_node: 0,
            back_links: vec![Vec::new(); 4096],
            detected_links: vec![None; 4096],
            in_changed_list: vec![0; 64],
            has_external_marks: false,
            render_signals: vec![0; 4096],
        }
    }

    pub fn clear(&mut self) {
        self.nodes.clear();
        self.cold_nodes.clear();
        self.chunks.clear();
        self.changed_nodes.clear();
        self.temp_changed_nodes.clear();
        self.cycles.clear();
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
        self.render_signals.clear();
        self.render_signals.resize(4096, 0);
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

                chunk_idx: 0,
                links: [0u32; 4],
                pos_hash: 0,
            });
            self.cold_nodes.resize_with(count, || NodeCold {
                cycle_idx: 0,
                cycle_offset: 0,
                blocked_link: u32::MAX,
                detectors: [0u32; 4],
                head_type: 0,
            });
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
    }

    pub fn ensure_chunk_capacity(&mut self, count: usize) {
        if self.chunks.len() < count {
            self.chunks.resize_with(count, || Chunk { flags: 0 });
        }
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
        let is_in_cycle = (node.flags & FLAG_IS_IN_CYCLE) != 0;
        let head_type = self.cold_nodes[node_idx as usize].head_type;

        if is_in_cycle && head_type == CYCLE_HEAD_TYPE_NONE {
            let cold = &self.cold_nodes[node_idx as usize];
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
        node.signal
    }

    pub fn add_cycle(&mut self, cycle_idx: u32, length: u32) {
        let idx = cycle_idx as usize;
        if idx >= self.cycles.len() {
            self.cycles.resize_with(idx + 1, || None);
        }
        if self.cycles[idx].is_none() {
            self.cycles[idx] = Some(CycleState::new(cycle_idx, length));
        }
    }

    pub fn remove_cycle(&mut self, cycle_idx: u32) {
        let idx = cycle_idx as usize;
        if idx < self.cycles.len() {
            self.cycles[idx] = None;
        }
    }

    #[inline(always)]
    pub fn mark_node_as_changed(&mut self, node_idx: u32) {
        let node = &mut self.nodes[node_idx as usize];
        if node.flags & FLAG_IS_CHANGED != 0 {
            return;
        }
        node.flags |= FLAG_IS_CHANGED;
        self.temp_changed_nodes.push(node_idx);
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
            (node.links, node.links_count as usize)
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
        let need = self.nodes.len();
        if self.temp_changed_nodes.capacity() < need {
            let len = self.temp_changed_nodes.len();
            self.temp_changed_nodes.reserve(need.saturating_sub(len));
        }

        if self.has_external_marks {
            self.clear_external_marks();
        }

        let changed_nodes_ptr = self.changed_nodes.as_ptr();
        let nodes_ptr = self.nodes.as_mut_ptr();
        let cold_nodes_ptr = self.cold_nodes.as_mut_ptr();
        let len = self.changed_nodes.len();

        let temp_ptr = self.temp_changed_nodes.as_mut_ptr();
        let mut temp_len = 0usize;

        for i in 0..len {
            let node_idx = unsafe { *changed_nodes_ptr.add(i) };

            let node = unsafe { &mut *nodes_ptr.add(node_idx as usize) };

            let signal = node.signal;
            let flags = node.flags;

            let is_cycle_head = (flags & FLAG_IS_CYCLE_HEAD) != 0;

            if is_cycle_head {
                let cold = unsafe { &*cold_nodes_ptr.add(node_idx as usize) };
                let cycle_head_type = cold.head_type;
                let blocked_count = node.blocked_count;
                let is_active = signal == NODE_SIGNAL_ACTIVE;

                if !is_active && (blocked_count == 0 || cycle_head_type != CYCLE_HEAD_TYPE_CLEAR) {
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
                        cycle_state.write_bit(self.tick, cycle_offset);
                    }
                    CYCLE_HEAD_TYPE_XOR_WRITE => {
                        cycle_state.xor_bit(self.tick, cycle_offset);
                    }
                    CYCLE_HEAD_TYPE_CLEAR => {
                        cycle_state.clear_bit(self.tick, cycle_offset);
                    }
                    _ => {}
                }

                if node.flags & FLAG_IS_CHANGED == 0 {
                    node.flags |= FLAG_IS_CHANGED;
                    unsafe {
                        *temp_ptr.add(temp_len) = node_idx;
                        temp_len += 1;
                    }
                }
                continue;
            }

            let last_signal = node.last_signal;
            let is_changed = last_signal != signal;
            let node_type = node.type_id();

            if is_changed {
                let is_active = signal == NODE_SIGNAL_ACTIVE;
                let delta = if is_active { 1u8 } else { 255u8 };
                let is_delayed = (node_type == NODE_TYPE_DELAY && signal == NODE_SIGNAL_PENDING)
                    || (!is_active && last_signal == NODE_SIGNAL_PENDING);

                if !is_delayed {
                    let links_count = node.links_count as usize;

                    if links_count != 0 {
                        let links = &node.links;
                        let is_blocker = node_type == NODE_TYPE_BLOCKER;
                        if is_blocker {
                            let cold = unsafe { &*cold_nodes_ptr.add(node_idx as usize) };
                            let blocked_link_idx = cold.blocked_link;
                            for k in 0..links_count {
                                let edge_idx = links[k] as usize;
                                let edge = unsafe { &mut *nodes_ptr.add(edge_idx) };
                                if edge_idx as u32 == blocked_link_idx {
                                    edge.blocked_count = edge.blocked_count.wrapping_add(delta);
                                } else {
                                    edge.signals_count = edge.signals_count.wrapping_add(delta);
                                }
                                if edge.flags & FLAG_IS_CHANGED == 0 {
                                    edge.flags |= FLAG_IS_CHANGED;
                                    unsafe {
                                        *temp_ptr.add(temp_len) = edge_idx as u32;
                                        temp_len += 1;
                                    }
                                }
                            }
                        } else {
                            for k in 0..links_count {
                                let edge_idx = links[k] as usize;
                                let edge = unsafe { &mut *nodes_ptr.add(edge_idx) };
                                edge.signals_count = edge.signals_count.wrapping_add(delta);

                                if edge.flags & FLAG_IS_CHANGED == 0 {
                                    edge.flags |= FLAG_IS_CHANGED;
                                    unsafe {
                                        *temp_ptr.add(temp_len) = edge_idx as u32;
                                        temp_len += 1;
                                    }
                                }
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
                        if detector.flags & FLAG_IS_CHANGED == 0 {
                            detector.flags |= FLAG_IS_CHANGED;
                            unsafe {
                                *temp_ptr.add(temp_len) = detector_idx as u32;
                                temp_len += 1;
                            }
                        }
                    } else {
                        for k in 0..detectors_count {
                            let detector_idx = detectors[k] as usize;
                            let detector = unsafe { &mut *nodes_ptr.add(detector_idx) };
                            detector.signals_count = sig_count;
                            if detector.flags & FLAG_IS_CHANGED == 0 {
                                detector.flags |= FLAG_IS_CHANGED;
                                unsafe {
                                    *temp_ptr.add(temp_len) = detector_idx as u32;
                                    temp_len += 1;
                                }
                            }
                        }
                    }
                }

                node.last_signal = signal;
            }

            let should_requeue = if (flags & REQUEUE_FLAGS) != 0 {
                (flags & FLAG_IS_UPDATED) != 0
                    || (is_changed && (flags & FLAG_IS_ADDITIONAL_UPDATE) != 0)
                    || ((flags & FLAG_IS_READ_HEAD) != 0 && node.signals_count > 0)
                    || (self.tick == 0 && (flags & FLAG_IS_ENTRY_POINT) != 0)
            } else if ((REQUEUE_TYPES >> (node_type as u32 & 63)) & 1) != 0 {
                (node_type == NODE_TYPE_RANDOM && node.signals_count > 0)
                    || (signal != NODE_SIGNAL_NONE && node.signals_count == 0)
            } else {
                false
            };

            if should_requeue {
                node.flags &= !FLAG_IS_UPDATED;
                if node.flags & FLAG_IS_CHANGED == 0 {
                    node.flags |= FLAG_IS_CHANGED;
                    unsafe {
                        *temp_ptr.add(temp_len) = node_idx;
                        temp_len += 1;
                    }
                }
            }
        }

        unsafe {
            self.temp_changed_nodes.set_len(temp_len);
        }

        std::mem::swap(&mut self.changed_nodes, &mut self.temp_changed_nodes);

        let changed_nodes_ptr = self.changed_nodes.as_ptr();
        let len = self.changed_nodes.len();

        for i in 0..len {
            let node_idx = unsafe { *changed_nodes_ptr.add(i) };
            let node_ptr = unsafe { nodes_ptr.add(node_idx as usize) };
            let node = unsafe { &mut *node_ptr };
            let mut signal = self.update_node_signal(node_idx, node_ptr as *const Node);
            if node.blocked_count > 0 {
                signal = NODE_SIGNAL_NONE;
            }

            node.signal = signal;
            node.flags &= !FLAG_IS_CHANGED;
        }

        self.temp_changed_nodes.clear();
        self.tick += 1;
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
    fn update_node_signal(&self, node_idx: u32, node_ptr: *const Node) -> u8 {
        let node = unsafe { &*node_ptr };
        let signals_count = node.signals_count;
        let flags = node.flags;

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
                let cycle_active = cycle_state.get_bit(self.tick, cycle_offset);
                return if cycle_active {
                    NODE_SIGNAL_ACTIVE
                } else {
                    NODE_SIGNAL_NONE
                };
            }
            return node.signal;
        }

        let node_type = node.type_id();

        if node_type == NODE_TYPE_RANDOM {
            return if signals_count > 0
                && random_bool(self.seed, node.pos_hash, self.tick)
            {
                NODE_SIGNAL_ACTIVE
            } else {
                NODE_SIGNAL_NONE
            };
        }

        let lut_index = ((node.node_type as usize) << 7)
            | ((node.signal as usize) << 5)
            | (signals_count as usize);
        unsafe { *STATE_LUT.get_unchecked(lut_index) }
    }

    pub fn full_node_state_calculate(&mut self, node_idx: u32) {
        let node_type = self.nodes[node_idx as usize].type_id();
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
            let head_type = self.cold_nodes[back_idx as usize].head_type;
            let is_bypassed_head = head_type != CYCLE_HEAD_TYPE_NONE
                && head_type != CYCLE_HEAD_TYPE_READ;

            if is_bypassed_head {
                continue;
            }

            let back_last_signal = back_node.last_signal;
            if back_last_signal == NODE_SIGNAL_ACTIVE {
                let is_blocker = back_node.type_id() == NODE_TYPE_BLOCKER;
                let blocked_link = self.cold_nodes[back_idx as usize].blocked_link;
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
        n.flags |= FLAG_IS_UPDATED;

        self.mark_node_as_changed_non_temp(node_idx);
        self.mark_node_as_changed(node_idx);
    }

    pub fn on_cycle_build(
        &mut self,
        cycle_idx: u32,
        cycle_length: u32,
        cycle_nodes: &[u32],
        cycle_heads: &[u32],
    ) {
        self.add_cycle(cycle_idx, cycle_length);

        for &node_idx in cycle_nodes {
            let (cycle_offset, chunk_idx, is_active) = {
                let node = &self.nodes[node_idx as usize];
                let cold = &self.cold_nodes[node_idx as usize];
                (
                    cold.cycle_offset,
                    node.chunk_idx,
                    node.signal == NODE_SIGNAL_ACTIVE,
                )
            };

            if is_active {
                if let Some(ref mut cycle_state) = self.cycles[cycle_idx as usize] {
                    cycle_state.write_bit(self.tick, cycle_offset);
                }
            }

            let node = &mut self.nodes[node_idx as usize];
            node.signal = NODE_SIGNAL_NONE;
            node.last_signal = NODE_SIGNAL_NONE;
            self.make_dirty_chunk(chunk_idx);
        }

        let mut removed: HashSet<u32> = HashSet::new();

        for &node_idx in cycle_nodes {
            let head_type = self.cold_nodes[node_idx as usize].head_type;
            let is_head = head_type != CYCLE_HEAD_TYPE_NONE && head_type != CYCLE_HEAD_TYPE_READ;

            if is_head {
                self.mark_node_as_changed_non_temp(node_idx);
                self.mark_node_as_changed(node_idx);
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
                self.mark_node_as_changed(head_idx);
            }
        }

        let mut affected_nodes = HashSet::new();
        for &node_idx in cycle_nodes {
            affected_nodes.insert(node_idx);
            let node = &self.nodes[node_idx as usize];
            let count = node.links_count as usize;
            let links = &node.links[..count];
            for &link_idx in links {
                affected_nodes.insert(link_idx);
            }
        }
        for &head_idx in cycle_heads {
            affected_nodes.insert(head_idx);
            let node = &self.nodes[head_idx as usize];
            let count = node.links_count as usize;
            let links = &node.links[..count];
            for &link_idx in links {
                affected_nodes.insert(link_idx);
            }
        }

        for affected_idx in affected_nodes {
            self.full_node_state_calculate(affected_idx);
        }
    }

    pub fn on_cycle_dismantle(&mut self, cycle_idx: u32, cycle_nodes: &[u32], cycle_heads: &[u32]) {
        for &node_idx in cycle_nodes {
            let (cycle_offset, chunk_idx, is_active) = {
                let node = &self.nodes[node_idx as usize];
                let cold = &self.cold_nodes[node_idx as usize];
                let active = if let Some(ref cycle_state) = self.cycles[cycle_idx as usize] {
                    cycle_state.get_bit(self.tick, cold.cycle_offset)
                } else {
                    false
                };
                (cold.cycle_offset, node.chunk_idx, active)
            };
            let _ = cycle_offset;

            let has_cycle_state = self.cycles[cycle_idx as usize].is_some();
            let node = &mut self.nodes[node_idx as usize];
            if has_cycle_state {
                if is_active {
                    node.signal = NODE_SIGNAL_ACTIVE;
                    node.last_signal = NODE_SIGNAL_ACTIVE;
                } else {
                    if node.signal != NODE_SIGNAL_ACTIVE {
                        node.signal = NODE_SIGNAL_NONE;
                    }
                    node.last_signal = node.signal;
                }
            }

            self.cold_nodes[node_idx as usize].cycle_offset = 0;
            node.flags |= FLAG_IS_UPDATED;

            self.make_dirty_chunk(chunk_idx);
            self.mark_node_as_changed_non_temp(node_idx);
            self.mark_node_as_changed(node_idx);
        }

        let mut affected_nodes = HashSet::new();
        for &node_idx in cycle_nodes {
            affected_nodes.insert(node_idx);
            let node = &self.nodes[node_idx as usize];
            let count = node.links_count as usize;
            let links = &node.links[..count];
            for &link_idx in links {
                affected_nodes.insert(link_idx);
            }
        }
        for &head_idx in cycle_heads {
            affected_nodes.insert(head_idx);
            let node = &self.nodes[head_idx as usize];
            let count = node.links_count as usize;
            let links = &node.links[..count];
            for &link_idx in links {
                affected_nodes.insert(link_idx);
            }
        }

        for affected_idx in affected_nodes {
            self.full_node_state_calculate(affected_idx);
        }

        self.remove_cycle(cycle_idx);
    }
}
