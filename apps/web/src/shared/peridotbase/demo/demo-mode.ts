/**
 * Demo-mode helper. The flag lives in the admin database (localStorage overlay over the seed),
 * not in an env var. Shared cannot import `feat/admin`, so this reads the storage key directly;
 * without an overlay the seed default applies (demo off).
 */
const DB_KEY = "peridotbase-admin-db";

export const isDemoMode = (): boolean => {
	try {
		const raw = localStorage.getItem(DB_KEY);
		if (!raw) return false;

		const settings = (JSON.parse(raw) as { settings?: { demoMode?: boolean } }).settings;

		return settings?.demoMode === true;
	} catch {
		return false;
	}
};
