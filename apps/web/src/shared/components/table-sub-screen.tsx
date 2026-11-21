import { Spinner } from "@peridotvault/peridotbase-ui/spinner";
import { Link } from "@tanstack/react-router";
import { Plus, RefreshCw, Table2 } from "lucide-react";
import type { ReactNode } from "react";
import { Toolbar, ToolbarButton, ToolbarIconButton } from "@/shared/components/toolbar";
import { useTableSchemaName } from "@/shared/hooks/use-table-schema-name";
import { useStudioScope } from "@/shared/hooks/use-studio-scope";
import { CONSTANTS } from "@/shared/utils/constants";

/** The loading, error and toolbar frame shared by a table's schema and indexes screens. */
export const TableSubScreen = ({
	tableName,
	subject,
	isLoading,
	error,
	refetch,
	isRefetching,
	action,
	children,
}: {
	tableName: string;
	/** Names what the screen lists, as in "Failed to load schema". */
	subject: string;
	isLoading: boolean;
	error: Error | null;
	refetch: () => void;
	isRefetching: boolean;
	/** The toolbar's primary button, omitted when the screen offers none. */
	action?: { label: string; onClick: () => void };
	children: ReactNode;
}) => {
	const schemaName = useTableSchemaName();
	const scope = useStudioScope();

	if (isLoading) {
		return (
			<div className="size-full flex items-center justify-center">
				<Spinner size="size-7" />
			</div>
		);
	}

	if (error) {
		return (
			<div className="size-full flex flex-col items-center justify-center gap-2">
				<div className="text-sm font-medium">Failed to load {subject}</div>
				<div className="text-sm text-muted-foreground">{error.message}</div>
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col overflow-hidden">
			<Toolbar
				actions={
					action && (
						<ToolbarButton type="button" variant="default" onClick={action.onClick}>
							<Plus />
							{action.label}
						</ToolbarButton>
					)
				}
			>
				<ToolbarIconButton
					type="button"
					onClick={() => void refetch()}
					aria-label={`Refetch ${subject} for ${tableName}`}
					disabled={isRefetching}
				>
					<RefreshCw />
				</ToolbarIconButton>

				<ToolbarButton variant="ghost" asChild>
					<Link
						to="/studio/org/$organization/$project/database/$table"
						params={{ ...scope, table: tableName }}
						search={{ [CONSTANTS.TABLE_SCHEMA]: schemaName }}
						aria-label={`View data for ${tableName}`}
					>
						<Table2 />
						View data
					</Link>
				</ToolbarButton>
			</Toolbar>
			{children}
		</div>
	);
};
