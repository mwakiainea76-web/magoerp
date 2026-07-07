import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Pencil, Plus, Trash2, ArrowLeft, Settings2 } from "lucide-react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";

import { bodyTextClassName, initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { Modal, ModalBody, ModalFooter } from "@/components/Modal";
import { Table, TableHeader, TableWrapper, Thead, Th, Tbody, Td, TableFooter } from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { useHostelsApi } from "@/hooks/useHostelsApi";
import { useHostelRoomsApi } from "@/hooks/useHostelRoomsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";
import {
  HostelRoomForm,
  hostelRoomSchema,
  defaultHostelRoomValues,
  normalizeHostelRoomPayload,
} from "./HostelRoomForm";

export function HostelRoomsPage() {
  const [searchParams] = useSearchParams();
  const hostelId = searchParams.get("hostelId");

  const hostelsApi = useHostelsApi();
  const roomsApi = useHostelRoomsApi();

  const [hostel, setHostel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formError, setFormError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setError: setFormFieldError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(hostelRoomSchema),
    defaultValues: defaultHostelRoomValues,
  });

  const loadRooms = useCallback(async () => {
    if (!hostelId) return;
    setIsLoading(true);
    setError("");
    try {
      const [hostelRes, roomsRes] = await Promise.all([
        hostelsApi.show(hostelId),
        roomsApi.list({ hostel_id: hostelId }),
      ]);
      setHostel(hostelRes.data ?? null);
      setRooms(roomsRes.data ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load rooms."));
    } finally {
      setIsLoading(false);
    }
  }, [hostelId, hostelsApi, roomsApi]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  const openCreateModal = useCallback(() => {
    setEditingRoom(null);
    setFormError("");
    reset(defaultHostelRoomValues);
    setModalOpen(true);
  }, [reset]);

  const openEditModal = useCallback(async (room) => {
    setEditingRoom(room);
    setFormError("");
    reset({
      code: room.code ?? "",
      name: room.name ?? "",
      floor: room.floor ?? "",
      bed_count: room.bed_count ?? 1,
      is_active: room.is_active ?? true,
    });
    setModalOpen(true);
  }, [reset]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingRoom(null);
    setFormError("");
  }, []);

  const onSubmit = useCallback(async (data) => {
    setSaving(true);
    setFormError("");
    try {
      if (editingRoom) {
        await roomsApi.update(editingRoom.id, normalizeHostelRoomPayload(data, hostelId));
        toast.success("Room updated.");
      } else {
        await roomsApi.create(normalizeHostelRoomPayload(data, hostelId));
        toast.success("Room created.");
      }
      closeModal();
      await loadRooms();
    } catch (e) {
      const serverErrors = e?.response?.data?.errors;
      if (serverErrors) {
        Object.entries(serverErrors).forEach(([key, value]) => {
          setFormFieldError(key, { message: value?.[0] ?? "Invalid value" });
        });
      } else {
        setFormError(getApiErrorMessage(e, "Failed to save room."));
      }
    } finally {
      setSaving(false);
    }
  }, [editingRoom, hostelId, roomsApi, closeModal, loadRooms, setFormFieldError]);

  const handleDelete = useCallback(async (room) => {
    if (!window.confirm(`Delete room ${room.code}?`)) return;
    try {
      await roomsApi.remove(room.id);
      toast.success("Room deleted.");
      await loadRooms();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to delete room."));
    }
  }, [roomsApi, loadRooms]);

  const total = rooms.length;
  const lastPage = Math.ceil(total / perPage);
  const paginated = rooms.slice((page - 1) * perPage, page * perPage);

  if (!hostelId) {
    return (
      <section className="space-y-5">
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
          No hostel selected. <Link to="/admin/hostels" className="text-emerald-600 underline">Go to hostels</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin/hostels" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">
              {hostel?.name ?? "Rooms"}
            </h1>
            <p className="text-[13px] text-slate-500">Manage rooms and beds</p>
          </div>
        </div>
        <FormButton onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />Add Room
        </FormButton>
      </div>

      {error ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      ) : null}

      <Table>
        <TableHeader>
          <h2 className="text-[1.0625rem] font-semibold text-slate-900">
            {hostel ? `${hostel.name} — Rooms` : "Rooms"}
          </h2>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading rooms...</div>
        ) : rooms.length === 0 ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>No rooms found. Click "Add Room" to create one.</div>
        ) : (
          <TableWrapper>
            <Thead>
              <tr>
                <Th className="w-10 text-center">#</Th>
                <Th>Code</Th>
                <Th>Name</Th>
                <Th>Floor</Th>
                <Th className="text-center">Beds</Th>
                <Th className="text-center">Active Beds</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {paginated.map((r, index) => (
                <tr key={r.id}>
                  <Td className="w-10 text-center text-slate-400">{(page - 1) * perPage + index + 1}</Td>
                  <Td className="font-medium text-slate-800">{r.code}</Td>
                  <Td>{r.name}</Td>
                  <Td>{r.floor ?? "—"}</Td>
                  <Td className="text-center">{r.bed_count}</Td>
                  <Td className="text-center">{r.active_beds_count}</Td>
                  <Td>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${r.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {r.is_active ? "Active" : "Inactive"}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openEditModal(r)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => handleDelete(r)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </Tbody>
          </TableWrapper>
        )}

        <TableFooter>
          <PaginationFooter
            page={page}
            perPage={perPage}
            total={total}
            lastPage={lastPage}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
          />
        </TableFooter>
      </Table>

      <Modal open={modalOpen} onClose={closeModal} title={editingRoom ? "Edit Room" : "Add Room"} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} id="room-form">
          <ModalBody>
            {formError ? (
              <div className={`mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{formError}</div>
            ) : null}
            <HostelRoomForm register={register} errors={errors} hostelName={hostel?.name} />
          </ModalBody>
          <ModalFooter>
            <FormButton type="button" variant="secondary" onClick={closeModal}>Cancel</FormButton>
            <FormButton type="submit" disabled={saving}>
              {saving ? "Saving..." : editingRoom ? "Update Room" : "Create Room"}
            </FormButton>
          </ModalFooter>
        </form>
      </Modal>
    </section>
  );
}
