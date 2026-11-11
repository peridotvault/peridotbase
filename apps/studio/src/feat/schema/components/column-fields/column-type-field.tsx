import { Button } from "@peridotbase/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@peridotbase/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@peridotbase/ui/popover";
import { cn } from "@peridotbase/ui/utils";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import {
	type Control,
	Controller,
	type FieldPathByValue,
	type FieldValues,
} from "react-hook-form";
import type { ColumnOptionName } from "./column-field-values";
import { ARRAY_COMPATIBLE_TYPES, PSQL_TYPES, SERIAL_TYPES } from "./column-types";

/**
 * `onIncompatibleOptions` receives the column options the picked type rules out, for forms
 * that carry those options.
 */
export const ColumnTypeField = <T extends FieldValues>({
	control,
	name,
	onIncompatibleOptions,
}: {
	control: Control<T>;
	name: FieldPathByValue<T, string>;
	onIncompatibleOptions?: (options: ColumnOptionName[]) => void;
}) => {
	const [typePickerOpen, setTypePickerOpen] = useState(false);
	const typeGroups = PSQL_TYPES;

	const incompatibleOptions = (type: string): ColumnOptionName[] => {
		return [
			...(SERIAL_TYPES.includes(type) ? (["isIdentity"] as const) : []),
			...(ARRAY_COMPATIBLE_TYPES.includes(type) ? [] : (["isArray"] as const)),
		];
	};

	return (
		<Controller
			control={control}
			name={name}
			render={({ field, fieldState }) => (
				<Popover modal={true} open={typePickerOpen} onOpenChange={setTypePickerOpen}>
					<PopoverTrigger asChild>
						<Button
							id={name}
							role="combobox"
							aria-expanded={typePickerOpen}
							aria-controls={`${name}-listbox`}
							variant="outline"
							className={cn(
								"w-full justify-between border-input bg-background px-3 font-normal hover:bg-background",
								fieldState.error ? "border-destructive ring-destructive ring-1" : "",
							)}
						>
							{field.value || "Select type"}
							<ChevronDownIcon aria-hidden="true" className="-me-1 opacity-60" size={16} />
						</Button>
					</PopoverTrigger>
					<PopoverContent
						id={`${name}-listbox`}
						align="start"
						className="w-full min-w-[--radix-popper-anchor-width] border-input p-0"
					>
						<Command>
							<CommandInput placeholder="Search type..." />
							<CommandList>
								<CommandEmpty>No type found.</CommandEmpty>
								{Object.entries(typeGroups).map(([category, types]) => (
									<CommandGroup key={category} heading={category}>
										{types.map((type) => (
											<CommandItem
												key={type.value}
												value={`${type.label} ${type.description}`}
												onSelect={() => {
													field.onChange(type.value);
													onIncompatibleOptions?.(incompatibleOptions(type.value));
													setTypePickerOpen(false);
												}}
											>
												<div className="flex flex-col gap-1 items-start flex-1">
													<p className="font-medium">{type.label}</p>
													<span className="text-xs text-muted-foreground">
														{type.description}
													</span>
												</div>
												{field.value === type.value && (
													<CheckIcon className="ml-auto shrink-0" size={16} />
												)}
											</CommandItem>
										))}
									</CommandGroup>
								))}
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			)}
		/>
	);
};
