import { Alert } from "@peridotbase/ui/alert";
import { Button } from "@peridotbase/ui/button";
import { SheetClose } from "@peridotbase/ui/sheet";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { SheetSidebar } from "@/shared/components/sheet-sidebar";
import { useTableCols } from "@/shared/hooks/use-table-cols";
import { useTableSchemaName } from "@/shared/hooks/use-table-schema-name";
import type { AddRecordFormData } from "@/shared/peridotbase";
import { useOverlayStore } from "@/shared/stores/overlay.store";
import { toWriteValues } from "@/shared/utils/cell-variant";
import { useCreateRecord } from "../hooks/use-create-record";
import { useAddRecordStore } from "@/shared/stores/add-record.store";
import { AddRecordField } from "./add-record-field";
import { RecordFormProvider } from "./record-form-provider";

export const AddRecordForm = ({ tableName }: { tableName: string }) => {
	const { closeOverlay, isOverlayOpen } = useOverlayStore();
	const schemaName = useTableSchemaName();
	const { tableCols, isLoadingTableCols } = useTableCols({ tableName, schemaName });
	const { createRecord, isCreatingRecord } = useCreateRecord({ tableName, schemaName });
	const methods = useForm<AddRecordFormData>();
	const { prefill, clearPrefill } = useAddRecordStore();

	// Prefilled values count as edits, so a duplicate can be saved as it opens.
	useEffect(() => {
		if (!prefill) return;
		methods.reset(prefill, { keepDefaultValues: true });
		clearPrefill();
	}, [prefill, methods, clearPrefill]);

	const onSubmit = async (data: AddRecordFormData) => {
		createRecord(toWriteValues(data, tableCols ?? []), {
			onSuccess: () => {
				methods.reset();
				closeOverlay("records.add-record");
			},
		});
	};

	const handleCancel = () => {
		methods.reset();
		closeOverlay("records.add-record");
	};

	const renderFormContent = () => {
		if (tableCols && tableCols.length > 0) {
			return (
				<RecordFormProvider methods={methods}>
					<form onSubmit={methods.handleSubmit(onSubmit)} className="flex flex-col h-full">
						<div className="space-y-6">
							{!isLoadingTableCols &&
								tableCols.map((col) => <AddRecordField key={col.columnName} {...col} />)}
						</div>

						<div className="flex justify-end gap-2 py-6">
							<SheetClose asChild onClick={handleCancel} disabled={isCreatingRecord}>
								<Button variant="outline" size="lg">
									Close
								</Button>
							</SheetClose>

							<Button
								type="submit"
								size="lg"
								disabled={isCreatingRecord || !methods.formState.isDirty}
							>
								Save
							</Button>
						</div>
					</form>
				</RecordFormProvider>
			);
		}

		return (
			<div className="flex flex-col h-full">
				<div className="space-y-6">
					<Alert
						variant="info"
						title="No columns found"
						message="Please add at least one column to the table before adding a record."
					/>
				</div>
			</div>
		);
	};

	return (
		<SheetSidebar
			title={`Add a new record to the table: ${tableName}`}
			open={isOverlayOpen("records.add-record")}
			onOpenChange={(open) => {
				if (!open) {
					handleCancel();
				}
			}}
		>
			{renderFormContent()}
		</SheetSidebar>
	);
};
