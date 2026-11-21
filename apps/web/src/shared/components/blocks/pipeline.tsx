"use client";

/* Vendored from reactbits pipeline (shadcn registry). Keep close to upstream. */
/* eslint-disable no-useless-assignment */

import {
	forwardRef,
	isValidElement,
	useCallback,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useMemo,
	useId,
	useRef,
	useState,
	useSyncExternalStore,
	type CSSProperties,
	type ReactNode,
} from "react";
import { cn } from "@peridotvault/peridotbase-ui/utils";

export type PipelineIcon =
	| "bolt"
	| "search"
	| "sparkles"
	| "chat"
	| "database"
	| "code"
	| "globe"
	| "book"
	| "rocket"
	| "branch"
	| "file"
	| "mail"
	| "shield"
	| "check"
	| "layers"
	| "cpu";

export interface PipelineNode {
	id: string;
	title: string;
	description?: string;
	status?: string;
	icon?: PipelineIcon | ReactNode;
	duration?: number;
}

export interface PipelineHandle {
	run: () => void;
	play: () => void;
	pause: () => void;
}

export interface PipelineProps {
	nodes?: PipelineNode[];
	edges?: [string, string][];
	direction?: "auto" | "horizontal" | "vertical";
	theme?: "auto" | "light" | "dark";
	accentColor?: string;
	nodeColor?: string;
	textColor?: string;
	nodeWidth?: number;
	height?: number;
	radius?: number;
	speed?: number;
	pace?: number;
	rest?: number;
	autoplay?: boolean;
	loop?: boolean;
	beam?: boolean;
	grid?: boolean;
	interactive?: boolean;
	onNodeComplete?: (id: string) => void;
	className?: string;
	style?: CSSProperties;
}

type NodeState = "idle" | "running" | "done";

interface Placed {
	id: string;
	x: number;
	y: number;
	w: number;
	h: number;
}

interface Wire {
	from: string;
	to: string;
	d: string;
	length: number;
}

interface Layout {
	placed: Placed[];
	wires: Wire[];
	height: number;
	vertical: boolean;
	compact: boolean;
}

interface Flow {
	edge: number;
	start: number;
	velocity: number;
}

interface Timer {
	id: string;
	at: number;
	kind: "start" | "finish";
}

interface Engine {
	now: number;
	phase: "start" | "run" | "rest" | "fade" | "stopped";
	since: number;
	until: number;
	states: Record<string, NodeState>;
	fill: number[];
	settled: boolean;
	fading: boolean;
	received: Record<string, number>;
	timers: Timer[];
	flows: Flow[];
	dirty: boolean;
}

interface Palette {
	surface: string;
	ring: string;
	text: string;
	muted: string;
	accent: string;
	glint: string;
	success: string;
	line: string;
	lineAlpha: number;
	raised: string;
	grid: string;
	shadow: string;
}

const SANS =
	'var(--font-sans, ui-sans-serif), ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const NODE_HEIGHT = 62;
const TILE_HEIGHT = 78;
const BEND = 10;
const ACCEL = 260;
const HEAD = 28;
const FADE = 640;
const SWAP = 380;
const TRAVEL = 640;

const DEFAULT_NODES: PipelineNode[] = [
	{
		id: "signup",
		title: "New signup",
		description: "Webhook trigger",
		status: "maya@acme.co",
		icon: "bolt",
	},
	{
		id: "enrich",
		title: "Enrich",
		description: "Company lookup",
		status: "Acme, 120 staff",
		icon: "search",
	},
	{
		id: "score",
		title: "Score lead",
		description: "AI model",
		status: "Fit score 92",
		icon: "sparkles",
	},
	{
		id: "notify",
		title: "Notify sales",
		description: "Slack message",
		status: "Posted to #deals",
		icon: "chat",
	},
	{
		id: "crm",
		title: "Create deal",
		description: "CRM record",
		status: "Deal 4821 created",
		icon: "database",
	},
];

const DEFAULT_EDGES: [string, string][] = [
	["signup", "enrich"],
	["enrich", "score"],
	["score", "notify"],
	["score", "crm"],
];

const ICONS: Record<PipelineIcon, ReactNode> = {
	bolt: <path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z" />,
	search: (
		<>
			<circle cx="11" cy="11" r="6.5" />
			<path d="m20 20-4.2-4.2" />
		</>
	),
	sparkles: (
		<>
			<path d="M11 3.5l1.7 4.6 4.6 1.7-4.6 1.7L11 16.1l-1.7-4.6-4.6-1.7 4.6-1.7z" />
			<path d="M18.5 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
		</>
	),
	chat: (
		<path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-9l-4.5 3.5v-3.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z" />
	),
	database: (
		<>
			<ellipse cx="12" cy="6.5" rx="7.5" ry="3" />
			<path d="M4.5 6.5v11c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-11" />
			<path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" />
		</>
	),
	code: <path d="M8.5 7.5 4 12l4.5 4.5M15.5 7.5 20 12l-4.5 4.5M13.5 5l-3 14" />,
	globe: (
		<>
			<circle cx="12" cy="12" r="8.5" />
			<path d="M3.5 12h17M12 3.5c2.4 2.6 3.5 5.5 3.5 8.5s-1.1 5.9-3.5 8.5c-2.4-2.6-3.5-5.5-3.5-8.5s1.1-5.9 3.5-8.5z" />
		</>
	),
	book: (
		<path d="M5 17V5.5A1.5 1.5 0 0 1 6.5 4H17v13H7.5A2.5 2.5 0 0 0 5 19.5 2.5 2.5 0 0 0 7.5 22H17v-5" />
	),
	rocket: (
		<>
			<path d="M14.5 4.5c2.6-.6 4.6-.3 5 0 .3.4.6 2.4 0 5L12 17l-5-5z" />
			<path d="M7 12l-3.5 1 2.5 2.5M12 17l-1 3.5-2.5-2.5" />
		</>
	),
	branch: (
		<>
			<circle cx="6" cy="5.5" r="2" />
			<circle cx="6" cy="18.5" r="2" />
			<circle cx="18" cy="8.5" r="2" />
			<path d="M6 7.5v9M18 10.5a6 6 0 0 1-6 6H8" />
		</>
	),
	file: (
		<>
			<path d="M7 3.5h7l4 4v13H7a1.5 1.5 0 0 1-1.5-1.5V5A1.5 1.5 0 0 1 7 3.5z" />
			<path d="M14 3.5v4h4" />
		</>
	),
	mail: (
		<>
			<rect x="3.5" y="5.5" width="17" height="13" rx="2" />
			<path d="m4 7 8 6 8-6" />
		</>
	),
	shield: (
		<>
			<path d="M12 3.5 19 6v5.5c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9V6z" />
			<path d="m9 12 2 2 4-4" />
		</>
	),
	check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
	layers: (
		<path d="M12 4 3.5 8.5 12 13l8.5-4.5zM3.5 12.5 12 17l8.5-4.5M3.5 16.5 12 21l8.5-4.5" />
	),
	cpu: (
		<>
			<rect x="7" y="7" width="10" height="10" rx="2" />
			<path d="M10 3.5v3M14 3.5v3M10 17.5v3M14 17.5v3M3.5 10h3M3.5 14h3M17.5 10h3M17.5 14h3" />
		</>
	),
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const finite = (value: number | undefined, fallback: number) =>
	typeof value === "number" && Number.isFinite(value) ? value : fallback;

const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t, 0, 1));

const round = (value: number) => Math.round(value * 100) / 100;

const travelled = (elapsed: number, velocity: number) => {
	if (elapsed <= 0) return 0;
	if (elapsed < ACCEL) return (velocity * elapsed * elapsed) / (2 * ACCEL);
	return velocity * (elapsed - ACCEL / 2);
};

const travelTime = (length: number, velocity: number) => {
	if (velocity <= 0) return 0;
	if (length <= (velocity * ACCEL) / 2) return Math.sqrt((2 * ACCEL * length) / velocity);
	return length / velocity + ACCEL / 2;
};

const subscribeToMotion = (notify: () => void) => {
	const media = window.matchMedia("(prefers-reduced-motion: reduce)");
	media.addEventListener("change", notify);
	return () => media.removeEventListener("change", notify);
};

const readMotion = () =>
	typeof window !== "undefined" &&
	window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const luminance = (color: string, probe: CanvasRenderingContext2D | null) => {
	if (!probe) return -1;
	probe.fillStyle = "#010203";
	probe.fillStyle = color;
	if (String(probe.fillStyle) === "#010203" && color.trim().toLowerCase() !== "#010203")
		return -1;
	probe.clearRect(0, 0, 1, 1);
	probe.fillRect(0, 0, 1, 1);
	const rgba = probe.getImageData(0, 0, 1, 1).data;
	if (rgba[3] / 255 < 0.5) return -1;
	const linear = (value: number) => {
		const v = value / 255;
		return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
	};
	return 0.2126 * linear(rgba[0]) + 0.7152 * linear(rgba[1]) + 0.0722 * linear(rgba[2]);
};

const readBackdrop = (root: HTMLElement, probe: CanvasRenderingContext2D | null) => {
	let node: Element | null = root.parentElement;
	let view: Window | null = root.ownerDocument.defaultView;
	for (let hop = 0; hop < 4 && view; hop += 1) {
		while (node) {
			const color = view.getComputedStyle(node).backgroundColor;
			const value = luminance(color, probe);
			if (value >= 0) return { dark: value < 0.35, color };
			node = node.parentElement;
		}
		let frame: Element | null = null;
		try {
			frame = view.frameElement;
		} catch {
			frame = null;
		}
		if (!frame) break;
		node = frame.parentElement;
		view = frame.ownerDocument.defaultView;
	}
	const doc = root.ownerDocument;
	const html = doc.documentElement;
	const own = doc.defaultView ?? window;
	if (html.classList.contains("dark")) return { dark: true, color: null };
	if (html.classList.contains("light")) return { dark: false, color: null };
	const scheme = own.getComputedStyle(html).colorScheme;
	if (scheme === "dark" || scheme === "light") return { dark: scheme === "dark", color: null };
	return { dark: own.matchMedia("(prefers-color-scheme: dark)").matches, color: null };
};

const makePalette = (
	dark: boolean,
	accent?: string,
	surface?: string,
	text?: string,
): Palette => {
	if (dark) {
		const tone = accent || "#A99BFF";
		return {
			surface: surface || "#141416",
			ring: "rgba(255,255,255,0.08)",
			text: text || "#E7E7EA",
			muted: "#8C8C95",
			accent: tone,
			glint: `color-mix(in srgb, ${tone} 55%, #ffffff)`,
			success: "#5EDB8A",
			line: "#FFFFFF",
			lineAlpha: 0.13,
			raised: "rgba(255,255,255,0.06)",
			grid: "rgba(255,255,255,0.07)",
			shadow: "0 12px 28px -14px rgba(0,0,0,0.7)",
		};
	}
	const tone = accent || "#5227FF";
	return {
		surface: surface || "#FFFFFF",
		ring: "rgba(0,0,0,0.08)",
		text: text || "#18181B",
		muted: "#71717A",
		accent: tone,
		glint: `color-mix(in srgb, ${tone} 62%, #000000)`,
		success: "#15803D",
		line: "#000000",
		lineAlpha: 0.13,
		raised: "rgba(0,0,0,0.045)",
		grid: "rgba(0,0,0,0.08)",
		shadow: "0 1px 2px rgba(0,0,0,0.04), 0 10px 24px -14px rgba(0,0,0,0.18)",
	};
};

const elbow = (
	sx: number,
	sy: number,
	ex: number,
	ey: number,
	turn: number,
	vertical: boolean,
) => {
	if (!vertical) {
		const dy = ey - sy;
		if (Math.abs(dy) < 0.5)
			return { d: `M ${round(sx)} ${round(sy)} H ${round(ex)}`, length: Math.abs(ex - sx) };
		const r = Math.max(0, Math.min(BEND, Math.abs(dy) / 2, turn - sx, ex - turn));
		const s = Math.sign(dy);
		return {
			d: `M ${round(sx)} ${round(sy)} H ${round(turn - r)} A ${r} ${r} 0 0 ${s > 0 ? 1 : 0} ${round(turn)} ${round(sy + s * r)} V ${round(ey - s * r)} A ${r} ${r} 0 0 ${s > 0 ? 0 : 1} ${round(turn + r)} ${round(ey)} H ${round(ex)}`,
			length: Math.abs(ex - sx) + Math.abs(dy) - 4 * r + Math.PI * r,
		};
	}
	const dx = ex - sx;
	if (Math.abs(dx) < 0.5)
		return { d: `M ${round(sx)} ${round(sy)} V ${round(ey)}`, length: Math.abs(ey - sy) };
	const r = Math.max(0, Math.min(BEND, Math.abs(dx) / 2, turn - sy, ey - turn));
	const s = Math.sign(dx);
	return {
		d: `M ${round(sx)} ${round(sy)} V ${round(turn - r)} A ${r} ${r} 0 0 ${s > 0 ? 0 : 1} ${round(sx + s * r)} ${round(turn)} H ${round(ex - s * r)} A ${r} ${r} 0 0 ${s > 0 ? 1 : 0} ${round(ex)} ${round(turn + r)} V ${round(ey)}`,
		length: Math.abs(ey - sy) + Math.abs(dx) - 4 * r + Math.PI * r,
	};
};

const arrange = (
	ids: string[],
	edges: [string, string][],
	width: number,
	direction: PipelineProps["direction"],
	preferred: number,
): Layout => {
	const known = new Set(ids);
	const valid = edges.filter(([from, to]) => known.has(from) && known.has(to) && from !== to);
	const outgoing = new Map<string, string[]>(ids.map((id) => [id, []]));
	const indegree = new Map<string, number>(ids.map((id) => [id, 0]));
	valid.forEach(([from, to]) => {
		outgoing.get(from)?.push(to);
		indegree.set(to, (indegree.get(to) ?? 0) + 1);
	});
	const level = new Map<string, number>(ids.map((id) => [id, 0]));
	const queue = ids.filter((id) => (indegree.get(id) ?? 0) === 0);
	const remaining = new Map(indegree);
	while (queue.length) {
		const id = queue.shift() as string;
		for (const next of outgoing.get(id) ?? []) {
			level.set(next, Math.max(level.get(next) ?? 0, (level.get(id) ?? 0) + 1));
			remaining.set(next, (remaining.get(next) ?? 0) - 1);
			if ((remaining.get(next) ?? 0) === 0) queue.push(next);
		}
	}
	const depth = Math.max(0, ...ids.map((id) => level.get(id) ?? 0)) + 1;
	const columns: string[][] = Array.from({ length: depth }, () => []);
	ids.forEach((id) => columns[level.get(id) ?? 0].push(id));
	const pad = width < 480 ? 12 : 16;
	const usable = Math.max(0, width - pad * 2);
	const gapX = 56;
	const fitWidth = depth > 1 ? (usable - (depth - 1) * gapX) / depth : usable;
	const horizontal =
		direction === "horizontal" || (direction !== "vertical" && fitWidth >= 136);
	const placed: Placed[] = [];
	const byId = new Map<string, Placed>();
	let height = 0;
	let compact = false;
	let channel = 0;
	if (horizontal) {
		const w = clamp(Math.min(preferred, fitWidth), 96, 320);
		const rows = Math.max(...columns.map((column) => column.length));
		const gapY = 16;
		height = Math.max(rows * NODE_HEIGHT + (rows - 1) * gapY + 48, NODE_HEIGHT + 96);
		const span = depth > 1 ? (usable - w) / (depth - 1) : 0;
		channel = Math.max(0, span - w);
		columns.forEach((column, c) => {
			const x = depth > 1 ? pad + c * span : (width - w) / 2;
			column.forEach((id, r) => {
				const y =
					height / 2 + (r - (column.length - 1) / 2) * (NODE_HEIGHT + gapY) - NODE_HEIGHT / 2;
				const item = { id, x, y, w, h: NODE_HEIGHT };
				placed.push(item);
				byId.set(id, item);
			});
		});
	} else {
		const widest = Math.max(...columns.map((column) => column.length));
		const gap = 10;
		const natural = Math.min(preferred + 40, (usable - (widest - 1) * gap) / widest);
		compact = natural < 136;
		const h = compact ? TILE_HEIGHT : NODE_HEIGHT;
		const gapY = 36;
		channel = gapY;
		height = depth * h + (depth - 1) * gapY + 32;
		columns.forEach((column, c) => {
			// Size each row to its own column so a crowded row does not squeeze a single node.
			const w = clamp(
				Math.min(preferred + 40, (usable - (column.length - 1) * gap) / column.length),
				72,
				320,
			);
			const total = column.length * w + (column.length - 1) * gap;
			const left = (width - total) / 2;
			column.forEach((id, k) => {
				const item = { id, x: left + k * (w + gap), y: 16 + c * (h + gapY), w, h };
				placed.push(item);
				byId.set(id, item);
			});
		});
	}
	const wires: Wire[] = valid.map(([from, to]) => {
		const a = byId.get(from) as Placed;
		const b = byId.get(to) as Placed;
		if (horizontal) {
			const sx = a.x + a.w;
			const ex = b.x;
			const turn = ex - Math.min(channel, Math.max(0, ex - sx)) / 2;
			return { from, to, ...elbow(sx, a.y + a.h / 2, ex, b.y + b.h / 2, turn, false) };
		}
		const sy = a.y + a.h;
		const ey = b.y;
		const turn = ey - Math.min(channel, Math.max(0, ey - sy)) / 2;
		return { from, to, ...elbow(a.x + a.w / 2, sy, b.x + b.w / 2, ey, turn, true) };
	});
	return { placed, wires, height, vertical: !horizontal, compact };
};

const Glyph = ({ icon }: { icon: PipelineNode["icon"] }) => {
	if (isValidElement(icon)) return icon;
	const name = (typeof icon === "string" && icon in ICONS ? icon : "layers") as PipelineIcon;
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{ICONS[name]}
		</svg>
	);
};

const fresh = (now: number): Engine => ({
	now,
	phase: "start",
	since: now,
	until: now + 400,
	states: {},
	fill: [],
	settled: false,
	fading: false,
	received: {},
	timers: [],
	flows: [],
	dirty: true,
});

const Pipeline = forwardRef<PipelineHandle, PipelineProps>(function Pipeline(
	{
		nodes = DEFAULT_NODES,
		edges = DEFAULT_EDGES,
		direction = "auto",
		theme = "auto",
		accentColor,
		nodeColor,
		textColor,
		nodeWidth = 188,
		height,
		radius = 14,
		speed = 1,
		pace = 1,
		rest = 2200,
		autoplay = true,
		loop = true,
		beam = true,
		grid = false,
		interactive = true,
		onNodeComplete,
		className,
		style,
	},
	ref,
) {
	const rootRef = useRef<HTMLDivElement>(null);
	const fillsRef = useRef<SVGGElement>(null);
	const fillRefs = useRef<(SVGPathElement | null)[]>([]);
	const headRefs = useRef<(SVGPathElement | null)[]>([]);
	const gradientRefs = useRef<(SVGLinearGradientElement | null)[]>([]);
	const lengthsRef = useRef<number[]>([]);
	const uid = `pl${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
	const engineRef = useRef<Engine>(fresh(0));
	const wakeRef = useRef<() => void>(() => {});
	const completeRef = useRef(onNodeComplete);
	const reduced = useSyncExternalStore(subscribeToMotion, readMotion, () => false);
	const [width, setWidth] = useState(0);
	const [dark, setDark] = useState(theme === "dark");
	const [playing, setPlaying] = useState(autoplay);
	const [view, setView] = useState<{ states: Record<string, NodeState>; fading: boolean }>({
		states: {},
		fading: false,
	});
	const [hovered, setHovered] = useState<string | null>(null);

	const graphKey = JSON.stringify([
		nodes.map((node) => node.id),
		edges,
		nodes.map((node) => node.duration ?? 0),
	]);
	const settingsRef = useRef({ nodes, speed, pace, rest, loop });

	useEffect(() => {
		completeRef.current = onNodeComplete;
		settingsRef.current = { nodes, speed, pace, rest, loop };
	});

	useEffect(() => {
		setPlaying(autoplay);
	}, [autoplay]);

	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		const update = () => setWidth(root.clientWidth);
		update();
		const observer = new ResizeObserver(update);
		observer.observe(root);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		const doc = root.ownerDocument;
		const viewport = doc.defaultView ?? window;
		if (theme !== "auto") {
			setDark(theme === "dark");
			return;
		}
		const probe = doc.createElement("canvas").getContext("2d", { willReadFrequently: true });
		const measure = () => {
			setDark(readBackdrop(root, probe).dark);
		};
		const frames: number[] = [];
		const timers: number[] = [];
		const schedule = () => {
			frames.push(viewport.requestAnimationFrame(measure));
			timers.push(viewport.setTimeout(measure, 380));
		};
		schedule();
		timers.push(viewport.setTimeout(measure, 1200));
		const observer = new MutationObserver(schedule);
		const watch = (target: Document) => {
			observer.observe(target.documentElement, {
				attributes: true,
				attributeFilter: ["class", "style", "data-theme"],
			});
			if (target.body)
				observer.observe(target.body, {
					attributes: true,
					attributeFilter: ["class", "style", "data-theme"],
				});
		};
		watch(doc);
		let outer: Element | null = null;
		try {
			outer = viewport.frameElement;
		} catch {
			outer = null;
		}
		if (outer) watch(outer.ownerDocument);
		return () => {
			observer.disconnect();
			frames.forEach((id) => viewport.cancelAnimationFrame(id));
			timers.forEach((id) => viewport.clearTimeout(id));
		};
	}, [theme]);

	const layout = useMemo(() => {
		if (width <= 0) return null;
		const [ids, links] = JSON.parse(graphKey) as [string[], [string, string][]];
		return arrange(ids, links, width, direction, clamp(finite(nodeWidth, 188), 96, 320));
	}, [graphKey, width, direction, nodeWidth]);
	const wires = useMemo(() => layout?.wires ?? [], [layout]);
	const incoming = useMemo(() => {
		const counts: Record<string, number> = {};
		wires.forEach((wire) => {
			counts[wire.to] = (counts[wire.to] ?? 0) + 1;
		});
		return counts;
	}, [wires]);
	const reach = useMemo(
		() =>
			wires.length ? wires.reduce((sum, wire) => sum + wire.length, 0) / wires.length : 0,
		[wires],
	);

	const publish = useCallback(() => {
		const engine = engineRef.current;
		if (!engine.dirty) return;
		engine.dirty = false;
		setView({ states: { ...engine.states }, fading: engine.fading });
	}, []);

	const step = useCallback(
		(dt: number) => {
			const engine = engineRef.current;
			const {
				nodes: list,
				speed: velocity,
				pace: tempo,
				rest: pause,
				loop: repeat,
			} = settingsRef.current;
			engine.now += dt;
			const now = engine.now;
			const enter = (phase: Engine["phase"], until: number) => {
				engine.phase = phase;
				engine.since = now;
				engine.until = until;
			};
			if (engine.phase === "start" && now >= engine.until) {
				enter("run", now);
				engine.received = {};
				engine.fill = wires.map(() => 0);
				engine.flows = [];
				engine.timers = [];
				engine.settled = false;
				list.forEach((node) => {
					engine.states[node.id] = "idle";
				});
				engine.dirty = true;
				list
					.filter((node) => !incoming[node.id])
					.forEach((node, index) =>
						engine.timers.push({ id: node.id, at: now + 220 + index * 140, kind: "start" }),
					);
			}
			if (engine.phase === "rest" && now >= engine.until) {
				if (repeat) {
					enter("fade", now + FADE);
					engine.fading = true;
					engine.dirty = true;
				} else enter("stopped", now);
			}
			if (engine.phase === "fade") {
				if (
					now >= engine.since + SWAP &&
					list.some((node) => (engine.states[node.id] ?? "idle") !== "idle")
				) {
					list.forEach((node) => {
						engine.states[node.id] = "idle";
					});
					engine.dirty = true;
				}
				if (now >= engine.until) {
					engine.fill = wires.map(() => 0);
					engine.settled = false;
					engine.fading = false;
					engine.dirty = true;
					enter("start", now + 360);
				}
			}
			engine.flows = engine.flows.filter((flow) => {
				const wire = wires[flow.edge];
				if (!wire) return false;
				const distance = travelled(now - flow.start, flow.velocity);
				if (distance < wire.length) {
					engine.fill[flow.edge] = distance / wire.length;
					return true;
				}
				engine.fill[flow.edge] = 1;
				engine.received[wire.to] = (engine.received[wire.to] ?? 0) + 1;
				if (engine.received[wire.to] >= (incoming[wire.to] ?? 0)) {
					engine.timers.push({
						id: wire.to,
						at: flow.start + travelTime(wire.length, flow.velocity) + 40,
						kind: "start",
					});
				}
				return false;
			});
			let guard = 0;
			while (guard++ < 64) {
				engine.timers.sort((a, b) => a.at - b.at);
				const timer = engine.timers[0];
				if (!timer || timer.at > now) break;
				engine.timers.shift();
				const node = list.find((item) => item.id === timer.id);
				if (!node) continue;
				if (timer.kind === "start") {
					engine.states[node.id] = "running";
					engine.dirty = true;
					const base = finite(node.duration, 1100) * clamp(finite(tempo, 1), 0.2, 5);
					const jitter = 0.86 + (0.28 * ((node.id.length * 37) % 10)) / 10;
					engine.timers.push({ id: node.id, at: timer.at + base * jitter, kind: "finish" });
				} else {
					engine.states[node.id] = "done";
					engine.dirty = true;
					completeRef.current?.(node.id);
					const rate = reach / (TRAVEL / clamp(finite(velocity, 1), 0.1, 6));
					wires.forEach((wire, index) => {
						if (wire.from === node.id && rate > 0)
							engine.flows.push({ edge: index, start: timer.at, velocity: rate });
					});
				}
			}
			if (engine.phase === "run" && engine.flows.length === 0 && engine.timers.length === 0) {
				enter("rest", now + Math.max(0, finite(pause, 2200)));
			}
		},
		[incoming, reach, wires],
	);

	const paint = useCallback(() => {
		const engine = engineRef.current;
		const group = fillsRef.current;
		if (group)
			group.style.opacity =
				engine.phase === "fade" ? String(1 - ease((engine.now - engine.since) / FADE)) : "1";
		const moving = new Set(engine.flows.map((flow) => flow.edge));
		wires.forEach((wire, index) => {
			const fill = fillRefs.current[index];
			const head = headRefs.current[index];
			const gradient = gradientRefs.current[index];
			const progress = clamp(engine.fill[index] ?? (engine.settled ? 1 : 0), 0, 1);
			if (fill) fill.style.strokeDashoffset = String(1 - progress);
			if (!head || !fill) return;
			const total = lengthsRef.current[index] || wire.length;
			if (!moving.has(index) || total <= 0) {
				head.style.opacity = "0";
				return;
			}
			const distance = progress * total;
			const size = Math.min(0.6, HEAD / total);
			head.style.strokeDasharray = `${size} 2`;
			head.style.strokeDashoffset = String(size - progress);
			head.style.opacity = String(
				clamp(Math.min(distance / 12, (total - distance) / 18), 0, 1),
			);
			if (gradient) {
				const tail = fill.getPointAtLength(Math.max(0, distance - HEAD));
				const tip = fill.getPointAtLength(distance);
				gradient.setAttribute("x1", tail.x.toFixed(2));
				gradient.setAttribute("y1", tail.y.toFixed(2));
				gradient.setAttribute("x2", tip.x.toFixed(2));
				gradient.setAttribute("y2", tip.y.toFixed(2));
			}
		});
	}, [wires]);

	useLayoutEffect(() => {
		engineRef.current = fresh(engineRef.current.now);
		if (reduced) {
			const engine = engineRef.current;
			(JSON.parse(graphKey) as [string[]])[0].forEach((id) => {
				engine.states[id] = "done";
			});
			engine.settled = true;
			engine.phase = "stopped";
		}
		publish();
	}, [graphKey, reduced, publish]);

	useLayoutEffect(() => {
		lengthsRef.current = wires.map(
			(wire, index) => fillRefs.current[index]?.getTotalLength() ?? wire.length,
		);
	}, [wires]);

	useLayoutEffect(() => {
		paint();
	}, [paint, graphKey, reduced]);

	useEffect(() => {
		const root = rootRef.current;
		if (!root || reduced || !playing || !layout) return;
		const doc = root.ownerDocument;
		const viewport = doc.defaultView ?? window;
		let ticking = false;
		let raf = 0;
		let last = 0;
		let visible = false;
		const tick = (time: number) => {
			raf = 0;
			ticking = true;
			const dt = last ? Math.min(64, time - last) : 16;
			last = time;
			step(dt);
			paint();
			publish();
			ticking = false;
			if (visible && !doc.hidden && engineRef.current.phase !== "stopped")
				raf = viewport.requestAnimationFrame(tick);
		};
		const wake = () => {
			if (raf || ticking || !visible || doc.hidden || engineRef.current.phase === "stopped")
				return;
			last = 0;
			raf = viewport.requestAnimationFrame(tick);
		};
		wakeRef.current = wake;
		const observer = new IntersectionObserver(
			(entries) => {
				visible = entries.some((entry) => entry.isIntersecting);
				if (visible) wake();
			},
			{ threshold: 0.2 },
		);
		observer.observe(root);
		const onVisibility = () => wake();
		doc.addEventListener("visibilitychange", onVisibility);
		return () => {
			wakeRef.current = () => {};
			observer.disconnect();
			doc.removeEventListener("visibilitychange", onVisibility);
			viewport.cancelAnimationFrame(raf);
		};
	}, [layout, paint, playing, publish, reduced, step]);

	useImperativeHandle(
		ref,
		() => ({
			run: () => {
				const engine = engineRef.current;
				engine.flows = [];
				engine.timers = [];
				engine.fading = true;
				engine.phase = "fade";
				engine.since = engine.now;
				engine.until = engine.now + FADE;
				engine.dirty = true;
				setPlaying(true);
				wakeRef.current();
			},
			play: () => {
				setPlaying(true);
				wakeRef.current();
			},
			pause: () => setPlaying(false),
		}),
		[],
	);

	const palette = makePalette(dark, accentColor, nodeColor, textColor);
	const corner = clamp(finite(radius, 14), 0, 28);
	const tint = `color-mix(in srgb, ${palette.accent} 34%, transparent)`;
	const settledRing = `color-mix(in srgb, ${palette.accent} 26%, transparent)`;
	const related = useMemo(() => {
		if (!hovered || !interactive) return null;
		const set = new Set<string>([hovered]);
		const walk = (id: string, forward: boolean) => {
			wires.forEach((wire) => {
				const next = forward
					? wire.from === id
						? wire.to
						: null
					: wire.to === id
						? wire.from
						: null;
				if (next && !set.has(next)) {
					set.add(next);
					walk(next, forward);
				}
			});
		};
		walk(hovered, true);
		walk(hovered, false);
		return set;
	}, [hovered, interactive, wires]);

	const total = height
		? Math.max(finite(height, 0), layout?.height ?? 0)
		: (layout?.height ?? 220);
	const offset = layout ? (total - layout.height) / 2 : 0;
	const summary = nodes.map((node) => node.title).join(", then ");

	return (
		<div
			ref={rootRef}
			role="img"
			aria-label={`Workflow: ${summary}`}
			className={cn("relative isolate w-full select-none", className)}
			style={{
				height: total,
				color: palette.text,
				fontFamily: SANS,
				backgroundImage: grid
					? `radial-gradient(${palette.grid} 1px, transparent 1px)`
					: undefined,
				backgroundSize: grid ? "18px 18px" : undefined,
				backgroundPosition: grid ? "center" : undefined,
				...style,
			}}
		>
			{layout ? (
				<>
					<svg
						aria-hidden="true"
						width={width}
						height={layout.height}
						fill="none"
						style={{
							position: "absolute",
							left: 0,
							top: offset,
							overflow: "visible",
							pointerEvents: "none",
						}}
					>
						<defs>
							{wires.map((wire, index) => (
								<linearGradient
									key={`${wire.from}-${wire.to}`}
									id={`${uid}-${index}`}
									ref={(element) => {
										gradientRefs.current[index] = element;
									}}
									gradientUnits="userSpaceOnUse"
								>
									<stop offset="0" stopColor={palette.accent} stopOpacity={0} />
									<stop offset="0.55" stopColor={palette.accent} />
									<stop offset="1" stopColor={palette.glint} />
								</linearGradient>
							))}
						</defs>
						<g style={{ opacity: palette.lineAlpha }}>
							{wires.map((wire) => (
								<path
									key={`${wire.from}-${wire.to}`}
									d={wire.d}
									stroke={palette.line}
									strokeWidth={1.5}
								/>
							))}
						</g>
						<g ref={fillsRef}>
							{wires.map((wire, index) => {
								const faded = related && !(related.has(wire.from) && related.has(wire.to));
								return (
									<g
										key={`${wire.from}-${wire.to}`}
										style={{ opacity: faded ? 0.2 : 1, transition: "opacity 240ms ease" }}
									>
										<path
											ref={(element) => {
												fillRefs.current[index] = element;
											}}
											d={wire.d}
											pathLength={1}
											stroke={palette.accent}
											strokeWidth={1.5}
											strokeDasharray="1 1"
											strokeDashoffset={1}
										/>
										<path
											ref={(element) => {
												headRefs.current[index] = element;
											}}
											d={wire.d}
											pathLength={1}
											stroke={`url(#${uid}-${index})`}
											strokeWidth={2}
											strokeLinecap="round"
											style={{ opacity: 0 }}
										/>
									</g>
								);
							})}
						</g>
					</svg>
					{layout.placed.map((item) => {
						const node = nodes.find((entry) => entry.id === item.id) as PipelineNode;
						const state = view.states[item.id] ?? "idle";
						const running = state === "running" && !view.fading;
						const done = state === "done" && !view.fading;
						const faded = related && !related.has(item.id);
						const line =
							state === "done" && node.status
								? node.status
								: state === "running"
									? "Running"
									: (node.description ?? "");
						const spin = Math.ceil(Math.hypot(item.w, item.h)) + 6;
						const ring = running
							? beam
								? settledRing
								: palette.accent
							: done
								? settledRing
								: palette.ring;
						return (
							<div
								key={item.id}
								onPointerEnter={(event) => {
									if (interactive && event.pointerType === "mouse") setHovered(item.id);
								}}
								onPointerLeave={() =>
									setHovered((current) => (current === item.id ? null : current))
								}
								style={{
									position: "absolute",
									boxSizing: "border-box",
									left: item.x,
									top: item.y + offset,
									width: item.w,
									height: item.h,
									borderRadius: corner,
									background: palette.surface,
									boxShadow: `0 0 0 ${running && !beam ? 1.5 : 1}px ${ring}, ${palette.shadow}`,
									opacity: faded ? 0.4 : 1,
									display: "flex",
									flexDirection: layout.compact ? "column" : "row",
									alignItems: "center",
									justifyContent: layout.compact ? "center" : undefined,
									gap: layout.compact ? 7 : 10,
									padding: layout.compact ? "0 8px" : "0 14px 0 11px",
									transition: "box-shadow 360ms ease, opacity 240ms ease",
								}}
							>
								{beam ? (
									<span
										aria-hidden="true"
										style={{
											position: "absolute",
											inset: -1,
											borderRadius: corner + 1,
											overflow: "hidden",
											pointerEvents: "none",
											opacity: running ? 1 : 0,
											transition: `opacity ${running ? 240 : 420}ms ease`,
										}}
									>
										<span
											ref={(element) => {
												if (
													!element ||
													reduced ||
													element.dataset.spin ||
													typeof element.animate !== "function"
												)
													return;
												element.dataset.spin = "1";
												element.animate(
													[{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
													{ duration: 2200, iterations: Infinity },
												);
											}}
											style={{
												position: "absolute",
												left: "50%",
												top: "50%",
												width: spin,
												height: spin,
												marginLeft: -spin / 2,
												marginTop: -spin / 2,
												background: `conic-gradient(from 0deg, transparent 0deg, transparent 170deg, ${tint} 250deg, ${palette.accent} 320deg, ${palette.glint} 352deg, transparent 360deg)`,
											}}
										/>
										<span
											style={{
												position: "absolute",
												inset: 2,
												borderRadius: Math.max(0, corner - 1),
												background: palette.surface,
											}}
										/>
									</span>
								) : null}
								<div
									style={{
										position: "relative",
										flex: "none",
										width: 32,
										height: 32,
										borderRadius: Math.max(6, corner - 5),
										display: "grid",
										placeItems: "center",
										background: running
											? `color-mix(in srgb, ${palette.accent} 16%, transparent)`
											: palette.raised,
										color: running ? palette.accent : palette.text,
										transition: "background-color 320ms ease, color 320ms ease",
									}}
								>
									<Glyph icon={node.icon} />
									<span
										aria-hidden="true"
										style={{
											position: "absolute",
											right: -5,
											bottom: -5,
											width: 16,
											height: 16,
											borderRadius: 999,
											display: "grid",
											placeItems: "center",
											background: palette.surface,
											opacity: done ? 1 : 0,
											transform: done ? "scale(1)" : "scale(0.5)",
											transition:
												"opacity 220ms ease, transform 360ms cubic-bezier(0.34, 1.56, 0.64, 1)",
										}}
									>
										<svg width="12" height="12" viewBox="0 0 16 16">
											<circle cx="8" cy="8" r="8" fill={palette.success} />
											<path
												d="M4.6 8.3l2.2 2.2 4.6-4.8"
												fill="none"
												stroke={palette.surface}
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									</span>
								</div>
								<div
									style={{
										position: "relative",
										minWidth: 0,
										flex: layout.compact ? "none" : "1 1 auto",
										maxWidth: "100%",
										textAlign: layout.compact ? "center" : "left",
									}}
								>
									<div
										style={{
											fontSize: 12.5,
											fontWeight: 600,
											letterSpacing: "-0.005em",
											lineHeight: 1.3,
											whiteSpace: "nowrap",
											overflow: "hidden",
											textOverflow: "ellipsis",
										}}
									>
										{node.title}
									</div>
									{!layout.compact ? (
										<div
											key={line}
											ref={(element) => {
												if (
													!element ||
													reduced ||
													element.dataset.shown ||
													typeof element.animate !== "function"
												)
													return;
												element.dataset.shown = "1";
												element.animate(
													[
														{ opacity: 0, transform: "translateY(2px)" },
														{ opacity: 1, transform: "translateY(0)" },
													],
													{ duration: 260, easing: "ease-out" },
												);
												if (element.dataset.shimmer) {
													element.animate(
														[{ backgroundPosition: "100% 0" }, { backgroundPosition: "0% 0" }],
														{ duration: 1500, iterations: Infinity },
													);
												}
											}}
											data-shimmer={running ? "1" : undefined}
											style={{
												marginTop: 2,
												fontSize: 11.5,
												fontWeight: 500,
												lineHeight: 1.3,
												color: running
													? "transparent"
													: state === "done"
														? palette.text
														: palette.muted,
												opacity: view.fading && state !== "idle" ? 0 : 1,
												transition: "opacity 360ms ease",
												backgroundImage: running
													? `linear-gradient(90deg, ${palette.muted} 35%, ${palette.text} 50%, ${palette.muted} 65%)`
													: undefined,
												backgroundSize: running ? "300% 100%" : undefined,
												backgroundPosition: running ? "100% 0" : undefined,
												WebkitBackgroundClip: running ? "text" : undefined,
												backgroundClip: running ? "text" : undefined,
												whiteSpace: "nowrap",
												overflow: "hidden",
												textOverflow: "ellipsis",
											}}
										>
											{line || " "}
										</div>
									) : null}
								</div>
							</div>
						);
					})}
				</>
			) : null}
		</div>
	);
});

Pipeline.displayName = "Pipeline";

export { Pipeline };
export default Pipeline;
