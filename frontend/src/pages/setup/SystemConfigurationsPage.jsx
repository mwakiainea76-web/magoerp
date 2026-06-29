import { useCallback, useEffect, useState } from "react";
import { Save } from "lucide-react";
import toast from "react-hot-toast";

import { FormButton } from "@/components/FormButton";
import { useSystemConfigurationsApi } from "@/hooks/useSystemConfigurationsApi";
import { bodyTextClassName } from "@/lib/styles";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function SystemConfigurationsPage() {
  const api = useSystemConfigurationsApi();

  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.list();
      setConfigs(response.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  async function handleSave(item) {
    setSaving((prev) => ({ ...prev, [item.key]: true }));
    try {
      await api.update(item.key, { value: item.editingValue });
      toast.success(`${item.label} updated.`);
      await loadConfigs();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update configuration."));
    } finally {
      setSaving((prev) => ({ ...prev, [item.key]: false }));
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">
            System Configuration
          </h1>
          <p className="mt-2 text-[14px] text-slate-500">
            Configure global system settings.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        {loading ? (
          <div className={`text-slate-500 ${bodyTextClassName}`}>
            Loading configurations...
          </div>
        ) : configs.length === 0 ? (
          <div className={`text-slate-500 ${bodyTextClassName}`}>
            No configurations found.
          </div>
        ) : (
          <div className="space-y-3">
            {configs.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3"
              >
                <div className="flex-1">
                  <p className="text-[14px] font-medium text-slate-900">
                    {item.label}
                  </p>
                  <p className="text-[12px] text-slate-500">{item.key}</p>
                </div>
                <div className="flex items-center gap-2">
                  {item.type === "boolean" ? (
                    <select
                      value={item.value ? "true" : "false"}
                      onChange={(e) =>
                        setConfigs((prev) =>
                          prev.map((c) =>
                            c.key === item.key
                              ? { ...c, editingValue: e.target.value === "true" }
                              : c,
                          ),
                        )
                      }
                      className="h-9 w-28 rounded-lg border border-slate-200 bg-white px-3 text-[14px] text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  ) : (
                    <input
                      type={item.type === "integer" ? "number" : "text"}
                      value={
                        item.editingValue !== undefined
                          ? item.editingValue
                          : item.value
                      }
                      onChange={(e) =>
                        setConfigs((prev) =>
                          prev.map((c) =>
                            c.key === item.key
                              ? { ...c, editingValue: e.target.value }
                              : c,
                          ),
                        )
                      }
                      className="h-9 w-28 rounded-lg border border-slate-200 bg-white px-3 text-[14px] text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    />
                  )}
                  <FormButton
                    type="button"
                    disabled={saving[item.key]}
                    onClick={() => handleSave(item)}
                    className="h-9"
                  >
                    {saving[item.key] ? (
                      "Saving..."
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
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
