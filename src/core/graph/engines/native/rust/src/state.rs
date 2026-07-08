use crate::chunk::Chunk;
use crate::consts::*;
use crate::cycle::CycleState;
use crate::node::Node;
use crate::rng::{random_bool, reset_rng};
use std::collections::HashSet;

pub struct GraphState {
    pub nodes: Vec<Node>,
    pub chunks: Vec<Chunk>,
    pub changed_nodes: Vec<u32>,
    pub temp_changed_nodes: Vec<u32>,
    pub cycles: Vec<Option<CycleState>>,
    pub tick: u32,
    pub break_point: bool,
    pub break_point_node: u32,
    pub back_links: Vec<Vec<u32>>,
    pub detected_links: Vec<Option<u32>>,
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

impl GraphState {
    pub fn new() -> Self {
        GraphState {
            nodes: Vec::with_capacity(4096),
            chunks: Vec::with_capacity(16),
            changed_nodes: Vec::with_capacity(4096),
            temp_changed_nodes: Vec::with_capacity(4096),
            cycles: Vec::with_capacity(64),
            tick: 0,
            break_point: false,
            break_point_node: 0,
            back_links: vec![Vec::new(); 4096],
            detected_links: vec![None; 4096],
        }
    }

    pub fn clear(&mut self) {
        self.nodes.clear();
        self.chunks.clear();
        self.changed_nodes.clear();
        self.temp_changed_nodes.clear();
        self.cycles.clear();
        self.tick = 0;
        self.break_point = false;
        // reset_rng(new_state);
    }

    pub fn ensure_node_capacity(&mut self, count: usize) {
        if self.nodes.len() < count {
            self.nodes.resize_with(count, || Node {
                packed_type: 0,
                flags: 0,
                signal: 0,
                last_signal: 0,
                signals_count: 0,
                blocked_count: 0,
                links_count: 0,
                detectors_count: 0,

                chunk_idx: 0,
                cycle_idx: 0,
                cycle_offset: 0,

                links: [0u32; 4],
                detectors: [0u32; 4],
            });
            self.back_links.resize(count, Vec::new());
            self.detected_links.resize(count, None);
        }
    }

    pub fn ensure_chunk_capacity(&mut self, count: usize) {
        if self.chunks.len() < count {
            self.chunks.resize_with(count, || Chunk { flags: 0 });
        }
    }

    #[inline(always)]
    pub fn make_dirty_chunk(&mut self, chunk_idx: u32) {
        self.ensure_chunk_capacity((chunk_idx + 1) as usize);
        self.chunks[chunk_idx as usize].flags |= CHUNK_FLAG_IS_DIRTY;
    }

    #[inline(always)]
    pub fn make_undirty_chunk(&mut self, chunk_idx: u32) {
        self.ensure_chunk_capacity((chunk_idx + 1) as usize);
        self.chunks[chunk_idx as usize].flags &= !CHUNK_FLAG_IS_DIRTY;
    }

    pub fn get_node_signal(&self, node_idx: u32) -> u8 {
        if node_idx as usize >= self.nodes.len() {
            return NODE_SIGNAL_NONE;
        }
        let node = &self.nodes[node_idx as usize];
        let is_in_cycle = (node.flags & FLAG_IS_IN_CYCLE) != 0;
        let head_type = node.head_type();

        if is_in_cycle && head_type == CYCLE_HEAD_TYPE_NONE {
            let cycle_idx = node.cycle_idx;
            let cycle_offset = node.cycle_offset;
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
        if (node.flags & FLAG_IS_CHANGED) != 0 {
            return;
        }
        node.flags |= FLAG_IS_CHANGED;
        self.temp_changed_nodes.push(node_idx);
    }

    #[inline(always)]
    pub unsafe fn mark_node_as_changed_fast(
        nodes_ptr: *mut Node,
        temp_changed_nodes: &mut Vec<u32>,
        node_idx: usize,
    ) {
        let node = &mut *nodes_ptr.add(node_idx);

        if node.flags & FLAG_IS_CHANGED == 0 {
            node.flags |= FLAG_IS_CHANGED;
            temp_changed_nodes.push(node_idx as u32);
        }
    }

    #[inline(always)]
    pub fn mark_node_as_changed_non_temp(&mut self, node_idx: u32) {
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

    pub fn update_state(&mut self) {
        let changed_nodes_ptr = self.changed_nodes.as_ptr();
        let nodes_ptr = self.nodes.as_mut_ptr();
        let len = self.changed_nodes.len();

        for i in 0..len {
            let node_idx = unsafe { *changed_nodes_ptr.add(i) };

            let node = unsafe { &mut *nodes_ptr.add(node_idx as usize) };

            let signal = node.signal;
            let flags = node.flags;

            let is_cycle_head = (flags & FLAG_IS_CYCLE_HEAD) != 0;

            if is_cycle_head {
                let blocked_count = node.blocked_count;
                let is_active = signal == NODE_SIGNAL_ACTIVE;

                if !is_active && (blocked_count == 0 || node.head_type() != CYCLE_HEAD_TYPE_CLEAR) {
                    continue;
                }

                let cycle_head_type = node.head_type();

                let cycle_idx = node.cycle_idx;
                let cycle_offset = node.cycle_offset;

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

                unsafe {
                    GraphState::mark_node_as_changed_fast(
                        nodes_ptr,
                        &mut self.temp_changed_nodes,
                        node_idx as usize,
                    );
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
                    let links = &node.links;
                    let links_count = node.links_count as usize;

                    let is_blocker = node_type == NODE_TYPE_BLOCKER;
                    if is_blocker && links_count == 1 {
                        let edge_idx = links[0] as usize;
                        let edge = unsafe { &mut *nodes_ptr.add(edge_idx as usize) };
                        edge.blocked_count = edge.blocked_count.wrapping_add(delta);
                        unsafe {
                            GraphState::mark_node_as_changed_fast(
                                nodes_ptr,
                                &mut self.temp_changed_nodes,
                                edge_idx as usize,
                            );
                        }
                    } else {
                        for i in 0..links_count {
                            let edge_idx = links[i] as usize;
                            let edge = unsafe { &mut *nodes_ptr.add(edge_idx as usize) };
                            edge.signals_count = edge.signals_count.wrapping_add(delta);
                            unsafe {
                                GraphState::mark_node_as_changed_fast(
                                    nodes_ptr,
                                    &mut self.temp_changed_nodes,
                                    edge_idx as usize,
                                );
                            }
                        }
                    }
                }

                let detectors_count = node.detectors_count as usize;

                if detectors_count != 0 {
                    let detectors = &node.detectors;

                    let sig_count = (signal != NODE_SIGNAL_NONE) as u8;

                    if detectors_count == 1 {
                        let detector_idx = unsafe { *detectors.get_unchecked(0) } as usize;
                        let detector = unsafe { &mut *nodes_ptr.add(detector_idx as usize) };
                        detector.signals_count = sig_count;
                        self.mark_node_as_changed_internal(detector_idx as u32);
                    } else {
                        for i in 0..detectors_count {
                            let detector_idx = detectors[i] as usize;
                            let detector = unsafe { &mut *nodes_ptr.add(detector_idx as usize) };
                            detector.signals_count = sig_count;
                            self.mark_node_as_changed_internal(detector_idx as u32);
                        }
                    }
                }

                node.last_signal = signal;
            }

            let signals_count = node.signals_count;
            if (flags & FLAG_IS_UPDATED) != 0
                || (is_changed && (flags & FLAG_IS_ADDITIONAL_UPDATE) != 0)
                || (signal != NODE_SIGNAL_NONE
                    && signals_count == 0
                    && (node_type == NODE_TYPE_BUTTON || node_type == NODE_TYPE_DIRECTIONAL_BUTTON))
                || (signals_count > 0
                    && (node_type == NODE_TYPE_RANDOM || (flags & FLAG_IS_READ_HEAD) != 0))
                || (self.tick == 0 && (flags & FLAG_IS_ENTRY_POINT) != 0)
            {
                node.flags &= !FLAG_IS_UPDATED;
                self.mark_node_as_changed(node_idx);
            }
        }

        std::mem::swap(&mut self.changed_nodes, &mut self.temp_changed_nodes);

        let changed_nodes_ptr = self.changed_nodes.as_ptr();
        let len = self.changed_nodes.len();

        for i in 0..len {
            let node_idx = unsafe { *changed_nodes_ptr.add(i) };
            let node_ptr = unsafe { nodes_ptr.add(node_idx as usize) };
            let node = unsafe { &mut *node_ptr };

            node.flags &= !FLAG_IS_CHANGED;

            let blocked_count = node.blocked_count;
            if blocked_count > 0 {
                node.signal = NODE_SIGNAL_NONE;
                let chunk_idx = node.chunk_idx;
                self.make_dirty_chunk(chunk_idx);
            } else {
                let signal = self.update_node_signal(node_ptr as *const Node);
                if signal != NODE_SIGNAL_KEEP_SIGNAL {
                    node.signal = signal;
                    let chunk_idx = node.chunk_idx;
                    self.make_dirty_chunk(chunk_idx);
                    let flags = node.flags;
                    let is_breakpoint = (flags & FLAG_IS_BREAKPOINT) != 0;
                    if signal == NODE_SIGNAL_ACTIVE && is_breakpoint {
                        self.break_point = true;
                        self.break_point_node = node_idx;
                    }
                }
            }
        }

        self.temp_changed_nodes.clear();
        self.tick += 1;
    }

    #[inline(always)]
    fn update_node_signal(&self, node_ptr: *const Node) -> u8 {
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

            let cycle_idx = node.cycle_idx;
            let cycle_offset = node.cycle_offset;

            if let Some(ref cycle_state) = self.cycles[cycle_idx as usize] {
                let cycle_active = cycle_state.get_bit(self.tick, cycle_offset);
                return if cycle_active {
                    NODE_SIGNAL_ACTIVE
                } else {
                    NODE_SIGNAL_NONE
                };
            }
            return NODE_SIGNAL_KEEP_SIGNAL;
        }

        let node_type = node.type_id();
        match node_type {
            NODE_TYPE_PATH
            | NODE_TYPE_BLOCKER
            | NODE_TYPE_DETECTOR
            | NODE_TYPE_DIRECTIONAL_BUTTON => {
                if signals_count > 0 {
                    NODE_SIGNAL_ACTIVE
                } else {
                    NODE_SIGNAL_NONE
                }
            }
            NODE_TYPE_SOURCE => NODE_SIGNAL_ACTIVE,
            NODE_TYPE_DELAY => {
                let signal = node.signal;
                if signal == NODE_SIGNAL_PENDING {
                    NODE_SIGNAL_ACTIVE
                } else if signals_count > 0 {
                    if signal == NODE_SIGNAL_NONE {
                        NODE_SIGNAL_PENDING
                    } else {
                        NODE_SIGNAL_KEEP_SIGNAL
                    }
                } else {
                    NODE_SIGNAL_NONE
                }
            }
            NODE_TYPE_IMPULSE => {
                let signal = node.signal;
                if signal == NODE_SIGNAL_NONE {
                    NODE_SIGNAL_ACTIVE
                } else {
                    NODE_SIGNAL_PENDING
                }
            }
            NODE_TYPE_LOGIC_NOT => {
                if signals_count == 0 {
                    NODE_SIGNAL_ACTIVE
                } else {
                    NODE_SIGNAL_NONE
                }
            }
            NODE_TYPE_LOGIC_AND => {
                if signals_count > 1 {
                    NODE_SIGNAL_ACTIVE
                } else {
                    NODE_SIGNAL_NONE
                }
            }
            NODE_TYPE_LOGIC_XOR => {
                if signals_count & 1 == 1 {
                    NODE_SIGNAL_ACTIVE
                } else {
                    NODE_SIGNAL_NONE
                }
            }
            NODE_TYPE_LATCH => {
                if signals_count > 1 {
                    NODE_SIGNAL_ACTIVE
                } else if signals_count == 1 {
                    NODE_SIGNAL_NONE
                } else {
                    NODE_SIGNAL_KEEP_SIGNAL
                }
            }
            NODE_TYPE_FLIP_FLOP => {
                if signals_count > 0 {
                    let signal = node.signal;
                    if signal == NODE_SIGNAL_ACTIVE {
                        NODE_SIGNAL_NONE
                    } else {
                        NODE_SIGNAL_ACTIVE
                    }
                } else {
                    NODE_SIGNAL_KEEP_SIGNAL
                }
            }
            NODE_TYPE_RANDOM => {
                if signals_count > 0 && random_bool() {
                    NODE_SIGNAL_ACTIVE
                } else {
                    NODE_SIGNAL_NONE
                }
            }
            NODE_TYPE_BUTTON => NODE_SIGNAL_NONE,
            _ => NODE_SIGNAL_NONE,
        }
    }

    #[inline(always)]
    fn mark_node_as_changed_internal(&mut self, node_idx: u32) {
        self.mark_node_as_changed(node_idx);
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
        } else {
            let back_links = &self.back_links[node_idx as usize];

            for &back_idx in back_links {
                let back_node = &self.nodes[back_idx as usize];
                let is_bypassed_head = back_node.head_type() != CYCLE_HEAD_TYPE_NONE
                    && back_node.head_type() != CYCLE_HEAD_TYPE_READ;

                if is_bypassed_head {
                    continue;
                }

                let back_last_signal = back_node.last_signal;
                if back_last_signal == NODE_SIGNAL_ACTIVE {
                    let is_blocker = back_node.type_id() == NODE_TYPE_BLOCKER;
                    if is_blocker {
                        blocked_count += 1;
                    } else {
                        signals_count += 1;
                    }
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
                (
                    node.cycle_offset,
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

        for &node_idx in cycle_nodes {
            let node = &self.nodes[node_idx as usize];
            let is_head = node.head_type() != CYCLE_HEAD_TYPE_NONE
                && node.head_type() != CYCLE_HEAD_TYPE_READ;

            if !is_head {
                let is_changed = (node.flags & FLAG_IS_CHANGED) != 0;
                if is_changed {
                    self.changed_nodes.retain(|&x| x != node_idx);
                    self.temp_changed_nodes.retain(|&x| x != node_idx);
                    self.nodes[node_idx as usize].flags &= !FLAG_IS_CHANGED;
                }
            } else {
                self.mark_node_as_changed_non_temp(node_idx);
                self.mark_node_as_changed(node_idx);
            }
        }

        for &head_idx in cycle_heads {
            let head_node = &self.nodes[head_idx as usize];
            if head_node.cycle_idx == cycle_idx {
                continue;
            }

            if head_node.head_type() != CYCLE_HEAD_TYPE_NONE {
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
                let active = if let Some(ref cycle_state) = self.cycles[cycle_idx as usize] {
                    cycle_state.get_bit(self.tick, node.cycle_offset)
                } else {
                    false
                };
                (node.cycle_offset, node.chunk_idx, active)
            };

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

            node.cycle_offset = 0;
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

    pub fn update_node_change(&mut self, node_idx: u32, old_links: &[u32], new_links: &[u32]) {
        let mut all_nodes = HashSet::new();
        for &idx in old_links {
            all_nodes.insert(idx);
        }
        for &idx in new_links {
            all_nodes.insert(idx);
        }

        self.full_node_state_calculate(node_idx);
        for idx in all_nodes {
            self.full_node_state_calculate(idx);
        }
    }
}
