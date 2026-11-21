import { Button } from "@peridotvault/peridotbase-ui/button";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "@peridotvault/peridotbase-ui/command";
import { Kbd } from "@peridotvault/peridotbase-ui/kbd";
import { useNavigate } from "@tanstack/react-router";
import {
	Brain,
	ChevronLeft,
	Code,
	Columns2,
	Copy,
	Database,
	Download,
	GitBranch,
	ListTree,
	MessageSquare,
	Moon,
	Pin,
	PinOff,
	Plus,
	RotateCw,
	Search,
	Settings,
	Sidebar,
	Sparkles,
	Sun,
	Table2,
	Upload,
} from "lucide-react";
import { askAssistant } from "@/shared/stores/assistant-request.store";
import { openAddRecord } from "@/shared/stores/add-record.store";
import { useCopyTableSchema } from "@/shared/hooks/use-copy-table-schema";
import { useExportFile } from "@/shared/hooks/use-export-file";
import { useTableSchemaName } from "@/shared/hooks/use-table-schema-name";
import { useStudioScope } from "@/shared/hooks/use-studio-scope";
import { useTablesList } from "@/shared/hooks/use-tables-list";
import { useTheme } from "@/shared/hooks/use-theme";
import { DATA_TABLE_PATH, DATA_TAB_PARAM } from "@/shared/lib/sections";
import { isMac } from "@/shared/lib/platform";
import { useOverlayStore } from "@/shared/stores/overlay.store";
import { usePersonalPreferencesStore } from "@/shared/stores/personal-preferences.store";
import { CONSTANTS } from "@/shared/utils/constants";
import { tableId } from "@/shared/utils/table-id";
import {
	NO_TABLE_HINT,
	useCommandPaletteCapabilities,
} from "./use-command-palette-capabilities";
import { useCommandPaletteState } from "./use-command-palette-state";

export function CommandPalette() {
	const navigate = useNavigate();
	const openSchema = useTableSchemaName();
	const scope = useStudioScope();
	const { openOverlay } = useOverlayStore();

	const {
		sidebar: { mode: sidebarMode },
		setSidebarMode,
	} = usePersonalPreferencesStore();

	const { toggleTheme, isDark } = useTheme();
	const { tablesList, isLoadingTablesList, errorTablesList } = useTablesList();
	const { exportFile, isExportingFile } = useExportFile();
	const { copyTableSchema, isCopyingSchema } = useCopyTableSchema();

	const {
		open,
		mode,
		inputValue,
		inputRef,
		handleOpenChange,
		handleAction,
		handleInputChange,
		handleKeyDown,
		switchToAllMode,
		switchToTablesMode,
	} = useCommandPaletteState();

	const {
		activeTable,
		activeTab,
		capabilities,
		canCreateTable,
		canEditRecords,
		recordsHint,
		canEditSchema,
		schemaHint,
		hasSection,
	} = useCommandPaletteCapabilities();

	const handleNavigateToTable = (tableName: string, schemaName: string | undefined) => {
		handleAction(() => {
			// Reset search params: sort/filter/cursor keys from the previous
			// table must not leak into the newly opened one.
			navigate({
				to: DATA_TABLE_PATH,
				params: { ...scope, table: tableName },
				search: { [CONSTANTS.TABLE_SCHEMA]: schemaName },
			});
		});
	};

	const placeholder =
		mode === "all" ? "Search commands... (type > for tables)" : "Search tables...";

	return (
		<CommandDialog open={open} onOpenChange={handleOpenChange} className="sm:max-w-lg">
			<div className="flex items-center border-b border-input px-2 gap-2 w-full">
				{mode === "tables" && (
					<Button
						type="button"
						variant="ghost"
						size="lg"
						onClick={switchToAllMode}
						aria-label="Back to all commands"
						className="shrink-0 bg-primary/10 text-primary hover:bg-primary/20"
					>
						<Table2 className="size-3.5" />
						<span>Tables</span>
						<ChevronLeft className="size-3 opacity-60" />
					</Button>
				)}
				<CommandInput
					ref={inputRef}
					placeholder={placeholder}
					value={inputValue}
					onValueChange={handleInputChange}
					onKeyDown={handleKeyDown}
					className="border-0 px-0"
				/>
			</div>
			<CommandList>
				<CommandEmpty>
					{mode === "tables" ? "No tables found." : "No results found."}
				</CommandEmpty>

				{mode === "tables" && !isLoadingTablesList && !errorTablesList && tablesList && (
					<CommandGroup heading="Tables">
						{tablesList.length === 0 ? (
							<div className="py-6 text-center text-sm text-muted-foreground">
								No tables in database
							</div>
						) : (
							tablesList.map((table) => (
								<CommandItem
									key={tableId(table)}
									value={tableId(table)}
									onSelect={() => handleNavigateToTable(table.tableName, table.schemaName)}
								>
									<Database className="size-4 text-primary" />
									<div className="flex flex-1 items-center justify-between">
										<span className="font-medium">{table.tableName}</span>
										<span className="text-xs text-muted-foreground">
											{table.rowCountEstimated && "~"}
											{table.rowCount} {table.rowCount === 1 ? "row" : "rows"}
										</span>
									</div>
								</CommandItem>
							))
						)}
					</CommandGroup>
				)}
				{mode === "tables" && isLoadingTablesList && (
					<div className="py-6 text-center text-sm text-muted-foreground">
						Loading tables...
					</div>
				)}
				{mode === "tables" && errorTablesList && (
					<div className="py-6 text-center text-sm text-muted-foreground">
						Failed to load tables.
					</div>
				)}

				{mode === "all" && (
					<>
						{hasSection("database") && (
							<>
								<CommandGroup heading="Quick Access">
									<CommandItem
										onSelect={switchToTablesMode}
										keywords={["tables", ">", "go to table"]}
										className="group"
									>
										<Search className="size-4 text-primary" />
										<div className="flex flex-1 items-center justify-between">
											<div className="flex flex-col">
												<span>Search Tables</span>
												<span className="text-xs text-muted-foreground">
													Navigate to any table quickly
												</span>
											</div>
											<CommandShortcut>&gt;</CommandShortcut>
										</div>
									</CommandItem>
								</CommandGroup>

								<CommandSeparator />
							</>
						)}

						<CommandGroup heading="Go to">
							{hasSection("database") && (
								<CommandItem
									onSelect={() =>
										handleAction(() =>
											navigate({
												to: "/studio/org/$organization/$project",
												params: scope,
											}),
										)
									}
									keywords={["go", "navigate", "home", "tables"]}
								>
									<Table2 className="size-4" />
									<div className="flex flex-col">
										<span>Go to Tables</span>
										<span className="text-xs text-muted-foreground">
											Open the tables overview
										</span>
									</div>
								</CommandItem>
							)}
							<CommandItem
								onSelect={() =>
									handleAction(() =>
										navigate({
											to: "/studio/org/$organization/$project/runner",
											params: scope,
										}),
									)
								}
								keywords={["go", "navigate", "sql", "query", "runner", "editor"]}
							>
								<Code className="size-4" />
								<div className="flex flex-col">
									<span>Go to Query Runner</span>
									<span className="text-xs text-muted-foreground">
										Write and execute queries
									</span>
								</div>
							</CommandItem>
							{capabilities.ddl && (
								<CommandItem
									disabled={!activeTable}
									onSelect={() => {
										if (!activeTable) return;
										const table = activeTable;
										handleAction(() =>
											navigate({
												to: DATA_TABLE_PATH,
												params: { ...scope, table },
												search: {
													[CONSTANTS.TABLE_SCHEMA]: openSchema,
													[DATA_TAB_PARAM]: "schema",
												},
											}),
										);
									}}
									keywords={["go", "navigate", "schema", "columns"]}
								>
									<GitBranch className="size-4" />
									<div className="flex flex-col">
										<span>Go to Schema</span>
										<span className="text-xs text-muted-foreground">
											{activeTable ? `View the schema of ${activeTable}` : NO_TABLE_HINT}
										</span>
									</div>
								</CommandItem>
							)}
							{capabilities.indexes && (
								<CommandItem
									disabled={!activeTable}
									onSelect={() => {
										if (!activeTable) return;
										const table = activeTable;
										handleAction(() =>
											navigate({
												to: DATA_TABLE_PATH,
												params: { ...scope, table },
												search: {
													[CONSTANTS.TABLE_SCHEMA]: openSchema,
													[DATA_TAB_PARAM]: "indexes",
												},
											}),
										);
									}}
									keywords={["go", "navigate", "indexes", "index"]}
								>
									<ListTree className="size-4" />
									<div className="flex flex-col">
										<span>Go to Indexes</span>
										<span className="text-xs text-muted-foreground">
											{activeTable ? `View the indexes of ${activeTable}` : NO_TABLE_HINT}
										</span>
									</div>
								</CommandItem>
							)}
						</CommandGroup>

						<CommandSeparator />

						<CommandGroup heading="AI Assistant">
							<CommandItem
								onSelect={() => handleAction(() => openOverlay("chat.assistant"))}
								keywords={["ai", "assistant", "chat", "help"]}
							>
								<MessageSquare className="size-4" />
								<div className="flex flex-col">
									<span>Chat with AI Assistant</span>
									<span className="text-xs text-muted-foreground">
										Ask questions about your database
									</span>
								</div>
							</CommandItem>
							<CommandItem
								onSelect={() =>
									handleAction(() =>
										askAssistant(
											"Generate a query for this database. Ask me for the goal if it is unclear.",
										),
									)
								}
								keywords={["ai", "generate", "sql", "query", "write"]}
							>
								<Sparkles className="size-4" />
								<div className="flex flex-col">
									<span>Generate SQL with AI</span>
									<span className="text-xs text-muted-foreground">
										Create queries using natural language
									</span>
								</div>
							</CommandItem>
							{capabilities.ddl && (
								<CommandItem
									disabled={!activeTable}
									onSelect={() => {
										if (!activeTable) return;
										const table = activeTable;
										handleAction(() =>
											askAssistant(
												`Explain the schema of table "${table}": what each column stores and how it relates to other tables.`,
											),
										);
									}}
									keywords={["ai", "explain", "schema", "table", "understand"]}
								>
									<Brain className="size-4" />
									<div className="flex flex-col">
										<span>Explain Table Schema</span>
										<span className="text-xs text-muted-foreground">
											{activeTable
												? `Understand the structure of ${activeTable} with AI`
												: NO_TABLE_HINT}
										</span>
									</div>
								</CommandItem>
							)}
						</CommandGroup>

						<CommandSeparator />

						<CommandGroup heading="Database Actions">
							{canCreateTable && (
								<CommandItem
									onSelect={() =>
										handleAction(() => openOverlay("table-builder.create-table"))
									}
									keywords={["create", "new", "table"]}
								>
									<Plus className="size-4" />
									<div className="flex flex-col">
										<span>Create New Table</span>
										<span className="text-xs text-muted-foreground">
											Design and create a new database table
										</span>
									</div>
								</CommandItem>
							)}
							{hasSection("database") && (
								<>
									<CommandItem
										disabled={!canEditRecords}
										onSelect={() => handleAction(() => openAddRecord())}
										keywords={["add", "new", "row", "record", "insert"]}
									>
										<Plus className="size-4" />
										<div className="flex flex-col">
											<span>Add New Row</span>
											<span className="text-xs text-muted-foreground">
												{canEditRecords
													? `Insert a new record into ${activeTable}`
													: recordsHint}
											</span>
										</div>
									</CommandItem>
									<CommandItem
										disabled={!canEditRecords}
										onSelect={() => handleAction(() => openOverlay("records.bulk-insert"))}
										keywords={["bulk", "insert", "import", "csv", "excel", "json"]}
									>
										<Upload className="size-4" />
										<div className="flex flex-col">
											<span>Bulk Insert Records</span>
											<span className="text-xs text-muted-foreground">
												{canEditRecords
													? `Import many records into ${activeTable}`
													: recordsHint}
											</span>
										</div>
									</CommandItem>
									<CommandItem
										disabled={!canEditSchema}
										onSelect={() => handleAction(() => openOverlay("schema.add-column"))}
										keywords={["add", "new", "column", "schema"]}
									>
										<Columns2 className="size-4" />
										<div className="flex flex-col">
											<span>Add Column</span>
											<span className="text-xs text-muted-foreground">
												{canEditSchema ? `Add a column to ${activeTable}` : schemaHint}
											</span>
										</div>
									</CommandItem>
									{capabilities.indexes && (
										<CommandItem
											disabled={!activeTable}
											onSelect={() => {
												if (!activeTable) return;
												const table = activeTable;
												handleAction(() => {
													if (activeTab !== "indexes") {
														navigate({
															to: DATA_TABLE_PATH,
															params: { ...scope, table },
															search: {
																[CONSTANTS.TABLE_SCHEMA]: openSchema,
																[DATA_TAB_PARAM]: "indexes",
															},
														});
													}

													openOverlay("indexes.create-index");
												});
											}}
											keywords={["create", "add", "new", "index", "indexes"]}
										>
											<ListTree className="size-4" />
											<div className="flex flex-col">
												<span>Create Index</span>
												<span className="text-xs text-muted-foreground">
													{activeTable ? `Create an index on ${activeTable}` : NO_TABLE_HINT}
												</span>
											</div>
										</CommandItem>
									)}
									<CommandItem
										disabled={!activeTable || isExportingFile}
										onSelect={() => {
											if (!activeTable) return;
											const tableName = activeTable;
											handleAction(() => {
												exportFile({
													tableName,
													schemaName: openSchema,
													format: "csv",
												});
											});
										}}
										keywords={["export", "download", "csv"]}
									>
										<Download className="size-4" />
										<div className="flex flex-col">
											<span>Export Table as CSV</span>
											<span className="text-xs text-muted-foreground">
												{activeTable ? `Download ${activeTable} as a CSV file` : NO_TABLE_HINT}
											</span>
										</div>
									</CommandItem>
									<CommandItem
										disabled={!activeTable || isExportingFile}
										onSelect={() => {
											if (!activeTable) return;
											const tableName = activeTable;
											handleAction(() => {
												exportFile({
													tableName,
													schemaName: openSchema,
													format: "json",
												});
											});
										}}
										keywords={["export", "download", "json"]}
									>
										<Download className="size-4" />
										<div className="flex flex-col">
											<span>Export Table as JSON</span>
											<span className="text-xs text-muted-foreground">
												{activeTable
													? `Download ${activeTable} as a JSON file`
													: NO_TABLE_HINT}
											</span>
										</div>
									</CommandItem>
									<CommandItem
										disabled={!activeTable || isCopyingSchema}
										onSelect={() => {
											if (!activeTable) return;
											const tableName = activeTable;
											handleAction(() => {
												void copyTableSchema(tableName, openSchema);
											});
										}}
										keywords={["copy", "schema", "ddl", "clipboard"]}
									>
										<Copy className="size-4" />
										<div className="flex flex-col">
											<span>Copy Table Schema</span>
											<span className="text-xs text-muted-foreground">
												{activeTable
													? `Copy the schema of ${activeTable} to the clipboard`
													: NO_TABLE_HINT}
											</span>
										</div>
									</CommandItem>
								</>
							)}
							<CommandItem
								onSelect={() =>
									handleAction(() => {
										window.location.reload();
									})
								}
								keywords={["refresh", "reload", "restart"]}
							>
								<RotateCw className="size-4" />
								<div className="flex flex-col">
									<span>Reload Application</span>
									<span className="text-xs text-muted-foreground">
										Reload all tables and data
									</span>
								</div>
							</CommandItem>
						</CommandGroup>

						<CommandSeparator />

						<CommandGroup heading="View & Settings">
							<CommandItem
								onSelect={() =>
									handleAction(() =>
										setSidebarMode(sidebarMode === "hidden" ? "peek" : "hidden"),
									)
								}
								keywords={["sidebar", "show", "hide", "toggle", "view"]}
							>
								<Sidebar className="size-4" />
								<div className="flex flex-col">
									<span>{sidebarMode === "hidden" ? "Show" : "Hide"} Sidebar</span>
									<span className="text-xs text-muted-foreground">
										Toggle sidebar visibility
									</span>
								</div>
							</CommandItem>
							<CommandItem
								onSelect={() =>
									handleAction(() =>
										setSidebarMode(sidebarMode === "pinned" ? "peek" : "pinned"),
									)
								}
								keywords={["sidebar", "pin", "unpin"]}
							>
								{sidebarMode === "pinned" ? (
									<PinOff className="size-4" />
								) : (
									<Pin className="size-4" />
								)}
								<div className="flex flex-col">
									<span>{sidebarMode === "pinned" ? "Unpin" : "Pin"} Sidebar</span>
									<span className="text-xs text-muted-foreground">
										Keep sidebar always visible
									</span>
								</div>
							</CommandItem>
							<CommandItem
								onSelect={() => handleAction(toggleTheme)}
								keywords={["theme", "dark", "light", "mode", "appearance"]}
							>
								{isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
								<div className="flex flex-col">
									<span>Switch to {isDark ? "Light" : "Dark"} Mode</span>
									<span className="text-xs text-muted-foreground">
										Toggle the application theme
									</span>
								</div>
							</CommandItem>
							<CommandItem
								onSelect={() => handleAction(() => openOverlay("settings.app"))}
								keywords={["settings", "preferences", "configure", "options"]}
							>
								<Settings className="size-4" />
								<div className="flex flex-col">
									<span>Settings & Preferences</span>
									<span className="text-xs text-muted-foreground">
										Configure application settings
									</span>
								</div>
							</CommandItem>
						</CommandGroup>

						{hasSection("database") &&
							!isLoadingTablesList &&
							!errorTablesList &&
							tablesList &&
							tablesList.length > 0 && (
								<>
									<CommandSeparator />
									<CommandGroup heading="Recent Tables">
										{tablesList.slice(0, 5).map((table) => (
											<CommandItem
												key={tableId(table)}
												value={tableId(table)}
												keywords={["table", "recent", table.tableName]}
												onSelect={() =>
													handleNavigateToTable(table.tableName, table.schemaName)
												}
											>
												<Database className="size-4" />
												<div className="flex flex-col">
													<span>{table.tableName}</span>
													<span className="text-xs text-muted-foreground">
														{table.rowCountEstimated && "~"}
														{table.rowCount} {table.rowCount === 1 ? "row" : "rows"}
													</span>
												</div>
											</CommandItem>
										))}
										{tablesList.length > 5 && (
											<CommandItem
												onSelect={switchToTablesMode}
												className="text-muted-foreground"
											>
												<span className="text-xs">
													+{tablesList.length - 5} more tables — press{" "}
													<Kbd className="rounded-sm border bg-muted px-1 py-0.5 font-mono text-[0.625rem]">
														&gt;
													</Kbd>{" "}
													to see all
												</span>
											</CommandItem>
										)}
									</CommandGroup>
								</>
							)}
					</>
				)}
			</CommandList>
			<div
				aria-hidden="true"
				className="flex items-center gap-3 border-t border-border px-3 py-2 text-[11px] text-muted-foreground"
			>
				<span className="flex items-center gap-1">
					<Kbd>↑</Kbd>
					<Kbd>↓</Kbd> to navigate
				</span>
				<span className="flex items-center gap-1">
					<Kbd>↵</Kbd> to select
				</span>
				<span className="flex items-center gap-1">
					<Kbd>esc</Kbd> to close
				</span>
				<span className="ml-auto flex items-center gap-1">
					<Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
					<Kbd>K</Kbd> to toggle
				</span>
			</div>
		</CommandDialog>
	);
}
