import { useEffect, useState } from "react";

import {
  Table,
  TableHeader,
  TableWrapper,
  Thead,
  Th,
  Tbody,
  Td,
  TableFooter,
} from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { FormInput } from "@/components/FormInput";
import {
  bodyTextClassName,
  labelTextClassName,
  selectClassName,
  initialMeta,
} from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useCourseChangeApi } from "@/hooks/useCourseChangeApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function CourseTransfersPage() {
  const api = useCourseChangeApi();

  const [transfers, setTransfers] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const res = await api.allTransfers({ q: query, page, per_page: perPage });
        if (mounted) {
          setTransfers(res.data ?? []);
          setMeta(res.meta ?? initialMeta);
        }
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load transfers."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [api, page, perPage, query]);

  function handleFilterSubmit(event) {
    event.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  }

  function handleResetFilters() {
    setSearchInput("");
    setQuery("");
    setPage(1);
    setPerPage(10);
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Course Transfers</h1>
          <p className="text-[13px] text-slate-500">View all course change history</p>
        </div>
      </div>

      <form
        onSubmit={handleFilterSubmit}
        className="rounded-xl border border-slate-200/80 bg-white p-5"
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)_auto] xl:items-end">
          <FormInput
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by student name or admission number..."
          />
          <div className="flex gap-3 xl:justify-end">
            <FormButton type="submit" className="w-full sm:w-auto">Apply</FormButton>
            <FormButton type="button" variant="secondary" className="w-full sm:w-auto" onClick={handleResetFilters}>Reset</FormButton>
          </div>
        </div>
      </form>

      {error ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      ) : null}

      <Table>
        <TableHeader>
          <h2 className="text-[1.0625rem] font-semibold text-slate-900">All Transfers</h2>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading transfers...</div>
        ) : transfers.length === 0 ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>No transfers found.</div>
        ) : (
          <TableWrapper>
            <Thead>
              <tr>
                <Th className="w-10 text-center">#</Th>
                <Th>Student</Th>
                <Th>Old Admission #</Th>
                <Th>New Admission #</Th>
                <Th>Processed By</Th>
                <Th>Date</Th>
              </tr>
            </Thead>
            <Tbody>
              {transfers.map((t, index) => (
                <tr key={t.id}>
                  <Td className="w-10 text-center text-slate-400">
                    {(meta.current_page - 1) * meta.per_page + index + 1}
                  </Td>
                  <Td className="font-medium text-slate-900">{t.student_name}</Td>
                  <Td><span className="text-slate-500 line-through">{t.old_admission_number}</span></Td>
                  <Td><span className="font-medium text-emerald-700">{t.new_admission_number}</span></Td>
                  <Td>{t.processed_by}</Td>
                  <Td className="text-slate-500">{t.changed_at}</Td>
                </tr>
              ))}
            </Tbody>
          </TableWrapper>
        )}

        <PaginationFooter page={page} perPage={perPage} total={meta.total} lastPage={meta.last_page} onPageChange={setPage} onPerPageChange={setPerPage} />
      </Table>
    </section>
  );
}
