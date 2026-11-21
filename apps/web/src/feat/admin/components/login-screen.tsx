import { Button } from "@peridotvault/peridotbase-ui/button";
import { Input } from "@peridotvault/peridotbase-ui/input";
import { Label } from "@peridotvault/peridotbase-ui/label";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { loadDatabase, verifyPassword } from "@/feat/admin/lib/database";
import { setSession } from "@/feat/admin/lib/session";

const LOCKOUT_KEY = "peridotbase-admin-lockout";
const MAX_DELAY_MS = 15 * 60 * 1000;

type Lockout = { count: number; until: number };

const readLockout = (): Lockout => {
	try {
		const raw = localStorage.getItem(LOCKOUT_KEY);
		return raw ? (JSON.parse(raw) as Lockout) : { count: 0, until: 0 };
	} catch {
		return { count: 0, until: 0 };
	}
};

const writeLockout = (lockout: Lockout): void => {
	localStorage.setItem(LOCKOUT_KEY, JSON.stringify(lockout));
};

const secondsLeft = (until: number): number =>
	Math.max(0, Math.ceil((until - Date.now()) / 1000));

/** Username + password gate. Seed JSON ships the hash; session is an expiring localStorage
 *  token. ponytail: server-side lockout replaces this when a backend exists. */
export const LoginScreen = () => {
	const navigate = useNavigate();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setError(null);

		const lockout = readLockout();
		if (Date.now() < lockout.until) {
			setError(
				`Terlalu banyak percobaan. Coba lagi dalam ${secondsLeft(lockout.until)} detik.`,
			);
			return;
		}

		setPending(true);

		try {
			const db = loadDatabase();
			const admin = db.admins.find((candidate) => candidate.username === username.trim());

			// Generic message: no username enumeration.
			if (!admin || !(await verifyPassword(admin, password))) {
				const next: Lockout = {
					count: lockout.count + 1,
					until: Date.now() + Math.min(2 ** lockout.count * 1000, MAX_DELAY_MS),
				};
				writeLockout(next);
				setError("Username atau password salah.");
				return;
			}

			localStorage.removeItem(LOCKOUT_KEY);

			setSession(admin.username);
			void navigate({ to: "/admin" });
		} finally {
			setPending(false);
		}
	};

	return (
		<main className="flex min-h-dvh items-center justify-center bg-background px-6 py-12 text-foreground">
			<form
				onSubmit={(event) => void handleSubmit(event)}
				className="w-full max-w-sm space-y-4 rounded-lg border border-border p-6"
			>
				<div className="space-y-1">
					<h1 className="text-xl font-semibold tracking-tight">Admin login</h1>
					<p className="text-sm text-muted-foreground">
						Masuk dengan username dan password dari database.json.
					</p>
				</div>
				<div className="space-y-2">
					<Label htmlFor="admin-username">Username</Label>
					<Input
						id="admin-username"
						value={username}
						onChange={(event) => setUsername(event.target.value)}
						autoComplete="username"
					/>
				</div>
				<div className="space-y-2">
					<Label htmlFor="admin-password">Password</Label>
					<Input
						id="admin-password"
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						autoComplete="current-password"
					/>
				</div>
				{error ? <p className="text-sm text-destructive">{error}</p> : null}
				<Button type="submit" className="w-full" disabled={pending}>
					{pending ? "Checking…" : "Masuk"}
				</Button>
			</form>
		</main>
	);
};
