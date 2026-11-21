import type { ExecuteQueryResult } from "@peridotvault/peridotbase-sdk";
import { ToggleGroup, ToggleGroupItem } from "@peridotvault/peridotbase-ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@peridotvault/peridotbase-ui/tooltip";
import {
	AlignLeft,
	Braces,
	Command,
	CornerDownLeft,
	Heart,
	Save,
	Sparkles,
	Table,
	Zap,
} from "lucide-react";
import { useQueryState } from "nuqs";
import { Toolbar, ToolbarButton, ToolbarIconButton } from "@/shared/components/toolbar";
import { askAssistant } from "@/shared/stores/assistant-request.store";
import { RUNNER_STATE_KEYS } from "../constants";

export const RunnerHeader = ({
	isExecutingQuery,
	handleButtonClick,
	handleFormatQuery,
	handleSaveQuery,
	handleFavorite,
	isFavorite,
	queryId,
	hasUnsavedChanges,
	queryResult,
	currentQuery,
}: {
	isExecutingQuery: boolean;
	handleButtonClick: () => void;
	handleFormatQuery: () => void;
	handleSaveQuery: () => void;
	handleFavorite: () => void;
	isFavorite: boolean;
	queryId: string;
	hasUnsavedChanges: boolean;
	queryResult: ExecuteQueryResult | null;
	currentQuery: string;
}) => {
	const [showAs, setShowAs] = useQueryState(RUNNER_STATE_KEYS.SHOW_AS);

	return (
		<Toolbar
			actions={
				<>
					{queryResult && (
						<div className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground tabular-nums">
							<span>{queryResult.duration.toFixed(2)}ms</span>
							<span aria-hidden>·</span>
							<span>{queryResult.rowCount} rows</span>
						</div>
					)}

					<ToggleGroup
						type="single"
						variant="ghost"
						size="sm"
						onValueChange={(value) => {
							if (value === showAs) return;
							setShowAs(value);
						}}
						value={showAs ?? undefined}
						aria-label="Result view"
					>
						<Tooltip>
							<TooltipTrigger asChild>
								<ToggleGroupItem value="table" aria-label="View as a table">
									<Table />
								</ToggleGroupItem>
							</TooltipTrigger>
							<TooltipContent>View as a table</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<ToggleGroupItem value="json" aria-label="View as JSON">
									<Braces />
								</ToggleGroupItem>
							</TooltipTrigger>
							<TooltipContent>View as JSON</TooltipContent>
						</Tooltip>
					</ToggleGroup>
				</>
			}
		>
			<ToolbarButton
				type="button"
				variant="default"
				className="gap-1"
				onClick={handleButtonClick}
				disabled={isExecutingQuery}
				aria-label="Run the query"
			>
				Run
				<Command className="size-3" />
				<CornerDownLeft className="size-3" />
			</ToolbarButton>

			<Tooltip>
				<TooltipTrigger asChild>
					<ToolbarIconButton
						type="button"
						aria-label="Generate a query with AI"
						onClick={() =>
							askAssistant(
								"Generate a query for this database. Ask me for the goal if it is unclear.",
							)
						}
					>
						<Sparkles />
					</ToolbarIconButton>
				</TooltipTrigger>
				<TooltipContent>Generate with AI</TooltipContent>
			</Tooltip>

			<Tooltip>
				<TooltipTrigger asChild>
					<ToolbarIconButton
						type="button"
						aria-label="Optimize the query with AI"
						disabled={!currentQuery.trim() || isExecutingQuery}
						onClick={() =>
							askAssistant(
								`Suggest a faster, clearer version of this query. Explain the tradeoffs and return the complete query in a fenced code block.\n\n${currentQuery}`,
							)
						}
					>
						<Zap />
					</ToolbarIconButton>
				</TooltipTrigger>
				<TooltipContent>Optimize with AI</TooltipContent>
			</Tooltip>

			<ToolbarButton type="button" aria-label="Format the query" onClick={handleFormatQuery}>
				Format <AlignLeft />
			</ToolbarButton>

			<ToolbarButton type="button" aria-label="Save the query" onClick={handleSaveQuery}>
				Save <Save />
			</ToolbarButton>

			<ToolbarIconButton
				type="button"
				aria-label="Favorite the query"
				aria-pressed={isFavorite}
				className={isFavorite ? "text-foreground" : undefined}
				onClick={handleFavorite}
			>
				<Heart className={isFavorite ? "fill-current" : undefined} />
			</ToolbarIconButton>

			{queryId && hasUnsavedChanges && (
				<span className="px-1 text-xs text-muted-foreground">Unsaved changes</span>
			)}
		</Toolbar>
	);
};
