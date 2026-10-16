export interface RustEngineExports extends WebAssembly.Exports {
    readonly memory: WebAssembly.Memory;

    get_staging_buffer_ptr(): number;
    init(): void;
    clear(): void;
    set_seed(seed: number): void;
    reset_node_signal(node_idx: number): void;
    register_chunk_export(chunk_idx: number, x: number, y: number): void;
    update_node_state(
        node_idx: number,
        pos_hash: number,
        node_type: number,
        is_entry_point: number,
        is_additional_update: number,
        cycle_idx: number,
        cycle_offset: number,
        head_type: number,
        chunk_idx: number,
        local_idx: number,
        links_count: number,
        detectors_count: number,
        detected_link: number,
        blocked_link: number,
    ): void;
    set_node_breakpoint(node_idx: number, is_breakpoint: boolean): void;
    ensure_node_capacity_export(count: number): void;
    ensure_chunk_capacity_export(count: number): void;
    reset_export(): void;
    run_tick(): boolean;
    run_many_ticks(count: number): boolean;
    get_tick(): number;
    get_breakpoint(do_reset: boolean): number;
    is_changed(): number;
    mark_all_chunks_dirty(): void;
    make_dirty_chunk_export(chunk_idx: number): void;
    make_undirty_chunk_export(chunk_idx: number): void;
    get_node_signal_export(node_idx: number): number;
    get_nodes_signals_bulk_export(count: number): void;
    get_chunks_signals_bulk_export(chunks_count: number): void;
    get_dirty_chunks_count(): number;
    copy_dirty_chunks(out_ptr: number, mark_undirty: number): number;
    copy_dirty_chunks_in_viewport(
        out_ptr: number,
        mark_undirty: number,
        min_x: number,
        min_y: number,
        max_x: number,
        max_y: number,
    ): number;
    set_node_signal_export(node_idx: number, signal: number): void;
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
