import type { Cluster } from "@peridotvault/peridotbase-sdk";
import { Button } from "@peridotvault/peridotbase-ui/button";
import { Input } from "@peridotvault/peridotbase-ui/input";
import { Label } from "@peridotvault/peridotbase-ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@peridotvault/peridotbase-ui/select";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AdminSidebar } from "@/feat/admin/components/admin-sidebar";
import {
	hashPassword,
	loadDatabase,
	newSalt,
	resetDatabase,
	saveDatabase,
} from "@/feat/admin/lib/database";
import { getSession } from "@/feat/admin/lib/session";
import { useWorkspaceStore } from "@/shared/stores/workspace.store";

const CLUSTERS = ["mainnet-beta", "devnet", "testnet", "localnet", "custom"] as const;

/** Dashboard admin di `/admin`: sidebar + CRUD admins/settings atas database.json. */
export const DashboardScreen = () => {
	const navigate = useNavigate();
	const [db, setDb] = useState(() => loadDatabase());
	const user = getSession();

	const [rpcUrl, setRpcUrl] = useState(db.settings.rpcUrl);
	const [cluster, setCluster] = useState(db.settings.cluster);
	const [programId, setProgramId] = useState(db.settings.activeProgramId);
	const [siteUrl, setSiteUrl] = useState(db.settings.siteUrl);
	const [newUsername, setNewUsername] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [changeUser, setChangeUser] = useState("");
	const [changePassword, setChangePassword] = useState("");

	const commit = (next: typeof db) => {
		saveDatabase(next);
		setDb(next);
	};

	const saveSettings = () => {
		const next = {
			...db,
			settings: { ...db.settings, rpcUrl, cluster, activeProgramId: programId, siteUrl },
		};
		commit(next);

		// The Studio reads its connection from the workspace store; keep both in step.
		const workspace = useWorkspaceStore.getState();
		workspace.setRpcUrl(rpcUrl.trim());
		workspace.setCluster(cluster as Cluster);
		workspace.setProgramId(programId.trim());
	};

	const toggleDemo = () =>
		commit({ ...db, settings: { ...db.settings, demoMode: !db.settings.demoMode } });

	const addAdmin = async () => {
		const name = newUsername.trim();
		if (!name || !newPassword) return;
		if (db.admins.some((candidate) => candidate.username === name)) {
			setNewUsername("");
			return;
		}

		const salt = newSalt();
		const record = {
			username: name,
			salt,
			passwordHash: await hashPassword(salt, newPassword),
		};
		commit({ ...db, admins: [...db.admins, record] });
		setNewUsername("");
		setNewPassword("");
	};

	const removeAdmin = (username: string) => {
		if (db.admins.length <= 1 || username === user) return;
		commit({
			...db,
			admins: db.admins.filter((candidate) => candidate.username !== username),
		});
	};

	const changeAdminPassword = async () => {
		const name = changeUser.trim();
		if (!name || !changePassword) return;
		if (!db.admins.some((candidate) => candidate.username === name)) return;

		const salt = newSalt();
		const passwordHash = await hashPassword(salt, changePassword);
		const admins = db.admins.map((candidate) =>
			candidate.username === name ? { ...candidate, salt, passwordHash } : candidate,
		);
		commit({ ...db, admins });
		setChangeUser("");
		setChangePassword("");
	};

	const handleExport = () => {
		const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "database.json";
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleReset = () => {
		resetDatabase();
		const next = loadDatabase();
		setDb(next);
		setRpcUrl(next.settings.rpcUrl);
		setCluster(next.settings.cluster);
		setProgramId(next.settings.activeProgramId);
		setSiteUrl(next.settings.siteUrl);
	};

	return (
		<div className="flex min-h-dvh bg-background text-foreground">
			<AdminSidebar />
			<main className="flex-1 space-y-6 overflow-y-auto px-6 py-8">
				<header className="space-y-1">
					<h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
					<p className="text-sm text-muted-foreground">
						{user ? `Masuk sebagai ${user}. ` : ""}Kelola admins dan connection — tersimpan di
						localStorage, export untuk tulis balik ke database.json.
					</p>
				</header>

				<section className="grid gap-4 lg:grid-cols-2">
					<div className="space-y-3 rounded-lg border border-border p-5">
						<h2 className="text-sm font-medium">Connection settings</h2>
						<div className="space-y-2">
							<Label htmlFor="set-rpc">RPC URL</Label>
							<Input
								id="set-rpc"
								value={rpcUrl}
								onChange={(event) => setRpcUrl(event.target.value)}
								className="font-mono text-xs"
							/>
						</div>
						<div className="space-y-2">
							<Label>Cluster</Label>
							<Select value={cluster} onValueChange={setCluster}>
								<SelectTrigger aria-label="Cluster">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{CLUSTERS.map((option) => (
										<SelectItem key={option} value={option}>
											{option}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="set-program">Program ID</Label>
							<Input
								id="set-program"
								value={programId}
								onChange={(event) => setProgramId(event.target.value)}
								className="font-mono text-xs"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="set-site">Site URL</Label>
							<Input
								id="set-site"
								value={siteUrl}
								onChange={(event) => setSiteUrl(event.target.value)}
								className="font-mono text-xs"
							/>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Button type="button" onClick={saveSettings}>
								Simpan settings
							</Button>
							<Button type="button" variant="outline" onClick={toggleDemo}>
								Demo mode: {db.settings.demoMode ? "on" : "off"}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => void navigate({ to: "/admin/connect" })}
							>
								Connection screen
							</Button>
						</div>
					</div>

					<div className="space-y-3 rounded-lg border border-border p-5">
						<h2 className="text-sm font-medium">Admins ({db.admins.length})</h2>
						<ul className="divide-y divide-border text-sm">
							{db.admins.map((admin) => (
								<li
									key={admin.username}
									className="flex items-center justify-between gap-3 py-2"
								>
									<span className="font-mono text-xs">{admin.username}</span>
									{admin.username !== user && db.admins.length > 1 && (
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => removeAdmin(admin.username)}
										>
											Hapus
										</Button>
									)}
								</li>
							))}
						</ul>
						<div className="flex flex-col gap-2 sm:flex-row">
							<Input
								aria-label="Username baru"
								placeholder="Username"
								value={newUsername}
								onChange={(event) => setNewUsername(event.target.value)}
							/>
							<Input
								aria-label="Password baru"
								type="password"
								placeholder="Password"
								value={newPassword}
								onChange={(event) => setNewPassword(event.target.value)}
							/>
							<Button type="button" onClick={() => void addAdmin()}>
								Tambah
							</Button>
						</div>
						<div className="space-y-2 border-t border-border pt-3">
							<p className="text-xs text-muted-foreground">Ubah password</p>
							<div className="flex flex-col gap-2 sm:flex-row">
								<Input
									aria-label="Username"
									placeholder="Username"
									value={changeUser}
									onChange={(event) => setChangeUser(event.target.value)}
								/>
								<Input
									aria-label="Password baru"
									type="password"
									placeholder="Password baru"
									value={changePassword}
									onChange={(event) => setChangePassword(event.target.value)}
								/>
								<Button
									type="button"
									variant="outline"
									onClick={() => void changeAdminPassword()}
								>
									Ubah
								</Button>
							</div>
						</div>
					</div>

					<div className="space-y-3 rounded-lg border border-border p-5">
						<h2 className="text-sm font-medium">Database file</h2>
						<div className="flex gap-2">
							<Button type="button" variant="outline" onClick={handleExport}>
								Export JSON
							</Button>
							<Button type="button" variant="outline" onClick={handleReset}>
								Reset ke seed
							</Button>
						</div>
						<p className="text-xs text-muted-foreground">
							Reset menghapus overlay localStorage dan kembali ke seed bundle.
						</p>
					</div>
				</section>
			</main>
		</div>
	);
};
