/**
 * SSR stand-in for `@coral-xyz/anchor`.
 *
 * Anchor publishes an ESM build that still assigns `exports`, which throws the moment Node
 * imports it. The marketing routes are the only pages rendered on the server and they never
 * reach the program client, so the server bundle gets this stub instead of the real package.
 * If a server-rendered route ever needs Anchor, replace this with a real Node-compatible entry.
 */
export class AnchorProvider {
	constructor() {
		throw new Error(
			"Anchor is browser-only in this app; server rendering must not build a client",
		);
	}
}

export class Program {
	constructor() {
		throw new Error(
			"Anchor is browser-only in this app; server rendering must not build a client",
		);
	}
}
