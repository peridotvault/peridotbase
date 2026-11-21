import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@peridotvault/peridotbase-ui/select";
import { useQuery } from "@tanstack/react-query";
import { useFormContext, useWatch } from "react-hook-form";
import { listDatabaseTypes } from "@/shared/peridotbase";
import { tableKeys } from "@/shared/query/keys";
import { useDatabaseStore } from "@/shared/stores/database.store";
import type { AddTableFormData } from "../types";

const BUILT_IN = "__built_in__";

/** Optional ENUM/DOMAIN catalog for one column; picking one pins its base type. */
export const TypeNameField = ({ index }: { index: number }) => {
	const { control, setValue } = useFormContext<AddTableFormData>();
	const { selectedDatabase } = useDatabaseStore();
	const typeName = useWatch({ control, name: `fields.${index}.typeName` });

	const types = useQuery({
		queryKey: tableKeys.databaseTypes(selectedDatabase),
		queryFn: () => listDatabaseTypes(selectedDatabase),
		enabled: Boolean(selectedDatabase),
	});

	if ((types.data ?? []).length === 0) return null;

	return (
		<Select
			value={typeName ?? BUILT_IN}
			onValueChange={(value) => {
				const next = value === BUILT_IN ? undefined : value;
				setValue(`fields.${index}.typeName`, next);

				const catalog = types.data?.find((type) => type.typeName === next);
				if (catalog) setValue(`fields.${index}.columnType`, catalog.base);
			}}
		>
			<SelectTrigger size="sm" className="w-full" aria-label="Column type catalog">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value={BUILT_IN}>Built-in type</SelectItem>
				{(types.data ?? []).map((type) => (
					<SelectItem key={type.typeName} value={type.typeName}>
						{type.typeName}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
};
