import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";

import { bodyTextClassName, labelTextClassName, inputClassName, selectClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useHostelsApi } from "@/hooks/useHostelsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function HostelFormPage() {
  const { hostelId } = useParams();
  const navigate = useNavigate();
  const api = useHostelsApi();
  const isEditing = Boolean(hostelId);

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [fee, setFee] = useState("");
  const [gender, setGender] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hostelId) return;
    let mounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const res = await api.show(hostelId);
        const h = res.data;
        if (mounted) {
          setName(h.name);
          setCode(h.code);
          setFee(String(h.session_fee_amount));
          setGender(h.gender ?? "");
          setLocation(h.location ?? "");
          setDescription(h.description ?? "");
          setIsActive(h.is_active);
          setRooms((h.rooms ?? []).map((r) => ({
            _id: r.id,
            name: r.name,
            code: r.code,
            floor: r.floor ?? "",
            bed_count: String(r.bed_count),
            is_active: r.is_active,
          })));
        }
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load hostel."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [hostelId]);

  function addRoom() {
    setRooms((prev) => [...prev, { _id: null, name: "", code: "", floor: "", bed_count: "1", is_active: true }]);
  }

  function removeRoom(index) {
    setRooms((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRoom(index, field, value) {
    setRooms((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!name.trim() || !code.trim()) {
      setError("Name and code are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        code: code.trim(),
        session_fee_amount: Number(fee) || 0,
        gender: gender || null,
        location: location || null,
        description: description || null,
        is_active: isActive,
        rooms: rooms.map((r) => ({
          id: r._id,
          name: r.name,
          code: r.code,
          floor: r.floor || null,
          bed_count: Number(r.bed_count) || 1,
        })),
      };

      if (isEditing) {
        await api.update(hostelId, payload);
        toast.success("Hostel updated.");
      } else {
        await api.create(payload);
        toast.success("Hostel created.");
      }
      navigate("/hostels");
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to save hostel."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading...</div>;
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">{isEditing ? "Edit Hostel" : "Add Hostel"}</h1>
        <p className="text-[13px] text-slate-500">{isEditing ? "Update hostel details" : "Register a new hostel facility"}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClassName} required />
            </div>
            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Code</label>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} className={inputClassName} required />
            </div>
            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Session Fee</label>
              <input type="number" step="0.01" min="0" value={fee} onChange={(e) => setFee(e.target.value)} className={inputClassName} />
            </div>
            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Gender Restriction</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} className={`${selectClassName} w-full`}>
                <option value="">Mixed / No Restriction</option>
                <option value="male">Male Only</option>
                <option value="female">Female Only</option>
              </select>
            </div>
            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Location</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className={inputClassName} />
            </div>
            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Status</label>
              <select value={isActive} onChange={(e) => setIsActive(e.target.value === "true")} className={`${selectClassName} w-full`}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClassName} min-h-[80px] resize-y py-3`} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-slate-900">Rooms</h2>
            <FormButton type="button" variant="secondary" onClick={addRoom}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Room
            </FormButton>
          </div>

          {rooms.length === 0 ? (
            <p className={`text-slate-500 ${bodyTextClassName}`}>No rooms added yet. Click "Add Room" to create rooms with beds.</p>
          ) : (
            <div className="space-y-3">
              {rooms.map((room, index) => (
                <div key={index} className="flex items-end gap-3 rounded-lg border border-slate-100 p-3">
                  <div className="flex-1">
                    <label className={`mb-1 block text-[11px] font-medium text-slate-500`}>Name</label>
                    <input type="text" value={room.name} onChange={(e) => updateRoom(index, "name", e.target.value)} className={inputClassName} required />
                  </div>
                  <div className="flex-1">
                    <label className={`mb-1 block text-[11px] font-medium text-slate-500`}>Code</label>
                    <input type="text" value={room.code} onChange={(e) => updateRoom(index, "code", e.target.value)} className={inputClassName} required />
                  </div>
                  <div className="w-20">
                    <label className={`mb-1 block text-[11px] font-medium text-slate-500`}>Floor</label>
                    <input type="text" value={room.floor} onChange={(e) => updateRoom(index, "floor", e.target.value)} className={inputClassName} />
                  </div>
                  <div className="w-24">
                    <label className={`mb-1 block text-[11px] font-medium text-slate-500`}>Beds</label>
                    <input type="number" min="1" value={room.bed_count} onChange={(e) => updateRoom(index, "bed_count", e.target.value)} className={inputClassName} />
                  </div>
                  <button type="button" onClick={() => removeRoom(index)} className="mb-px flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error ? (
          <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
        ) : null}

        <div className="flex justify-end gap-3">
          <FormButton type="button" variant="secondary" onClick={() => navigate("/hostels")}>Cancel</FormButton>
          <FormButton type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : isEditing ? "Update Hostel" : "Create Hostel"}</FormButton>
        </div>
      </form>
    </section>
  );
}
