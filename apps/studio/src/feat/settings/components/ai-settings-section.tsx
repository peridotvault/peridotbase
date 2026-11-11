import { Button } from "@peridotbase/ui/button";
import { Input } from "@peridotbase/ui/input";
import { Label } from "@peridotbase/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@peridotbase/ui/select";
import { Switch } from "@peridotbase/ui/switch";
import { useByok } from "@tanstack/ai-react";
import { useState } from "react";
import { toast } from "sonner";
import { AI_PROVIDER_OPTIONS, type AiProvider, aiByok, useAiSettingsStore } from "@/shared/ai";

export const AiSettingsSection = () => {
	const [apiKey, setApiKey] = useState("");
	const snapshot = useByok(aiByok);
	const settings = useAiSettingsStore();
	const providerOption = AI_PROVIDER_OPTIONS.find((option) => option.id === settings.provider);
	const status = snapshot.status[settings.provider];
	const maskedKey = status && "masked" in status ? status.masked : null;

	const saveApiKey = async () => {
		const nextKey = apiKey.trim();

		if (!nextKey) return;

		try {
			await toast
				.promise(aiByok.update(settings.provider, nextKey), {
					loading: `Saving ${providerOption?.label} key...`,
					success: `${providerOption?.label} key ready for this tab`,
					error: (error: Error) =>
						error.message || `Could not save ${providerOption?.label} key`,
				})
				.unwrap();
			setApiKey("");
		} catch {
			// toast.promise already reported the failure.
		}
	};

	const removeApiKey = async () => {
		await toast.promise(aiByok.clear(settings.provider), {
			loading: `Removing ${providerOption?.label} key...`,
			success: "API key removed",
			error: (error: Error) =>
				error.message || `Could not remove ${providerOption?.label} key`,
		});
	};

	return (
		<section className="space-y-3">
			<div className="space-y-2 rounded-lg border p-3">
				<Label htmlFor="ai-provider">Provider</Label>
				<Select
					value={settings.provider}
					onValueChange={(value) => {
						setApiKey("");
						settings.setProvider(value as AiProvider);
					}}
				>
					<SelectTrigger id="ai-provider">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{AI_PROVIDER_OPTIONS.map((option) => (
							<SelectItem key={option.id} value={option.id}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Label htmlFor="ai-model">Model</Label>
				<Select value={settings.model} onValueChange={settings.setModel}>
					<SelectTrigger id="ai-model">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{providerOption?.models.map((option) => (
							<SelectItem key={option.id} value={option.id}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-2 rounded-lg border p-3">
				<Label htmlFor="ai-api-key">{providerOption?.label} API key</Label>
				<Input
					id="ai-api-key"
					type="password"
					autoComplete="off"
					value={apiKey}
					onChange={(event) => setApiKey(event.target.value)}
					placeholder={maskedKey ? `Saved ${maskedKey}` : "Paste an API key"}
				/>
				<p className="text-xs text-muted-foreground">
					Kept in memory for this tab only. Requests go straight from this page to{" "}
					{providerOption?.label}; nothing passes through a Peridotbase server.
				</p>
				{snapshot.storageError && (
					<p className="text-xs text-destructive">{snapshot.storageError}</p>
				)}
				<div className="flex gap-2">
					<Button type="button" disabled={!apiKey.trim()} onClick={saveApiKey}>
						Save key
					</Button>
					{status && status.state !== "empty" && (
						<Button type="button" variant="outline" onClick={removeApiKey}>
							Remove key
						</Button>
					)}
				</div>
			</div>

			<div className="flex items-center justify-between gap-4 rounded-lg border p-3">
				<div className="space-y-1">
					<Label htmlFor="include-schema">Include database schema</Label>
					<p className="text-xs text-muted-foreground">
						Share table and column metadata for context-aware answers.
					</p>
				</div>
				<Switch
					id="include-schema"
					checked={settings.includeSchemaInAiContext}
					onCheckedChange={settings.setIncludeSchemaInAiContext}
				/>
			</div>
		</section>
	);
};
