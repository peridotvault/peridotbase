import type { LucideIcon } from "lucide-react";
import { CircleAlert, CircleCheckIcon, InfoIcon, TriangleAlert } from "lucide-react";
import { cn } from "../utils";

type AlertVariant = "info" | "warning" | "error" | "success";

interface AlertProps {
	variant: AlertVariant;
	title: string;
	message?: string;
	className?: string;
}

const alertConfig: Record<
	AlertVariant,
	{
		icon: LucideIcon;
		containerClass: string;
		iconClass: string;
	}
> = {
	info: {
		icon: InfoIcon,
		containerClass: "border-info/40 bg-info/10 text-info",
		iconClass: "text-info",
	},
	warning: {
		icon: TriangleAlert,
		containerClass: "border-warning/40 bg-warning/10 text-warning",
		iconClass: "text-warning",
	},
	error: {
		icon: CircleAlert,
		containerClass: "border-destructive/40 bg-destructive/10 text-destructive",
		iconClass: "text-destructive",
	},
	success: {
		icon: CircleCheckIcon,
		containerClass: "border-success/40 bg-success/10 text-success",
		iconClass: "text-success",
	},
};

export const Alert = ({ variant, title, message, className }: AlertProps) => {
	const config = alertConfig[variant];
	const Icon = config.icon;

	return (
		<div className={cn("rounded-md border px-4 py-3", config.containerClass, className)}>
			<p className={cn("text-sm flex items-center gap-2", message ? "mb-1" : "")}>
				<Icon
					aria-hidden="true"
					className={cn("-mt-0.5 inline-flex opacity-80", config.iconClass)}
					size={16}
				/>
				<span className="font-medium">{title}</span>
			</p>
			{message && <p className="text-xs opacity-90 ml-7">{message}</p>}
		</div>
	);
};
