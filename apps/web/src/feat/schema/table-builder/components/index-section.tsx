import { Button } from "@peridotvault/peridotbase-ui/button";
import { Checkbox } from "@peridotvault/peridotbase-ui/checkbox";
import { Input } from "@peridotvault/peridotbase-ui/input";
import { Label } from "@peridotvault/peridotbase-ui/label";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import type { AddTableFormData } from "../types";

/** Composite indexes can only be minted with the table, so they are declared here. */
export const IndexSection = () => {
	const { control, setValue } = useFormContext<AddTableFormData>();
	const fields = useWatch({ control, name: "fields" });
	const indexes = useWatch({ control, name: "indexes" }) ?? [];
	const [name, setName] = useState("");
	const [columns, setColumns] = useState<string[]>([]);
	const [isUnique, setIsUnique] = useState(false);

	const columnNames = [
		...new Set((fields ?? []).map((field) => field.columnName).filter(Boolean)),
	];

	const toggleColumn = (columnName: string) => {
		setColumns((previous) =>
			previous.includes(columnName)
				? previous.filter((column) => column !== columnName)
				: [...previous, columnName],
		);
	};

	const addIndex = () => {
		if (!name.trim() || columns.length < 2) return;

		setValue("indexes", [...indexes, { indexName: name.trim(), columns, isUnique }], {
			shouldValidate: true,
		});
		setName("");
		setColumns([]);
		setIsUnique(false);
	};

	const removeIndex = (position: number) => {
		setValue(
			"indexes",
			indexes.filter((_, index) => index !== position),
			{ shouldValidate: true },
		);
	};

	return (
		<div className="space-y-3 rounded-lg border border-dashed border-input p-4">
			<div className="space-y-1">
				<p className="text-sm font-medium">Composite indexes</p>
				<p className="text-xs text-muted-foreground">
					The program cannot add a multi-column index after the table exists.
				</p>
			</div>

			{indexes.length > 0 ? (
				<ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
					{indexes.map((index, position) => (
						<li
							key={`${index.indexName}-${position}`}
							className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
						>
							<span className="font-mono">
								{index.indexName} ({index.columns.join(", ")}){index.isUnique ? " unique" : ""}
							</span>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label={`Remove index ${index.indexName}`}
								onClick={() => removeIndex(position)}
							>
								<Trash2 className="size-3.5" />
							</Button>
						</li>
					))}
				</ul>
			) : null}

			<div className="space-y-2">
				{columnNames.map((columnName) => (
					<div key={columnName} className="flex items-center gap-2">
						<Checkbox
							id={`composite-index-${columnName}`}
							checked={columns.includes(columnName)}
							onCheckedChange={() => toggleColumn(columnName)}
						/>
						<Label
							htmlFor={`composite-index-${columnName}`}
							className="cursor-pointer font-mono font-normal"
						>
							{columnName}
						</Label>
					</div>
				))}
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<Input
					aria-label="Index name"
					className="w-48"
					placeholder="index_name"
					value={name}
					onChange={(event) => setName(event.target.value)}
				/>
				<div className="flex items-center gap-2">
					<Checkbox
						id="composite-index-unique"
						checked={isUnique}
						onCheckedChange={(checked) => setIsUnique(checked === true)}
					/>
					<Label htmlFor="composite-index-unique" className="cursor-pointer">
						Unique
					</Label>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={!name.trim() || columns.length < 2}
					onClick={addIndex}
				>
					Add index
				</Button>
			</div>
		</div>
	);
};
