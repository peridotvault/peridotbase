import { statSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * The pre-bundled copy of the linked core SDK is keyed by the lockfile, and a `link:` package
 * changes without touching it. A rebuild then stayed invisible: the dev server kept serving a
 * cached bundle whose constants and error strings no longer existed in the repo, so every fix
 * looked like it had not been applied. Re-optimize whenever that dist is newer than the cache.
 */
const linkedCoreIsStale = (): boolean => {
	try {
		return (
			statSync(
				fileURLToPath(new URL("./node_modules/.vite/deps/_metadata.json", import.meta.url)),
			).mtimeMs <
			statSync(
				fileURLToPath(
					new URL(
						"./node_modules/@peridotvault/peridotbase-core-sdk/dist/index.js",
						import.meta.url,
					),
				),
			).mtimeMs
		);
	} catch {
		// No cache yet, or the link is missing: let Vite decide.
		return false;
	}
};

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		{
			name: "peridotbase:anchor-ssr-stub",
			enforce: "pre",
			applyToEnvironment: (environment) => environment.name === "ssr",
			resolveId: (id) =>
				id === "@coral-xyz/anchor"
					? fileURLToPath(new URL("./src/shared/lib/anchor-ssr-shim.ts", import.meta.url))
					: undefined,
		},
		tanstackStart({
			router: {
				routesDirectory: "./pages",
				generatedRouteTree: "./routeTree.gen.ts",
				disableLogging: true,
			},
			// Marketing pages ship as static HTML for crawlers. The Studio subtree is
			// client-only (`ssr: false`) and served by the SPA fallback.
			prerender: {
				enabled: true,
				crawlLinks: true,
				autoSubfolderIndex: true,
				failOnError: true,
				filter: ({ path }) => !path.startsWith("/studio") && !path.startsWith("/admin"),
			},
			sitemap: {
				enabled: true,
				host: process.env.PUBLIC_SITE_URL ?? "https://peridotbase.com",
			},
		}),
		tailwindcss(),
		viteReact(),
	],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	// The core SDK is CommonJS built by `tsc`. Vite inlines workspace-linked packages into the
	// dev SSR module runner, where `exports` does not exist; keeping it external makes Node
	// load it as the CJS module it is.
	ssr: {
		external: ["@peridotvault/peridotbase-core-sdk"],
	},
	// @solana/web3.js and @coral-xyz/anchor reference the Node `global` alias.
	define: {
		global: "globalThis",
	},
	server: {
		port: Number.parseInt(process.env.PORT ?? "3001", 10),
		host: true,
	},
	preview: {
		port: Number.parseInt(process.env.PORT ?? "3000", 10),
		host: true,
	},
	build: {
		target: "esnext",
		minify: "esbuild",
		chunkSizeWarningLimit: 1500,
		rollupOptions: {
			output: {
				// Radix primitives and icons ship together; TanStack stays separate from the AI
				// packages, which the assistant loads when it first opens.
				manualChunks(id) {
					if (id.includes("@radix-ui")) return "radix-ui";
					if (id.includes("lucide-react")) return "icons";
					if (id.includes("@tanstack") && !id.includes("@tanstack/ai")) return "tanstack";
					if (id.includes("react-dom")) return "react-dom";
				},
			},
		},
	},
	optimizeDeps: {
		// Only when the linked core SDK was rebuilt: forcing on every start throws away the
		// prebundle for monaco/react too.
		force: linkedCoreIsStale(),
		include: [
			"monaco-editor",
			"react",
			"react-dom",
			"@tanstack/react-query",
			"lucide-react",
			// Linked CJS package outside the workspace: without prebundling, dev serves raw
			// `exports` assignments to the browser and the app dies before it renders.
			"@peridotvault/peridotbase-core-sdk",
		],
	},
});
