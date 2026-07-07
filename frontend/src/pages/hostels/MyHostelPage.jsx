import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Building2, Bed, DoorOpen, ArrowRight, Wallet } from "lucide-react";

import { bodyTextClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useHostelsApi } from "@/hooks/useHostelsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function MyHostelPage() {
  const api = useHostelsApi();

  const [allocation, setAllocation] = useState(null);
  const [canBook, setCanBook] = useState(false);
  const [availableHostels, setAvailableHostels] = useState([]);
  const [accountBalance, setAccountBalance] = useState(0);
  const [minimumFee, setMinimumFee] = useState(0);
  const [hasSufficientBalance, setHasSufficientBalance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [reason, setReason] = useState(null);
  const [error, setError] = useState("");

  const reasonLabels = {
    already_allocated: "You already have an active hostel allocation.",
    no_active_session: "There is no active academic session set up. An admin needs to activate a session.",
    not_enrolled_in_session: "You are not enrolled in the current active academic session.",
    no_active_hostels: "No hostels have been created or activated by the administration.",
    gender_mismatch: "All available hostels have gender restrictions that do not match your profile.",
    all_hostels_full: "All hostel beds are currently occupied. No vacancies available.",
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const res = await api.myAllocation();
        if (mounted && res?.data) {
          setAllocation(res.data.allocation ?? null);
          setCanBook(res.data.can_book ?? false);
          setAvailableHostels(res.data.available_hostels ?? []);
          setAccountBalance(res.data.account_balance ?? 0);
          setMinimumFee(res.data.minimum_fee ?? 0);
          setHasSufficientBalance(res.data.has_sufficient_balance ?? false);
          setReason(res.data.reason ?? null);
        }
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load allocation."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [api]);

  const handleBook = useCallback(async (hostelId) => {
    setIsBooking(true);
    try {
      const res = await api.selfBook({ hostel_id: hostelId });
      toast.success("Hostel booked successfully!");
      setAllocation(res?.data?.allocation ?? null);
      setCanBook(false);
      setAvailableHostels([]);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to book hostel."));
    } finally {
      setIsBooking(false);
    }
  }, [api]);

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
      ) : canBook ? (
        <div className="space-y-4">
          <div className={`rounded-xl border border-slate-200/80 bg-white p-5 ${bodyTextClassName}`}>
            <div className="mb-4 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-slate-400" />
              <span className="text-slate-600">Account Balance: <strong className="text-slate-900">{Number(accountBalance).toLocaleString()}</strong></span>
              {hasSufficientBalance ? (
                <span className="ml-2 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">Sufficient</span>
              ) : (
                <span className="ml-2 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-medium text-red-600">Insufficient (min. {Number(minimumFee).toLocaleString()})</span>
              )}
            </div>

            <p className="text-slate-600">Available hostels with vacancies:</p>
          </div>

          {availableHostels.map((hostel) => (
            <div key={hostel.id} className="rounded-xl border border-slate-200/80 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-[15px] font-semibold text-slate-900">{hostel.name}</h3>
                  <p className="text-[12px] text-slate-500">{hostel.code}{hostel.location ? ` \u2022 ${hostel.location}` : ""}</p>
                  <p className="mt-1 text-[12px] text-slate-500">{hostel.available_beds} bed{hostel.available_beds !== 1 ? "s" : ""} available</p>
                  <p className="mt-1 text-[13px] font-medium text-slate-700">{Number(hostel.session_fee_amount).toLocaleString()} KES</p>
                </div>
                <FormButton
                  onClick={() => handleBook(hostel.id)}
                  disabled={isBooking || !hasSufficientBalance}
                >
                  {isBooking ? "Booking..." : "Book"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </FormButton>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center ${bodyTextClassName}`}>
          <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-slate-500">You do not have a hostel allocation yet.</p>
          {reason && reasonLabels[reason] ? (
            <p className="mt-2 text-[13px] font-medium text-amber-600">{reasonLabels[reason]}</p>
          ) : (
            <p className="mt-1 text-[12px] text-slate-400">No hostels are currently available for booking.</p>
          )}
        </div>
      )}
    </section>
  );
}
