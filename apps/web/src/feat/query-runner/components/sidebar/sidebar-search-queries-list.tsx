import { Button } from "@peridotvault/peridotbase-ui/button";
import { Input } from "@peridotvault/peridotbase-ui/input";
import { Kbd } from "@peridotvault/peridotbase-ui/kbd";
import { useNavigate } from "@tanstack/react-router";
import { useStudioScope } from "@/shared/hooks/use-studio-scope";
import { FolderPlus, Plus, Search } from "lucide-react";
import { useQueryState } from "nuqs";
import { useRef } from "react";
import { useQueriesStore } from "@/shared/stores/queries.store";
import { CONSTANTS } from "@/shared/utils/constants";

export const SidebarSearchQueriesList = () => {
	const { addQuery, addFolder } = useQueriesStore();
	const navigate = useNavigate();
	const scope = useStudioScope();
	const inputRef = useRef<HTMLInputElement>(null);

	const [searchTerm, setSearchTerm] = useQueryState(CONSTANTS.SIDEBAR_SEARCH, {
		defaultValue: "",
	});

	const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(e.target.value);
	};

	const handleAddQuery = () => {
		const queryId = addQuery();
		navigate({
			to: "/studio/org/$organization/$project/runner/$queryId",
			params: { ...scope, queryId },
		});
	};

	const handleAddFolder = () => {
		const folderId = Math.random().toString(36).substring(2, 15);
		addFolder({
			id: folderId,
			name: "New Folder",
			isExpanded: true,
			isFavorite: false,
		});
	};

	return (
		<div className="p-3 space-y-2 border-b border-sidebar-border">
			<div className="flex gap-2">
				<Button size="lg" className="flex-1 justify-start" onClick={handleAddQuery}>
					<Plus className="size-4" />
					Add Query
				</Button>
				<Button size="lg" className="flex-1 justify-start" onClick={handleAddFolder}>
					<FolderPlus className="size-4" />
					Add Folder
				</Button>
			</div>

			<div className="relative">
				<Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
				<Input
					ref={inputRef}
					placeholder="Search queries"
					value={searchTerm ?? ""}
					onChange={handleSearch}
					className="rounded-sm h-8 pl-8 pr-8"
				/>
				<Kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">/</Kbd>
			</div>
		</div>
	);
};
