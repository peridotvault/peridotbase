import type { ExecuteQueryResult } from "@peridotvault/peridotbase-sdk";
import { useNavigate } from "@tanstack/react-router";
import { Database } from "lucide-react";
import { useStudioScope } from "@/shared/hooks/use-studio-scope";
import { lazy, Suspense, useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useQueriesStore } from "@/shared/stores/queries.store";
import { useDatabaseStore } from "@/shared/stores/database.store";
import type { CodeEditorHandle } from "../components/code-editor";
import { QueryResultContainer } from "../components/query-result-container";
import { RunnerHeader } from "../components/runner-header";
import { useExecuteQuery } from "../hooks/use-execute-query";
import { PLACEHOLDER_QUERY } from "../placeholders";

const CodeEditor = lazy(() =>
	import("../components/code-editor").then((module) => ({
		default: module.CodeEditor,
	})),
);

type QueryResult = {
	data: ExecuteQueryResult;
	queryId: string;
};

export const RunnerScreen = ({
	queryId,
	initialQuery,
}: {
	queryId?: string;
	initialQuery?: string;
}) => {
	const navigate = useNavigate();
	const scope = useStudioScope();
	const editorRef = useRef<CodeEditorHandle>(null);
	const [queryResult, setQueryResult] = useState<QueryResult | undefined>(undefined);
	const { getQuery, updateQuery, toggleFavorite, addQuery } = useQueriesStore();
	const selectedDatabase = useDatabaseStore((state) => state.selectedDatabase);
	const query = queryId ? getQuery(queryId) : null;
	const isFavorite = query?.isFavorite ?? false;
	const { executeQuery, isExecutingQuery, executeQueryError, steps, stepTotal } =
		useExecuteQuery();
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [currentQuery, setCurrentQuery] = useState<string>("");
	const [lastExecutedQuery, setLastExecutedQuery] = useState("");
	const editorLanguage = "pgsql" as const;

	const getInitialQuery = useCallback(() => {
		if (initialQuery) return initialQuery;

		if (!query) return PLACEHOLDER_QUERY;

		return query?.query ?? PLACEHOLDER_QUERY;
	}, [query, initialQuery]);

	const handleExecuteQuery = useCallback(
		(query: string) => {
			if (!query.trim()) {
				toast.error("Query is empty!");

				return;
			}

			if (!selectedDatabase) {
				toast.error("Create a database first: sidebar database menu → New database.");
				return;
			}

			setLastExecutedQuery(query);

			executeQuery(
				{ query },
				{ onSuccess: (data) => setQueryResult({ data, queryId: queryId ?? "" }) },
			);
		},
		[executeQuery, queryId, selectedDatabase],
	);

	const handleFavorite = useCallback(() => {
		if (!queryId) return;
		toggleFavorite(queryId);
		toast.success(isFavorite ? "Query unfavorited" : "Query favorited");
	}, [toggleFavorite, queryId, isFavorite]);

	const handleSaveQuery = useCallback(() => {
		if (!currentQuery) return;

		if (!queryId) {
			const newQueryId = addQuery(currentQuery);
			navigate({
				to: "/studio/org/$organization/$project/runner/$queryId",
				params: { ...scope, queryId: newQueryId },
			});
		} else {
			updateQuery(queryId, { query: currentQuery });
		}

		setHasUnsavedChanges(false);
		toast.success("Query saved");
	}, [currentQuery, queryId, updateQuery, addQuery, navigate, scope]);

	return (
		<div className="flex-1 relative w-full flex flex-col">
			<RunnerHeader
				isExecutingQuery={isExecutingQuery}
				handleButtonClick={() => handleExecuteQuery(currentQuery)}
				handleFormatQuery={() => editorRef.current?.format()}
				handleSaveQuery={handleSaveQuery}
				handleFavorite={handleFavorite}
				isFavorite={isFavorite}
				queryId={queryId ?? ""}
				hasUnsavedChanges={hasUnsavedChanges}
				queryResult={queryResult?.data ?? null}
				currentQuery={currentQuery}
			/>

			{!selectedDatabase && (
				<div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
					<Database className="size-3.5 shrink-0" />
					Queries run inside a database. Create one from the sidebar database menu → New
					database, then select it.
				</div>
			)}

			<Suspense fallback={<div className="flex-1 bg-background size-full" />}>
				<CodeEditor
					initialQuery={getInitialQuery()}
					queryId={queryId}
					savedQuery={query?.query ?? ""}
					language={editorLanguage}
					onQueryChange={setCurrentQuery}
					onUnsavedChanges={setHasUnsavedChanges}
					ref={editorRef}
					onExecuteQuery={handleExecuteQuery}
					onSaveQuery={handleSaveQuery}
				/>
			</Suspense>

			<QueryResultContainer
				results={queryResult?.data ?? null}
				isLoading={isExecutingQuery}
				error={executeQueryError}
				lastExecutedQuery={lastExecutedQuery}
				steps={steps}
				stepTotal={stepTotal}
			/>
		</div>
	);
};
