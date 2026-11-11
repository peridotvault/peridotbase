import type { ColumnInfoSchemaType } from "@peridotbase/sdk";
import { create } from "zustand";
import { onConnectionReset } from "@/shared/stores/connection-reset";

type SchemaEditState = {
	editingColumn: ColumnInfoSchemaType | null;
	setEditingColumn: (column: ColumnInfoSchemaType | null) => void;
	editingTable: { tableName: string; schemaName: string | undefined } | null;
	setEditingTable: (table: SchemaEditState["editingTable"]) => void;
};

export const useSchemaEditStore = create<SchemaEditState>()((set) => ({
	editingColumn: null,
	setEditingColumn: (column) => set({ editingColumn: column }),
	editingTable: null,
	setEditingTable: (table) => set({ editingTable: table }),
}));

onConnectionReset(() =>
	useSchemaEditStore.setState(useSchemaEditStore.getInitialState(), true),
);
