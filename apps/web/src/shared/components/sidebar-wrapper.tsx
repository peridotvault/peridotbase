import { cn } from "@peridotvault/peridotbase-ui/utils";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import {
	SIDEBAR_DEFAULT_WIDTH,
	usePersonalPreferencesStore,
} from "@/shared/stores/personal-preferences.store";
import { CONSTANTS } from "@/shared/utils/constants";

/**
 * The sidebar panel. It lives inside the shell and slides behind the icon rail, instead of
 * portalling to `document.body` like a dialog: a portal would paint above the rail and make the
 * panel jump over it on open and close.
 */
export const SidebarWrapper = ({
	children,
	left = CONSTANTS.RAIL_WIDTH,
}: {
	children: ReactNode;
	/** The org shell has no icon rail, so its sidebar starts at the viewport edge. */
	left?: number;
}) => {
	const {
		sidebar: { width, mode },
		setSidebarWidth,
	} = usePersonalPreferencesStore();

	const isOpen = mode !== "hidden";

	const handleResizeStart = (e: ReactMouseEvent) => {
		e.preventDefault();
		const startX = e.clientX;
		const startWidth = width;

		Object.assign(document.body.style, { cursor: "col-resize", userSelect: "none" });

		// Covers the page so iframes and other elements under the pointer cannot take the drag.
		// The id is what index.css watches to stop the content margin transition mid-drag.
		const overlay = document.createElement("div");
		overlay.id = "resize-overlay";
		overlay.style.cssText = "position:fixed;inset:0;z-index:9999;cursor:col-resize;";
		document.body.appendChild(overlay);

		const onMouseMove = (event: MouseEvent) => {
			requestAnimationFrame(() => {
				const newWidth = startWidth + event.clientX - startX;
				// Dragging within 16px of the default width snaps onto it, so it is easy to get back to.
				setSidebarWidth(
					Math.abs(newWidth - SIDEBAR_DEFAULT_WIDTH) <= 16 ? SIDEBAR_DEFAULT_WIDTH : newWidth,
				);
			});
		};

		const onMouseUp = () => {
			Object.assign(document.body.style, { cursor: "", userSelect: "" });
			overlay.remove();
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("mouseup", onMouseUp);
		};

		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("mouseup", onMouseUp);
	};

	return (
		<aside
			aria-label="Sidebar"
			aria-hidden={!isOpen}
			inert={!isOpen}
			data-state={isOpen ? "open" : "closed"}
			className={cn(
				"sidebar-behind-rail absolute inset-y-0 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
			)}
			style={{ width: `${width}px`, left: `${left}px` }}
		>
			<div className="relative flex h-full flex-col">
				{children}

				<div
					role="button"
					tabIndex={0}
					onMouseDown={handleResizeStart}
					className={cn(
						"absolute inset-y-0 -right-1.5 w-3 cursor-col-resize z-50 outline-none",
						"after:absolute after:inset-y-0 after:left-1/2 after:w-px after:transition-colors",
						"hover:after:bg-brand-500/70 active:after:bg-brand-500/70 focus-visible:after:bg-brand-500/70",
					)}
					title="Drag to resize sidebar"
				/>
			</div>
		</aside>
	);
};
