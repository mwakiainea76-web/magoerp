import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

import { labelTextClassName, selectClassName, inputClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { LookupSelect } from "@/components/LookupSelect";

function buildInitial(definitions, initialValues) {
  return Object.fromEntries(definitions.map((definition) => [definition.key, initialValues[definition.key] ?? ""]));
}

function activeKeys(form, definitions) {
  return definitions.filter((definition) => {
    const value = form[definition.key];
    return value !== "" && value !== null && value !== undefined;
  });
}

export function FilterPanel({
  definitions = [],
  initialValues = {},
  onApply,
  onReset,
  quickKeys = [],
  searchSelectOverrides = {},
}) {
  const [form, setForm] = useState(() => buildInitial(definitions, initialValues));
  const [labels, setLabels] = useState({});
  const [showMore, setShowMore] = useState(false);
  const initialValuesRef = useRef(JSON.stringify(initialValues));

  useEffect(() => {
    const serializedValues = JSON.stringify(initialValues);

    if (serializedValues !== initialValuesRef.current) {
      initialValuesRef.current = serializedValues;
      setForm(buildInitial(definitions, initialValues));
    }
  }, [initialValues, definitions]);

  const quickDefinitions = definitions.filter((definition) => quickKeys.includes(definition.key));
  const advancedDefinitions = definitions.filter((definition) => !quickKeys.includes(definition.key));
  const active = activeKeys(form, definitions);

  function setFilter(key, value, label) {
    const definition = definitions.find((item) => item.key === key);
    const next = { ...form, [key]: value };

    for (const clearedKey of definition?.clears ?? []) {
      next[clearedKey] = "";
    }

    setForm(next);

    if (label !== undefined) {
      setLabels((current) => ({ ...current, [key]: label }));
    }
  }

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      onApply?.({ ...form });
    },
    [form, onApply],
  );

  const clearSingle = useCallback(
    (key) => {
      const next = { ...form, [key]: "" };
      setForm(next);
      setLabels((current) => {
        const copy = { ...current };
        delete copy[key];
        return copy;
      });
      onApply?.(next);
    },
    [form, onApply],
  );

  const handleReset = useCallback(() => {
    setForm(Object.fromEntries(definitions.map((definition) => [definition.key, ""])));
    setLabels({});
    onReset?.();
  }, [definitions, onReset]);

  function optionLabel(key) {
    const definition = definitions.find((item) => item.key === key);

    if (!definition) return "";

    if (definition.type === "select" || definition.type === "status") {
      return definition.options?.find((option) => option.value === form[key])?.label ?? form[key];
    }

    return labels[key] || form[key];
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-visible rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
    >
      <div className="p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-12">
          {quickDefinitions.map((definition) => (
            <div key={definition.key} className={definition.className || "xl:col-span-3"}>
              {renderInput(definition, form, setFilter, labels, searchSelectOverrides)}
            </div>
          ))}
        </div>

        {showMore && advancedDefinitions.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-dashed border-slate-200 pt-4 sm:grid-cols-2 xl:grid-cols-12">
            {advancedDefinitions.map((definition) => (
              <div key={definition.key} className={definition.className || "xl:col-span-4"}>
                {renderInput(definition, form, setFilter, labels, searchSelectOverrides)}
              </div>
            ))}
          </div>
        )}

        {active.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Selected</span>
            {active.map((definition) => (
              <button
                key={definition.key}
                type="button"
                onClick={() => clearSingle(definition.key)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-[12px] font-medium text-slate-700 transition hover:bg-slate-200"
                title={`Remove ${definition.label} filter`}
              >
                <span className="text-slate-400">{definition.label}:</span>
                <span className="max-w-48 truncate">{optionLabel(definition.key)}</span>
                <X className="h-3 w-3 text-slate-400" />
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {advancedDefinitions.length > 0 && (
              <button
                type="button"
                onClick={() => setShowMore((value) => !value)}
                aria-expanded={showMore}
                className="inline-flex h-9 items-center gap-2 rounded-lg px-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${showMore ? "rotate-180" : ""}`} />
                {showMore ? "Hide advanced filters" : `Advanced filters (${advancedDefinitions.length})`}
              </button>
            )}
          </div>

          <div className="flex gap-2 sm:justify-end">
            <FormButton type="button" variant="secondary" className="flex-1 whitespace-nowrap sm:flex-none sm:px-4" onClick={handleReset}>
              Clear all
            </FormButton>
            <FormButton type="submit" className="flex-1 whitespace-nowrap sm:flex-none sm:px-5">
              Apply filters
            </FormButton>
          </div>
        </div>
      </div>
    </form>
  );
}

function renderInput(definition, form, setFilter, labels, overrides) {
  if (definition.type === "search") {
    const disabled = definition.dependsOn && !form[definition.dependsOn];
    const override = overrides[definition.key];

    return (
      <LookupSelect
        label={definition.label}
        value={form[definition.key]}
        onChange={(id, option) => setFilter(definition.key, id ?? "", option?.label ?? "")}
        fetchOptions={definition.fetchOptions}
        selectedOption={form[definition.key] && labels[definition.key] ? { id: form[definition.key], label: labels[definition.key] } : null}
        placeholder={disabled ? (definition.disabledPlaceholder || "Select dependency first") : (definition.placeholder || "Search...")}
        disabled={Boolean(disabled)}
        {...override}
      />
    );
  }

  const label = <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>{definition.label}</label>;

  if (definition.type === "text") {
    const isPrimarySearch = definition.key === "q";

    return (
      <>
        {label}
        <div className="relative">
          {isPrimarySearch && (
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          )}
          <input
            type="text"
            value={form[definition.key] || ""}
            onChange={(event) => setFilter(definition.key, event.target.value)}
            className={`${inputClassName} ${isPrimarySearch ? "pl-10" : ""}`}
            placeholder={definition.placeholder || "Search..."}
          />
        </div>
      </>
    );
  }

  if (definition.type === "select" || definition.type === "status") {
    return (
      <>
        {label}
        <select
          value={form[definition.key] || ""}
          onChange={(event) => setFilter(definition.key, event.target.value)}
          className={selectClassName}
        >
          <option value="">{definition.placeholder || "All"}</option>
          {(definition.options || []).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </>
    );
  }

  return null;
}
