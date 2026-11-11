import { Button } from "@peridotbase/ui/button";
import { useChat } from "@tanstack/ai-react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SheetSidebar } from "@/shared/components/sheet-sidebar";
import { aiByok, getAiProviderLabel, useAiSettingsStore } from "@/feat/settings";
import { getSchemaGraph } from "@/shared/peridotbase";
import { tableKeys } from "@/shared/query/keys";
import { useDatabaseStore } from "@/shared/stores/database.store";
import { useOverlayStore } from "@/shared/stores/overlay.store";
import { useAiAvailability } from "../hooks/use-ai-availability";
import { streamAssistantReply } from "../lib/direct-chat";
import { CHAT_SUGGESTIONS } from "../lib/suggestions";
import { useAssistantRequestStore } from "../stores/assistant-request.store";
import { Conversation, ConversationContent, ConversationScrollButton } from "./conversation";
import { LoadingText } from "./loading-text";
import {
	Message,
	MessageBranch,
	MessageBranchContent,
	MessageContent,
	MessageResponse,
} from "./message";
import {
	PromptInput,
	PromptInputBody,
	PromptInputFooter,
	PromptInputSubmit,
	PromptInputTextarea,
} from "./prompt-input";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "./reasoning";
import { Suggestion, Suggestions } from "./suggestion";

interface ChatController {
	clear: () => void;
	isLoading: boolean;
}

interface ChatSidebarContentProps {
	db: string;
	onControllerReady: (controller: ChatController) => void;
}

// `useChat` captures its transport at mount. Keying this inner component on the database, the
// provider and the model rebuilds the chat when any of them changes.
const ChatSidebarContent = ({ db, onControllerReady }: ChatSidebarContentProps) => {
	const [text, setText] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const { openOverlay } = useOverlayStore();
	const { pendingPrompt, consumePrompt } = useAssistantRequestStore();
	const { includeSchemaInAiContext, model } = useAiSettingsStore();
	const { provider, isByokReady, hasPersonalKey, canSend } = useAiAvailability();

	const { data: schemaTables } = useQuery({
		queryKey: tableKeys.graph(db),
		queryFn: () => getSchemaGraph(db),
		enabled: includeSchemaInAiContext,
		staleTime: 60_000,
		retry: false,
	});

	const threadId = useRef(`thread-${crypto.randomUUID()}`);

	const { messages, sendMessage, isLoading, clear, stop } = useChat({
		threadId: threadId.current,
		fetcher: ({ messages: turnMessages }, { signal }) => {
			const apiKey = aiByok.keys()[provider];

			if (!apiKey)
				throw new Error(`Add a ${getAiProviderLabel(provider)} API key in Settings.`);

			return streamAssistantReply({
				provider,
				model,
				apiKey,
				database: db,
				messages: turnMessages,
				schemaTables,
				includeSchema: includeSchemaInAiContext,
				threadId: threadId.current,
				signal,
			});
		},
		onError: (error) => setErrorMessage(error.message),
	});

	// Hold a queued prompt until the chat can actually send it. Consuming it while BYOK is
	// still initialising, or without a key, would drop the prompt.
	useEffect(() => {
		if (!pendingPrompt || isLoading || !isByokReady || !canSend) return;
		consumePrompt();
		sendMessage(pendingPrompt);
	}, [canSend, consumePrompt, isByokReady, isLoading, pendingPrompt, sendMessage]);

	useEffect(() => {
		onControllerReady({
			clear: () => {
				clear();
				setText("");
				setErrorMessage(null);
			},
			isLoading,
		});
	}, [clear, isLoading, onControllerReady]);

	const handleSubmit = (message: string) => {
		if (!message || isLoading) return;

		setErrorMessage(null);
		sendMessage(message);
		setText("");
	};

	const handleSuggestionClick = (suggestion: string) => {
		setErrorMessage(null);
		sendMessage(suggestion);
		setText("");
	};

	const handleStop = () => {
		stop();
		setText("");
	};

	const status = isLoading ? "streaming" : "ready";

	return (
		<div className="relative flex size-full flex-col divide-y overflow-hidden">
			<Conversation>
				<ConversationContent>
					{messages.length === 0 ? (
						<div className="flex items-center justify-center h-full text-muted-foreground">
							<div className="text-center space-y-2">
								<p className="text-lg font-medium">Start a new conversation</p>
								<p className="text-sm">Ask me anything to get started</p>
							</div>
						</div>
					) : (
						<>
							{messages.map((message) => {
								const thinkingParts = message.parts.filter((part) => part.type === "thinking");

								const textContent = message.parts.reduce<string>(
									(acc, part) => (part.type === "text" ? acc + (part.content ?? "") : acc),
									"",
								);

								const hasThinking = thinkingParts.length > 0;

								return (
									<MessageBranch defaultBranch={0} key={message.id}>
										<MessageBranchContent>
											<Message from={message.role === "user" ? "user" : "assistant"}>
												<div>
													{hasThinking && message.role === "assistant" && (
														<Reasoning duration={0}>
															<ReasoningTrigger />
															<ReasoningContent>
																{thinkingParts.map((part) => part.content).join("\n")}
															</ReasoningContent>
														</Reasoning>
													)}
													<MessageContent>
														<MessageResponse>{textContent}</MessageResponse>
													</MessageContent>
												</div>
											</Message>
										</MessageBranchContent>
									</MessageBranch>
								);
							})}

							{isLoading && (
								<MessageBranch defaultBranch={0}>
									<MessageBranchContent>
										<Message from="assistant">
											<MessageContent>
												<LoadingText>Thinking...</LoadingText>
											</MessageContent>
										</Message>
									</MessageBranchContent>
								</MessageBranch>
							)}
						</>
					)}
				</ConversationContent>
				<ConversationScrollButton />
			</Conversation>

			<div className="grid shrink-0 gap-4 pt-3">
				{errorMessage && (
					<div className="mx-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
						{errorMessage}
					</div>
				)}
				{!canSend && (
					<div className="mx-4 rounded-lg border p-3 text-sm">
						<p className="text-muted-foreground">
							{hasPersonalKey
								? "The assistant is still starting. Try again in a moment."
								: `Add a ${getAiProviderLabel(provider)} API key in Settings to use the assistant. The key stays in this tab and goes only to ${getAiProviderLabel(provider)}.`}
						</p>
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="mt-2"
							onClick={() => openOverlay("settings.app")}
						>
							Open settings
						</Button>
					</div>
				)}
				{messages.length === 0 && canSend && (
					<Suggestions className="px-4">
						{CHAT_SUGGESTIONS.map((suggestion) => (
							<Suggestion
								key={suggestion}
								onClick={() => handleSuggestionClick(suggestion)}
								suggestion={suggestion}
								size="lg"
							>
								{suggestion}
							</Suggestion>
						))}
					</Suggestions>
				)}

				<div className="w-full px-4 pb-4">
					<PromptInput onSubmit={handleSubmit}>
						<PromptInputBody>
							<PromptInputTextarea
								onChange={(event) => setText(event.target.value)}
								value={text}
								placeholder="Type a message..."
							/>
						</PromptInputBody>

						<PromptInputFooter>
							<PromptInputSubmit
								className="h-8!"
								status={status}
								onClick={isLoading ? handleStop : undefined}
								disabled={!canSend}
							/>
						</PromptInputFooter>
					</PromptInput>
				</div>
			</div>
		</div>
	);
};

export const ChatSidebar = () => {
	const { isOverlayOpen, closeOverlay } = useOverlayStore();
	const { selectedDatabase } = useDatabaseStore();
	const { includeSchemaInAiContext, provider, model } = useAiSettingsStore();

	const [controller, setController] = useState<ChatController | null>(null);
	const controllerSetterRef = useRef((next: ChatController) => setController(next));

	return (
		<SheetSidebar
			title="AI Assistant"
			cta={
				selectedDatabase && controller ? (
					<Button
						type="button"
						variant="outline"
						size="lg"
						onClick={controller.clear}
						disabled={controller.isLoading}
					>
						<Plus className="size-4 mr-1" />
						New Chat
					</Button>
				) : null
			}
			closeButton={false}
			open={isOverlayOpen("chat.assistant")}
			size="max-w-2xl!"
			contentClassName="p-0 flex flex-col h-[calc(100vh-4rem)] flex-1"
			onOpenChange={(open) => {
				if (!open) {
					closeOverlay("chat.assistant");
				}
			}}
		>
			{selectedDatabase ? (
				<ChatSidebarContent
					key={`${selectedDatabase}:${includeSchemaInAiContext}:${provider}:${model}`}
					db={selectedDatabase}
					onControllerReady={controllerSetterRef.current}
				/>
			) : (
				<div className="flex items-center justify-center h-full text-muted-foreground p-8">
					<div className="text-center space-y-2">
						<p className="text-lg font-medium">No database selected</p>
						<p className="text-sm">Select a database from the sidebar to start chatting.</p>
					</div>
				</div>
			)}
		</SheetSidebar>
	);
};
