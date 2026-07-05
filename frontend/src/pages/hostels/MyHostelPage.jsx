import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Building2, Bed, DoorOpen, ArrowRight } from "lucide-react";

import { bodyTextClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useHostelsApi } from "@/hooks/useHostelsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function MyHostelPage() {
  const api = useHostelsApi();

  const [allocation, setAllocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const res = await api.myAllocation();
        if (mounted) setAllocation(res.data ?? null);
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load allocation."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (isLoading) {
    return (
      <section className="space-y-5">
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">My Hostel</h1>
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>Loading...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-5">
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">My Hostel</h1>
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">My Hostel</h1>
        <p className="text-[13px] text-slate-500">Your hostel accommodation details</p>
      </div>

      {allocation ? (
        <div className="rounded-xl border border-slate-200/80 bg-white p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
              <Building2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-[18px] font-semibold text-slate-900">{allocation.hostel_name}</h2>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${allocation.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {allocation.status}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-100 p-4">
              <DoorOpen className="mb-2 h-5 w-5 text-slate-400" />
              <p className="text-[12px] font-medium text-slate-500">Room</p>
              <p className="text-[15px] font-semibold text-slate-800">{allocation.room_name}</p>
            </div>
            <div className="rounded-lg border border-slate-100 p-4">
              <Bed className="mb-2 h-5 w-5 text-slate-400" />
              <p className="text-[12px] font-medium text-slate-500">Bed</p>
              <p className="text-[15px] font-semibold text-slate-800">{allocation.bed_label}</p>
            </div>
            <div className="rounded-lg border border-slate-100 p-4">
              <p className="text-[12px] font-medium text-slate-500">Fee Charged</p>
              <p className="text-[15px] font-semibold text-slate-800">
                {Number(allocation.hostel_fee_amount).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-4 text-[13px] text-slate-500">
            Allocated on: {allocation.allocated_on} | Session: {allocation.session_name}
          </div>
        </div>
      ) : (
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center ${bodyTextClassName}`}>
          <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-slate-500">You do not have a hostel allocation yet.</p>
          <p className="mt-1 text-[12px] text-slate-400">Check available hostels and book online.</p>
          <Link to="/student/hostel-book" className="mt-5 inline-block">
            <FormButton>
              Book a Hostel
              <ArrowRight className="ml-2 h-4 w-4" />
            </FormButton>
          </Link>
        </div>
      )}
    </section>
  );
}
