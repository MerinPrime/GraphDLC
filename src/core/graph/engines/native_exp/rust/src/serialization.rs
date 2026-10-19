use crate::consts::*;
use crate::cycle::CycleState;
use crate::state::GraphState;
use std::collections::HashSet;

pub struct BufferWriter {
    pub data: Vec<u8>,
}

impl BufferWriter {
    pub fn new() -> Self {
        BufferWriter { data: Vec::new() }
    }

    #[inline(always)]
    pub fn write_u8(&mut self, val: u8) {
        self.data.push(val);
    }

    #[inline(always)]
    pub fn write_u32(&mut self, val: u32) {
        self.data.extend_from_slice(&val.to_le_bytes());
    }
}

pub struct BufferReader<'a> {
    pub data: &'a [u8],
    pub offset: usize,
}

impl<'a> BufferReader<'a> {
    pub fn new(data: &'a [u8]) -> Self {
        BufferReader { data, offset: 0 }
    }

    #[inline(always)]
    pub fn read_u8(&mut self) -> u8 {
        let val = self.data[self.offset];
        self.offset += 1;
        val
    }

    #[inline(always)]
    pub fn read_u32(&mut self) -> u32 {
        let bytes = [
            self.data[self.offset],
            self.data[self.offset + 1],
            self.data[self.offset + 2],
            self.data[self.offset + 3],
        ];
        self.offset += 4;
        u32::from_le_bytes(bytes)
    }
}

pub fn serialize_state(state: &GraphState) -> Vec<u8> {
    let mut writer = BufferWriter::new();

    writer.write_u32(state.tick);
    writer.write_u8(if state.break_point { 1 } else { 0 });
    writer.write_u32(state.break_point_node);

    writer.write_u32(state.nodes.len() as u32);
    for (i, node) in state.nodes.iter().enumerate() {
        writer.write_u32(i as u32);
        writer.write_u8(node.signal);
        writer.write_u8(node.last_signal);
        writer.write_u8(node.signals_count);
        writer.write_u8(node.blocked_count);
    }

    writer.write_u32(state.chunks.len() as u32);

    writer.write_u32(state.changed_nodes.len() as u32);
    for &idx in &state.changed_nodes {
        writer.write_u32(idx);
    }

    writer.write_u32(state.temp_changed_nodes.len() as u32);
    for &idx in &state.temp_changed_nodes {
        writer.write_u32(idx);
    }

    let mut active_cycles = Vec::new();
    for (idx, cycle) in state.cycles.iter().enumerate() {
        if let Some(ref c) = cycle {
            active_cycles.push((idx as u32, c));
        }
    }

    writer.write_u32(active_cycles.len() as u32);
    for (idx, c) in active_cycles {
        writer.write_u32(idx);
        writer.write_u32(c.length);
        writer.write_u32(c.state.len() as u32);
        for &word in &c.state {
            writer.write_u32(word);
        }
    }

    writer.data
}

pub fn deserialize_state(state: &mut GraphState, data: &[u8]) {
    let mut reader = BufferReader::new(data);

    let restored_tick = reader.read_u32();
    let restored_break_point = reader.read_u8() != 0;
    let restored_break_point_node = reader.read_u32();

    state.tick = restored_tick;
    state.break_point = restored_break_point;
    state.break_point_node = restored_break_point_node;

    for node in &mut state.nodes {
        node.flags &= !FLAG_IS_CHANGED;
    }

    let nodes_len = reader.read_u32() as usize;
    state.ensure_node_capacity(nodes_len);

    for _ in 0..nodes_len {
        let node_idx = reader.read_u32() as usize;
        let signal = reader.read_u8();
        let last_signal = reader.read_u8();
        let signals_count = reader.read_u8();
        let blocked_count = reader.read_u8();

        if node_idx < state.nodes.len() {
            let node = &mut state.nodes[node_idx];
            node.signal = signal;
            node.last_signal = last_signal;
            node.signals_count = signals_count;
            node.blocked_count = blocked_count;
            if blocked_count > 0 {
                node.flags |= FLAG_IS_BLOCKED;
            } else {
                node.flags &= !FLAG_IS_BLOCKED;
            }
        }
    }

    let current_nodes_len = state.nodes.len();
    if current_nodes_len > nodes_len {
        for idx in nodes_len..current_nodes_len {
            let node = &mut state.nodes[idx];
            node.signal = NODE_SIGNAL_NONE;
            node.last_signal = NODE_SIGNAL_NONE;
            node.signals_count = 0;
            node.blocked_count = 0;
            node.flags &= !FLAG_IS_BLOCKED;
        }

        for idx in nodes_len..current_nodes_len {
            state.full_node_state_calculate(idx as u32);
        }
    }

    let chunks_len = reader.read_u32() as usize;
    state.ensure_chunk_capacity(chunks_len);
    for chunk_idx in 0..state.chunks.len() {
        state.make_dirty_chunk(chunk_idx as u32);
    }

    state.changed_nodes.clear();
    state.temp_changed_nodes.clear();
    state.in_changed_list.fill(0);
    state.has_external_marks = false;

    let mut visited_changed = HashSet::new();

    let snapshot_changed_len = reader.read_u32() as usize;
    for _ in 0..snapshot_changed_len {
        let node_idx = reader.read_u32();
        if (node_idx as usize) < state.nodes.len() && visited_changed.insert(node_idx) {
            let node = &mut state.nodes[node_idx as usize];
            if node.signal == node.last_signal {
                node.flags |= FLAG_IS_UPDATED;
            }
            state.mark_node_as_changed_non_temp(node_idx);
        }
    }

    let snapshot_temp_changed_len = reader.read_u32() as usize;
    for _ in 0..snapshot_temp_changed_len {
        let node_idx = reader.read_u32();
        if (node_idx as usize) < state.nodes.len() && visited_changed.insert(node_idx) {
            let node = &mut state.nodes[node_idx as usize];
            if node.signal == node.last_signal {
                node.flags |= FLAG_IS_UPDATED;
            }
            state.mark_node_as_changed_non_temp(node_idx);
        }
    }

    if restored_tick == 0 {
        for i in 0..state.nodes.len() {
            let node = &state.nodes[i];
            let t = node.type_id();
            let is_entry = (node.flags & FLAG_IS_ENTRY_POINT) != 0;

            if t == NODE_TYPE_SOURCE || t == NODE_TYPE_IMPULSE || is_entry {
                let node_mut = &mut state.nodes[i];
                node_mut.flags |= FLAG_IS_UPDATED;
                state.mark_node_as_changed_non_temp(i as u32);
            }
        }
    }

    for cycle in &mut state.cycles {
        *cycle = None;
    }

    let cycles_len = reader.read_u32() as usize;
    for _ in 0..cycles_len {
        let cycle_idx = reader.read_u32() as usize;
        let length = reader.read_u32();
        let state_words_len = reader.read_u32() as usize;
        let mut state_words = Vec::with_capacity(state_words_len);
        for _ in 0..state_words_len {
            state_words.push(reader.read_u32());
        }

        if cycle_idx >= state.cycles.len() {
            state.cycles.resize_with(cycle_idx + 1, || None);
        }

        let mut cycle_state = CycleState::new(cycle_idx as u32, length);
        let copy_len = state_words.len().min(cycle_state.state.len());
        cycle_state.state[..copy_len].copy_from_slice(&state_words[..copy_len]);
        state.cycles[cycle_idx] = Some(cycle_state);
    }

    let mut valid_active_cycles = HashSet::new();
    for i in 0..state.nodes.len() {
        let cold = &state.cold_nodes[i];
        if cold.is_in_cycle {
            valid_active_cycles.insert(cold.cycle_idx);
        }
    }

    for idx in 0..state.cycles.len() {
        if !valid_active_cycles.contains(&(idx as u32)) {
            state.cycles[idx] = None;
        }
    }

    for &active_cycle_idx in &valid_active_cycles {
        let idx = active_cycle_idx as usize;
        if idx >= state.cycles.len() {
            state.cycles.resize_with(idx + 1, || None);
        }
        if state.cycles[idx].is_none() {
            state.cycles[idx] = Some(CycleState::new(active_cycle_idx, 64));
        }
    }

    state.has_cycles = state.cycles.iter().any(|c| c.is_some());
    state.has_blockers = state.nodes.iter().any(|n| n.type_id() == NODE_TYPE_BLOCKER);
}
