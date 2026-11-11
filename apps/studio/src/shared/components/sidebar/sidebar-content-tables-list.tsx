import { ScrollArea } from "@peridotbase/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@peridotbase/ui/select";
import { useQueryState } from "nuqs";
import { useMemo } from "react";
import { SidebarListTables } from "@/shared/components/sidebar/sidebar-list-tables";
import { SidebarSearchTables } from "@/shared/components/sidebar/sidebar-search-tables";
import { useTablesList } from "@/shared/hooks/use-tables-list";
import { CONSTANTS } from "@/shared/utils/constants";

const SidebarSchemaDropdown = () => {
	const [selectedSchema, setSelectedSchema] = useQueryState(CONSTANTS.ACTIVE_SCHEMA, {
		defaultValue: CONSTANTS.ALL_SCHEMAS,
	});

	const { tablesList = [] } = useTablesList();

	const schemas = useMemo(
		() =>
			Array.from(
				new Set(
					tablesList.reduce<string[]>((acc, table) => {
						if (table.schemaName) acc.push(table.schemaName);

						return acc;
					}, []),
				),
			).sort(),
		[tablesList],
	);

	const showSchemaDropdown = schemas.length > 1;

	if (!showSchemaDropdown) return null;

	return (
		<div className="px-3 pt-3">
			<Select value={selectedSchema} onValueChange={setSelectedSchema}>
				<SelectTrigger variant="outline" className="h-8! w-full justify-between rounded-sm">
					<SelectValue placeholder="Select schema" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={CONSTANTS.ALL_SCHEMAS}>All schemas</SelectItem>
					{schemas.map((schema) => (
						<SelectItem key={schema} value={schema}>
							{schema}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
};

export const SidebarContentTablesList = () => {
	return (
		<>
			<SidebarSchemaDropdown />
			<SidebarSearchTables />
			{/* Radix wraps the list in a `display: table` div that widens to the longest name and pushes the row counts off-screen. */}
			<ScrollArea className="flex-1 overflow-y-auto pb-3 block h-full w-full [&_[data-slot=scroll-area-viewport]>div]:block!">
				<SidebarListTables />
			</ScrollArea>
		</>
	);
};
