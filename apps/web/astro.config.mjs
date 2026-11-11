import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
	site: process.env.PUBLIC_SITE_URL ?? "https://peridotbase.com",
	integrations: [
		starlight({
			title: "Peridotbase",
			description:
				"A Solana-native, fully on-chain relational database. Browse tables, edit records, and query data straight from your wallet.",
			logo: {
				src: "./src/assets/logo.svg",
				alt: "Peridotbase",
			},
			social: [
				{
					icon: "github",
					label: "GitHub",
					href: "https://github.com/peridotbase",
				},
			],
			customCss: ["./src/styles/starlight.css"],
			sidebar: [
				{
					label: "Start here",
					items: [
						{ label: "Introduction", slug: "introduction" },
						{ label: "Getting started", slug: "getting-started" },
						{ label: "Studio tour", slug: "studio" },
					],
				},
				{
					label: "Build",
					items: [
						{ label: "TypeScript SDK", slug: "sdk" },
						{ label: "On-chain model", slug: "on-chain-model" },
					],
				},
				{
					label: "Project",
					items: [
						{ label: "Roadmap", link: "/roadmap/" },
						{ label: "Changelog", link: "/changelog/" },
						{ label: "FAQ", slug: "faq" },
					],
				},
			],
		}),
		sitemap(),
	],
});
