import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Pencil, Plus, Settings2, Trash2 } from "lucide-react";
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
import { PaginationFooter } from "@/components/PaginationFooter";
import { FormButton } from "@/components/FormButton";
import { Modal, ModalBody, ModalFooter } from "@/components/Modal";
import { useFeeStructureItemsApi } from "@/hooks/useFeeStructureItemsApi";
import { useFeeStructuresApi } from "@/hooks/useFeeStructuresApi";
import { getApiErrorMessage } from "@/lib/api/authClient";
import {
  defaultFeeStructureItemValues,
  FeeStructureItemForm,
  feeStructureItemSchema,
  normalizeFeeStructureItemPayload,
} from "./FeeStructureItemForm";

function formatCurrency(amount) {
  return `Ksh ${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function FeeStructureItemsPage() {
  const itemsApi = useFeeStructureItemsApi();
  const templatesApi = useFeeStructuresApi();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("templateId") ?? "";

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    setError: setFormFieldError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(feeStructureItemSchema),
    defaultValues: defaultFeeStructureItemValues,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadTemplate() {
      if (!templateId) {
        if (isMounted) {
          setSelectedTemplate(null);
          setIsLoadingTemplate(false);
        }
        return;
      }

      setIsLoadingTemplate(true);

      try {
        const response = await templatesApi.show(templateId);
        if (isMounted) {
          setSelectedTemplate(response.data ?? null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, "Server error."));
        }
      } finally {
        if (isMounted) {
          setIsLoadingTemplate(false);
        }
      }
    }

    loadTemplate();

    return () => {
      isMounted = false;
    };
  }, [templateId, templatesApi]);

  useEffect(() => {
    let isMounted = true;

    async function loadItems() {
      setIsLoading(true);
      setError("");

      try {
        const response = await itemsApi.list({
          fee_structure_id: templateId,
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
  }, [itemsApi, page, perPage, templateId, reloadKey]);

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
    setEditingItem(null);
    setFormError("");
    reset(defaultFeeStructureItemValues);
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
      setEditingItem(item ?? null);

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
    setEditingItem(null);
    setFormError("");
    setIsFormLoading(false);
    reset(defaultFeeStructureItemValues);
  }

  async function onSubmitForm(data) {
    if (!templateId) {
      setFormError("Choose a fee template first before adding a component.");
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      const payload = normalizeFeeStructureItemPayload(data, templateId);

      if (editingItemId) {
        await itemsApi.update(editingItemId, payload);
        toast.success("Fee component updated successfully.");
      } else {
        await itemsApi.create(payload);
        toast.success("Fee component created successfully.");
      }

      setEditingItemId(null);
      setEditingItem(null);
      setIsFormLoading(false);
      reset(defaultFeeStructureItemValues);
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
  const modalDescription = selectedTemplate?.name
    ? `${isEditing ? "Update" : "Create"} a fee component for ${selectedTemplate.name}.`
    : `${isEditing ? "Update" : "Create"} a fee component for this fee template.`;

  const summaryTitle = isLoadingTemplate
    ? "Loading fee template..."
    : selectedTemplate?.name
      ? `Fee Template: ${selectedTemplate.name}`
      : "Fee Template Items";

  const summaryMeta = useMemo(() => {
    const totalItems = selectedTemplate?.items_count ?? meta.total ?? 0;
    const totalAmount = formatCurrency(selectedTemplate?.total_amount);
    return `Total Items: ${totalItems} | Total Amount: ${totalAmount}`;
  }, [meta.total, selectedTemplate?.items_count, selectedTemplate?.total_amount]);

  const templateField = (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-[14px] text-emerald-800">
      <span className="font-medium text-emerald-900">Fee Template:</span>{" "}
      {selectedTemplate?.name ?? "Selected template"}
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
          disabled={!templateId || isLoadingTemplate}
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
            Fee Template Items
          </h2>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
            Loading fee template items...
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
                      No fee template items found
                    </Td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr key={item.id}>
                      <Td className="w-12 text-center text-slate-400">
                        {(meta.current_page - 1) * meta.per_page + index + 1}
                      </Td>
                      <Td>{item.name}</Td>
                      <Td>
                        <div className="flex flex-col gap-1">
                          <span>{formatCurrency(item.amount)}</span>
                          {item.is_amount_locked ? (
                            <span className="w-fit rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                              Amount locked
                            </span>
                          ) : null}
                        </div>
                      </Td>
                      <Td>
                        <div className="flex justify-end gap-2">
                          {item.is_locked ? (
                            <span
                              className="inline-flex h-7 items-center gap-1 rounded-lg border border-amber-200 px-2 text-[11px] font-medium text-amber-600 cursor-not-allowed"
                              title={item.lock_reason ?? "Locked"}
                            >
                              <Settings2 className="h-3 w-3" />
                              Locked
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openEditModal(item.id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.id || item.is_locked}
                            title={
                              item.is_locked
                                ? "This template has been assigned. Components cannot be deleted."
                                : "Delete component"
                            }
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
              <PaginationFooter page={page} perPage={perPage} total={meta.total} lastPage={meta.last_page} onPageChange={setPage} onPerPageChange={setPerPage} />
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
          <FeeStructureItemForm
            formId="fee-template-item-form"
            onSubmit={handleSubmit(onSubmitForm)}
            register={register}
            errors={errors}
            loading={isFormLoading}
            formError={formError}
            templateField={templateField}
            amountLocked={Boolean(editingItem?.is_amount_locked)}
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
            form="fee-template-item-form"
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

export default FeeStructureItemsPage;
