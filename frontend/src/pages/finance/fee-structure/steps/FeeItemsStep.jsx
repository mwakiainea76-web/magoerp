import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { FormInput } from "@/components/FormInput";

export function FeeItemsStep() {
  const { control, register, formState: { errors } } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = useWatch({ control, name: "items" }) || [];
  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-slate-900">Fee Items</h2>
        <button type="button" onClick={() => append({ name: "", amount: "", description: "" })} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-emerald-700"><Plus className="h-3.5 w-3.5" /> Add Item</button>
      </div>
      <div className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <FormInput label="Item Name" required placeholder="e.g. Tuition" error={errors.items?.[index]?.name?.message} {...register(`items.${index}.name`)} />
              <FormInput label="Amount (KES)" type="number" required step="0.01" min="0" placeholder="0.00" error={errors.items?.[index]?.amount?.message} {...register(`items.${index}.amount`)} />
              <div className="flex items-start gap-2"><FormInput className="flex-1" label="Description" placeholder="Optional" {...register(`items.${index}.description`)} /><button type="button" onClick={() => remove(index)} disabled={fields.length === 1} aria-label={`Remove fee item ${index + 1}`} className="mt-7 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></div>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><span className="text-[13px] font-semibold text-slate-700">Total</span><span className="text-[15px] font-semibold text-emerald-700">KES {total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span></div>
      </div>
    </div>
  );
}
