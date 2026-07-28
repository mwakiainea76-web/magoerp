import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { FormInput } from "@/components/FormInput";
import { bodyTextClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useSystemConfigurationsApi } from "@/hooks/useSystemConfigurationsApi";
import { authClient, getApiErrorMessage } from "@/lib/api/authClient";

export function SystemConfigurationsPage() {
  const api = useSystemConfigurationsApi();

  const [configs, setConfigs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState(null);
  const [allRoles, setAllRoles] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState({});
  const [highlightedKey, setHighlightedKey] = useState(null);

  const loadConfigs = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [configRes, rolesRes] = await Promise.all([
        api.list(),
        authClient.get("/lookups/roles", { params: { limit: 50 } }),
      ]);
      const roles = rolesRes.data?.data ?? [];
      setAllRoles(roles);
      setConfigs(configRes.data ?? []);
      const initial = {};
      for (const c of configRes.data ?? []) {
        if (c.type === "multi_select") {
          const roles = c.value ?? [];
          initial[c.key] = roles.includes("admin") ? roles : ["admin", ...roles];
        }
      }
      setSelectedRoles(initial);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load configurations."));
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  useEffect(() => {
    if (!isLoading && configs.length > 0) {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        setHighlightedKey(hash);
        setTimeout(() => {
          document.getElementById(`config-row-${hash}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    }
  }, [isLoading, configs]);

  function handleMultiSelectToggle(configKey, roleName) {
    if (roleName === "admin") return;
    setSelectedRoles((prev) => {
      const current = prev[configKey] ?? [];
      const next = current.includes(roleName)
        ? current.filter((r) => r !== roleName)
        : [...current, roleName];
      const withAdmin = next.includes("admin") ? next : ["admin", ...next];
      return { ...prev, [configKey]: withAdmin };
    });
  }

  async function handleUpdate(config) {
    let value;
    if (config.type === "boolean") {
      const input = document.getElementById(`config-${config.key}`);
      value = input?.checked;
    } else if (config.type === "multi_select") {
      value = (selectedRoles[config.key] ?? []).join(",");
    } else {
      const input = document.getElementById(`config-${config.key}`);
      value = input?.value;
    }

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
              <div
                id={`config-row-${config.key}`}
                key={config.key}
                className={`flex items-center justify-between gap-4 py-4 rounded-lg transition-colors ${
                  highlightedKey === config.key ? "bg-emerald-50 ring-2 ring-emerald-300 px-3 -mx-3" : ""
                }`}
              >
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
                    <FormInput
                      id={`config-${config.key}`}
                      type="number"
                      min="1"
                      defaultValue={config.value}
                      label="Value"
                      className="w-24"
                    />
                  ) : config.type === "select" ? (
                    <select
                      id={`config-${config.key}`}
                      defaultValue={config.value}
                      className="w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-800 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    >
                      <option value="per_session">Per Academic Session of Study</option>
                      <option value="per_year">Per Academic Year of Study</option>
                    </select>
                  ) : config.type === "multi_select" ? (
                    <div className="flex flex-wrap gap-2">
                      {allRoles.map((role) => {
                        const checked = (selectedRoles[config.key] ?? []).includes(role.id);
                        const isAdmin = role.id === "admin";
                        return (
                          <label
                            key={role.id}
                            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition ${
                              isAdmin
                                ? "border-emerald-400 bg-emerald-50 text-emerald-700 opacity-60 cursor-not-allowed"
                                : checked
                                  ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={isAdmin}
                              onChange={() => handleMultiSelectToggle(config.key, role.id)}
                              className="sr-only"
                            />
                            {role.label}{isAdmin ? " (always)" : ""}
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <FormInput
                      id={`config-${config.key}`}
                      type="text"
                      defaultValue={config.value}
                      label="Value"
                      className="w-48"
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
