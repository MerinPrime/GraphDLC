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
        reset_rng();
    }

    pub fn ensure_node_capacity(&mut self, count: usize) {
        if self.nodes.len() < count {
            self.nodes.resize_with(count, || Node {
                node_type: NODE_TYPE_EMPTY,
                flags: 0,
                signal: 0,
                last_signal: 0,
                signals_count: 0,
                blocked_count: 0,
                head_type: 0,
                chunk_idx: 0,
                cycle_idx: 0,
                cycle_offset: 0,
                detected_link: None,
                links: Vec::new(),
                detectors: Vec::new(),
                back_links: Vec::new(),
            });
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
        let head_type = node.head_type;

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
    pub fn mark_node_as_changed_non_temp(&mut self, node_idx: u32) {
        self.changed_nodes.push(node_idx);
    }

    pub fn update_node_back_links(&mut self, node_idx: u32, new_links: &[u32]) {
        let old_links = if (node_idx as usize) < self.nodes.len() {
            let links = std::mem::take(&mut self.nodes[node_idx as usize].links);
            let ret = links.clone();
            self.nodes[node_idx as usize].links = links;
            ret
        } else {
            Vec::new()
        };

        for &target_idx in &old_links {
            if (target_idx as usize) < self.nodes.len() {
                self.nodes[target_idx as usize]
                    .back_links
                    .retain(|&x| x != node_idx);
            }
        }

        for &target_idx in new_links {
            self.ensure_node_capacity((target_idx + 1) as usize);
            let back_links = &mut self.nodes[target_idx as usize].back_links;
            if !back_links.contains(&node_idx) {
                back_links.push(node_idx);
            }
        }
    }

    pub fn update_state(&mut self) {
        for i in 0..self.changed_nodes.len() {
            let node_idx = self.changed_nodes[i];

            let (signal, last_signal, flags, node_type) = {
                let node = &self.nodes[node_idx as usize];
                (node.signal, node.last_signal, node.flags, node.node_type)
            };

            let is_active = signal == NODE_SIGNAL_ACTIVE;
            let is_changed = last_signal != signal;

            let is_blocker = node_type == NODE_TYPE_BLOCKER;
            let is_cycle_head = (flags & FLAG_IS_CYCLE_HEAD) != 0;

            if is_cycle_head {
                let blocked_count = self.nodes[node_idx as usize].blocked_count;
                let cycle_head_type = self.nodes[node_idx as usize].head_type;

                if !is_active && (cycle_head_type != CYCLE_HEAD_TYPE_CLEAR || blocked_count == 0) {
                    continue;
                }

                let cycle_idx = self.nodes[node_idx as usize].cycle_idx;
                let cycle_offset = self.nodes[node_idx as usize].cycle_offset;

                if let Some(ref mut cycle_state) = self.cycles[cycle_idx as usize] {
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
                }
                self.mark_node_as_changed(node_idx);
                continue;
            }

            if is_changed {
                let delta = if is_active { 1i8 } else { -1i8 };
                let is_delayed = (node_type == NODE_TYPE_DELAY && signal == NODE_SIGNAL_PENDING)
                    || (!is_active && last_signal == NODE_SIGNAL_PENDING);

                if !is_delayed {
                    let links = std::mem::take(&mut self.nodes[node_idx as usize].links);
                    for &edge_idx in &links {
                        let edge = &mut self.nodes[edge_idx as usize];
                        if is_blocker {
                            if delta > 0 {
                                edge.blocked_count = edge.blocked_count.saturating_add(1);
                            } else {
                                edge.blocked_count = edge.blocked_count.saturating_sub(1);
                            }
                        } else {
                            if delta > 0 {
                                edge.signals_count = edge.signals_count.saturating_add(1);
                            } else {
                                edge.signals_count = edge.signals_count.saturating_sub(1);
                            }
                        }
                        self.mark_node_as_changed_internal(edge_idx);
                    }
                    self.nodes[node_idx as usize].links = links;
                }

                let detectors = std::mem::take(&mut self.nodes[node_idx as usize].detectors);
                for &detector_idx in &detectors {
                    let detector = &mut self.nodes[detector_idx as usize];
                    detector.signals_count = if signal != NODE_SIGNAL_NONE { 1 } else { 0 };
                    self.mark_node_as_changed_internal(detector_idx);
                }
                self.nodes[node_idx as usize].detectors = detectors;

                self.nodes[node_idx as usize].last_signal = signal;
            }

            let signals_count = self.nodes[node_idx as usize].signals_count;
            if (flags & FLAG_IS_UPDATED) != 0
                || (is_changed && (flags & FLAG_IS_ADDITIONAL_UPDATE) != 0)
                || (self.tick == 0 && (flags & FLAG_IS_ENTRY_POINT) != 0)
                || (signal != NODE_SIGNAL_NONE
                    && signals_count == 0
                    && (node_type == NODE_TYPE_BUTTON || node_type == NODE_TYPE_DIRECTIONAL_BUTTON))
                || (signals_count > 0
                    && (node_type == NODE_TYPE_RANDOM || (flags & FLAG_IS_READ_HEAD) != 0))
            {
                self.nodes[node_idx as usize].flags &= !FLAG_IS_UPDATED;
                self.mark_node_as_changed(node_idx);
            }
        }

        std::mem::swap(&mut self.changed_nodes, &mut self.temp_changed_nodes);

        for i in 0..self.changed_nodes.len() {
            let node_idx = self.changed_nodes[i];
            self.nodes[node_idx as usize].flags &= !FLAG_IS_CHANGED;

            let blocked_count = self.nodes[node_idx as usize].blocked_count;
            if blocked_count > 0 {
                self.nodes[node_idx as usize].signal = NODE_SIGNAL_NONE;
                let chunk_idx = self.nodes[node_idx as usize].chunk_idx;
                self.make_dirty_chunk(chunk_idx);
            } else {
                let signal = self.update_node_signal(node_idx);
                if signal != NODE_SIGNAL_KEEP_SIGNAL {
                    self.nodes[node_idx as usize].signal = signal;
                    let chunk_idx = self.nodes[node_idx as usize].chunk_idx;
                    self.make_dirty_chunk(chunk_idx);
                    let flags = self.nodes[node_idx as usize].flags;
                    let is_breakpoint = (flags & FLAG_IS_BREAKPOINT) != 0;
                    if signal == NODE_SIGNAL_ACTIVE && is_breakpoint {
                        self.break_point = true;
                    }
                }
            }
        }

        self.temp_changed_nodes.clear();
        self.tick += 1;
    }

    fn update_node_signal(&self, node_idx: u32) -> u8 {
        let node = &self.nodes[node_idx as usize];
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

        let node_type = node.node_type;
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
                if signals_count % 2 == 1 {
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
        let node_type = self.nodes[node_idx as usize].node_type;
        let is_detector = node_type == NODE_TYPE_DETECTOR;

        let mut signals_count = 0;
        let mut blocked_count = 0;

        if is_detector {
            if let Some(detected_idx) = self.nodes[node_idx as usize].detected_link {
                let detected_signal = self.nodes[detected_idx as usize].signal;
                signals_count = if detected_signal != NODE_SIGNAL_NONE {
                    1
                } else {
                    0
                };
            }
        } else {
            let back_links = std::mem::take(&mut self.nodes[node_idx as usize].back_links);
            for &back_idx in &back_links {
                let back_node = &self.nodes[back_idx as usize];
                let is_bypassed_head = back_node.head_type != CYCLE_HEAD_TYPE_NONE
                    && back_node.head_type != CYCLE_HEAD_TYPE_READ;

                if is_bypassed_head {
                    continue;
                }

                let back_last_signal = back_node.last_signal;
                if back_last_signal == NODE_SIGNAL_ACTIVE {
                    let is_blocker = back_node.node_type == NODE_TYPE_BLOCKER;
                    if is_blocker {
                        blocked_count += 1;
                    } else {
                        signals_count += 1;
                    }
                }
            }
            self.nodes[node_idx as usize].back_links = back_links;
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
            let is_head =
                node.head_type != CYCLE_HEAD_TYPE_NONE && node.head_type != CYCLE_HEAD_TYPE_READ;

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

            if head_node.head_type != CYCLE_HEAD_TYPE_NONE {
                self.mark_node_as_changed_non_temp(head_idx);
                self.mark_node_as_changed(head_idx);
            }
        }

        let mut affected_nodes = HashSet::new();
        for &node_idx in cycle_nodes {
            affected_nodes.insert(node_idx);
            let links = self.nodes[node_idx as usize].links.clone();
            for link_idx in links {
                affected_nodes.insert(link_idx);
            }
        }
        for &head_idx in cycle_heads {
            affected_nodes.insert(head_idx);
            let links = self.nodes[head_idx as usize].links.clone();
            for link_idx in links {
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
            let links = self.nodes[node_idx as usize].links.clone();
            for link_idx in links {
                affected_nodes.insert(link_idx);
            }
        }
        for &head_idx in cycle_heads {
            affected_nodes.insert(head_idx);
            let links = self.nodes[head_idx as usize].links.clone();
            for link_idx in links {
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
