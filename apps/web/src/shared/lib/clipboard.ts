/**
 * Copies text even when the async clipboard API is unavailable or denied (insecure origin,
 * missing permission, unfocused document). The menu used to toast "copied" without this.
 */
export const copyText = async (text: string): Promise<void> => {
	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return;
		}
	} catch {
		// Fall through to the selection-based path.
	}

	const area = document.createElement("textarea");
	area.value = text;
	area.setAttribute("readonly", "");
	area.style.position = "fixed";
	area.style.opacity = "0";
	document.body.appendChild(area);
	area.select();

	try {
		if (!document.execCommand("copy")) throw new Error("copy command was rejected");
	} finally {
		area.remove();
	}
};
