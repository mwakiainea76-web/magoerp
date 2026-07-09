import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { Search, Users, ArrowRight, GraduationCap } from "lucide-react";
import { useStudentAccountApi } from "@/hooks/useStudentAccountApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function StudentAccountsPage() {
  const navigate = useNavigate();
  const api = useStudentAccountApi();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) return;
    setLoading(true);
    setError("");
    setSearched(true);
    try {
      const res = await api.search({ q });
      setResults(res.data || []);
    } catch (e) {
      setError(getApiErrorMessage(e, "Search failed."));
    } finally {
      setLoading(false);
    }
  }, [query, api]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">Student Accounts</h1>
        <p className="mt-1 text-[14px] text-slate-500">Search for a student to view their account, invoices, payments, and more.</p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-[13px] font-medium text-slate-700">Search Student</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-[14px] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="Search by name or admission number..." />
            </div>
          </div>
          <button type="button" onClick={handleSearch} disabled={loading || query.trim().length < 2}
            className="flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            <Search className="h-4 w-4" /> {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="rounded-2xl border border-slate-200/80 px-5 py-12 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-[14px] font-medium text-slate-500">No students found</p>
          <p className="text-[13px] text-slate-400">Try a different search term.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-[13px] font-medium text-slate-500">{results.length} student(s) found</p>
          {results.map(student => (
            <div key={student.id}
              className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow-md"
              onClick={() => navigate(`/admin/finance/student-accounts/${student.id}`)}>
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <GraduationCap className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-slate-900">{student.name}</h3>
                  <div className="flex items-center gap-3 text-[12px] text-slate-500">
                    <span>{student.admission_number}</span>
                    <span>{student.course || "—"}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      student.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>{student.status}</span>
                  </div>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-slate-300" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
