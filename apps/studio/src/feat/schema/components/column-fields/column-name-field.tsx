import { Input } from "@peridotbase/ui/input";
import { cn } from "@peridotbase/ui/utils";
import type { ComponentProps } from "react";

export const ColumnNameField = ({
	invalid,
	className,
	...props
}: ComponentProps<typeof Input> & { invalid: boolean }) => (
	<Input
		placeholder="column_name"
		className={cn(
			"flex-1",
			invalid && "border-destructive ring-destructive ring-1",
			className,
		)}
		{...props}
	/>
);
