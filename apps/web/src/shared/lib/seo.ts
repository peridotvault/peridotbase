import { OG_IMAGE, SITE_NAME, SITE_URL } from "./site";

type SeoInput = {
	/** Page title, without the site suffix. */
	title: string;
	description: string;
	/** Route path, e.g. "/roadmap/". Resolved against SITE_URL for canonical and og:url. */
	path: string;
	/** og:type. Marketing pages are "website"; dated entries can pass "article". */
	type?: "website" | "article";
	/** Structured data, emitted as `application/ld+json` by the router's head dedupe. */
	jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

/** One head block for every crawler-visible route: canonical, Open Graph, Twitter card and
 *  optional JSON-LD. Keeps titles and the social image in a single place. */
export function seoHead({ title, description, path, type = "website", jsonLd }: SeoInput) {
	const fullTitle = path === "/" ? `${SITE_NAME} — ${title}` : `${title} — ${SITE_NAME}`;
	const url = new URL(path, SITE_URL).toString();

	return {
		meta: [
			{ title: fullTitle },
			{ name: "description", content: description },
			{ property: "og:type", content: type },
			{ property: "og:title", content: fullTitle },
			{ property: "og:description", content: description },
			{ property: "og:url", content: url },
			{ property: "og:image", content: OG_IMAGE },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{ property: "og:image:alt", content: `${SITE_NAME} logo and wordmark` },
			{ name: "twitter:title", content: fullTitle },
			{ name: "twitter:description", content: description },
			...(jsonLd
				? [
						{
							"script:ld+json": Array.isArray(jsonLd)
								? { "@context": "https://schema.org", "@graph": jsonLd }
								: { "@context": "https://schema.org", ...jsonLd },
						},
					]
				: []),
		],
		links: [{ rel: "canonical", href: url }],
	};
}
