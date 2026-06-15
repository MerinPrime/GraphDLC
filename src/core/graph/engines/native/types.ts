export interface RustEngineExports extends WebAssembly.Exports {
    get_staging_buffer_ptr(): number;
    init(): void;
    clear(): void;
    update_node_state(
        node_idx: number,
        node_type: number,
        is_entry_point: number,
        is_additional_update: number,
        is_breakpoint: number,
        cycle_idx: number,
        cycle_offset: number,
        head_type: number,
        chunk_idx: number,
        links_count: number,
        detectors_count: number,
        detected_link: number,
        reset_signal: number,
    ): void;
    ensure_node_capacity_export(count: number): void;
    ensure_chunk_capacity_export(count: number): void;
    reset_export(): void;
    run_tick(): void;
    run_many_ticks(count: number): void;
    get_tick(): number;
    reset_breakpoint(): number;
    is_changed(): number;
    make_dirty_chunk_export(chunk_idx: number): void;
    make_undirty_chunk_export(chunk_idx: number): void;
    get_node_signal_export(node_idx: number): number;
    get_dirty_chunks_count(): number;
    copy_dirty_chunks(out_ptr: number, mark_undirty: number): number;
    do_press_button_export(node_idx: number, button_state: number): void;
    on_cycle_build_export(
        cycle_idx: number,
        cycle_length: number,
        nodes_count: number,
        heads_count: number,
    ): void;
    on_cycle_dismantle_export(
        cycle_idx: number,
        nodes_count: number,
        heads_count: number,
    ): void;
    update_node_change_export(
        node_idx: number,
        old_links_count: number,
        new_links_count: number,
    ): void;
    serialize_state_export(): number;
    get_serialized_length(): number;
    deserialize_state_export(len: number): void;
}
