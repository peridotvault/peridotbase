import { Button } from "@peridotbase/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@peridotbase/ui/tooltip";
import { cn } from "@peridotbase/ui/utils";
import { Sparkles } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { getAiProviderLabel } from "@/feat/settings";
import { useOverlayStore } from "@/shared/stores/overlay.store";
import { useAiAvailability } from "../hooks/use-ai-availability";

// The chat, its markdown renderer and its model client are a large share of the app's code, so
// they load when the assistant first opens instead of with every page.
const loadChatSidebar = () => import("./chat-sidebar");

const ChatSidebar = lazy(() =>
	loadChatSidebar().then((module) => ({ default: module.ChatSidebar })),
);

export const Chat = () => {
	const { openOverlay, isOverlayOpen } = useOverlayStore();
	// Once opened, the assistant stays mounted so it can animate closed and keep the conversation.
	const [assistantMounted, setAssistantMounted] = useState(false);

	if (isOverlayOpen("chat.assistant") && !assistantMounted) setAssistantMounted(true);

	const { provider, hasPersonalKey, isByokReady } = useAiAvailability();

	// Green once the selected provider has a key; grey while the key store hydrates; red when the
	// assistant cannot send until a key is added.
	const indicatorColor = hasPersonalKey
		? "bg-emerald-500"
		: isByokReady
			? "bg-red-500"
			: "bg-zinc-500";

	return (
		<>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						variant="ghost"
						className="rounded-none size-12 relative text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
						aria-label="Open AI assistant"
						onPointerEnter={loadChatSidebar}
						onFocus={loadChatSidebar}
						onClick={() => openOverlay("chat.assistant")}
					>
						<Sparkles className="size-5" />
						<span
							data-testid="chat-status-indicator"
							className={cn(
								"absolute top-2 right-2 h-2 w-2 rounded-full ring-2 ring-background",
								indicatorColor,
							)}
						/>
					</Button>
				</TooltipTrigger>
				<TooltipContent side="right" className="text-xs">
					{hasPersonalKey ? (
						<p>AI Assistant · personal {getAiProviderLabel(provider)} key</p>
					) : (
						<p>AI Assistant · add a {getAiProviderLabel(provider)} key in Settings</p>
					)}
				</TooltipContent>
			</Tooltip>

			{assistantMounted && (
				<Suspense>
					<ChatSidebar />
				</Suspense>
			)}
		</>
	);
};
