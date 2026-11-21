"use client";

/* Vendored from reactbits code-morph (shadcn registry). Keep close to upstream. */
/* eslint-disable no-useless-assignment, no-empty */

import {
	forwardRef,
	useCallback,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
	type CSSProperties,
	type KeyboardEvent as ReactKeyboardEvent,
	type ReactNode,
} from "react";
import { cn } from "@peridotvault/peridotbase-ui/utils";

export type CodeMorphLanguage = "tsx" | "python" | "json" | "css" | "bash";

export interface CodeMorphStep {
	code: string;
	label?: string;
	icon?: ReactNode;
	file?: string;
	language?: CodeMorphLanguage;
	highlight?: number[] | string;
}

export interface CodeMorphHandle {
	next: () => void;
	prev: () => void;
	goTo: (index: number) => void;
	play: () => void;
	pause: () => void;
}

export interface CodeMorphProps {
	steps?: CodeMorphStep[];
	language?: CodeMorphLanguage;
	chrome?: "tabs" | "window" | "none";
	frame?: "solid" | "inset";
	dots?: "mono" | "color";
	theme?: "auto" | "light" | "dark";
	accentColor?: string;
	windowColor?: string;
	textColor?: string;
	fontFamily?: string;
	fontSize?: number;
	lineHeight?: number;
	radius?: number;
	height?: number | "auto";
	lineNumbers?: boolean;
	focus?: boolean;
	fit?: boolean;
	duration?: number;
	interval?: number;
	autoplay?: boolean;
	loop?: boolean;
	pauseOnHover?: boolean;
	copyable?: boolean;
	defaultStep?: number;
	onStepChange?: (index: number) => void;
	className?: string;
	style?: CSSProperties;
}

type Kind =
	| "plain"
	| "keyword"
	| "string"
	| "number"
	| "comment"
	| "function"
	| "type"
	| "tag"
	| "attribute"
	| "property"
	| "punctuation"
	| "constant"
	| "variable";

interface Token {
	text: string;
	kind: Kind | "space";
}

interface Piece {
	text: string;
	kind: Kind;
	line: number;
}

interface Parsed {
	code: string;
	lines: Token[][];
	flat: Piece[];
	focus: Set<number> | null;
	label: string;
	file: string;
}

interface Layout {
	xs: number[];
	width: number;
}

interface Glyph {
	id: number;
	index: number;
	text: string;
	kind: Kind;
	line: number;
	x: number;
	state: "in" | "enter" | "exit";
	delay: number;
}

interface Frame {
	step: number;
	glyphs: Glyph[];
	instant: boolean;
}

interface Palette {
	surface: string;
	pill: string;
	sweep: string;
	frame: string;
	frameShadow: string;
	panel: string;
	bar: string;
	text: string;
	muted: string;
	dim: string;
	accent: string;
	shadow: string;
	dot: string;
	hover: string;
	syntax: Record<Kind, string>;
}

const MONO =
	'var(--font-mono, ui-monospace), ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace';
const SANS =
	'var(--font-sans, ui-sans-serif), ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const EASE = "cubic-bezier(0.65, 0, 0.35, 1)";

const DEFAULT_STEPS: CodeMorphStep[] = [
	{
		label: "Basic",
		file: "counter.tsx",
		code: `import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}`,
	},
	{
		label: "Props",
		file: "counter.tsx",
		code: `import { useState } from "react";

interface CounterProps {
  step?: number;
}

export function Counter({ step = 1 }: CounterProps) {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + step)}>
      Clicked {count} times
    </button>
  );
}`,
	},
	{
		label: "Animated",
		file: "counter.tsx",
		code: `import { useState } from "react";
import { motion } from "motion/react";

export function Counter({ step = 1 }: CounterProps) {
  const [count, setCount] = useState(0);

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={() => setCount((value) => value + step)}
    >
      Clicked {count} times
    </motion.button>
  );
}`,
	},
];

const KEYWORDS: Record<CodeMorphLanguage, Set<string>> = {
	tsx: new Set([
		"import",
		"from",
		"export",
		"default",
		"const",
		"let",
		"var",
		"function",
		"return",
		"if",
		"else",
		"for",
		"while",
		"do",
		"switch",
		"case",
		"break",
		"continue",
		"new",
		"class",
		"extends",
		"implements",
		"interface",
		"type",
		"enum",
		"async",
		"await",
		"try",
		"catch",
		"finally",
		"throw",
		"typeof",
		"instanceof",
		"in",
		"of",
		"as",
		"satisfies",
		"keyof",
		"readonly",
		"public",
		"private",
		"protected",
		"static",
		"yield",
		"void",
		"delete",
		"this",
		"super",
		"declare",
	]),
	python: new Set([
		"def",
		"class",
		"return",
		"if",
		"elif",
		"else",
		"for",
		"while",
		"in",
		"not",
		"and",
		"or",
		"is",
		"import",
		"from",
		"as",
		"with",
		"try",
		"except",
		"finally",
		"raise",
		"lambda",
		"yield",
		"pass",
		"break",
		"continue",
		"async",
		"await",
		"global",
		"nonlocal",
		"assert",
		"del",
		"match",
		"case",
	]),
	json: new Set<string>(),
	css: new Set<string>(),
	bash: new Set([
		"if",
		"then",
		"else",
		"elif",
		"fi",
		"for",
		"in",
		"do",
		"done",
		"while",
		"until",
		"case",
		"esac",
		"function",
		"return",
		"export",
		"local",
	]),
};

const CONSTANTS: Record<CodeMorphLanguage, Set<string>> = {
	tsx: new Set(["true", "false", "null", "undefined", "NaN", "Infinity"]),
	python: new Set(["None", "True", "False"]),
	json: new Set(["true", "false", "null"]),
	css: new Set(["inherit", "initial", "unset", "none", "auto", "transparent", "currentColor"]),
	bash: new Set(["true", "false"]),
};

const TS_TYPES = new Set([
	"string",
	"number",
	"boolean",
	"any",
	"unknown",
	"never",
	"object",
	"symbol",
	"bigint",
]);
const OPENERS = new Set([
	"(",
	",",
	"=",
	"?",
	":",
	"&&",
	"||",
	"??",
	"=>",
	"{",
	"[",
	"return",
	";",
	"}",
	"default",
]);

const SPACE = /[ ]+/y;
const LINE_COMMENT = /\/\/[^\n]*/y;
const BLOCK_COMMENT = /\/\*[\s\S]*?(?:\*\/|$)/y;
const HASH_COMMENT = /#[^\n]*/y;
const DOUBLE = /"(?:[^"\\\n]|\\.)*"?/y;
const SINGLE = /'(?:[^'\\\n]|\\.)*'?/y;
const TEMPLATE = /`(?:[^`\\]|\\[\s\S])*`?/y;
const PY_STRING =
	/[rRbBuUfF]{0,2}(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?)/y;
const DECORATOR = /@[A-Za-z_][\w.]*/y;
const NUMBER =
	/(?:0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?n?)/y;
const IDENT = /[A-Za-z_$][\w$]*/y;
const JSX_TEXT = /[^\s<{}]+/y;
const JSX_NAME = /[A-Za-z_$][\w$.:-]*/y;
const JSX_ATTR = /[A-Za-z_$][\w$-]*/y;
const PUNCT =
	/=>|\.\.\.|\?\?=?|\?\.|&&=?|\|\|=?|\*\*=?|===|!==|[-+*/%&|^<>=!]=|\+\+|--|<<=?|>>>?=?|[-+*/%=<>!&|^~?:;,.()[\]{}@#]/y;
const AT_RULE = /@[\w-]+/y;
const HEX_COLOR = /#[\da-fA-F]{3,8}(?![\w-])/y;
const CSS_NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:%|[a-zA-Z]+)?/y;
const CSS_IDENT = /-{0,2}[A-Za-z_][\w-]*/y;
const BASH_VAR = /\$(?:\{[^}\n]*\}|[A-Za-z_]\w*|[0-9@#?$!*-])/y;
const FLAG = /--?[A-Za-z0-9][\w-]*/y;
const BASH_OP = /&&|\|\||[|;&<>()]/y;
const BASH_WORD = /[^\s|;&<>()"'$#]+/y;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const finite = (value: number | undefined, fallback: number) =>
	typeof value === "number" && Number.isFinite(value) ? value : fallback;

const read = (pattern: RegExp, code: string, at: number) => {
	pattern.lastIndex = at;
	const match = pattern.exec(code);
	return match ? match[0] : "";
};

const dedent = (source: string) => {
	const lines = source.replace(/\r\n?/g, "\n").replace(/\t/g, "  ").split("\n");
	while (lines.length && !lines[0].trim()) lines.shift();
	while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
	const indents = lines
		.filter((line) => line.trim())
		.map((line) => (line.match(/^ */) ?? [""])[0].length);
	const indent = indents.length ? Math.min(...indents) : 0;
	return lines.map((line) => line.slice(indent).replace(/\s+$/, "")).join("\n");
};

const tokenize = (code: string, language: CodeMorphLanguage): Token[] => {
	const tokens: Token[] = [];
	const keywords = KEYWORDS[language];
	const constants = CONSTANTS[language];
	const contexts: string[] = [];
	let inTag = false;
	let closing = false;
	let tagName = false;
	let depth = 0;
	let command = true;
	let i = 0;
	const push = (text: string, kind: Token["kind"]) => {
		tokens.push({ text, kind });
		i += text.length;
	};
	const previous = () => {
		for (let k = tokens.length - 1; k >= 0; k--)
			if (tokens[k].kind !== "space") return tokens[k];
		return null;
	};
	const ahead = (from: number) => {
		let k = from;
		while (code[k] === " ") k++;
		return code[k] ?? "";
	};
	const classify = (word: string): Kind => {
		const prev = previous();
		const next = ahead(i + word.length);
		if (constants.has(word)) return "constant";
		if (language === "json") return "plain";
		if (keywords.has(word)) return "keyword";
		if (language === "tsx" && TS_TYPES.has(word) && prev && /^(?::|<|\||&|,)$/.test(prev.text))
			return "type";
		if (prev && prev.text === ".") return next === "(" ? "function" : "property";
		if (prev && (prev.text === "function" || prev.text === "def")) return "function";
		if (prev && prev.text === "class") return "type";
		if (next === "(") return "function";
		if (language === "python" && (word === "self" || word === "cls")) return "variable";
		if (/^[A-Z]/.test(word)) return "type";
		return "plain";
	};
	while (i < code.length) {
		const ch = code[i];
		if (ch === "\n") {
			push("\n", "space");
			command = true;
			continue;
		}
		let m = read(SPACE, code, i);
		if (m) {
			push(m, "space");
			continue;
		}
		if (language === "tsx") {
			const top = contexts[contexts.length - 1];
			if (top === "jsx" && !inTag && !tagName) {
				if (ch === "<") {
					m = code[i + 1] === "/" ? "</" : "<";
					closing = m === "</";
					if (closing) contexts.pop();
					push(m, "punctuation");
					tagName = true;
					continue;
				}
				if (ch === "{") {
					contexts.push("brace");
					push("{", "punctuation");
					continue;
				}
				m = read(JSX_TEXT, code, i);
				if (m) {
					push(m, "plain");
					continue;
				}
			}
			if (tagName) {
				tagName = false;
				m = read(JSX_NAME, code, i);
				if (m) {
					inTag = true;
					push(m, "tag");
					continue;
				}
				if (ch === ">") {
					if (!closing) contexts.push("jsx");
					closing = false;
					push(">", "punctuation");
					continue;
				}
			}
			if (inTag) {
				if (code.startsWith("/>", i)) {
					inTag = false;
					push("/>", "punctuation");
					continue;
				}
				if (ch === ">") {
					inTag = false;
					if (!closing) contexts.push("jsx");
					closing = false;
					push(">", "punctuation");
					continue;
				}
				if (ch === "{") {
					contexts.push("attr");
					inTag = false;
					push("{", "punctuation");
					continue;
				}
				m = read(DOUBLE, code, i) || read(SINGLE, code, i);
				if (m) {
					push(m, "string");
					continue;
				}
				m = read(JSX_ATTR, code, i);
				if (m) {
					push(m, "attribute");
					continue;
				}
			}
			if (ch === "}") {
				const popped = contexts.pop();
				if (popped === "attr") inTag = true;
				push("}", "punctuation");
				continue;
			}
			if (ch === "{") {
				contexts.push("brace");
				push("{", "punctuation");
				continue;
			}
			m = read(LINE_COMMENT, code, i) || read(BLOCK_COMMENT, code, i);
			if (m) {
				push(m, "comment");
				continue;
			}
			m = read(DOUBLE, code, i) || read(SINGLE, code, i) || read(TEMPLATE, code, i);
			if (m) {
				push(m, "string");
				continue;
			}
			if (ch === "<" && /[A-Za-z>]/.test(code[i + 1] ?? "")) {
				const prev = previous();
				if (!prev || OPENERS.has(prev.text)) {
					closing = false;
					tagName = true;
					push("<", "punctuation");
					continue;
				}
			}
		}
		if (language === "python") {
			m = read(HASH_COMMENT, code, i);
			if (m) {
				push(m, "comment");
				continue;
			}
			m = read(PY_STRING, code, i);
			if (m) {
				push(m, "string");
				continue;
			}
			m = read(DECORATOR, code, i);
			if (m) {
				push(m, "function");
				continue;
			}
		}
		if (language === "json") {
			m = read(DOUBLE, code, i);
			if (m) {
				push(m, ahead(i + m.length) === ":" ? "attribute" : "string");
				continue;
			}
		}
		if (language === "css") {
			m = read(BLOCK_COMMENT, code, i);
			if (m) {
				push(m, "comment");
				continue;
			}
			m = read(DOUBLE, code, i) || read(SINGLE, code, i);
			if (m) {
				push(m, "string");
				continue;
			}
			if (ch === "{") {
				depth++;
				push("{", "punctuation");
				continue;
			}
			if (ch === "}") {
				depth = Math.max(0, depth - 1);
				push("}", "punctuation");
				continue;
			}
			m = read(AT_RULE, code, i);
			if (m) {
				push(m, "keyword");
				continue;
			}
			if (depth > 0) {
				m = read(HEX_COLOR, code, i);
				if (m) {
					push(m, "number");
					continue;
				}
			}
			m = read(CSS_NUMBER, code, i);
			if (m) {
				push(m, "number");
				continue;
			}
			m = read(CSS_IDENT, code, i);
			if (m) {
				const prev = previous();
				const next = ahead(i + m.length);
				let kind: Kind = "plain";
				if (depth === 0 || next === "{" || next === ",") kind = "tag";
				else if (next === ":" && (!prev || prev.text === "{" || prev.text === ";"))
					kind = "attribute";
				else if (next === "(") kind = "function";
				else if (constants.has(m)) kind = "constant";
				push(m, kind);
				continue;
			}
		}
		if (language === "bash") {
			if (ch === "#" && (i === 0 || /\s/.test(code[i - 1]))) {
				push(read(HASH_COMMENT, code, i), "comment");
				continue;
			}
			m = read(DOUBLE, code, i) || read(SINGLE, code, i);
			if (m) {
				command = false;
				push(m, "string");
				continue;
			}
			m = read(BASH_VAR, code, i);
			if (m) {
				command = false;
				push(m, "variable");
				continue;
			}
			if (ch === "-" && (i === 0 || /\s/.test(code[i - 1]))) {
				m = read(FLAG, code, i);
				if (m) {
					push(m, "attribute");
					continue;
				}
			}
			m = read(BASH_OP, code, i);
			if (m) {
				command = /^(?:\|\||&&|\||;|\()$/.test(m);
				push(m, "punctuation");
				continue;
			}
			m = read(BASH_WORD, code, i);
			if (m) {
				let kind: Kind = "plain";
				if (keywords.has(m)) kind = "keyword";
				else if (command) {
					kind = "function";
					command = false;
				} else if (/^\d+$/.test(m)) kind = "number";
				push(m, kind);
				continue;
			}
		}
		m = read(NUMBER, code, i);
		if (m) {
			push(m, "number");
			continue;
		}
		m = read(IDENT, code, i);
		if (m) {
			push(m, classify(m));
			continue;
		}
		m = read(PUNCT, code, i);
		if (m) {
			push(m, "punctuation");
			continue;
		}
		push(ch, "plain");
	}
	return tokens;
};

const split = (tokens: Token[]) => {
	const lines: Token[][] = [[]];
	for (const token of tokens) {
		token.text.split("\n").forEach((part, index) => {
			if (index > 0) lines.push([]);
			if (part) lines[lines.length - 1].push({ text: part, kind: token.kind });
		});
	}
	return lines;
};

const parseFocus = (value: CodeMorphStep["highlight"], count: number) => {
	if (!value) return null;
	const lines = new Set<number>();
	const add = (line: number) => {
		if (Number.isInteger(line) && line >= 1 && line <= count) lines.add(line - 1);
	};
	if (Array.isArray(value)) value.forEach(add);
	else
		value.split(",").forEach((part) => {
			const [from, to] = part.split("-").map((item) => parseInt(item.trim(), 10));
			if (!Number.isFinite(from)) return;
			const end = Number.isFinite(to) ? to : from;
			for (let line = from; line <= end; line++) add(line);
		});
	return lines.size ? lines : null;
};

const parseStep = (
	step: CodeMorphStep,
	fallback: CodeMorphLanguage,
	index: number,
): Parsed => {
	const code = dedent(step.code ?? "");
	const lines = split(tokenize(code, step.language ?? fallback));
	const flat: Piece[] = [];
	lines.forEach((line, row) =>
		line.forEach((token) => {
			if (token.kind !== "space") flat.push({ text: token.text, kind: token.kind, line: row });
		}),
	);
	return {
		code,
		lines,
		flat,
		focus: parseFocus(step.highlight, lines.length),
		label: step.label || step.file || `Step ${index + 1}`,
		file: step.file || step.label || "",
	};
};

const align = (a: string[], b: string[]) => {
	const n = a.length;
	const m = b.length;
	const result = new Int32Array(m).fill(-1);
	if (!n || !m || n * m > 2_000_000) return result;
	const width = m + 1;
	const table = new Uint16Array((n + 1) * width);
	for (let i = n - 1; i >= 0; i--) {
		for (let j = m - 1; j >= 0; j--) {
			table[i * width + j] =
				a[i] === b[j]
					? table[(i + 1) * width + j + 1] + 1
					: Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
		}
	}
	let i = 0;
	let j = 0;
	while (i < n && j < m) {
		if (a[i] === b[j]) {
			result[j] = i;
			i++;
			j++;
		} else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) i++;
		else j++;
	}
	return result;
};

const ranges = (focus: Set<number> | null) => {
	if (!focus) return [];
	const sorted = [...focus].sort((a, b) => a - b);
	const out: [number, number][] = [];
	for (const line of sorted) {
		const last = out[out.length - 1];
		if (last && line === last[1] + 1) last[1] = line;
		else out.push([line, line]);
	}
	return out;
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
		const ink = text || "#E7E7EA";
		const lead = accent || "#A99BFF";
		return {
			surface: surface || "#111113",
			pill: "rgba(255,255,255,0.075)",
			sweep: "rgba(255,255,255,0.055)",
			frame: `color-mix(in srgb, ${surface || "#111113"} 94%, #ffffff)`,
			frameShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 24px 60px -16px rgba(0,0,0,0.65)",
			panel: "inset 0 0 0 1px rgba(255,255,255,0.06)",
			bar: "rgba(255,255,255,0.025)",
			text: ink,
			muted: "#8C8C95",
			dim: "#55555E",
			accent: lead,
			shadow: "0 0 0 1px rgba(255,255,255,0.07), 0 24px 60px -16px rgba(0,0,0,0.65)",
			dot: "rgba(255,255,255,0.14)",
			hover: "rgba(255,255,255,0.07)",
			syntax: {
				plain: ink,
				property: ink,
				keyword: lead,
				string: "#86E1A1",
				number: "#FFA07A",
				constant: "#FFA07A",
				comment: "#66666F",
				function: "#7DB4FF",
				type: "#6FD3CF",
				tag: "#FF8FAB",
				attribute: "#F2C27B",
				punctuation: "#8C8C95",
				variable: "#6FD3CF",
			},
		};
	}
	const ink = text || "#18181B";
	const lead = accent || "#5227FF";
	return {
		surface: surface || "#FFFFFF",
		pill: "rgba(0,0,0,0.05)",
		sweep: "rgba(0,0,0,0.045)",
		frame: `color-mix(in srgb, ${surface || "#FFFFFF"} 96%, #000000)`,
		frameShadow: "0 0 0 1px rgba(0,0,0,0.05), 0 16px 40px -14px rgba(0,0,0,0.14)",
		panel: "inset 0 0 0 1px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
		bar: "rgba(0,0,0,0.022)",
		text: ink,
		muted: "#71717A",
		dim: "#B4B4BC",
		accent: lead,
		shadow:
			"0 0 0 1px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04), 0 16px 40px -14px rgba(0,0,0,0.16)",
		dot: "rgba(0,0,0,0.12)",
		hover: "rgba(0,0,0,0.05)",
		syntax: {
			plain: ink,
			property: ink,
			keyword: lead,
			string: "#0B7A3E",
			number: "#C2410C",
			constant: "#C2410C",
			comment: "#A1A1AA",
			function: "#1D5FD1",
			type: "#0F7C86",
			tag: "#C2185B",
			attribute: "#9A6700",
			punctuation: "#71717A",
			variable: "#0F7C86",
		},
	};
};

const CopyIcon = ({ done }: { done: boolean }) =>
	done ? (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M5 12.5l4.5 4.5L19 7.5" />
		</svg>
	) : (
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.8"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<rect x="8.5" y="8.5" width="12" height="12" rx="2.5" />
			<path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5" />
		</svg>
	);

const CodeMorph = forwardRef<CodeMorphHandle, CodeMorphProps>(function CodeMorph(
	{
		steps = DEFAULT_STEPS,
		language = "tsx",
		chrome = "tabs",
		frame = "inset",
		dots = "mono",
		theme = "auto",
		accentColor,
		windowColor,
		textColor,
		fontFamily,
		fontSize = 13,
		lineHeight = 1.7,
		radius = 16,
		height = "auto",
		lineNumbers = true,
		focus = true,
		fit = true,
		duration = 800,
		interval = 4200,
		autoplay = true,
		loop = true,
		pauseOnHover = true,
		copyable = true,
		defaultStep = 0,
		onStepChange,
		className,
		style,
	},
	ref,
) {
	const rootRef = useRef<HTMLDivElement>(null);
	const bodyRef = useRef<HTMLDivElement>(null);
	const measureRef = useRef<HTMLDivElement>(null);
	const tablistRef = useRef<HTMLDivElement>(null);
	const fillRef = useRef<HTMLDivElement>(null);
	const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
	const frameRef = useRef<Frame | null>(null);
	const idRef = useRef(1);
	const elapsedRef = useRef(0);
	const hoverRef = useRef(false);
	const timersRef = useRef<number[]>([]);
	const changeRef = useRef(onStepChange);
	const reduced = useSyncExternalStore(subscribeToMotion, readMotion, () => false);
	const [scene, setScene] = useState<Frame | null>(null);
	const [layouts, setLayouts] = useState<{ items: Layout[]; char: number } | null>(null);
	const [avail, setAvail] = useState(0);
	const [dark, setDark] = useState(theme === "dark");
	const [playing, setPlaying] = useState(autoplay);
	const [copied, setCopied] = useState(false);
	const [indicator, setIndicator] = useState({ left: 0, width: 0 });

	useEffect(() => {
		changeRef.current = onStepChange;
	});

	const stepsKey = JSON.stringify(
		[steps.length ? steps : DEFAULT_STEPS, language],
		(key, value) => (key === "icon" ? undefined : value),
	);
	const parsed = useMemo(() => {
		const [list, lang] = JSON.parse(stepsKey) as [CodeMorphStep[], CodeMorphLanguage];
		return list.map((step, index) => parseStep(step, lang, index));
	}, [stepsKey]);

	const count = parsed.length;
	const size = clamp(finite(fontSize, 13), 9, 24);
	const leading = clamp(finite(lineHeight, 1.7), 1.2, 2.4);
	const font = fontFamily || MONO;
	const lh = size * leading;
	const time = clamp(finite(duration, 800), 0, 4000);
	const corner = clamp(finite(radius, 14), 0, 40);
	const inset = frame === "inset";
	const gap = 4;
	const inner = Math.max(0, corner - gap);
	const bar = inset ? 38 : 40;
	const pillGap = (bar - 28) / 2;
	const pillRadius = clamp(corner - pillGap, 4, 11);
	const maxLines = parsed.reduce((most, item) => Math.max(most, item.lines.length), 1);
	const digits = String(maxLines).length;

	const apply = useCallback((next: Frame) => {
		frameRef.current = next;
		setScene(next);
	}, []);

	const later = useCallback((callback: () => void, wait: number) => {
		const root = rootRef.current;
		const view = root?.ownerDocument.defaultView ?? window;
		const handle = view.setTimeout(() => {
			timersRef.current = timersRef.current.filter((item) => item !== handle);
			callback();
		}, wait);
		timersRef.current.push(handle);
	}, []);

	const settle = useCallback(() => {
		const root = rootRef.current;
		const view = root?.ownerDocument.defaultView ?? window;
		view.requestAnimationFrame(() =>
			view.requestAnimationFrame(() => {
				const current = frameRef.current;
				if (!current) return;
				if (!current.instant && !current.glyphs.some((glyph) => glyph.state === "enter"))
					return;
				apply({
					...current,
					instant: false,
					glyphs: current.glyphs.map((glyph) =>
						glyph.state === "enter" ? { ...glyph, state: "in" } : glyph,
					),
				});
			}),
		);
	}, [apply]);

	const build = useCallback(
		(index: number, items: Layout[]): Frame => {
			const target = parsed[index];
			const layout = items[index];
			return {
				step: index,
				instant: true,
				glyphs: target.flat.map((piece, k) => ({
					id: idRef.current++,
					index: k,
					text: piece.text,
					kind: piece.kind,
					line: piece.line,
					x: layout?.xs[k] ?? 0,
					state: "in",
					delay: 0,
				})),
			};
		},
		[parsed],
	);

	useLayoutEffect(() => {
		const host = measureRef.current;
		if (!host) return;
		const doc = host.ownerDocument;
		let cancelled = false;
		const measure = () => {
			if (cancelled) return;
			const probe = host.querySelector<HTMLElement>("[data-probe]");
			const char = probe ? probe.getBoundingClientRect().width / 10 : size * 0.6;
			const items: Layout[] = [];
			host.querySelectorAll<HTMLElement>("[data-step]").forEach((node) => {
				const base = node.getBoundingClientRect();
				const xs: number[] = [];
				let width = 0;
				node.querySelectorAll<HTMLElement>("[data-token]").forEach((span) => {
					const rect = span.getBoundingClientRect();
					const x = rect.left - base.left;
					xs.push(x);
					width = Math.max(width, x + rect.width);
				});
				items.push({ xs, width });
			});
			setLayouts({ items, char });
			const current = frameRef.current;
			const index = clamp(
				current ? current.step : Math.round(finite(defaultStep, 0)),
				0,
				Math.max(0, items.length - 1),
			);
			if (
				current &&
				current.glyphs.length &&
				current.step === index &&
				current.glyphs.every(
					(glyph) => glyph.state === "exit" || glyph.index < (items[index]?.xs.length ?? 0),
				)
			) {
				const layout = items[index];
				const sameText = current.glyphs
					.filter((glyph) => glyph.state !== "exit")
					.every((glyph) => parsed[index].flat[glyph.index]?.text === glyph.text);
				if (sameText) {
					apply({
						...current,
						instant: true,
						glyphs: current.glyphs
							.filter((glyph) => glyph.state !== "exit")
							.map((glyph) => ({
								...glyph,
								x: layout?.xs[glyph.index] ?? glyph.x,
								state: "in" as const,
								delay: 0,
							})),
					});
					settle();
					return;
				}
			}
			apply(build(index, items));
			settle();
		};
		measure();
		const fonts = doc.fonts;
		if (fonts) {
			fonts.ready.then(measure).catch(() => {});
			fonts.addEventListener?.("loadingdone", measure);
		}
		return () => {
			cancelled = true;
			fonts?.removeEventListener?.("loadingdone", measure);
		};
	}, [parsed, font, size, leading, apply, build, settle, defaultStep]);

	useEffect(() => {
		const body = bodyRef.current;
		if (!body) return;
		const update = () => setAvail(body.clientWidth);
		update();
		const observer = new ResizeObserver(update);
		observer.observe(body);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		const doc = root.ownerDocument;
		const view = doc.defaultView ?? window;
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
			frames.push(view.requestAnimationFrame(measure));
			timers.push(view.setTimeout(measure, 380));
		};
		schedule();
		timers.push(view.setTimeout(measure, 1200));
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
			outer = view.frameElement;
		} catch {
			outer = null;
		}
		if (outer) watch(outer.ownerDocument);
		return () => {
			observer.disconnect();
			frames.forEach((id) => view.cancelAnimationFrame(id));
			timers.forEach((id) => view.clearTimeout(id));
		};
	}, [theme]);

	useEffect(() => {
		setPlaying(autoplay);
	}, [autoplay]);

	useEffect(() => {
		const timers = timersRef;
		const root = rootRef.current;
		return () => {
			const view = root?.ownerDocument.defaultView ?? window;
			timers.current.forEach((handle) => view.clearTimeout(handle));
			timers.current = [];
		};
	}, []);

	const goTo = useCallback(
		(target: number) => {
			const current = frameRef.current;
			if (!current || !layouts) return;
			const index = ((Math.round(target) % count) + count) % count;
			if (index === current.step) return;
			const next = parsed[index];
			const layout = layouts.items[index];
			if (!next || !layout) return;
			const present = current.glyphs.filter((glyph) => glyph.state !== "exit");
			const match = align(
				present.map((glyph) => glyph.text),
				next.flat.map((piece) => piece.text),
			);
			const used = new Uint8Array(present.length);
			match.forEach((value) => {
				if (value >= 0) used[value] = 1;
			});
			next.flat.forEach((piece, j) => {
				if (
					match[j] >= 0 ||
					piece.text.length < 2 ||
					piece.kind === "punctuation" ||
					piece.kind === "comment"
				)
					return;
				let best = -1;
				let score = Infinity;
				present.forEach((glyph, k) => {
					if (used[k] || glyph.text !== piece.text || Math.abs(glyph.line - piece.line) > 24)
						return;
					const distance =
						Math.abs(glyph.line - piece.line) + Math.abs(glyph.x - layout.xs[j]) / 400;
					if (distance < score) {
						score = distance;
						best = k;
					}
				});
				if (best >= 0) {
					match[j] = best;
					used[best] = 1;
				}
			});
			let first = Infinity;
			next.flat.forEach((piece, j) => {
				if (match[j] < 0) first = Math.min(first, piece.line);
			});
			const glyphs: Glyph[] = next.flat.map((piece, j) => {
				const x = layout.xs[j] ?? 0;
				if (match[j] >= 0) {
					const glyph = present[match[j]];
					return {
						id: glyph.id,
						index: j,
						text: piece.text,
						kind: piece.kind,
						line: piece.line,
						x,
						state: "in",
						delay: 0,
					};
				}
				return {
					id: idRef.current++,
					index: j,
					text: piece.text,
					kind: piece.kind,
					line: piece.line,
					x,
					state: reduced ? "in" : "enter",
					delay: Math.round(time * 0.6 + Math.min(120, (piece.line - first) * 14)),
				};
			});
			if (!reduced)
				present.forEach((glyph, k) => {
					if (!used[k]) glyphs.push({ ...glyph, state: "exit", delay: 0 });
				});
			glyphs.sort((a, b) => a.id - b.id);
			apply({ step: index, glyphs, instant: reduced });
			elapsedRef.current = 0;
			changeRef.current?.(index);
			if (!reduced) {
				settle();
				later(() => {
					const latest = frameRef.current;
					if (!latest || !latest.glyphs.some((glyph) => glyph.state === "exit")) return;
					apply({
						...latest,
						glyphs: latest.glyphs.filter((glyph) => glyph.state !== "exit"),
					});
				}, time + 60);
			}
		},
		[apply, count, later, layouts, parsed, reduced, settle, time],
	);

	const stepNow = scene?.step ?? clamp(Math.round(finite(defaultStep, 0)), 0, count - 1);

	const advance = useCallback(() => {
		const current = frameRef.current;
		if (!current) return;
		if (!loop && current.step >= count - 1) {
			setPlaying(false);
			return;
		}
		goTo(current.step + 1);
	}, [count, goTo, loop]);

	const running = playing && count > 1 && !reduced && !!layouts;

	useEffect(() => {
		const root = rootRef.current;
		const fill = fillRef.current;
		if (!root) return;
		if (!running) {
			if (fill) fill.style.transform = "scaleX(0)";
			return;
		}
		const doc = root.ownerDocument;
		const view = doc.defaultView ?? window;
		const wait = Math.max(time + 400, finite(interval, 4200));
		let raf = 0;
		let last = 0;
		let visible = false;
		const tick = (now: number) => {
			raf = 0;
			const dt = last ? Math.min(64, now - last) : 0;
			last = now;
			if (!(pauseOnHover && hoverRef.current)) elapsedRef.current += dt;
			const progress = clamp(elapsedRef.current / wait, 0, 1);
			if (fillRef.current) fillRef.current.style.transform = `scaleX(${progress})`;
			if (progress >= 1) {
				elapsedRef.current = 0;
				advance();
			}
			if (visible && !doc.hidden) raf = view.requestAnimationFrame(tick);
		};
		const wake = () => {
			if (raf || !visible || doc.hidden) return;
			last = 0;
			raf = view.requestAnimationFrame(tick);
		};
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
			observer.disconnect();
			doc.removeEventListener("visibilitychange", onVisibility);
			view.cancelAnimationFrame(raf);
		};
	}, [advance, interval, pauseOnHover, running, time]);

	useLayoutEffect(() => {
		const list = tablistRef.current;
		const tab = tabRefs.current[stepNow];
		if (!list || !tab) return;
		const next = { left: tab.offsetLeft, width: tab.offsetWidth };
		setIndicator((current) =>
			current.left === next.left && current.width === next.width ? current : next,
		);
		const target = tab.offsetLeft - (list.clientWidth - tab.offsetWidth) / 2;
		if (list.scrollWidth > list.clientWidth)
			list.scrollTo({ left: Math.max(0, target), behavior: reduced ? "auto" : "smooth" });
	}, [stepNow, chrome, size, parsed, avail, reduced, layouts]);

	useImperativeHandle(
		ref,
		() => ({
			next: () => goTo((frameRef.current?.step ?? 0) + 1),
			prev: () => goTo((frameRef.current?.step ?? 0) - 1),
			goTo: (index: number) => goTo(index),
			play: () => setPlaying(true),
			pause: () => setPlaying(false),
		}),
		[goTo],
	);

	const copy = () => {
		const root = rootRef.current;
		const doc = root?.ownerDocument ?? document;
		const view = doc.defaultView ?? window;
		const text = parsed[stepNow]?.code ?? "";
		const done = () => {
			setCopied(true);
			view.setTimeout(() => setCopied(false), 1400);
		};
		const fallback = () => {
			const area = doc.createElement("textarea");
			area.value = text;
			area.style.cssText = "position:fixed;opacity:0;pointer-events:none";
			doc.body.appendChild(area);
			area.select();
			try {
				doc.execCommand("copy");
			} catch {}
			area.remove();
			done();
		};
		const clipboard = view.navigator.clipboard;
		if (clipboard?.writeText) clipboard.writeText(text).then(done, fallback);
		else fallback();
	};

	const onTabKey = (event: ReactKeyboardEvent, index: number) => {
		let target = -1;
		if (event.key === "ArrowRight") target = (index + 1) % count;
		else if (event.key === "ArrowLeft") target = (index - 1 + count) % count;
		else if (event.key === "Home") target = 0;
		else if (event.key === "End") target = count - 1;
		if (target < 0) return;
		event.preventDefault();
		tabRefs.current[target]?.focus();
		goTo(target);
	};

	const palette = makePalette(dark, accentColor, windowColor, textColor);
	const current = parsed[stepNow];
	const focusLines = focus ? (current?.focus ?? null) : null;
	const bands = ranges(focusLines);
	const maxBands = parsed.reduce(
		(most, item) => Math.max(most, ranges(focus ? item.focus : null).length),
		0,
	);
	const char = layouts?.char ?? size * 0.6;
	const gutter = lineNumbers ? (digits + 2) * char : 0;
	const contentWidth =
		gutter +
		(layouts ? layouts.items.reduce((most, item) => Math.max(most, item.width), 0) : 0);
	const padX = avail > 0 && avail < 440 ? 14 : 20;
	const room = Math.max(0, avail - padX * 2);
	const scale = fit && contentWidth > 0 && room > 0 ? Math.min(1, room / contentWidth) : 1;
	const codeHeight = maxLines * lh;
	const lineCount = current?.lines.length ?? 0;
	const fade = Math.round(time * 0.4);
	const exit = Math.round(time * 0.32);
	const instant = reduced || !scene || scene.instant;
	const dimmed = (line: number) => !!focusLines && !focusLines.has(line);

	const header =
		chrome === "none" ? null : (
			<div
				style={{
					position: "relative",
					flex: "none",
					height: bar,
					display: "flex",
					alignItems: "stretch",
					background: inset ? "transparent" : palette.bar,
					paddingLeft: chrome === "tabs" ? pillGap : inset ? 13 : 14,
					paddingRight: pillGap,
				}}
			>
				{chrome === "window" ? (
					<>
						<div aria-hidden="true" style={{ display: "flex", gap: 7, alignItems: "center" }}>
							{(dots === "color"
								? ["#FF5F57", "#FEBC2E", "#28C840"]
								: [palette.dot, palette.dot, palette.dot]
							).map((color, index) => (
								<span
									key={index}
									style={{ width: 11, height: 11, borderRadius: 999, background: color }}
								/>
							))}
						</div>
						<div
							key={current?.file}
							aria-hidden="true"
							ref={(node) => {
								if (!node || reduced || typeof node.animate !== "function") return;
								node.animate([{ opacity: 0 }, { opacity: 1 }], {
									duration: 260,
									easing: "ease-out",
								});
							}}
							style={{
								position: "absolute",
								left: 76,
								right: 76,
								top: 0,
								bottom: 0,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								fontFamily: SANS,
								fontSize: 12,
								fontWeight: 500,
								color: palette.muted,
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis",
								pointerEvents: "none",
							}}
						>
							{current?.file}
						</div>
						<div style={{ flex: "1 1 auto" }} />
					</>
				) : (
					<div
						ref={tablistRef}
						role="tablist"
						aria-label="Code steps"
						style={{
							position: "relative",
							flex: "1 1 auto",
							minWidth: 0,
							display: "flex",
							alignItems: "center",
							gap: 2,
							overflowX: "auto",
							overflowY: "hidden",
							scrollbarWidth: "none",
						}}
					>
						{count > 0 ? (
							<div
								aria-hidden="true"
								style={{
									position: "absolute",
									top: "50%",
									left: indicator.left,
									width: indicator.width,
									height: 28,
									marginTop: -14,
									borderRadius: pillRadius,
									overflow: "hidden",
									background: palette.pill,
									opacity: indicator.width ? 1 : 0,
									transition: reduced
										? "none"
										: "left 420ms cubic-bezier(0.22, 1, 0.36, 1), width 420ms cubic-bezier(0.22, 1, 0.36, 1)",
								}}
							>
								<div
									ref={fillRef}
									style={{
										position: "absolute",
										inset: 0,
										background: palette.sweep,
										transformOrigin: "0 50%",
										transform: "scaleX(0)",
									}}
								/>
							</div>
						) : null}
						{parsed.map((item, index) => (
							<button
								key={index}
								ref={(node) => {
									tabRefs.current[index] = node;
								}}
								type="button"
								role="tab"
								aria-selected={index === stepNow}
								tabIndex={index === stepNow ? 0 : -1}
								onClick={() => goTo(index)}
								onKeyDown={(event) => onTabKey(event, index)}
								style={{
									position: "relative",
									flex: "none",
									boxSizing: "border-box",
									height: 28,
									padding: "0 11px",
									border: 0,
									borderRadius: pillRadius,
									background: "transparent",
									fontFamily: SANS,
									fontSize: 12.5,
									fontWeight: 500,
									letterSpacing: "0.005em",
									color: index === stepNow ? palette.text : palette.muted,
									cursor: "pointer",
									whiteSpace: "nowrap",
									transition: "color 220ms ease",
									outlineOffset: 2,
									display: "inline-flex",
									alignItems: "center",
									gap: 6,
								}}
							>
								{(steps.length ? steps : DEFAULT_STEPS)[index]?.icon}
								{item.label}
							</button>
						))}
					</div>
				)}
				{copyable ? (
					<button
						type="button"
						aria-label={copied ? "Copied" : "Copy code"}
						onClick={copy}
						onMouseEnter={(event) => (event.currentTarget.style.background = palette.hover)}
						onMouseLeave={(event) => (event.currentTarget.style.background = "transparent")}
						style={{
							flex: "none",
							alignSelf: "center",
							boxSizing: "border-box",
							width: 28,
							height: 28,
							padding: 0,
							display: "grid",
							placeItems: "center",
							border: 0,
							borderRadius: pillRadius,
							background: "transparent",
							color: copied ? palette.syntax.string : palette.muted,
							cursor: "pointer",
							transition: "background-color 160ms ease, color 160ms ease",
						}}
					>
						<CopyIcon done={copied} />
					</button>
				) : null}
			</div>
		);

	return (
		<div
			ref={rootRef}
			role="group"
			aria-label={current?.file ? `Code example, ${current.file}` : "Code example"}
			onPointerEnter={(event) => {
				if (event.pointerType === "mouse") hoverRef.current = true;
			}}
			onPointerLeave={() => {
				hoverRef.current = false;
			}}
			className={cn("relative isolate flex w-full flex-col overflow-hidden", className)}
			style={{
				height: height === "auto" ? undefined : height,
				borderRadius: corner,
				background: inset ? palette.frame : palette.surface,
				boxShadow: inset ? palette.frameShadow : palette.shadow,
				color: palette.text,
				...style,
			}}
		>
			{header}
			<div
				style={{
					position: "relative",
					flex: height === "auto" ? "none" : "1 1 auto",
					minHeight: 0,
					display: "flex",
					flexDirection: "column",
					margin: inset ? (chrome === "none" ? gap : `0 ${gap}px ${gap}px`) : 0,
					borderRadius: inset ? inner : 0,
					background: inset ? palette.surface : "transparent",
					boxShadow: inset ? palette.panel : "none",
					overflow: "hidden",
				}}
			>
				<div
					ref={bodyRef}
					style={{
						position: "relative",
						flex: height === "auto" ? "none" : "1 1 auto",
						minHeight: 0,
						overflow: "hidden",
						padding: `${chrome === "none" ? 18 : 14}px ${padX}px 18px`,
						WebkitMaskImage:
							!fit && contentWidth > room
								? "linear-gradient(to right, #000 calc(100% - 40px), transparent)"
								: undefined,
						maskImage:
							!fit && contentWidth > room
								? "linear-gradient(to right, #000 calc(100% - 40px), transparent)"
								: undefined,
					}}
				>
					<pre
						style={{
							position: "absolute",
							width: 1,
							height: 1,
							margin: 0,
							overflow: "hidden",
							clip: "rect(0 0 0 0)",
							whiteSpace: "pre",
						}}
					>
						{current?.code}
					</pre>
					{Array.from({ length: maxBands }, (_, index) => {
						const band = bands[index];
						const top = band ? band[0] : (bands[bands.length - 1]?.[0] ?? 0);
						const rows = band ? band[1] - band[0] + 1 : 1;
						return (
							<div
								key={index}
								aria-hidden="true"
								style={{
									position: "absolute",
									left: 0,
									right: 0,
									top: (chrome === "none" ? 18 : 14) + top * lh * scale,
									height: rows * lh * scale,
									background: `color-mix(in srgb, ${palette.accent} ${dark ? 11 : 7}%, transparent)`,
									boxShadow: `inset 2px 0 0 ${palette.accent}`,
									opacity: band ? 1 : 0,
									transition: instant
										? "none"
										: `top ${time}ms ${EASE}, height ${time}ms ${EASE}, opacity ${fade}ms ease`,
								}}
							/>
						);
					})}
					<div
						style={{
							position: "relative",
							width: contentWidth * scale,
							height: codeHeight * scale,
						}}
					>
						<div
							aria-hidden="true"
							style={{
								position: "absolute",
								left: 0,
								top: 0,
								width: contentWidth,
								height: codeHeight,
								transform: scale === 1 ? undefined : `scale(${scale})`,
								transformOrigin: "0 0",
								fontFamily: font,
								fontSize: size,
								lineHeight: `${lh}px`,
								whiteSpace: "pre",
								fontVariantLigatures: "none",
								userSelect: "none",
								WebkitUserSelect: "none",
							}}
						>
							{lineNumbers
								? Array.from({ length: maxLines }, (_, line) => (
										<span
											key={`n${line}`}
											style={{
												position: "absolute",
												left: 0,
												top: line * lh,
												width: digits * char,
												textAlign: "right",
												color:
													focusLines && focusLines.has(line) ? palette.muted : palette.dim,
												opacity: line < lineCount ? 1 : 0,
												transition: instant
													? "none"
													: line < lineCount
														? `opacity ${fade}ms ease ${Math.round(time * 0.6)}ms, color ${time}ms ease`
														: `opacity ${exit}ms ease, color ${time}ms ease`,
											}}
										>
											{line + 1}
										</span>
									))
								: null}
							{scene
								? scene.glyphs.map((glyph) => {
										const shown = glyph.state === "in";
										return (
											<span
												key={glyph.id}
												style={{
													position: "absolute",
													left: 0,
													top: 0,
													transform: `translate3d(${gutter + glyph.x}px, ${glyph.line * lh}px, 0)`,
													color: palette.syntax[glyph.kind],
													fontStyle: glyph.kind === "comment" ? "italic" : undefined,
													opacity: shown ? (dimmed(glyph.line) ? 0.32 : 1) : 0,
													filter: shown ? "none" : "blur(3px)",
													transition: instant
														? "none"
														: glyph.state === "exit"
															? `opacity ${exit}ms ease, filter ${exit}ms ease`
															: `transform ${time}ms ${EASE}, color ${time}ms ease, opacity ${fade}ms ease ${glyph.delay}ms, filter ${fade}ms ease ${glyph.delay}ms`,
												}}
											>
												{glyph.text}
											</span>
										);
									})
								: (current?.lines ?? []).map((line, row) => (
										<div
											key={row}
											style={{ position: "absolute", left: gutter, top: row * lh }}
										>
											{line.map((token, index) => (
												<span
													key={index}
													style={{
														color:
															token.kind === "space" ? undefined : palette.syntax[token.kind],
													}}
												>
													{token.text}
												</span>
											))}
										</div>
									))}
						</div>
					</div>
					<div
						ref={measureRef}
						aria-hidden="true"
						style={{
							position: "absolute",
							left: 0,
							top: 0,
							width: "max-content",
							visibility: "hidden",
							pointerEvents: "none",
							fontFamily: font,
							fontSize: size,
							lineHeight: `${lh}px`,
							whiteSpace: "pre",
							fontVariantLigatures: "none",
						}}
					>
						<span data-probe="">0000000000</span>
						{parsed.map((item, index) => (
							<div key={index} data-step="" style={{ position: "absolute", left: 0, top: 0 }}>
								{item.lines.map((line, row) => (
									<div key={row} style={{ height: lh }}>
										{line.map((token, k) =>
											token.kind === "space" ? (
												<span key={k}>{token.text}</span>
											) : (
												<span key={k} data-token="">
													{token.text}
												</span>
											),
										)}
									</div>
								))}
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
});

CodeMorph.displayName = "CodeMorph";

export { CodeMorph };
export default CodeMorph;
