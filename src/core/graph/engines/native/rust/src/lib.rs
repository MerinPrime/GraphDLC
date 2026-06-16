#![allow(static_mut_refs, dead_code, unused_variables)]

const FLAG_IS_ENTRY_POINT: u8 = 1 << 0;
const FLAG_IS_ADDITIONAL_UPDATE: u8 = 1 << 1;
const FLAG_IS_BREAKPOINT: u8 = 1 << 2;
const FLAG_IS_UPDATED: u8 = 1 << 3;
const FLAG_IS_CHANGED: u8 = 1 << 4;
const FLAG_IS_READ_HEAD: u8 = 1 << 5;
const FLAG_IS_CYCLE_HEAD: u8 = 1 << 6;
const FLAG_IS_IN_CYCLE: u8 = 1 << 7;

const NODE_TYPE_EMPTY: u8 = 0;
const NODE_TYPE_PATH: u8 = 1;
const NODE_TYPE_SOURCE: u8 = 2;
const NODE_TYPE_BLOCKER: u8 = 3;
const NODE_TYPE_DELAY: u8 = 4;
const NODE_TYPE_DETECTOR: u8 = 5;
const NODE_TYPE_IMPULSE: u8 = 6;
const NODE_TYPE_LOGIC_NOT: u8 = 7;
const NODE_TYPE_LOGIC_AND: u8 = 8;
const NODE_TYPE_LOGIC_XOR: u8 = 9;
const NODE_TYPE_LATCH: u8 = 10;
const NODE_TYPE_FLIP_FLOP: u8 = 11;
const NODE_TYPE_RANDOM: u8 = 12;
const NODE_TYPE_BUTTON: u8 = 13;
const NODE_TYPE_DIRECTIONAL_BUTTON: u8 = 14;

const NODE_SIGNAL_NONE: u8 = 0;
const NODE_SIGNAL_ACTIVE: u8 = 1;
const NODE_SIGNAL_PENDING: u8 = 2;
const NODE_SIGNAL_KEEP_SIGNAL: u8 = 3;

const CYCLE_HEAD_TYPE_NONE: u8 = 0;
const CYCLE_HEAD_TYPE_READ: u8 = 1;
const CYCLE_HEAD_TYPE_WRITE: u8 = 2;
const CYCLE_HEAD_TYPE_XOR_WRITE: u8 = 3;
const CYCLE_HEAD_TYPE_CLEAR: u8 = 4;

const CHUNK_FLAG_IS_DIRTY: u8 = 1 << 0;

static mut RNG_STATE: u64 = 123456789;

fn next_random() -> f64 {
    unsafe {
        RNG_STATE = RNG_STATE
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1442695040888963407);

        let val = (RNG_STATE >> 11) & 0x1F_FFFF_FFFF_FFFF;

        (val as f64) / 9007199254740992.0
    }
}

struct CycleState {
    cycle_idx: u32,
    length: u32,
    state: Vec<u32>,
}

impl CycleState {
    fn new(cycle_idx: u32, length: u32) -> Self {
        let num_words = (length + 31) / 32;
        CycleState {
            cycle_idx,
            length,
            state: vec![0; num_words as usize],
        }
    }

    fn clear(&mut self) {
        self.state.fill(0);
    }

    fn get_bit_pos(&self, tick: u32, offset: u32) -> (usize, u32) {
        let pos = (tick + offset) % self.length;
        ((pos >> 5) as usize, 1 << (pos & 31))
    }

    fn get_bit(&self, tick: u32, offset: u32) -> bool {
        let (word, mask) = self.get_bit_pos(tick, offset);
        (self.state[word] & mask) != 0
    }

    fn write_bit(&mut self, tick: u32, offset: u32) {
        let (word, mask) = self.get_bit_pos(tick, offset);
        self.state[word] |= mask;
    }

    fn clear_bit(&mut self, tick: u32, offset: u32) {
        let (word, mask) = self.get_bit_pos(tick, offset);
        self.state[word] &= !mask;
    }

    fn xor_bit(&mut self, tick: u32, offset: u32) {
        let (word, mask) = self.get_bit_pos(tick, offset);
        self.state[word] ^= mask;
    }
}

struct Node {
    node_type: u8,
    flags: u8,
    signal: u8,
    last_signal: u8,
    signals_count: u8,
    blocked_count: u8,
    head_type: u8,
    chunk_idx: u32,
    cycle_idx: u32,
    cycle_offset: u32,
    detected_link: Option<u32>,
    links: Vec<u32>,
    detectors: Vec<u32>,
    back_links: Vec<u32>,
}

struct Chunk {
    flags: u8,
}

pub struct GraphState {
    nodes: Vec<Node>,
    chunks: Vec<Chunk>,
    changed_nodes: Vec<u32>,
    temp_changed_nodes: Vec<u32>,
    cycles: Vec<Option<CycleState>>,
    tick: u32,
    break_point: bool,
}

static mut STATE: Option<GraphState> = None;
static mut STAGING_BUFFER: [u32; 1048576] = [0; 1048576];
static mut SERIALIZED_BUFFER: Vec<u8> = Vec::new();

fn get_state() -> &'static mut GraphState {
    unsafe {
        if STATE.is_none() {
            STATE = Some(GraphState {
                nodes: Vec::with_capacity(4096),
                chunks: Vec::with_capacity(16),
                changed_nodes: Vec::with_capacity(4096),
                temp_changed_nodes: Vec::with_capacity(4096),
                cycles: Vec::with_capacity(64),
                tick: 0,
                break_point: false,
            });
        }
        STATE.as_mut().unwrap()
    }
}

#[no_mangle]
pub extern "C" fn get_staging_buffer_ptr() -> *mut u32 {
    unsafe { STAGING_BUFFER.as_mut_ptr() }
}

#[no_mangle]
pub extern "C" fn init() {
    let state = get_state();
    state.nodes.clear();
    state.chunks.clear();
    state.changed_nodes.clear();
    state.temp_changed_nodes.clear();
    state.cycles.clear();
    state.tick = 0;
    state.break_point = false;
    unsafe {
        RNG_STATE = 123456789;
    }
}

#[no_mangle]
pub extern "C" fn clear() {
    init();
}

fn ensure_node_capacity(state: &mut GraphState, count: usize) {
    if state.nodes.len() < count {
        state.nodes.resize_with(count, || Node {
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

fn ensure_chunk_capacity(state: &mut GraphState, count: usize) {
    if state.chunks.len() < count {
        state.chunks.resize_with(count, || Chunk { flags: 0 });
    }
}

fn make_dirty_chunk(state: &mut GraphState, chunk_idx: u32) {
    ensure_chunk_capacity(state, (chunk_idx + 1) as usize);
    state.chunks[chunk_idx as usize].flags |= CHUNK_FLAG_IS_DIRTY;
}

fn make_undirty_chunk(state: &mut GraphState, chunk_idx: u32) {
    ensure_chunk_capacity(state, (chunk_idx + 1) as usize);
    state.chunks[chunk_idx as usize].flags &= !CHUNK_FLAG_IS_DIRTY;
}

fn get_node_signal(state: &GraphState, node_idx: u32) -> u8 {
    if node_idx as usize >= state.nodes.len() {
        return NODE_SIGNAL_NONE;
    }
    let node = &state.nodes[node_idx as usize];
    let is_in_cycle = (node.flags & FLAG_IS_IN_CYCLE) != 0;
    let head_type = node.head_type;

    if is_in_cycle && head_type == CYCLE_HEAD_TYPE_NONE {
        let cycle_idx = node.cycle_idx;
        let cycle_offset = node.cycle_offset;
        if let Some(ref cycle_state) = state.cycles[cycle_idx as usize] {
            let is_active = cycle_state.get_bit(state.tick, cycle_offset);
            if is_active {
                return NODE_SIGNAL_ACTIVE;
            }
            return NODE_SIGNAL_NONE;
        }
        return NODE_SIGNAL_NONE;
    }
    node.signal
}

fn add_cycle(state: &mut GraphState, cycle_idx: u32, length: u32) {
    let idx = cycle_idx as usize;
    if idx >= state.cycles.len() {
        state.cycles.resize_with(idx + 1, || None);
    }
    if state.cycles[idx].is_none() {
        state.cycles[idx] = Some(CycleState::new(cycle_idx, length));
    }
}

fn remove_cycle(state: &mut GraphState, cycle_idx: u32) {
    let idx = cycle_idx as usize;
    if idx < state.cycles.len() {
        state.cycles[idx] = None;
    }
}

fn mark_node_as_changed(state: &mut GraphState, node_idx: u32) {
    let node = &mut state.nodes[node_idx as usize];
    if (node.flags & FLAG_IS_CHANGED) != 0 {
        return;
    }
    node.flags |= FLAG_IS_CHANGED;
    state.temp_changed_nodes.push(node_idx);
}

fn mark_node_as_changed_non_temp(state: &mut GraphState, node_idx: u32) {
    state.changed_nodes.push(node_idx);
}

fn update_node_back_links(state: &mut GraphState, node_idx: u32, new_links: &[u32]) {
    let old_links = if (node_idx as usize) < state.nodes.len() {
        let links = std::mem::take(&mut state.nodes[node_idx as usize].links);
        let ret = links.clone();
        state.nodes[node_idx as usize].links = links;
        ret
    } else {
        Vec::new()
    };

    for &target_idx in &old_links {
        if (target_idx as usize) < state.nodes.len() {
            state.nodes[target_idx as usize]
                .back_links
                .retain(|&x| x != node_idx);
        }
    }

    for &target_idx in new_links {
        ensure_node_capacity(state, (target_idx + 1) as usize);
        let back_links = &mut state.nodes[target_idx as usize].back_links;
        if !back_links.contains(&node_idx) {
            back_links.push(node_idx);
        }
    }
}

#[no_mangle]
pub extern "C" fn update_node_state(
    node_idx: u32,
    node_type: u8,
    is_entry_point: i32,
    is_additional_update: i32,
    is_breakpoint: i32,
    cycle_idx: i32,
    cycle_offset: u32,
    head_type: u8,
    chunk_idx: u32,
    links_count: u32,
    detectors_count: u32,
    detected_link: i32,
    reset_signal: i32,
) {
    let state = get_state();
    ensure_node_capacity(state, (node_idx + 1) as usize);

    let mut links = Vec::new();
    let mut detectors = Vec::new();
    unsafe {
        let ptr = STAGING_BUFFER.as_ptr();
        for i in 0..links_count {
            links.push(*ptr.add(i as usize));
        }
        for i in 0..detectors_count {
            detectors.push(*ptr.add((links_count + i) as usize));
        }
    }

    update_node_back_links(state, node_idx, &links);

    let existing_flags = state.nodes[node_idx as usize].flags;
    let mut flags = existing_flags & (FLAG_IS_UPDATED | FLAG_IS_CHANGED);

    let node = &mut state.nodes[node_idx as usize];
    node.node_type = node_type;

    if is_entry_point != 0 {
        flags |= FLAG_IS_ENTRY_POINT;
    }
    if is_additional_update != 0 {
        flags |= FLAG_IS_ADDITIONAL_UPDATE;
    }
    if is_breakpoint != 0 {
        flags |= FLAG_IS_BREAKPOINT;
    }

    if cycle_idx >= 0 {
        node.cycle_idx = cycle_idx as u32;
        node.cycle_offset = cycle_offset;
        node.head_type = head_type;
        if head_type != CYCLE_HEAD_TYPE_NONE && head_type != CYCLE_HEAD_TYPE_READ {
            flags |= FLAG_IS_CYCLE_HEAD;
        }
        flags |= FLAG_IS_IN_CYCLE;
        if head_type == CYCLE_HEAD_TYPE_READ {
            flags |= FLAG_IS_READ_HEAD;
        }
    } else {
        node.cycle_idx = 0;
        node.cycle_offset = 0;
        node.head_type = CYCLE_HEAD_TYPE_NONE;
    }

    node.chunk_idx = chunk_idx;
    node.detected_link = if detected_link >= 0 {
        Some(detected_link as u32)
    } else {
        None
    };
    node.links = links;
    node.detectors = detectors;

    if reset_signal != 0 {
        node.signal = NODE_SIGNAL_NONE;
        node.last_signal = NODE_SIGNAL_NONE;
    }

    node.flags = flags;

    mark_node_as_changed_non_temp(state, node_idx);
}

#[no_mangle]
pub extern "C" fn ensure_node_capacity_export(count: u32) {
    ensure_node_capacity(get_state(), count as usize);
}

#[no_mangle]
pub extern "C" fn ensure_chunk_capacity_export(count: u32) {
    ensure_chunk_capacity(get_state(), count as usize);
}

#[no_mangle]
pub extern "C" fn reset_export() {
    let state = get_state();
    state.changed_nodes.clear();
    state.temp_changed_nodes.clear();

    for node_idx in 0..state.nodes.len() {
        let node = &mut state.nodes[node_idx];
        node.signal = NODE_SIGNAL_NONE;
        node.last_signal = NODE_SIGNAL_NONE;
        node.signals_count = 0;
        node.blocked_count = 0;
        node.flags &= !FLAG_IS_CHANGED;
        node.flags &= !FLAG_IS_UPDATED;

        let is_entry_point = (node.flags & FLAG_IS_ENTRY_POINT) != 0;
        if is_entry_point {
            state.changed_nodes.push(node_idx as u32);
        }
    }

    for chunk_idx in 0..state.chunks.len() {
        state.chunks[chunk_idx].flags |= CHUNK_FLAG_IS_DIRTY;
    }

    for cycle in state.cycles.iter_mut() {
        if let Some(ref mut c) = cycle {
            c.clear();
        }
    }

    state.tick = 0;
}

#[no_mangle]
pub extern "C" fn run_tick() {
    update_state(get_state());
}

#[no_mangle]
pub extern "C" fn run_many_ticks(count: u32) {
    let state = get_state();
    for _ in 0..count {
        update_state(state);
    }
}

#[no_mangle]
pub extern "C" fn get_tick() -> u32 {
    get_state().tick
}

#[no_mangle]
pub extern "C" fn reset_breakpoint() -> i32 {
    let state = get_state();
    let old = state.break_point;
    state.break_point = false;
    if old {
        1
    } else {
        0
    }
}

#[no_mangle]
pub extern "C" fn is_changed() -> i32 {
    let state = get_state();
    if !state.changed_nodes.is_empty() {
        1
    } else {
        0
    }
}

#[no_mangle]
pub extern "C" fn make_dirty_chunk_export(chunk_idx: u32) {
    make_dirty_chunk(get_state(), chunk_idx);
}

#[no_mangle]
pub extern "C" fn make_undirty_chunk_export(chunk_idx: u32) {
    make_undirty_chunk(get_state(), chunk_idx);
}

#[no_mangle]
pub extern "C" fn get_node_signal_export(node_idx: u32) -> u8 {
    get_node_signal(get_state(), node_idx)
}

#[no_mangle]
pub extern "C" fn get_dirty_chunks_count() -> u32 {
    let state = get_state();
    let mut count = 0;
    for chunk in &state.chunks {
        if (chunk.flags & CHUNK_FLAG_IS_DIRTY) != 0 {
            count += 1;
        }
    }
    count
}

#[no_mangle]
pub extern "C" fn copy_dirty_chunks(out_ptr: *mut u32, mark_undirty: i32) -> u32 {
    let state = get_state();
    let mut offset = 0;
    for chunk_idx in 0..state.chunks.len() {
        if (state.chunks[chunk_idx].flags & CHUNK_FLAG_IS_DIRTY) != 0 {
            unsafe {
                *out_ptr.add(offset) = chunk_idx as u32;
            }
            offset += 1;
            if mark_undirty != 0 {
                state.chunks[chunk_idx].flags &= !CHUNK_FLAG_IS_DIRTY;
            }
        }
    }
    offset as u32
}

#[no_mangle]
pub extern "C" fn do_press_button_export(node_idx: u32, button_state: i32) {
    let new_signal = if button_state != 0 {
        NODE_SIGNAL_ACTIVE
    } else {
        NODE_SIGNAL_NONE
    };
    let state = get_state();
    let node = &mut state.nodes[node_idx as usize];
    node.signal = new_signal;
    let chunk_idx = node.chunk_idx;

    mark_node_as_changed(state, node_idx);
    mark_node_as_changed_non_temp(state, node_idx);
    make_dirty_chunk(state, chunk_idx);
}

#[no_mangle]
pub extern "C" fn on_cycle_build_export(
    cycle_idx: u32,
    cycle_length: u32,
    nodes_count: u32,
    heads_count: u32,
) {
    let mut cycle_nodes = Vec::new();
    let mut cycle_heads = Vec::new();

    unsafe {
        let ptr = STAGING_BUFFER.as_ptr();
        for i in 0..nodes_count {
            cycle_nodes.push(*ptr.add(i as usize));
        }
        for i in 0..heads_count {
            cycle_heads.push(*ptr.add((nodes_count + i) as usize));
        }
    }

    on_cycle_build(
        get_state(),
        cycle_idx,
        cycle_length,
        &cycle_nodes,
        &cycle_heads,
    );
}

#[no_mangle]
pub extern "C" fn on_cycle_dismantle_export(cycle_idx: u32, nodes_count: u32, heads_count: u32) {
    let mut cycle_nodes = Vec::new();
    let mut cycle_heads = Vec::new();

    unsafe {
        let ptr = STAGING_BUFFER.as_ptr();
        for i in 0..nodes_count {
            cycle_nodes.push(*ptr.add(i as usize));
        }
        for i in 0..heads_count {
            cycle_heads.push(*ptr.add((nodes_count + i) as usize));
        }
    }

    on_cycle_dismantle(get_state(), cycle_idx, &cycle_nodes, &cycle_heads);
}

#[no_mangle]
pub extern "C" fn update_node_change_export(
    node_idx: u32,
    old_links_count: u32,
    new_links_count: u32,
) {
    let mut old_links = Vec::new();
    let mut new_links = Vec::new();

    unsafe {
        let ptr = STAGING_BUFFER.as_ptr();
        for i in 0..old_links_count {
            old_links.push(*ptr.add(i as usize));
        }
        for i in 0..new_links_count {
            new_links.push(*ptr.add((old_links_count + i) as usize));
        }
    }

    update_node_change(get_state(), node_idx, &old_links, &new_links);
}

struct BufferWriter {
    data: Vec<u8>,
}

impl BufferWriter {
    fn new() -> Self {
        BufferWriter { data: Vec::new() }
    }
    fn write_u8(&mut self, val: u8) {
        self.data.push(val);
    }
    fn write_u32(&mut self, val: u32) {
        self.data.extend_from_slice(&val.to_le_bytes());
    }
}

struct BufferReader<'a> {
    data: &'a [u8],
    offset: usize,
}

impl<'a> BufferReader<'a> {
    fn new(data: &'a [u8]) -> Self {
        BufferReader { data, offset: 0 }
    }
    fn read_u8(&mut self) -> u8 {
        let val = self.data[self.offset];
        self.offset += 1;
        val
    }
    fn read_u32(&mut self) -> u32 {
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

fn serialize_state(state: &GraphState) -> Vec<u8> {
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

fn deserialize_state(state: &mut GraphState, data: &[u8]) {
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
    ensure_node_capacity(state, nodes_len);
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
    ensure_chunk_capacity(state, chunks_len);
    for chunk_idx in 0..chunks_len {
        make_dirty_chunk(state, chunk_idx as u32);
    }

    state.changed_nodes.clear();
    state.temp_changed_nodes.clear();

    let mut visited_changed = std::collections::HashSet::new();

    let snapshot_changed_len = reader.read_u32() as usize;
    for _ in 0..snapshot_changed_len {
        let node_idx = reader.read_u32();
        if visited_changed.insert(node_idx) {
            mark_node_as_changed_non_temp(state, node_idx);
        }
    }
    for node_idx in updated_nodes {
        if visited_changed.insert(node_idx) {
            mark_node_as_changed_non_temp(state, node_idx);
        }
    }

    visited_changed.clear();

    let snapshot_temp_changed_len = reader.read_u32() as usize;
    for _ in 0..snapshot_temp_changed_len {
        let node_idx = reader.read_u32();
        if visited_changed.insert(node_idx) {
            mark_node_as_changed(state, node_idx);
        }
    }
    for node_idx in updated_temp_nodes {
        if visited_changed.insert(node_idx) {
            mark_node_as_changed(state, node_idx);
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

#[no_mangle]
pub extern "C" fn serialize_state_export() -> *const u8 {
    let state = get_state();
    let bytes = serialize_state(state);
    unsafe {
        SERIALIZED_BUFFER = bytes;
        SERIALIZED_BUFFER.as_ptr()
    }
}

#[no_mangle]
pub extern "C" fn get_serialized_length() -> u32 {
    unsafe { SERIALIZED_BUFFER.len() as u32 }
}

#[no_mangle]
pub extern "C" fn deserialize_state_export(len: u32) {
    let state = get_state();
    unsafe {
        let ptr = STAGING_BUFFER.as_ptr() as *const u8;
        let data = std::slice::from_raw_parts(ptr, len as usize);
        deserialize_state(state, data);
    }
}

fn update_state(state: &mut GraphState) {
    for i in 0..state.changed_nodes.len() {
        let node_idx = state.changed_nodes[i];

        let (signal, last_signal, flags, node_type) = {
            let node = &state.nodes[node_idx as usize];
            (node.signal, node.last_signal, node.flags, node.node_type)
        };

        let is_active = signal == NODE_SIGNAL_ACTIVE;
        let is_changed = last_signal != signal;

        let is_blocker = node_type == NODE_TYPE_BLOCKER;
        let is_cycle_head = (flags & FLAG_IS_CYCLE_HEAD) != 0;

        if is_cycle_head {
            let blocked_count = state.nodes[node_idx as usize].blocked_count;
            let cycle_head_type = state.nodes[node_idx as usize].head_type;

            if !is_active && (cycle_head_type != CYCLE_HEAD_TYPE_CLEAR || blocked_count == 0) {
                continue;
            }

            let cycle_idx = state.nodes[node_idx as usize].cycle_idx;
            let cycle_offset = state.nodes[node_idx as usize].cycle_offset;

            if let Some(ref mut cycle_state) = state.cycles[cycle_idx as usize] {
                match cycle_head_type {
                    CYCLE_HEAD_TYPE_WRITE => {
                        cycle_state.write_bit(state.tick, cycle_offset);
                    }
                    CYCLE_HEAD_TYPE_XOR_WRITE => {
                        cycle_state.xor_bit(state.tick, cycle_offset);
                    }
                    CYCLE_HEAD_TYPE_CLEAR => {
                        cycle_state.clear_bit(state.tick, cycle_offset);
                    }
                    _ => {}
                }
            }
            mark_node_as_changed(state, node_idx);
            continue;
        }

        if is_changed {
            let delta = if is_active { 1i8 } else { -1i8 };
            let is_delayed = (node_type == NODE_TYPE_DELAY && signal == NODE_SIGNAL_PENDING)
                || (!is_active && last_signal == NODE_SIGNAL_PENDING);

            if !is_delayed {
                let links = std::mem::take(&mut state.nodes[node_idx as usize].links);
                for &edge_idx in &links {
                    let edge = &mut state.nodes[edge_idx as usize];
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
                    mark_node_as_changed_internal(state, edge_idx);
                }
                state.nodes[node_idx as usize].links = links;
            }

            let detectors = std::mem::take(&mut state.nodes[node_idx as usize].detectors);
            for &detector_idx in &detectors {
                let detector = &mut state.nodes[detector_idx as usize];
                detector.signals_count = if signal != NODE_SIGNAL_NONE { 1 } else { 0 };
                mark_node_as_changed_internal(state, detector_idx);
            }
            state.nodes[node_idx as usize].detectors = detectors;

            state.nodes[node_idx as usize].last_signal = signal;
        }

        let signals_count = state.nodes[node_idx as usize].signals_count;
        if (flags & FLAG_IS_UPDATED) != 0
            || (is_changed && (flags & FLAG_IS_ADDITIONAL_UPDATE) != 0)
            || (state.tick == 0 && (flags & FLAG_IS_ENTRY_POINT) != 0)
            || (signal != NODE_SIGNAL_NONE
                && signals_count == 0
                && (node_type == NODE_TYPE_BUTTON || node_type == NODE_TYPE_DIRECTIONAL_BUTTON))
            || (signals_count > 0
                && (node_type == NODE_TYPE_RANDOM || (flags & FLAG_IS_READ_HEAD) != 0))
        {
            state.nodes[node_idx as usize].flags &= !FLAG_IS_UPDATED;
            mark_node_as_changed(state, node_idx);
        }
    }

    std::mem::swap(&mut state.changed_nodes, &mut state.temp_changed_nodes);

    for i in 0..state.changed_nodes.len() {
        let node_idx = state.changed_nodes[i];
        state.nodes[node_idx as usize].flags &= !FLAG_IS_CHANGED;

        let blocked_count = state.nodes[node_idx as usize].blocked_count;
        if blocked_count > 0 {
            state.nodes[node_idx as usize].signal = NODE_SIGNAL_NONE;
            let chunk_idx = state.nodes[node_idx as usize].chunk_idx;
            make_dirty_chunk(state, chunk_idx);
        } else {
            let signal = update_node_signal(state, node_idx);
            if signal != NODE_SIGNAL_KEEP_SIGNAL {
                state.nodes[node_idx as usize].signal = signal;
                let chunk_idx = state.nodes[node_idx as usize].chunk_idx;
                make_dirty_chunk(state, chunk_idx);
                let flags = state.nodes[node_idx as usize].flags;
                let is_breakpoint = (flags & FLAG_IS_BREAKPOINT) != 0;
                if signal == NODE_SIGNAL_ACTIVE && is_breakpoint {
                    state.break_point = true;
                }
            }
        }
    }

    state.temp_changed_nodes.clear();
    state.tick += 1;
}

fn update_node_signal(state: &GraphState, node_idx: u32) -> u8 {
    let node = &state.nodes[node_idx as usize];
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

        if let Some(ref cycle_state) = state.cycles[cycle_idx as usize] {
            let cycle_active = cycle_state.get_bit(state.tick, cycle_offset);
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
        NODE_TYPE_PATH | NODE_TYPE_BLOCKER | NODE_TYPE_DETECTOR | NODE_TYPE_DIRECTIONAL_BUTTON => {
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
            if signals_count > 0 && next_random() > 0.5 {
                NODE_SIGNAL_ACTIVE
            } else {
                NODE_SIGNAL_NONE
            }
        }
        NODE_TYPE_BUTTON => NODE_SIGNAL_NONE,
        _ => NODE_SIGNAL_NONE,
    }
}

fn mark_node_as_changed_internal(state: &mut GraphState, node_idx: u32) {
    mark_node_as_changed(state, node_idx);
}

fn full_node_state_calculate(state: &mut GraphState, node_idx: u32) {
    let node_type = state.nodes[node_idx as usize].node_type;
    let is_detector = node_type == NODE_TYPE_DETECTOR;

    let mut signals_count = 0;
    let mut blocked_count = 0;

    if is_detector {
        if let Some(detected_idx) = state.nodes[node_idx as usize].detected_link {
            let detected_signal = state.nodes[detected_idx as usize].signal;
            signals_count = if detected_signal != NODE_SIGNAL_NONE {
                1
            } else {
                0
            };
        }
    } else {
        let back_links = std::mem::take(&mut state.nodes[node_idx as usize].back_links);
        for &back_idx in &back_links {
            let back_node = &state.nodes[back_idx as usize];
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
        state.nodes[node_idx as usize].back_links = back_links;
    }

    let n = &mut state.nodes[node_idx as usize];
    n.signals_count = signals_count;
    n.blocked_count = blocked_count;
    n.flags |= FLAG_IS_UPDATED;

    mark_node_as_changed_non_temp(state, node_idx);
    mark_node_as_changed(state, node_idx);
}

fn on_cycle_build(
    state: &mut GraphState,
    cycle_idx: u32,
    cycle_length: u32,
    cycle_nodes: &[u32],
    cycle_heads: &[u32],
) {
    add_cycle(state, cycle_idx, cycle_length);

    for &node_idx in cycle_nodes {
        let (cycle_offset, chunk_idx, is_active) = {
            let node = &state.nodes[node_idx as usize];
            (
                node.cycle_offset,
                node.chunk_idx,
                node.signal == NODE_SIGNAL_ACTIVE,
            )
        };

        if is_active {
            if let Some(ref mut cycle_state) = state.cycles[cycle_idx as usize] {
                cycle_state.write_bit(state.tick, cycle_offset);
            }
        }

        let node = &mut state.nodes[node_idx as usize];
        node.signal = NODE_SIGNAL_NONE;
        node.last_signal = NODE_SIGNAL_NONE;
        make_dirty_chunk(state, chunk_idx);
    }

    for &node_idx in cycle_nodes {
        let node = &state.nodes[node_idx as usize];
        let is_head =
            node.head_type != CYCLE_HEAD_TYPE_NONE && node.head_type != CYCLE_HEAD_TYPE_READ;

        if !is_head {
            let is_changed = (node.flags & FLAG_IS_CHANGED) != 0;
            if is_changed {
                state.changed_nodes.retain(|&x| x != node_idx);
                state.temp_changed_nodes.retain(|&x| x != node_idx);
                state.nodes[node_idx as usize].flags &= !FLAG_IS_CHANGED;
            }
        } else {
            mark_node_as_changed_non_temp(state, node_idx);
            mark_node_as_changed(state, node_idx);
        }
    }

    for &head_idx in cycle_heads {
        let head_node = &state.nodes[head_idx as usize];
        if head_node.cycle_idx == cycle_idx {
            continue;
        }

        if head_node.head_type != CYCLE_HEAD_TYPE_NONE {
            mark_node_as_changed_non_temp(state, head_idx);
            mark_node_as_changed(state, head_idx);
        }
    }

    let mut affected_nodes = std::collections::HashSet::new();
    for &node_idx in cycle_nodes {
        affected_nodes.insert(node_idx);
        let links = state.nodes[node_idx as usize].links.clone();
        for link_idx in links {
            affected_nodes.insert(link_idx);
        }
    }
    for &head_idx in cycle_heads {
        affected_nodes.insert(head_idx);
        let links = state.nodes[head_idx as usize].links.clone();
        for link_idx in links {
            affected_nodes.insert(link_idx);
        }
    }

    for affected_idx in affected_nodes {
        full_node_state_calculate(state, affected_idx);
    }
}

fn on_cycle_dismantle(
    state: &mut GraphState,
    cycle_idx: u32,
    cycle_nodes: &[u32],
    cycle_heads: &[u32],
) {
    for &node_idx in cycle_nodes {
        let (cycle_offset, chunk_idx, is_active) = {
            let node = &state.nodes[node_idx as usize];
            let active = if let Some(ref cycle_state) = state.cycles[cycle_idx as usize] {
                cycle_state.get_bit(state.tick, node.cycle_offset)
            } else {
                false
            };
            (node.cycle_offset, node.chunk_idx, active)
        };

        let has_cycle_state = state.cycles[cycle_idx as usize].is_some();
        let node = &mut state.nodes[node_idx as usize];
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

        make_dirty_chunk(state, chunk_idx);
        mark_node_as_changed_non_temp(state, node_idx);
        mark_node_as_changed(state, node_idx);
    }

    let mut affected_nodes = std::collections::HashSet::new();
    for &node_idx in cycle_nodes {
        affected_nodes.insert(node_idx);
        let links = state.nodes[node_idx as usize].links.clone();
        for link_idx in links {
            affected_nodes.insert(link_idx);
        }
    }
    for &head_idx in cycle_heads {
        affected_nodes.insert(head_idx);
        let links = state.nodes[head_idx as usize].links.clone();
        for link_idx in links {
            affected_nodes.insert(link_idx);
        }
    }

    for affected_idx in affected_nodes {
        full_node_state_calculate(state, affected_idx);
    }

    remove_cycle(state, cycle_idx);
}

fn update_node_change(state: &mut GraphState, node_idx: u32, old_links: &[u32], new_links: &[u32]) {
    let mut all_nodes = std::collections::HashSet::new();
    for &idx in old_links {
        all_nodes.insert(idx);
    }
    for &idx in new_links {
        all_nodes.insert(idx);
    }

    full_node_state_calculate(state, node_idx);
    for idx in all_nodes {
        full_node_state_calculate(state, idx);
    }
}
