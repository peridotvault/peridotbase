import type { ReactNode } from "react";
import { KeyRound, ShieldCheck, Table2, Wallet } from "lucide-react";

/** Landing-only product visuals: CSS mocks that stand in for Studio screenshots,
 *  rendered inside ProductCard media slots. Supabase-styled. All decorative. */

const ROWS = [
	["1", "0x4f2a…9d1c", "active", "2.4 SOL"],
	["2", "0x8c17…3e5b", "active", "1.1 SOL"],
	["3", "0xb93d…7a02", "frozen", "0.9 SOL"],
];

function MockShell({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="flex w-full flex-col bg-background-alternative">
			<div className="flex items-center gap-2 border-b border-border-alternative px-4 py-2.5">
				<span className="size-2 rounded-full bg-foreground-lighter/40" aria-hidden />
				<span className="ml-auto font-mono text-xs text-foreground-lighter">{label}</span>
			</div>
			{children}
		</div>
	);
}

export function TablePreview() {
	return (
		<MockShell label="players · 1,204 rows">
			<div className="grid grid-cols-[3rem_1fr_1fr_1fr] font-mono text-xs">
				<div className="flex items-center gap-1.5 border-b border-border-alternative px-4 py-2 text-foreground-lighter">
					<KeyRound className="size-3 text-primary" aria-hidden />
					id
				</div>
				<div className="border-b border-border-alternative px-4 py-2 text-foreground-lighter">
					owner
				</div>
				<div className="flex items-center gap-1.5 border-b border-border-alternative px-4 py-2 text-foreground-lighter">
					<Table2 className="size-3 text-primary" aria-hidden />
					status
				</div>
				<div className="border-b border-border-alternative px-4 py-2 text-foreground-lighter">
					balance
				</div>
				{ROWS.map((row) =>
					row.map((cell, c) => (
						<div
							key={`${row[0]}-${c}`}
							className={`px-4 py-2.5 ${c === 3 ? "tabular-nums" : ""} ${
								c === 2
									? cell === "active"
										? "text-primary"
										: "text-foreground-lighter"
									: "text-foreground"
							}`}
						>
							{cell}
						</div>
					)),
				)}
			</div>
			<div className="mt-auto border-t border-border-alternative px-4 py-2 font-mono text-xs text-foreground-lighter">
				account data · program-owned
			</div>
		</MockShell>
	);
}

export function QueryPreview() {
	return (
		<MockShell label="query-1.sql">
			<div className="flex flex-col gap-2 p-4 font-mono text-xs">
				<div className="rounded-md border border-border-default bg-surface-75 p-3 leading-relaxed">
					<span className="text-primary">select</span>{" "}
					<span className="text-foreground">owner, balance</span>
					<br />
					<span className="text-primary">from</span>{" "}
					<span className="text-primary">players</span>
					<br />
					<span className="text-primary">where</span>{" "}
					<span className="text-foreground">status = </span>
					<span className="text-primary">'active'</span>;
				</div>
				<div className="flex items-center gap-2 text-foreground-lighter">
					<span className="size-1.5 rounded-full bg-primary" aria-hidden />3 rows · 1 slot ·
					read via RPC
				</div>
			</div>
		</MockShell>
	);
}

export function IndexPreview() {
	const indexes = [
		["players_status_idx", "btree", "status"],
		["players_owner_idx", "btree", "owner"],
		["players_balance_idx", "btree", "balance"],
	];
	return (
		<MockShell label="indexes · 3">
			<ul className="divide-y divide-border-alternative">
				{indexes.map(([name, type, column]) => (
					<li key={name} className="flex items-center gap-3 px-4 py-2.5 font-mono text-xs">
						<span className="rounded border border-border-default bg-surface-100 px-1.5 py-0.5 text-foreground-lighter">
							{type}
						</span>
						<span className="text-foreground">{name}</span>
						<span className="ml-auto text-foreground-lighter">{column}</span>
					</li>
				))}
			</ul>
		</MockShell>
	);
}

export function ExportPreview() {
	return (
		<MockShell label="export">
			<ul className="divide-y divide-border-alternative">
				{["CSV", "JSON"].map((format) => (
					<li
						key={format}
						className="flex items-center justify-between gap-3 px-4 py-3 font-mono text-xs"
					>
						<span className="rounded border border-border-default bg-surface-100 px-2 py-1 text-primary">
							{format}
						</span>
						<span className="text-foreground-lighter">browser-side</span>
					</li>
				))}
			</ul>
		</MockShell>
	);
}

export function AuthPreview() {
	return (
		<MockShell label="session · wallet">
			<div className="flex flex-col gap-3 p-4">
				<div className="flex items-center gap-3 rounded-md border border-border-default bg-surface-75 p-3">
					<span className="flex size-8 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
						<Wallet className="size-4" aria-hidden />
					</span>
					<div className="min-w-0 flex-1">
						<p className="truncate font-mono text-xs text-foreground">8sK2…Qf9m</p>
						<p className="font-mono text-[10px] text-foreground-lighter">
							signature verified · devnet
						</p>
					</div>
					<span className="rounded-full border border-border-default px-2 py-0.5 font-mono text-[10px] text-foreground-lighter">
						connected
					</span>
				</div>
				<div className="grid grid-cols-2 gap-2 font-mono text-[10px] text-foreground-lighter">
					{["no password", "no API key", "no email", "no session"].map((item) => (
						<span
							key={item}
							className="rounded border border-dashed border-border-default px-2 py-1.5 text-center"
						>
							{item}
						</span>
					))}
				</div>
			</div>
		</MockShell>
	);
}

export function ImmutablePreview() {
	const writes = [
		["285,412,903", "5xQk…9fT2", "insert"],
		["285,412,880", "9mRz…1cHd", "update"],
		["285,412,851", "2tLp…7bVa", "index"],
	];
	return (
		<MockShell label="state · append-only">
			<ul className="divide-y divide-border-alternative">
				{writes.map(([slot, signature, action]) => (
					<li
						key={signature}
						className="flex items-center gap-3 px-4 py-2.5 font-mono text-xs"
					>
						<ShieldCheck className="size-3.5 flex-none text-primary" aria-hidden />
						<span className="text-foreground tabular-nums">{slot}</span>
						<span className="truncate text-foreground-lighter">{signature}</span>
						<span className="ml-auto rounded border border-border-default bg-surface-100 px-1.5 py-0.5 text-[10px] text-foreground-lighter">
							{action}
						</span>
					</li>
				))}
			</ul>
			<div className="mt-auto border-t border-border-alternative px-4 py-2 font-mono text-xs text-foreground-lighter">
				every write signed · nothing off-chain
			</div>
		</MockShell>
	);
}
