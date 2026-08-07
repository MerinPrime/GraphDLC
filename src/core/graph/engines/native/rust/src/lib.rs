#![allow(static_mut_refs, dead_code, unused_variables)]

pub mod chunk;
pub mod consts;
pub mod cycle;
pub mod node;
pub mod rng;
pub mod serialization;
pub mod state;

use consts::*;
use serialization::{deserialize_state, serialize_state};
use state::get_state;

use crate::rng::reset_rng;

static mut STAGING_BUFFER: [u32; 1048576] = [0; 1048576];
static mut SERIALIZED_BUFFER: Vec<u8> = Vec::new();

#[no_mangle]
pub extern "C" fn get_staging_buffer_ptr() -> *mut u32 {
    unsafe { STAGING_BUFFER.as_mut_ptr() }
}

#[no_mangle]
pub extern "C" fn init(rng_state: u64) {
    let state = get_state();
    state.clear();
    reset_rng(rng_state);
}

#[no_mangle]
pub extern "C" fn clear(rng_state: u64) {
    init(rng_state);
}

#[no_mangle]
pub extern "C" fn reset_node_signal(node_idx: u32) {
    let state = get_state();
    state.ensure_node_capacity((node_idx + 1) as usize);

    let node = &mut state.nodes[node_idx as usize];
    node.signal = NODE_SIGNAL_NONE;
    node.last_signal = NODE_SIGNAL_NONE;
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
    blocked_link: i32,
) {
    let state = get_state();
    state.ensure_node_capacity((node_idx + 1) as usize);

    let mut links = [0u32; 4];
    let mut detectors = [0u32; 4];
    let safe_links_count = (links_count as usize).min(4);
    let safe_detectors_count = (detectors_count as usize).min(4);

    unsafe {
        let ptr = STAGING_BUFFER.as_ptr();
        for i in 0..safe_links_count {
            links[i] = *ptr.add(i);
        }
        for i in 0..safe_detectors_count {
            detectors[i] = *ptr.add(links_count as usize + i);
        }
    }

    state.update_node_back_links(node_idx, &links[..safe_links_count]);

    let existing_flags = state.nodes[node_idx as usize].flags;
    let mut flags = existing_flags & (FLAG_IS_UPDATED | FLAG_IS_CHANGED);

    let node = &mut state.nodes[node_idx as usize];
    node.set_type_id(node_type);

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
        node.set_head_type(head_type);
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
        node.set_head_type(CYCLE_HEAD_TYPE_NONE);
    }

    node.chunk_idx = chunk_idx;
    state.detected_links[node_idx as usize] = if detected_link >= 0 {
        Some(detected_link as u32)
    } else {
        None
    };

    node.blocked_link = if blocked_link >= 0 {
        blocked_link as u32
    } else {
        u32::MAX
    };

    node.links = links;
    node.links_count = safe_links_count as u8;
    node.detectors = detectors;
    node.detectors_count = safe_detectors_count as u8;

    node.flags = flags;

    state.mark_node_as_changed_non_temp(node_idx);
}

#[no_mangle]
pub extern "C" fn ensure_node_capacity_export(count: u32) {
    get_state().ensure_node_capacity(count as usize);
}

#[no_mangle]
pub extern "C" fn ensure_chunk_capacity_export(count: u32) {
    get_state().ensure_chunk_capacity(count as usize);
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
pub extern "C" fn run_tick() -> bool {
    let state = get_state();
    state.update_state();
    return state.break_point;
}

#[no_mangle]
pub extern "C" fn run_many_ticks(count: u32) -> bool {
    let state = get_state();
    for _ in 0..count {
        state.update_state();
        if state.break_point {
            return state.break_point;
        }
    }
    return false;
}

#[no_mangle]
pub extern "C" fn get_tick() -> u32 {
    get_state().tick
}

#[no_mangle]
pub extern "C" fn get_breakpoint(do_reset: bool) -> i32 {
    let state = get_state();
    let old = state.break_point;
    if old {
        state.break_point = !do_reset;
        state.break_point_node as i32
    } else {
        -1
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
    get_state().make_dirty_chunk(chunk_idx);
}

#[no_mangle]
pub extern "C" fn mark_all_chunks_dirty() {
    let state = get_state();
    state.chunks.iter_mut().for_each(|chunk| {
        chunk.flags |= CHUNK_FLAG_IS_DIRTY;
    });
}

#[no_mangle]
pub extern "C" fn make_undirty_chunk_export(chunk_idx: u32) {
    get_state().make_undirty_chunk(chunk_idx);
}

#[no_mangle]
pub extern "C" fn get_node_signal_export(node_idx: u32) -> u8 {
    get_state().get_node_signal(node_idx)
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
pub extern "C" fn set_node_signal_export(node_idx: u32, signal: u8) {
    let state = get_state();
    let node = &mut state.nodes[node_idx as usize];
    node.signal = signal;
    let chunk_idx = node.chunk_idx;

    state.mark_node_as_changed_non_temp(node_idx);
    state.mark_node_as_changed(node_idx);
    state.make_dirty_chunk(chunk_idx);
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

    state.mark_node_as_changed(node_idx);
    state.mark_node_as_changed_non_temp(node_idx);
    state.make_dirty_chunk(chunk_idx);
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

    get_state().on_cycle_build(cycle_idx, cycle_length, &cycle_nodes, &cycle_heads);
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

    get_state().on_cycle_dismantle(cycle_idx, &cycle_nodes, &cycle_heads);
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

    get_state().update_node_change(node_idx, &old_links, &new_links);
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
