import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Table, TableHeader, TableWrapper, Thead, Th, SortableTh, Tbody, Td, TableFooter } from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { bodyTextClassName, labelTextClassName, selectClassName, inputClassName, initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useCertificationAuthoritiesApi } from "@/hooks/useCertificationAuthoritiesApi";
import { getApiErrorMessage } from "@/lib/api/authClient";
import { CertificationAuthorityModalForm } from "@/pages/certificationAuthorities/CertificationAuthorityModalForm";
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

export function CertificationAuthoritiesPage() {
  const authoritiesApi = useCertificationAuthoritiesApi();

  const [authorities, setAuthorities] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [isAuthorityModalOpen, setIsAuthorityModalOpen] = useState(false);
  const [editingAuthorityId, setEditingAuthorityId] = useState(null);
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [levelModalAuthority, setLevelModalAuthority] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAuthorities() {
      setIsLoading(true);
      setError("");

      try {
        const response = await authoritiesApi.list({
          q: query,
          status,
          sort_by: sortBy,
          sort_direction: sortDirection,
          page,
          per_page: perPage,
        });

        if (isMounted) {
          setAuthorities(response.data ?? []);
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

    loadAuthorities();

    return () => {
      isMounted = false;
    };
  }, [authoritiesApi, page, perPage, query, reloadKey, sortBy, sortDirection, status]);

  async function handleDelete(authority) {
    const confirmed = window.confirm(`Delete ${authority.name}?`);
    if (!confirmed) return;

    setDeletingId(authority.id);
    setError("");

    try {
      await authoritiesApi.remove(authority.id);
      toast.success("Certification authority deleted successfully.");
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
    setStatus("all");
    setSortBy("created_at");
    setSortDirection("desc");
    setPerPage(10);
    setPage(1);
  }

  function handleAuthoritySaved() {
    setReloadKey((current) => current + 1);
  }

  function handleLevelSaved() {
    setReloadKey((current) => current + 1);
  }

  function getAuthorityParams(authority) {
    return new URLSearchParams({
      authorityId: authority.id ?? "",
      authorityCode: authority.code ?? "",
      authorityName: authority.name ?? "",
    }).toString();
  }

  function getViewLevelsUrl(authority) {
    return `/certification-levels?${getAuthorityParams(authority)}`;
  }

  function getViewGradesUrl(authority) {
    return `/certification-authorities/grades?${getAuthorityParams(authority)}`;
  }

  function openCreateAuthorityModal() {
    setEditingAuthorityId(null);
    setIsAuthorityModalOpen(true);
  }

  function openEditAuthorityModal(authorityId) {
    setEditingAuthorityId(authorityId);
    setIsAuthorityModalOpen(true);
  }

  function closeAuthorityModal() {
    setIsAuthorityModalOpen(false);
    setEditingAuthorityId(null);
  }

  function openLevelModal(authority) {
    setLevelModalAuthority({
      id: authority.id,
      label: [authority.code, authority.name].filter(Boolean).join(" "),
    });
    setIsLevelModalOpen(true);
  }

  function closeLevelModal() {
    setIsLevelModalOpen(false);
    setLevelModalAuthority(null);
  }

  return (
    <>
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">
              Certification Authorities
            </h1>
            <p className="text-[13px] text-slate-500">
              Manage examining and awarding authorities
            </p>
          </div>

          <div className="flex gap-3">
            <Link to="/certification-levels">
              <FormButton variant="secondary" className="sm:px-5">
                View Levels
              </FormButton>
            </Link>
            <FormButton className="sm:px-5" onClick={openCreateAuthorityModal}>
              <Plus className="mr-2 h-4 w-4" />
              Add Authority
            </FormButton>
          </div>
        </div>

        <form
          onSubmit={handleFilterSubmit}
          className="rounded-xl border border-slate-200/80 bg-white p-5"
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,0.7fr))_auto] xl:items-end">
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
                placeholder="Search by code, name, or description"
              />
            </div>
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
            <h2 className="text-[1.0625rem] font-semibold text-slate-900">Authority Directory</h2>
          </TableHeader>

          {isLoading ? (
            <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading authorities...</div>
          ) : authorities.length === 0 ? (
            <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>No certification authorities found for the current filters.</div>
          ) : (
            <TableWrapper>
              <Thead>
                <tr>
                  <Th className="w-10 text-center">#</Th>
                  <SortableTh sortKey="code" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Authority Code</SortableTh>
                  <SortableTh sortKey="name" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Authority Name</SortableTh>
                  <Th>Linked Levels</Th>
                  <Th>Status</Th>
                  <Th>Description</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {authorities.map((authority, index) => (
                  <tr key={authority.id}>
                    <Td className="w-10 text-center text-slate-400">
                      {(meta.current_page - 1) * meta.per_page + index + 1}
                    </Td>
                    <Td>{authority.code}</Td>
                    <Td>{authority.name}</Td>
                    <Td>
                      <button
                        type="button"
                        onClick={() => openLevelModal(authority)}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                      >
                        <span>{authority.levels_count ?? 0}</span>
                        <span>Add level</span>
                      </button>
                    </Td>
                    <Td><StatusBadge active={authority.is_active} /></Td>
                    <Td className="max-w-md">{authority.description || "No description"}</Td>
                    <Td>
                      <div className="flex justify-end gap-2">
                          <Link
                            to={getViewLevelsUrl(authority)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                            title="View linked levels"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <Link
                            to={getViewGradesUrl(authority)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-amber-200 text-amber-600 transition hover:bg-amber-50 hover:text-amber-700"
                            title="Manage grade definitions"
                          >
                            <Award className="h-3.5 w-3.5" />
                          </Link>
                        <button
                          type="button"
                          onClick={() => openEditAuthorityModal(authority.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(authority)}
                          disabled={deletingId === authority.id}
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

      <CertificationAuthorityModalForm
        open={isAuthorityModalOpen}
        onClose={closeAuthorityModal}
        authorityId={editingAuthorityId}
        onSaved={handleAuthoritySaved}
      />

      <CertificationLevelModalForm
        open={isLevelModalOpen}
        onClose={closeLevelModal}
        defaultAuthority={levelModalAuthority}
        onSaved={handleLevelSaved}
      />
    </>
  );
}
