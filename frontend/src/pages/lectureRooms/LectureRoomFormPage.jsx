import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";

import { bodyTextClassName, labelTextClassName, inputClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useLectureRoomsApi } from "@/hooks/useLectureRoomsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function LectureRoomFormPage() {
  const { roomId } = useParams();
  const isEdit = Boolean(roomId);
  const navigate = useNavigate();
  const api = useLectureRoomsApi();

  const [form, setForm] = useState({
    name: "",
    code: "",
    capacity: "",
    location: "",
    description: "",
    is_active: true,
  });
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        if (isEdit) {
          const roomRes = await api.show(roomId);
          if (mounted && roomRes.data) {
            const r = roomRes.data;
            setForm({
              name: r.name ?? "",
              code: r.code ?? "",
              capacity: r.capacity ?? "",
              location: r.location ?? "",
              description: r.description ?? "",
              is_active: r.is_active ?? true,
            });
          }
        }
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load data."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    if (isEdit) load(); else setIsLoading(false);
    return () => { mounted = false; };
  }, [isEdit]);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    const payload = {
      ...form,
      capacity: form.capacity ? Number(form.capacity) : null,
      description: form.description || null,
    };

    try {
      if (isEdit) {
        await api.update(roomId, payload);
        toast.success("Room updated.");
      } else {
        await api.create(payload);
        toast.success("Room created.");
      }
      navigate("/lecture-rooms");
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to save room."));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading...</div>;
  }

  return (
    <section className="space-y-5">
      <button
        type="button"
        onClick={() => navigate("/lecture-rooms")}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Rooms
      </button>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <h1 className="mb-6 text-[18px] font-semibold text-slate-950">
          {isEdit ? "Edit Lecture Room" : "Add Lecture Room"}
        </h1>

        {error ? (
          <div className={`mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Room Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputClassName}
                required
                maxLength={255}
              />
            </div>
            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Code *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className={inputClassName}
                required
                maxLength={50}
              />
            </div>
            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Capacity</label>
              <input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                className={inputClassName}
                min={1}
                placeholder="e.g. 50"
              />
            </div>
            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className={inputClassName}
                maxLength={255}
                placeholder="e.g. Block A, Floor 2"
              />
            </div>
            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Status</label>
              <select
                value={form.is_active ? "active" : "inactive"}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.value === "active" }))}
                className={`${selectClassName} w-full`}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={`${inputClassName} min-h-[80px] w-full resize-y py-3`}
              maxLength={5000}
            />
          </div>

          <div className="flex justify-end gap-3">
            <FormButton type="button" variant="secondary" onClick={() => navigate("/lecture-rooms")}>
              Cancel
            </FormButton>
            <FormButton type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : isEdit ? "Update Room" : "Create Room"}
            </FormButton>
          </div>
        </form>
      </div>
    </section>
  );
}
