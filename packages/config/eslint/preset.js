import js from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import importX from "eslint-plugin-import-x";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Arctis layer boundaries: `pages → feat → shared`, plus `feat` may only reach its own feature.
 * This is editor-time feedback; `validate-architecture.mjs` from the Arctis skill is the
 * authoritative check for page/route ownership.
 */
const arctisLayers = [
	{
		plugins: { boundaries },
		settings: {
			"boundaries/include": ["src/**/*"],
			"boundaries/elements": [
				{ type: "pages", pattern: "src/pages/*", capture: ["path"] },
				{ type: "feat", pattern: "src/feat/*", capture: ["feature"] },
				{ type: "shared", pattern: "src/shared/*", capture: ["path"] },
			],
		},
		rules: {
			"boundaries/dependencies": [
				"error",
				{
					default: "disallow",
					policies: [
						{
							from: { element: { type: "pages" } },
							allow: [
								{ to: { element: { type: "feat" } } },
								{ to: { element: { type: "shared" } } },
							],
						},
						{
							from: { element: { type: "feat" } },
							allow: [
								{ to: { element: { type: "shared" } } },
								{ to: { element: { type: "feat", captured: { feature: "{{from.feature}}" } } } },
							],
						},
						{
							from: { element: { type: "shared" } },
							allow: [{ to: { element: { type: "shared" } } }],
						},
					],
				},
			],
		},
	},
];

/**
 * One ESLint flat-config factory for every workspace package.
 *
 * @param {object} [options]
 * @param {string} [options.rootDir] Directory holding the package's `tsconfig.json`.
 * @param {boolean} [options.react] Add React hooks rules.
 * @param {boolean} [options.arctis] Enforce Arctis `pages/feat/shared` boundaries.
 * @param {string[]} [options.ignores] Extra ignore globs.
 * @returns {import("eslint").Linter.Config[]}
 */
export const createConfig = ({ rootDir, react = false, arctis = false, ignores = [] } = {}) => {
	/** @type {import("eslint").Linter.Config[]} */
	const config = [
		{
			ignores: [
				"**/dist/**",
				"**/node_modules/**",
				"**/.astro/**",
				"**/.turbo/**",
				"**/coverage/**",
				"**/routeTree.gen.ts",
				...ignores,
			],
		},
		js.configs.recommended,
		...tseslint.configs.recommended,
		{
			files: ["**/*.{ts,tsx,js,mjs}"],
			languageOptions: {
				ecmaVersion: 2022,
				globals: react ? globals.browser : { ...globals.browser, ...globals.node },
				parserOptions: {
					projectService: {
						allowDefaultProject: ["*.config.js", "*.config.mjs", ".storybook/*.ts"],
					},
					tsconfigRootDir: rootDir,
				},
			},
			plugins: { "import-x": importX },
			rules: {
				"import-x/no-duplicates": "error",
				"import-x/no-cycle": ["error", { maxDepth: 12, ignoreExternal: true }],
				"@typescript-eslint/no-unused-vars": [
					"error",
					{ argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
				],
				"@typescript-eslint/consistent-type-imports": [
					"error",
					{ prefer: "type-imports", fixStyle: "inline-type-imports" },
				],
			},
		},
	];

	if (react) {
		const recommended = reactHooks.configs.flat?.recommended ?? reactHooks.configs.recommended;

		config.push({
			files: ["**/*.{ts,tsx}"],
			plugins: { "react-hooks": reactHooks },
			rules: {
				...recommended.rules,
				// React Compiler is not enabled in this monorepo, so the rules that only enforce
				// compiler-preparatory patterns are noise. The two behavioural rules stay on.
				"react-hooks/refs": "off",
				"react-hooks/set-state-in-effect": "off",
				"react-hooks/preserve-manual-memoization": "off",
				"react-hooks/incompatible-library": "off",
				"react-hooks/rules-of-hooks": "error",
				"react-hooks/exhaustive-deps": "warn",
			},
		});
	}

	if (arctis) config.push(...arctisLayers);

	return config;
};

export { arctisLayers };
