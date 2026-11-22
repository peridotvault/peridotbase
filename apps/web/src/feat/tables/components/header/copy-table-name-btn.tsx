import { ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import { ToolbarIconButton } from "@/shared/components/toolbar";
import { copyText } from "@/shared/lib/clipboard";

export const CopyTableNameBtn = ({ tableName }: { tableName: string }) => (
	<ToolbarIconButton
		type="button"
		aria-label={`Copy table name ${tableName}`}
		onClick={() => {
			void copyText(tableName)
				.then(() => toast.success(`Copied "${tableName}"`))
				.catch(() => toast.error("Clipboard is unavailable in this browser"));
		}}
	>
		<ClipboardCopy />
	</ToolbarIconButton>
);
