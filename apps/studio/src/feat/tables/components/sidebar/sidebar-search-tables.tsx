import { Button } from "@peridotbase/ui/button";
import { Input } from "@peridotbase/ui/input";
import { Kbd } from "@peridotbase/ui/kbd";
import { Plus, Search } from "lucide-react";
import { useQueryState } from "nuqs";
import { useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useStudioCapabilities } from "@/shared/hooks/use-studio-capabilities";
import { useOverlayStore } from "@/shared/stores/overlay.store";
import { CONSTANTS } from "@/shared/utils/constants";

export const SidebarSearchTables = () => {
	const inputRef = useRef<HTMLInputElement>(null);

	const [searchTerm, setSearchTerm] = useQueryState(CONSTANTS.SIDEBAR_SEARCH, {
		defaultValue: "",
	});

	const { openOverlay } = useOverlayStore();
	const { ddl } = useStudioCapabilities();

	// todo: fix this shit
	useHotkeys(
		"/",
		(event) => {
			event.preventDefault();

			if (inputRef.current) {
				inputRef.current.focus();
			}
		},
		{
			preventDefault: true,
		},
	);

	return (
		<div className="px-3 pb-3 pt-2 space-y-2">
			<div className="flex items-center gap-2">
				<div className="relative min-w-0 flex-1">
					<Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
					<Input
						ref={inputRef}
						variant="outline"
						placeholder="Search tables"
						value={searchTerm ?? ""}
						onChange={(e) => setSearchTerm(e.target.value.trim())}
						className="rounded-sm h-8 pl-8 pr-8"
					/>
					<Kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">/</Kbd>
				</div>
				{ddl && (
					<Button
						size="icon-lg"
						className="shrink-0 rounded-sm"
						onClick={() => openOverlay("table-builder.create-table")}
						aria-label="Add table"
					>
						<Plus className="size-4" />
					</Button>
				)}
			</div>
		</div>
	);
};
