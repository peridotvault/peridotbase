import type { RoadmapItemStatus } from "./roadmap";

export const ROADMAP_STATUS: Record<
	RoadmapItemStatus,
	{ label: string; tone: "done" | "active" | "next" }
> = {
	completed: { label: "Completed", tone: "done" },
	"in-progress": { label: "In progress", tone: "active" },
	planned: { label: "Planned", tone: "next" },
};
