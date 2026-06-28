import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { bodyTextClassName, labelTextClassName, selectClassName, inputClassName, initialMeta } from "@/lib/styles";
import { Table, TableHeader, TableWrapper, Thead, Th, SortableTh, Tbody, Td, TableFooter } from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { FormButton } from "@/components/FormButton";
import { LookupSelect } from "@/components/LookupSelect";
import { useCertificationLevelsApi } from "@/hooks/useCertificationLevelsApi";
import { useLookupApi } from "@/hooks/useLookupApi";
import { getApiErrorMessage } from "@/lib/api/authClient";
import { CertificationLevelModalForm } from "@/pages/certificationAuthorities/CertificationLevelModalForm";

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

export function CertificationLevelsPage() {
  const levelsApi = useCertificationLevelsApi();
  const lookupApi = useLookupApi();
  const [searchParams] = useSearchParams();

  const authorityIdFromQuery = searchParams.get("authorityId") ?? "";
  const authorityCodeFromQuery = searchParams.get("authorityCode") ?? "";
  const authorityNameFromQuery = searchParams.get("authorityName") ?? "";
  const authorityLabelFromQuery = [authorityCodeFromQuery, authorityNameFromQuery]
    .filter(Boolean)
    .join(" ");

  const [levels, setLevels] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [selectedAuthority, setSelectedAuthority] = useState(
    authorityIdFromQuery
      ? {
          id: authorityIdFromQuery,
          label: authorityLabelFromQuery,
        }
      : null,
  );
  const [authorityFilter, setAuthorityFilter] = useState(authorityIdFromQuery);
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [editingLevelId, setEditingLevelId] = useState(null);

  useEffect(() => {
    if (!authorityIdFromQuery) {
      return;
    }

    setAuthorityFilter(authorityIdFromQuery);
    setSelectedAuthority({
      id: authorityIdFromQuery,
      label: authorityLabelFromQuery,
    });
  }, [authorityIdFromQuery, authorityLabelFromQuery]);

  useEffect(() => {
    let isMounted = true;

    async function loadLevels() {
      setIsLoading(true);
      setError("");

      try {
        const response = await levelsApi.list({
          q: query,
          certification_authority_id: authorityFilter,
          status,
          sort_by: sortBy,
          sort_direction: sortDirection,
          page,
          per_page: perPage,
        });

        if (isMounted) {
          setLevels(response.data ?? []);
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

    loadLevels();

    return () => {
      isMounted = false;
    };
  }, [authorityFilter, levelsApi, page, perPage, query, reloadKey, sortBy, sortDirection, status]);

  async function fetchAuthorityOptions(queryText) {
    const response = await lookupApi.search("certification-authorities", {
      query: queryText,
      limit: 5,
    });
    return response.data ?? [];
  }

  async function handleDelete(level) {
    const confirmed = window.confirm(`Delete ${level.name}?`);
    if (!confirmed) return;

    setDeletingId(level.id);
    setError("");

    try {
      await levelsApi.remove(level.id);
      toast.success("Certification level deleted successfully.");
      setReloadKey((current) => current + 1);
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError, "Server error."));
    } finally {
      setDeletingId(null);
    }
  }

  function handleSort(field, direction) {
    setSortBy(field);
    setSortDirection(direction);
    setPage(1);
  }

  function handleFilterSubmit(event) {
    event.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  }

  function handleResetFilters() {
    setSearchInput("");
    setQuery("");
    setSelectedAuthority(null);
    setAuthorityFilter("");
    setStatus("all");
    setSortBy("created_at");
    setSortDirection("desc");
    setPerPage(10);
    setPage(1);
  }

  function handleLevelSaved() {
    setReloadKey((current) => current + 1);
  }

  function openCreateLevelModal() {
    setEditingLevelId(null);
    setIsLevelModalOpen(true);
  }

  function openEditLevelModal(levelId) {
    setEditingLevelId(levelId);
    setIsLevelModalOpen(true);
  }

  function closeLevelModal() {
    setIsLevelModalOpen(false);
    setEditingLevelId(null);
  }

  return (
    <>
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">
              Certification Levels
            </h1>
            <p className="text-[13px] text-slate-500">
              Maintain authority-specific level codes and names
            </p>
          </div>

          <div className="flex gap-3">
            <Link to="/certification-authorities">
              <FormButton variant="secondary" className="sm:px-5">
                View Authorities
              </FormButton>
            </Link>
            <FormButton className="sm:px-5" onClick={openCreateLevelModal}>
              <Plus className="mr-2 h-4 w-4" />
              Add Level
            </FormButton>
          </div>
        </div>

        <form
          onSubmit={handleFilterSubmit}
          className="rounded-xl border border-slate-200/80 bg-white p-5"
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_repeat(2,minmax(0,0.6fr))_auto] xl:items-end">
            <div>
              <label
                className={`mb-2 block text-slate-600 ${labelTextClassName}`}
              >
                Search
              </label>
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className={inputClassName}
                placeholder="Search by code, name, entry grade, description, or authority"
              />
            </div>
            <LookupSelect
              label="Authority"
              value={authorityFilter}
              selectedOption={selectedAuthority}
              onChange={(nextValue, option) => {
                setAuthorityFilter(nextValue);
                setSelectedAuthority(option);
                setPage(1);
              }}
              fetchOptions={fetchAuthorityOptions}
              placeholder="Type authority code or name"
              emptyMessage="No authority found."
            />
            <div>
              <label
                className={`mb-2 block text-slate-600 ${labelTextClassName}`}
              >
                Status
              </label>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className={`${selectClassName} w-full`}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex gap-3 xl:justify-end">
              <FormButton type="submit" className="w-full sm:w-auto">
                Apply
              </FormButton>
              <FormButton
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={handleResetFilters}
              >
                Reset
              </FormButton>
            </div>
          </div>
        </form>

        {error ? (
          <div
            className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}
          >
            {error}
          </div>
        ) : null}

        <Table>
          <TableHeader>
            <h2 className="text-[1.0625rem] font-semibold text-slate-900">Level Directory</h2>
          </TableHeader>

          {isLoading ? (
            <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading levels...</div>
          ) : levels.length === 0 ? (
            <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>No certification levels found for the current filters.</div>
          ) : (
            <TableWrapper>
              <Thead>
                <tr>
                  <Th className="w-10 text-center">#</Th>
                  <Th>Authority</Th>
                  <SortableTh sortKey="code" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Level Code</SortableTh>
                  <SortableTh sortKey="name" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Level Name</SortableTh>
                  <SortableTh sortKey="entry_grade" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Entry Grade</SortableTh>
                  <Th>Status</Th>
                  <Th>Description</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {levels.map((level, index) => (
                  <tr key={level.id}>
                    <Td className="w-10 text-center text-slate-400">
                      {(meta.current_page - 1) * meta.per_page + index + 1}
                    </Td>
                    <Td>
                      <div>{level.certification_authority_name}</div>
                      <div className="text-slate-400">{level.certification_authority_code}</div>
                    </Td>
                    <Td>{level.code}</Td>
                    <Td>{level.name}</Td>
                    <Td>{level.entry_grade || "Not set"}</Td>
                    <Td><StatusBadge active={level.is_active} /></Td>
                    <Td className="max-w-md">{level.description || "No description"}</Td>
                    <Td>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditLevelModal(level.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(level)}
                          disabled={deletingId === level.id}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
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
            <PaginationFooter page={page} perPage={perPage} total={meta.total} lastPage={meta.last_page} onPageChange={setPage} onPerPageChange={setPerPage} />
          </TableFooter>
        </Table>
      </section>

      <CertificationLevelModalForm
        open={isLevelModalOpen}
        onClose={closeLevelModal}
        levelId={editingLevelId}
        defaultAuthority={selectedAuthority}
        onSaved={handleLevelSaved}
      />
    </>
  );
}
