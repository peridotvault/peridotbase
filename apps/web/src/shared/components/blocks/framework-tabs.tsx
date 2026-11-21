import { buttonVariants } from "@peridotvault/peridotbase-ui/button";
import { ArrowUpRight } from "lucide-react";
import { useState, type ComponentType } from "react";
import { SiNextdotjs, SiReact } from "react-icons/si";
import { DOCS_URL } from "@/shared/lib/site";
import { CodeMorph, type CodeMorphStep } from "./code-morph";

/** "Use Peridotbase with X" — the heading word and the code panel morph together when a
 *  framework tab is clicked. Static snippets; nothing is executed. */

type Framework = {
	id: string;
	label: string;
	icon: ComponentType<{ className?: string }>;
	blurb: string;
	step: CodeMorphStep;
};

const FRAMEWORKS: Framework[] = [
	{
		id: "react",
		label: "React",
		icon: SiReact,
		blurb:
			"Drop the SDK into any React app. One client, one effect, and your tables render straight from program state.",
		step: {
			label: "React",
			icon: <SiReact className="size-3.5 fill-current" aria-hidden />,
			file: "src/tables.tsx",
			code: `import { useEffect, useState } from "react";
import {
  createPeridotbaseClient,
  createRpcPort,
  createWalletStandardPort,
} from "@peridotvault/peridotbase-sdk";

const client = createPeridotbaseClient({
  rpc: createRpcPort({
    url: "https://api.devnet.solana.com",
    cluster: "devnet",
  }),
  wallet: createWalletStandardPort(),
  programId,
});

export function Tables({ database }) {
  const [tables, setTables] = useState([]);

  useEffect(() => {
    client.listTables(database)
      .then(setTables);
  }, [database]);

  return <TableList rows={tables} />;
}`,
		},
	},
	{
		id: "next",
		label: "Next.js",
		icon: SiNextdotjs,
		blurb:
			"Runs in the App Router. Keep wallet code behind a use client boundary, or load it with ssr: false.",
		step: {
			label: "Next.js",
			icon: <SiNextdotjs className="size-3.5 fill-current" aria-hidden />,
			file: "app/page.tsx",
			code: `"use client";

import { useEffect, useState } from "react";
import {
  createPeridotbaseClient,
  createRpcPort,
  createWalletStandardPort,
} from "@peridotvault/peridotbase-sdk";

const client = createPeridotbaseClient({
  rpc: createRpcPort({
    url: "https://api.devnet.solana.com",
    cluster: "devnet",
  }),
  wallet: createWalletStandardPort(),
  programId,
});

export default function Page() {
  const [tables, setTables] = useState([]);

  useEffect(() => {
    client.listTables("mainnet_db")
      .then(setTables);
  }, []);

  return <p>{tables.length} tables</p>;
}`,
		},
	},
];

export function FrameworkTabs() {
	const [activeIndex, setActiveIndex] = useState(0);
	const active = FRAMEWORKS[activeIndex];
	const Icon = active.icon;

	return (
		<div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-12">
			<div>
				<p className="font-mono text-xs uppercase tracking-widest text-foreground-lighter">
					Access
				</p>
				<h2 className="mt-3 text-3xl font-medium tracking-tight text-balance text-foreground sm:text-4xl md:text-5xl">
					<span className="block">Use Peridotbase with</span>
					<span
						key={active.id}
						className="inline-flex items-center gap-3 text-foreground animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none"
					>
						<Icon className="size-8 fill-current text-primary" aria-hidden />
						{active.label}
					</span>
				</h2>

				<p
					key={`${active.id}-blurb`}
					className="mt-4 min-h-24 max-w-md text-balance text-foreground-light animate-in fade-in duration-300 motion-reduce:animate-none sm:min-h-20"
				>
					{active.blurb}
				</p>

				<a
					href={DOCS_URL}
					className={`${buttonVariants({ variant: "outline", size: "md" })} mt-8`}
				>
					Read the SDK docs
					<ArrowUpRight className="size-4" aria-hidden />
				</a>
			</div>

			<CodeMorph
				className="min-w-0"
				steps={FRAMEWORKS.map((framework) => framework.step)}
				chrome="tabs"
				frame="inset"
				dots="mono"
				theme="dark"
				accentColor="#87e08b"
				windowColor="#1e1e1e"
				textColor="#ededed"
				autoplay={false}
				defaultStep={0}
				onStepChange={setActiveIndex}
			/>
		</div>
	);
}
