import { CircleCheck, Info, Loader2, OctagonAlert, TriangleAlert } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/** Pass the app's resolved `theme`; sonner cannot see it otherwise. */
const Toaster = ({ ...props }: ToasterProps) => {
	return (
		<Sonner
			className="toaster group"
			icons={{
				success: <CircleCheck className="size-4 text-success" />,
				info: <Info className="size-4 text-info" />,
				warning: <TriangleAlert className="size-4 text-warning" />,
				error: <OctagonAlert className="size-4 text-destructive" />,
				loading: <Loader2 className="size-4 animate-spin text-info" />,
			}}
			style={
				{
					"--normal-bg": "var(--popover)",
					"--normal-text": "var(--popover-foreground)",
					"--normal-border": "var(--border)",
					"--border-radius": "var(--radius)",
				} as React.CSSProperties
			}
			toastOptions={{
				classNames: {
					toast: "cn-toast",
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
