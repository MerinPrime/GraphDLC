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
    pub fn write_u8(&mut self, val: u8) {
        self.data.push(val);
    }
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
    pub fn read_u8(&mut self) -> u8 {
        let val = self.data[self.offset];
        self.offset += 1;
        val
    }
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

    let mut updated_nodes = Vec::new();
    for &node_idx in &state.changed_nodes {
        if (node_idx as usize) < state.nodes.len() {
            if (state.nodes[node_idx as usize].flags & FLAG_IS_UPDATED) != 0 {
                updated_nodes.push(node_idx);
            }
        }
    }
    let mut updated_temp_nodes = Vec::new();
    for &node_idx in &state.temp_changed_nodes {
        if (node_idx as usize) < state.nodes.len() {
            if (state.nodes[node_idx as usize].flags & FLAG_IS_UPDATED) != 0 {
                updated_temp_nodes.push(node_idx);
            }
        }
    }

    for node in &mut state.nodes {
        node.flags &= !FLAG_IS_CHANGED;
    }

    state.tick = restored_tick;
    state.break_point = restored_break_point;

    let nodes_len = reader.read_u32() as usize;
    state.ensure_node_capacity(nodes_len);
    for _ in 0..nodes_len {
        let node_idx = reader.read_u32() as usize;
        let signal = reader.read_u8();
        let last_signal = reader.read_u8();
        let signals_count = reader.read_u8();
        let blocked_count = reader.read_u8();

        state.nodes[node_idx].signal = signal;
        state.nodes[node_idx].last_signal = last_signal;
        state.nodes[node_idx].signals_count = signals_count;
        state.nodes[node_idx].blocked_count = blocked_count;
    }

    let chunks_len = reader.read_u32() as usize;
    state.ensure_chunk_capacity(chunks_len);
    for chunk_idx in 0..chunks_len {
        state.make_dirty_chunk(chunk_idx as u32);
    }

    state.changed_nodes.clear();
    state.temp_changed_nodes.clear();

    let mut visited_changed = HashSet::new();

    let snapshot_changed_len = reader.read_u32() as usize;
    for _ in 0..snapshot_changed_len {
        let node_idx = reader.read_u32();
        if visited_changed.insert(node_idx) {
            state.mark_node_as_changed_non_temp(node_idx);
        }
    }
    for node_idx in updated_nodes {
        if visited_changed.insert(node_idx) {
            state.mark_node_as_changed_non_temp(node_idx);
        }
    }

    visited_changed.clear();

    let snapshot_temp_changed_len = reader.read_u32() as usize;
    for _ in 0..snapshot_temp_changed_len {
        let node_idx = reader.read_u32();
        if visited_changed.insert(node_idx) {
            state.mark_node_as_changed(node_idx);
        }
    }
    for node_idx in updated_temp_nodes {
        if visited_changed.insert(node_idx) {
            state.mark_node_as_changed(node_idx);
        }
    }

    let cycles_len = reader.read_u32() as usize;
    for _ in 0..cycles_len {
        let cycle_idx = reader.read_u32() as usize;
        let length = reader.read_u32();
        let state_words_len = reader.read_u32() as usize;
        let mut state_words = Vec::new();
        for _ in 0..state_words_len {
            state_words.push(reader.read_u32());
        }

        if cycle_idx >= state.cycles.len() {
            state.cycles.resize_with(cycle_idx + 1, || None);
        }
        if state.cycles[cycle_idx].is_none() {
            state.cycles[cycle_idx] = Some(CycleState::new(cycle_idx as u32, length));
        }
        if let Some(ref mut cycle_state) = state.cycles[cycle_idx] {
            if cycle_state.length == length {
                cycle_state.state.copy_from_slice(&state_words);
            }
        }
    }
}
