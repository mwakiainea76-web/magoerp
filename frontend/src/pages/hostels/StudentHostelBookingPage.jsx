import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Building2, Bed, DoorOpen, MapPin, Users } from "lucide-react";

import { bodyTextClassName, labelTextClassName, inputClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useHostelsApi } from "@/hooks/useHostelsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function StudentHostelBookingPage() {
  const navigate = useNavigate();
  const api = useHostelsApi();

  const [eligibility, setEligibility] = useState(null);
  const [hostels, setHostels] = useState([]);
  const [selectedHostelId, setSelectedHostelId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const [eligRes, hostelsRes] = await Promise.all([
          api.bookingEligibility(),
          api.availableHostels(),
        ]);
        if (mounted) {
          setEligibility(eligRes.data ?? null);
          setHostels(hostelsRes.data ?? []);
        }
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load booking data."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  async function handleBook() {
    if (!selectedHostelId) return;
    setIsBooking(true);
    try {
      const res = await api.selfBook({ hostel_id: selectedHostelId });
      setResult(res.data);
      toast.success("Hostel booked successfully!");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Booking failed."));
    } finally {
      setIsBooking(false);
    }
  }

  if (isLoading) {
    return (
      <section className="space-y-5">
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Book a Hostel</h1>
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>Loading...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-5">
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Book a Hostel</h1>
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      </section>
    );
  }

  if (result) {
    return (
      <section className="space-y-5">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Booking Confirmed</h1>
          <p className="text-[13px] text-slate-500">Your hostel has been booked successfully.</p>
        </div>

        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50 p-6">
          <div className="mb-4 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-emerald-600" />
            <h2 className="text-[18px] font-semibold text-emerald-900">{result.allocation.hostel_name}</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-emerald-100 bg-white p-4">
              <DoorOpen className="mb-2 h-5 w-5 text-emerald-400" />
              <p className="text-[12px] font-medium text-emerald-600">Room</p>
              <p className="text-[15px] font-semibold text-emerald-900">{result.allocation.room_name}</p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-white p-4">
              <Bed className="mb-2 h-5 w-5 text-emerald-400" />
              <p className="text-[12px] font-medium text-emerald-600">Bed</p>
              <p className="text-[15px] font-semibold text-emerald-900">{result.allocation.bed_label}</p>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-white p-4">
              <p className="text-[12px] font-medium text-emerald-600">Fee Charged</p>
              <p className="text-[15px] font-semibold text-emerald-900">
                {Number(result.allocation.hostel_fee_amount).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-emerald-100 bg-white p-4">
            <p className="text-[12px] font-medium text-emerald-600">Invoice</p>
            <p className="text-[14px] text-emerald-900">
              {result.invoice.invoice_number} — {Number(result.invoice.amount).toLocaleString()} KES
            </p>
            <p className="text-[12px] text-emerald-600">Due: {result.invoice.due_date}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <FormButton onClick={() => navigate("/hostel")}>
            View My Hostel
          </FormButton>
        </div>
      </section>
    );
  }

  if (eligibility && !eligibility.can_book) {
    return (
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/hostel")}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </div>

        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Book a Hostel</h1>
          <p className="text-[13px] text-slate-500">{eligibility.message}</p>
        </div>

        {eligibility.allocation ? (
          <div className="rounded-xl border border-slate-200/80 bg-white p-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-slate-400" />
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900">{eligibility.allocation.hostel_name}</h2>
                <p className="text-[13px] text-slate-500">
                  {eligibility.allocation.room_name} — {eligibility.allocation.bed_label}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className={`rounded-xl border border-slate-200/80 bg-amber-50 px-5 py-8 text-center text-slate-600 ${bodyTextClassName}`}>
            {eligibility.message}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/hostel")}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Book a Hostel</h1>
        <p className="text-[13px] text-slate-500">Select a hostel to book for the current session.</p>
      </div>

      {eligibility?.account_balance !== undefined ? (
        <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
          <p className="text-[13px] text-sky-700">
            Account Balance: <span className="font-semibold">{Number(eligibility.account_balance).toLocaleString()} KES</span>
          </p>
        </div>
      ) : null}

      {hostels.length === 0 ? (
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
          <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p>No hostels available for booking at this time.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hostels.map((hostel) => (
            <button
              key={hostel.id}
              type="button"
              onClick={() => setSelectedHostelId(hostel.id)}
              className={`rounded-xl border p-5 text-left transition ${
                selectedHostelId === hostel.id
                  ? "border-sky-300 bg-sky-50 ring-2 ring-sky-200"
                  : "border-slate-200/80 bg-white hover:border-slate-300"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <Building2 className={`h-6 w-6 ${selectedHostelId === hostel.id ? "text-sky-600" : "text-slate-400"}`} />
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  {hostel.available_beds_count} bed{hostel.available_beds_count !== 1 ? "s" : ""} left
                </span>
              </div>

              <h3 className="text-[15px] font-semibold text-slate-900">{hostel.name}</h3>
              <p className="text-[12px] text-slate-500">{hostel.code}</p>

              {hostel.description ? (
                <p className="mt-2 text-[12px] text-slate-600 line-clamp-2">{hostel.description}</p>
              ) : null}

              <div className="mt-4 flex items-center gap-4 text-[12px] text-slate-500">
                {hostel.location ? (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {hostel.location}
                  </span>
                ) : null}
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {hostel.gender ?? "Mixed"}
                </span>
              </div>

              <div className="mt-3 text-[14px] font-semibold text-slate-900">
                {Number(hostel.session_fee_amount).toLocaleString()} KES
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedHostelId ? (
        <div className="flex justify-end">
          <FormButton onClick={handleBook} disabled={isBooking}>
            {isBooking ? "Booking..." : "Confirm Booking"}
          </FormButton>
        </div>
      ) : null}
    </section>
  );
}
