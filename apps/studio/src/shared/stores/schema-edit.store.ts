import type { ColumnInfoSchemaType } from "@peridotbase/sdk";
import { create } from "zustand";
import { onConnectionReset } from "@/shared/stores/connection-reset";
import { useOverlayStore } from "@/shared/stores/overlay.store";

export type EditingTableTarget = {
	tableName: string;
	schemaName: string | undefined;
};

export type DropColumnTarget = EditingTableTarget & {
	columnName: string;
};

type SchemaEditState = {
	editingColumn: ColumnInfoSchemaType | null;
	setEditingColumn: (column: ColumnInfoSchemaType | null) => void;
	editingTable: EditingTableTarget | null;
	setEditingTable: (table: EditingTableTarget | null) => void;
	dropColumn: DropColumnTarget | null;
	closeDropColumn: () => void;
};

export const useSchemaEditStore = create<SchemaEditState>()((set) => ({
	editingColumn: null,
	setEditingColumn: (column) => set({ editingColumn: column }),
	editingTable: null,
	setEditingTable: (table) => set({ editingTable: table }),
	dropColumn: null,
	closeDropColumn: () => set({ dropColumn: null }),
}));

/** Queues a column for the shell-level confirmation dialog. */
export const openDropColumn = (target: DropColumnTarget) => {
	useSchemaEditStore.setState({ dropColumn: target });
	useOverlayStore.getState().openOverlay("schema.drop-column");
};

onConnectionReset(() =>
	useSchemaEditStore.setState(useSchemaEditStore.getInitialState(), true),
);
