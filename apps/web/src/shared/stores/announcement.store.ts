import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const ANNOUNCEMENT_DAY_MS = 24 * 60 * 60 * 1000;
export const ANNOUNCEMENT_STORAGE_KEY = "peridotbase-announcement";

type AnnouncementState = {
	/** Epoch ms of the last dismiss; `null` when never dismissed. */
	dismissedAt: number | null;
	dismiss: () => void;
};

export const useAnnouncementStore = create<AnnouncementState>()(
	persist(
		(set) => ({
			dismissedAt: null,
			dismiss: () => set({ dismissedAt: Date.now() }),
		}),
		{ name: ANNOUNCEMENT_STORAGE_KEY },
	),
);

/** Visible unless dismissed within the last 24h. Follows dismisses from other tabs too. */
export const useAnnouncementVisible = () => {
	const dismissedAt = useAnnouncementStore((state) => state.dismissedAt);
	const [now, setNow] = useState<number | null>(null);

	useEffect(() => {
		setNow(Date.now());

		const onStorage = (event: StorageEvent) => {
			if (event.key === ANNOUNCEMENT_STORAGE_KEY) setNow(Date.now());
		};

		const timer = window.setInterval(() => setNow(Date.now()), 60_000);

		window.addEventListener("storage", onStorage);

		return () => {
			window.removeEventListener("storage", onStorage);
			window.clearInterval(timer);
		};
	}, []);

	if (dismissedAt == null) return true;
	if (now == null) return true;

	return now - dismissedAt >= ANNOUNCEMENT_DAY_MS;
};
