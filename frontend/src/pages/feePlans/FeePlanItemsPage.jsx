import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";

import { bodyTextClassName, initialMeta } from "@/lib/styles";
import {
  Table,
  TableFooter,
  TableHeader,
  TableWrapper,
  Tbody,
  Td,
  Th,
  Thead,
} from "@/components/DataTable";
import { FormButton } from "@/components/FormButton";
import { Modal, ModalBody, ModalFooter } from "@/components/Modal";
import { useFeePlanItemsApi } from "@/hooks/useFeePlanItemsApi";
import { useFeePlansApi } from "@/hooks/useFeePlansApi";
import { getApiErrorMessage } from "@/lib/api/authClient";
import {
  defaultFeePlanItemValues,
  FeePlanItemForm,
  feePlanItemSchema,
  normalizeFeePlanItemPayload,
} from "@/pages/feePlans/FeePlanItemForm";

function formatCurrency(amount) {
  return `Ksh ${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function FeePlanItemsPage() {
  const itemsApi = useFeePlanItemsApi();
  const plansApi = useFeePlansApi();
  const [searchParams] = useSearchParams();
  const planId = searchParams.get("planId") ?? "";

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setError: setFormFieldError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(feePlanItemSchema),
    defaultValues: defaultFeePlanItemValues,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadPlan() {
      if (!planId) {
        if (isMounted) {
          setSelectedPlan(null);
          setIsLoadingPlan(false);
        }
        return;
      }

      setIsLoadingPlan(true);

      try {
        const response = await plansApi.show(planId);
        if (isMounted) {
          setSelectedPlan(response.data ?? null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, "Server error."));
        }
      } finally {
        if (isMounted) {
          setIsLoadingPlan(false);
        }
      }
    }

    loadPlan();

    return () => {
      isMounted = false;
    };
  }, [planId, plansApi]);

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      setIsLoading(true);
      setError("");

      try {
        const response = await itemsApi.list({
          fee_plan_id: planId,
          page,
          per_page: perPage,
        });

        if (isMounted) {
          setItems(response.data ?? []);
          setMeta(response.meta ?? initialMeta);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, "Server error."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadItems();

    return () => {
      isMounted = false;
    };
  }, [itemsApi, page, perPage, planId, reloadKey]);

  async function handleDelete(item) {
    const confirmed = window.confirm(`Delete ${item.name}?`);
    if (!confirmed) return;

    setDeletingId(item.id);
    setError("");

    try {
      await itemsApi.remove(item.id);
      toast.success("Fee component deleted successfully.");
      setReloadKey((current) => current + 1);
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError, "Server error."));
    } finally {
      setDeletingId(null);
    }
  }

  function openCreateModal() {
    setEditingItemId(null);
    setFormError("");
    reset(defaultFeePlanItemValues);
    setIsFormLoading(false);
    setIsFormModalOpen(true);
  }

  async function openEditModal(itemId) {
    setEditingItemId(itemId);
    setFormError("");
    setIsFormLoading(true);
    setIsFormModalOpen(true);

    try {
      const response = await itemsApi.show(itemId);
      const item = response.data;

      reset({
        name: item?.name ?? "",
        amount: item?.amount ?? "",
        description: item?.description ?? "",
        is_active: item?.is_active ?? true,
      });
    } catch (loadError) {
      setFormError(getApiErrorMessage(loadError, "Server error."));
    } finally {
      setIsFormLoading(false);
    }
  }

  function closeFormModal() {
    if (isSaving) return;

    setIsFormModalOpen(false);
    setEditingItemId(null);
    setFormError("");
    setIsFormLoading(false);
    reset(defaultFeePlanItemValues);
  }

  async function onSubmitForm(data) {
    if (!planId) {
      setFormError("Choose a fee plan first before adding a component.");
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      const payload = normalizeFeePlanItemPayload(data, planId);

      if (editingItemId) {
        await itemsApi.update(editingItemId, payload);
        toast.success("Fee component updated successfully.");
      } else {
        await itemsApi.create(payload);
        toast.success("Fee component created successfully.");
      }

      setIsFormModalOpen(false);
      setEditingItemId(null);
      setIsFormLoading(false);
      reset(defaultFeePlanItemValues);
      setPage(1);
      setReloadKey((current) => current + 1);
    } catch (saveError) {
      const validationErrors = saveError?.response?.data?.errors;

      if (validationErrors) {
        Object.entries(validationErrors).forEach(([key, value]) => {
          setFormFieldError(key, {
            message: value?.[0] ?? "Invalid value",
          });
        });
      } else {
        setFormError(getApiErrorMessage(saveError, "Server error."));
      }
    } finally {
      setIsSaving(false);
    }
  }

  const isEditing = Boolean(editingItemId);
  const modalTitle = isEditing ? "Edit Fee Component" : "Add Fee Component";
  const modalDescription = selectedPlan?.name
    ? `${isEditing ? "Update" : "Create"} a fee component for ${selectedPlan.name}.`
    : `${isEditing ? "Update" : "Create"} a fee component for this fee plan.`;

  const summaryTitle = isLoadingPlan
    ? "Loading fee plan..."
    : selectedPlan?.name
      ? `Fee Plan: ${selectedPlan.name}`
      : "Fee Plan Items";

  const summaryMeta = useMemo(() => {
    const totalItems = selectedPlan?.items_count ?? meta.total ?? 0;
    const totalAmount = formatCurrency(selectedPlan?.total_amount);
    return `Total Items: ${totalItems} | Total Amount: ${totalAmount}`;
  }, [meta.total, selectedPlan?.items_count, selectedPlan?.total_amount]);

  const planField = (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-[14px] text-emerald-800">
      <span className="font-medium text-emerald-900">Fee Plan:</span>{" "}
      {selectedPlan?.name ?? "Selected plan"}
    </div>
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">
            {summaryTitle}
          </h1>
          <p className="mt-1 text-[14px] text-slate-500">{summaryMeta}</p>
        </div>

        <FormButton
          type="button"
          onClick={openCreateModal}
          disabled={!planId || isLoadingPlan}
          className="h-10 gap-2 px-5"
        >
          <Plus className="h-4 w-4" />
          Add Component
        </FormButton>
      </div>

      {error ? (
        <div
          className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}
        >
          {error}
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <h2 className="text-[1.0625rem] font-semibold text-slate-900">
            Fee Plan Items
          </h2>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
            Loading fee plan items...
          </div>
        ) : (
          <>
            <TableWrapper>
              <Thead>
                <tr>
                  <Th className="w-12 text-center">#</Th>
                  <Th>Fee component name</Th>
                  <Th>Amount</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {items.length === 0 ? (
                  <tr>
                    <Td
                      className={`px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}
                      colSpan={4}
                    >
                      No fee plan items found
                    </Td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr key={item.id}>
                      <Td className="w-12 text-center text-slate-400">
                        {(meta.current_page - 1) * meta.per_page + index + 1}
                      </Td>
                      <Td>{item.name}</Td>
                      <Td>{formatCurrency(item.amount)}</Td>
                      <Td>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(item.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.id}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  ))
                )}
              </Tbody>
            </TableWrapper>

            <TableFooter>
              <p className={`text-slate-500 ${bodyTextClassName}`}>
                {meta.total > 0
                  ? `Showing ${meta.from} to ${meta.to} of ${meta.total} items`
                  : "No results"}
              </p>
              <div className="flex items-center gap-3">
                <FormButton
                  type="button"
                  variant="secondary"
                  className="h-9 w-auto px-4"
                  disabled={meta.current_page <= 1 || isLoading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </FormButton>
                <span className={`text-slate-500 ${bodyTextClassName}`}>
                  Page {meta.current_page} of {meta.last_page}
                </span>
                <FormButton
                  type="button"
                  variant="secondary"
                  className="h-9 w-auto px-4"
                  disabled={meta.current_page >= meta.last_page || isLoading}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </FormButton>
              </div>
            </TableFooter>
          </>
        )}
      </Table>

      <Modal
        open={isFormModalOpen}
        onClose={closeFormModal}
        title={modalTitle}
        description={modalDescription}
        size="lg"
      >
        <ModalBody>
          <FeePlanItemForm
            formId="fee-plan-item-form"
            onSubmit={handleSubmit(onSubmitForm)}
            register={register}
            errors={errors}
            loading={isFormLoading}
            formError={formError}
            planField={planField}
          />
        </ModalBody>
        <ModalFooter>
          <FormButton
            type="button"
            variant="secondary"
            onClick={closeFormModal}
            disabled={isSaving}
          >
            Cancel
          </FormButton>
          <FormButton
            type="submit"
            form="fee-plan-item-form"
            disabled={isSaving || isFormLoading}
          >
            {isSaving
              ? "Saving..."
              : isEditing
                ? "Update Component"
                : "Create Component"}
          </FormButton>
        </ModalFooter>
      </Modal>
    </section>
  );
}

export default FeePlanItemsPage;
