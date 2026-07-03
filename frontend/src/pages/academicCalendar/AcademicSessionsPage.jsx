import { yupResolver } from "@hookform/resolvers/yup";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { PaginationFooter } from "@/components/PaginationFooter";
import { FormButton } from "@/components/FormButton";
import { Modal, ModalBody, ModalFooter } from "@/components/Modal";
import { useAcademicSessionsApi } from "@/hooks/useAcademicSessionsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";
import {
  AcademicSessionForm,
  academicSessionSchema,
  defaultAcademicSessionValues,
  normalizeAcademicSessionPayload,
} from "@/pages/academicCalendar/AcademicSessionForm";

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function AcademicSessionsPage() {
  const sessionsApi = useAcademicSessionsApi();
  const [searchParams] = useSearchParams();
  const yearId = searchParams.get("yearId") ?? "";
  const yearName = searchParams.get("yearName") ?? "";

  const [sessions, setSessions] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormLoading, setIsFormLoading] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editData, setEditData] = useState(null);

  const formModalValues = useMemo(() => {
    if (editData) {
      return {
        code: editData.code ?? "",
        name: editData.name ?? "",
        description: editData.description ?? "",
        start_date: editData.start_date ?? "",
        end_date: editData.end_date ?? "",
        status: editData.is_active ? "active" : "disabled",
      };
    }
    return defaultAcademicSessionValues;
  }, [editData]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError: setFormFieldError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(academicSessionSchema),
    values: formModalValues,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadSessions() {
      setIsLoading(true);
      setError("");

      try {
        const response = await sessionsApi.list({
          academic_year_id: yearId,
          page,
          per_page: perPage,
        });

        if (isMounted) {
          setSessions(response.data ?? []);
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

    loadSessions();

    return () => {
      isMounted = false;
    };
  }, [sessionsApi, page, perPage, yearId, reloadKey]);

  async function handleDelete(session) {
    const confirmed = window.confirm(`Delete ${session.name}?`);
    if (!confirmed) return;

    setDeletingId(session.id);
    setError("");

    try {
      await sessionsApi.remove(session.id);
      toast.success("Academic session deleted successfully.");
      setReloadKey((current) => current + 1);
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError, "Server error."));
    } finally {
      setDeletingId(null);
    }
  }

  function openCreateModal() {
    setEditData(null);
    setEditingSessionId(null);
    setFormError("");
    setIsFormModalOpen(true);
  }

  async function openEditModal(id) {
    setEditingSessionId(id);
    setFormError("");
    setIsFormLoading(true);
    setIsFormModalOpen(true);

    try {
      const response = await sessionsApi.show(id);
      setEditData(response.data);
    } catch (loadError) {
      setFormError(getApiErrorMessage(loadError, "Server error."));
    } finally {
      setIsFormLoading(false);
    }
  }

  function closeFormModal() {
    if (isSaving) return;

    setIsFormModalOpen(false);
    setEditingSessionId(null);
    setEditData(null);
    setFormError("");
    setIsFormLoading(false);
  }

  async function onSubmitForm(data) {
    if (!yearId) {
      setFormError("Choose an academic year first before adding a session.");
      return;
    }

    setIsSaving(true);
    setFormError("");

    try {
      const payload = normalizeAcademicSessionPayload(data, yearId);

      if (editingSessionId) {
        await sessionsApi.update(editingSessionId, payload);
        toast.success("Academic session updated successfully.");
      } else {
        await sessionsApi.create(payload);
        toast.success("Academic session created successfully.");
      }

      setIsFormModalOpen(false);
      setEditingSessionId(null);
      setEditData(null);
      setIsFormLoading(false);
      setPage(1);
      setReloadKey((current) => current + 1);
    } catch (saveError) {
      const validationErrors = saveError?.response?.data?.errors;

      if (validationErrors) {
        Object.entries(validationErrors).forEach(([key, value]) => {
          setFormFieldError(key === "is_active" ? "status" : key, {
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

  const isEditing = Boolean(editingSessionId);
  const modalTitle = isEditing ? "Edit Academic Session" : "Add Academic Session";
  const modalDescription = yearName
    ? `${isEditing ? "Update" : "Create"} a session for ${yearName}.`
    : `${isEditing ? "Update" : "Create"} a session for this academic year.`;

  const summaryTitle = yearName ? `Academic Year: ${yearName}` : "Academic Sessions";

  const summaryMeta = useMemo(() => {
    const totalSessions = meta.total ?? 0;
    return `Total Sessions: ${totalSessions}`;
  }, [meta.total]);

  const yearField = useMemo(
    () => (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-[14px] text-emerald-800">
        <span className="font-medium text-emerald-900">Academic Year:</span>{" "}
        {yearName || "Selected year"}
      </div>
    ),
    [yearName],
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
          disabled={!yearId}
          className="h-10 gap-2 px-5"
        >
          <Plus className="h-4 w-4" />
          Add Session
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
            Academic Sessions
          </h2>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
            Loading academic sessions...
          </div>
        ) : (
          <>
            <TableWrapper>
              <Thead>
                <tr>
                  <Th className="w-12 text-center">#</Th>
                  <Th>Session Code</Th>
                  <Th>Session Name</Th>
                  <Th>Start Date</Th>
                  <Th>End Date</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {sessions.length === 0 ? (
                  <tr>
                    <Td
                      className={`px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}
                      colSpan={7}
                    >
                      No academic sessions found
                    </Td>
                  </tr>
                ) : (
                  sessions.map((session, index) => (
                    <tr key={session.id}>
                      <Td className="w-12 text-center text-slate-400">
                        {(meta.current_page - 1) * meta.per_page + index + 1}
                      </Td>
                      <Td>{session.code}</Td>
                      <Td>{session.name}</Td>
                      <Td className="whitespace-nowrap">{session.start_date ?? "—"}</Td>
                      <Td className="whitespace-nowrap">{session.end_date ?? "—"}</Td>
                      <Td><StatusBadge active={session.is_active} /></Td>
                      <Td>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(session.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(session)}
                            disabled={deletingId === session.id}
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
          <AcademicSessionForm
            formId="academic-session-form"
            onSubmit={handleSubmit(onSubmitForm)}
            register={register}
            watch={watch}
            errors={errors}
            loading={isFormLoading}
            formError={formError}
            yearField={yearField}
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
            form="academic-session-form"
            disabled={isSaving || isFormLoading}
          >
            {isSaving
              ? "Saving..."
              : isEditing
                ? "Update Session"
                : "Create Session"}
          </FormButton>
        </ModalFooter>
      </Modal>
    </section>
  );
}
