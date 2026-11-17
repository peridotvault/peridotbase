/** Admin session: expiring token in localStorage. UX gate only — a browser cannot keep a
 *  secret, so the program stays the authority. ponytail: HttpOnly cookie session when a
 *  backend exists. */
const KEY = "peridotbase-admin-session";
const TTL_MS = 8 * 60 * 60 * 1000;

type Token = { u: string; exp: number };

export const getSession = (): string | null => {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return null;

		const token = JSON.parse(raw) as Partial<Token>;
		if (typeof token.u !== "string" || typeof token.exp !== "number") {
			localStorage.removeItem(KEY);
			return null;
		}
		if (Date.now() >= token.exp) {
			localStorage.removeItem(KEY);
			return null;
		}

		return token.u;
	} catch {
		return null;
	}
};

export const setSession = (username: string): void => {
	const token: Token = { u: username, exp: Date.now() + TTL_MS };
	localStorage.setItem(KEY, JSON.stringify(token));
};

export const clearSession = (): void => {
	localStorage.removeItem(KEY);
};
