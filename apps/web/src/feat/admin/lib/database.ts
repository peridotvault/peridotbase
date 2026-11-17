import seed from "../data/database.json";

export type AdminRecord = { username: string; salt: string; passwordHash: string };
export type AdminSettings = {
	activeProgramId: string;
	rpcUrl: string;
	cluster: string;
	demoMode: boolean;
	siteUrl: string;
};
export type AdminDatabase = { admins: AdminRecord[]; settings: AdminSettings };

/**
 * Admin store. Seed JSON ships in bundle; edits overlay `localStorage`.
 * UX gate only — hashes public, program stays authority.
 * ponytail: server store replaces localStorage when admin backend exists.
 */
const STORAGE_KEY = "peridotbase-admin-db";

const fallback = seed as AdminDatabase;

export const PBKDF2_ITERATIONS = 210_000;

const enc = new TextEncoder();

const hex = (bytes: Uint8Array): string =>
	[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

const timingEqual = (a: string, b: string): boolean => {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
};

const sha256Hex = async (text: string): Promise<string> => {
	const digest = await crypto.subtle.digest("SHA-256", enc.encode(text));
	return hex(new Uint8Array(digest));
};

const pbkdf2Hex = async (salt: string, password: string, iterations: number): Promise<string> => {
	const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
		"deriveBits",
	]);
	const bits = await crypto.subtle.deriveBits(
		{ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations },
		key,
		256,
	);
	return hex(new Uint8Array(bits));
};

export const loadDatabase = (): AdminDatabase => {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return fallback;
		const parsed = JSON.parse(raw) as Partial<AdminDatabase>;
		return {
			admins: parsed.admins ?? fallback.admins,
			settings: { ...fallback.settings, ...parsed.settings },
		};
	} catch {
		return fallback;
	}
};

export const saveDatabase = (db: AdminDatabase): void => {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

export const resetDatabase = (): void => {
	localStorage.removeItem(STORAGE_KEY);
};

export const newSalt = (): string => hex(crypto.getRandomValues(new Uint8Array(16)));

/** New hashes: `pbkdf2$<iter>$<hex>`. 210k rounds slows offline brute-force ~210k x vs SHA-256 1x. */
export const hashPassword = async (
	salt: string,
	password: string,
	iterations: number = PBKDF2_ITERATIONS,
): Promise<string> => `pbkdf2$${iterations}$${await pbkdf2Hex(salt, password, iterations)}`;

export const verifyPassword = async (
	admin: AdminRecord,
	password: string,
): Promise<boolean> => {
	// Legacy seed: plain SHA-256(salt + password) hex. Still accepted once, then re-hashed on login.
	if (!admin.passwordHash.startsWith("pbkdf2$")) {
		return (await sha256Hex(admin.salt + password)) === admin.passwordHash;
	}
	const [, iterRaw, expected] = admin.passwordHash.split("$");
	const iterations = Number.parseInt(iterRaw, 10);
	if (!Number.isFinite(iterations) || !expected) return false;
	const actual = await pbkdf2Hex(admin.salt, password, iterations);
	return timingEqual(actual, expected);
};

export const needsRehash = (admin: AdminRecord): boolean =>
	!admin.passwordHash.startsWith("pbkdf2$");
