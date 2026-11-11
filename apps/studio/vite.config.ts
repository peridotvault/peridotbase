import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		tailwindcss(),
		tanstackRouter({
			target: "react",
			routesDirectory: "./src/pages",
			generatedRouteTree: "./src/routeTree.gen.ts",
			autoCodeSplitting: true,
			disableLogging: true,
		}),
		viteReact(),
	],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
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
		outDir: "dist",
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
		include: ["monaco-editor", "react", "react-dom", "@tanstack/react-query", "lucide-react"],
	},
});
