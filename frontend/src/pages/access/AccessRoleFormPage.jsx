import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import * as yup from "yup";

import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { useAccessRolesApi } from "@/hooks/useAccessRolesApi";
import { bodyTextClassName } from "@/lib/styles";
import { getApiErrorMessage } from "@/lib/api/authClient";

const roleSchema = yup.object({
  name: yup
    .string()
    .required("Role name is required")
    .max(255, "Role name must be at most 255 characters"),
  guard_name: yup
    .string()
    .required("Guard name is required")
    .max(255, "Guard name must be at most 255 characters"),
});

function normalizePayload(values) {
  return {
    name: values.name.trim().toLowerCase().replace(/\s+/g, "-"),
    guard_name: values.guard_name.trim(),
  };
}

export function AccessRoleFormPage() {
  const { roleId } = useParams();
  const navigate = useNavigate();
  const rolesApi = useAccessRolesApi();
  const isEdit = Boolean(roleId);

  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const title = useMemo(
    () => (isEdit ? "Edit Role" : "Add Role"),
    [isEdit],
  );

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(roleSchema),
    defaultValues: {
      name: "",
      guard_name: "web",
    },
  });

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      setIsLoading(true);
      setPageError("");

      try {
        if (!isEdit) {
          return;
        }

        const response = await rolesApi.show(roleId);
        if (!isMounted) return;

        const role = response.data;
        reset({
          name: role.name ?? "",
          guard_name: role.guard_name ?? "web",
        });
      } catch (loadError) {
        if (isMounted) {
          setPageError(getApiErrorMessage(loadError, "Server error."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [isEdit, roleId, rolesApi, reset]);

  async function onSubmit(data) {
    setIsSaving(true);
    setPageError("");

    try {
      const payload = normalizePayload(data);

      if (isEdit) {
        await rolesApi.update(roleId, payload);
        toast.success("Role updated successfully.");
      } else {
        await rolesApi.create(payload);
        toast.success("Role created successfully.");
      }

          navigate("/admin/access-roles", { replace: true });
    } catch (saveError) {
      const validationErrors = saveError?.response?.data?.errors;

      if (validationErrors) {
        Object.entries(validationErrors).forEach(([key, value]) => {
          setError(key, {
            message: value?.[0] ?? "Invalid value",
          });
        });
      } else {
        setPageError(getApiErrorMessage(saveError, "Server error."));
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">{title}</h1>
          <p className="text-[13px] text-slate-500">
            {isEdit ? "Update role details." : "Create a new user role."}
          </p>
        </div>

        <Link
          to="/admin/access-roles"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to roles
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        {isLoading ? (
          <div className={`text-slate-500 ${bodyTextClassName}`}>Loading form...</div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {pageError ? (
              <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>
                {pageError}
              </div>
            ) : null}

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <FormInput
                id="name"
                label="Role Name"
                placeholder="e.g. trainer"
                required
                error={errors.name?.message}
                {...register("name")}
              />

              <FormInput
                id="guard_name"
                label="Guard"
                placeholder="e.g. web"
                required
                error={errors.guard_name?.message}
                {...register("guard_name")}
              />
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <Link to="/admin/access-roles" className="sm:w-auto">
                <FormButton type="button" variant="secondary" className="w-full sm:w-auto sm:px-5">Cancel</FormButton>
              </Link>
              <FormButton type="submit" disabled={isSaving} className="sm:w-auto sm:px-5">
                {isSaving ? "Saving..." : isEdit ? "Update Role" : "Create Role"}
              </FormButton>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
