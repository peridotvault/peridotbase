import type { IndexInfoSchemaType } from "@peridotvault/peridotbase-sdk";
import { Button } from "@peridotvault/peridotbase-ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@peridotvault/peridotbase-ui/tooltip";
import { EqualNot, Lock, Trash2 } from "lucide-react";
import { useTableSchemaName } from "@/shared/hooks/use-table-schema-name";
import { useOverlayStore } from "@/shared/stores/overlay.store";
import { useSetIndexNullsNotDistinct } from "../hooks/use-set-index-nulls-not-distinct";
import { useIndexDropStore } from "../stores/index-drop.store";

export const IndexRowActions = ({
	index,
	tableName,
}: {
	index: IndexInfoSchemaType;
	tableName: string;
}) => {
	const { openOverlay } = useOverlayStore();
	const { setDroppingIndex } = useIndexDropStore();
	const schemaName = useTableSchemaName();
	const { setIndexNullsNotDistinct, isUpdating } = useSetIndexNullsNotDistinct({
		tableName,
		schemaName,
	});

	return (
		<div className="flex items-center gap-1">
			{index.isUnique ? (
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon-sm"
							className="text-muted-foreground"
							aria-label={`Toggle NULLS NOT DISTINCT on ${index.indexName}`}
							disabled={isUpdating}
							onClick={() =>
								void setIndexNullsNotDistinct({
									indexName: index.indexName,
									nullsNotDistinct: !index.nullsNotDistinct,
								})
							}
						>
							<EqualNot className="size-3.5" />
						</Button>
					</TooltipTrigger>
					<TooltipContent side="left">
						<p>
							{index.nullsNotDistinct
								? "NULLs are equal. Click to allow repeated NULLs."
								: "Allow repeated NULLs. Click to treat NULLs as equal."}
						</p>
					</TooltipContent>
				</Tooltip>
			) : null}

			{index.kind !== "index" ? (
				<Tooltip>
					<TooltipTrigger asChild>
						<span className="inline-flex text-muted-foreground/40">
							<Lock className="size-3.5" />
						</span>
					</TooltipTrigger>
					<TooltipContent side="left">
						<p>Backs a constraint. Drop the constraint to remove it.</p>
					</TooltipContent>
				</Tooltip>
			) : (
				<Button
					variant="ghost"
					size="icon-sm"
					className="text-muted-foreground hover:text-destructive"
					aria-label={`Drop index ${index.indexName}`}
					onClick={() => {
						setDroppingIndex(index);
						openOverlay("indexes.drop-index");
					}}
				>
					<Trash2 className="size-3.5" />
				</Button>
			)}
		</div>
	);
};
