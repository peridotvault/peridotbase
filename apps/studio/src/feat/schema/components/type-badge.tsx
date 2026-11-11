import type { ColumnInfoSchemaType } from "@peridotbase/sdk";
import { Badge } from "@peridotbase/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@peridotbase/ui/tooltip";

export const TypeBadge = ({ col }: { col: ColumnInfoSchemaType }) => {
	if (col.dataTypeLabel === "enum" && col.enumValues && col.enumValues.length > 0) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<Badge variant="outline" className="font-mono cursor-default truncate">
						{col.dataTypeLabel}
					</Badge>
				</TooltipTrigger>
				<TooltipContent side="right">
					<div className="text-xs space-y-0.5">
						<p className="text-muted-foreground mb-1">Enum values:</p>
						{col.enumValues.map((v) => (
							<p key={v} className="font-mono">
								{v}
							</p>
						))}
					</div>
				</TooltipContent>
			</Tooltip>
		);
	}

	return (
		<Badge variant="outline" className="font-mono">
			{col.dataTypeLabel}
		</Badge>
	);
};
