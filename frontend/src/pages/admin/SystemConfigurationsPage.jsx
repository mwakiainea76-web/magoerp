import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { bodyTextClassName, inputClassName, labelClassName, selectClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useSystemConfigurationsApi } from "@/hooks/useSystemConfigurationsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function SystemConfigurationsPage() {
  const api = useSystemConfigurationsApi();

  const [configs, setConfigs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState(null);

  const loadConfigs = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await api.list();
      setConfigs(res.data ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load configurations."));
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  async function handleUpdate(config) {
    const input = document.getElementById(`config-${config.key}`);
    const value = config.type === "boolean" ? input?.checked : input?.value;

    setSavingKey(config.key);
    try {
      const payload = config.type === "boolean" ? { value } : { value: String(value) };
      await api.update(config.key, payload);
      toast.success(`${config.label} updated.`);
      await loadConfigs();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to update."));
    } finally {
      setSavingKey(null);
    }
  }

  if (isLoading) {
    return (
      <section className="space-y-5">
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
          Loading system configurations...
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">System Configurations</h1>
        <p className="text-[13px] text-slate-500">Manage global institution settings</p>
      </div>

      {error ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      ) : null}

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        {configs.length === 0 ? (
          <p className={`text-slate-500 ${bodyTextClassName}`}>No configurations found.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {configs.map((config) => (
              <div key={config.key} className="flex items-center justify-between gap-4 py-4">
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-slate-900">{config.label}</p>
                  <p className="text-[12px] text-slate-500">{config.key}</p>
                </div>
                <div className="flex items-center gap-3">
                  {config.type === "boolean" ? (
                    <input
                      id={`config-${config.key}`}
                      type="checkbox"
                      defaultChecked={config.value === true}
                      className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  ) : config.type === "integer" ? (
                    <input
                      id={`config-${config.key}`}
                      type="number"
                      min="1"
                      defaultValue={config.value}
                      className={`${inputClassName} w-24`}
                    />
                  ) : (
                    <input
                      id={`config-${config.key}`}
                      type="text"
                      defaultValue={config.value}
                      className={`${inputClassName} w-48`}
                    />
                  )}
                  <FormButton
                    type="button"
                    onClick={() => handleUpdate(config)}
                    disabled={savingKey === config.key}
                    className="h-8 whitespace-nowrap px-3 text-[12px]"
                  >
                    {savingKey === config.key ? "Saving..." : "Save"}
                  </FormButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
