import { Badge } from "@peridotvault/peridotbase-ui/badge";
import { Button } from "@peridotvault/peridotbase-ui/button";
import { Input } from "@peridotvault/peridotbase-ui/input";
import { Navigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useOrganization } from "@/shared/hooks/use-scope";
import { isDemoMode } from "@/shared/peridotbase/demo/demo-mode";

type Member = { name: string; email: string; role: string };

/** Demo samples; real memberships arrive with the Peridotbase program. */
const DEMO_MEMBERS: Member[] = [
	{ name: "Ada Lovelace", email: "ada@peridot.dev", role: "owner" },
	{ name: "Grace Hopper", email: "grace@peridot.dev", role: "admin" },
	{ name: "Alan Turing", email: "alan@peridot.dev", role: "member" },
];

/** The organization's team tab: member list plus a demo-gated invite. */
export const TeamScreen = ({ organization }: { organization: string }) => {
	const active = useOrganization(organization);
	const demo = isDemoMode();
	const [members, setMembers] = useState<Member[]>(DEMO_MEMBERS);
	const [email, setEmail] = useState("");

	if (!active) return <Navigate to="/studio/org" replace />;

	const handleInvite = () => {
		const trimmed = email.trim();

		if (!trimmed) return;

		setEmail("");
		setMembers((prev) => [...prev, { name: trimmed, email: trimmed, role: "member" }]);
		toast.success(`Invited ${trimmed} (demo sample)`);
	};

	return (
		<main className="flex-1 overflow-y-auto">
			<div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-10">
				<header className="space-y-1">
					<p className="text-xs text-muted-foreground">{active.name}</p>
					<h1 className="text-2xl font-semibold tracking-tight">Team</h1>
					<p className="text-sm text-muted-foreground">
						{demo
							? `${members.length} members · demo samples`
							: "Organization membership is not stored on chain yet."}
					</p>
				</header>

				{demo ? (
					<ul className="divide-y divide-border rounded-lg border border-border text-sm">
						{members.map((member) => (
							<li
								key={member.email}
								className="flex items-center justify-between gap-4 px-5 py-3"
							>
								<div className="min-w-0">
									<p className="truncate font-medium">{member.name}</p>
									<p className="truncate font-mono text-xs text-muted-foreground">
										{member.email}
									</p>
								</div>
								<Badge variant={member.role === "owner" ? "default" : "secondary"}>
									{member.role}
								</Badge>
							</li>
						))}
					</ul>
				) : (
					<p className="rounded-lg border border-border px-5 py-4 text-sm text-muted-foreground">
						The program has no membership accounts yet, so there is nothing to list. The
						connected wallet owns this organization.
					</p>
				)}

				<section className="rounded-lg border border-border p-5">
					<h2 className="mb-3 text-sm font-medium">Invite member</h2>
					<div className="flex flex-col gap-2 sm:flex-row">
						<Input
							aria-label="Member email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") handleInvite();
							}}
							placeholder="teammate@example.com"
							disabled={!demo}
						/>
						<Button type="button" onClick={handleInvite} disabled={!demo || !email.trim()}>
							<Plus className="mr-2 size-4" />
							Invite
						</Button>
					</div>
					{!demo && (
						<p className="mt-2 text-xs text-muted-foreground">
							Invites need membership accounts, which the program does not have yet.
						</p>
					)}
				</section>
			</div>
		</main>
	);
};
