import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ");
}

const inputTextClassName = "text-[14px] leading-5";

export function SearchSelect({
  options = [],
  value,
  onChange,
  placeholder = "Search and select",
  emptyMessage = "No results found.",
  className = "",
  disabled = false,
}) {
  const inputId = useId();
  const containerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.id === value);
  const hasValue = value != null && value !== "";

  const filtered = query.trim()
    ? options.filter(
        (o) =>
          (o.name ?? o.label ?? "")
            .toLowerCase()
            .includes(query.toLowerCase()) ||
          o.id?.toLowerCase().includes(query.toLowerCase()),
      )
    : options;

  useEffect(() => {
    if (!isOpen) {
      setQuery(selected ? selected.name ?? selected.label ?? "" : "");
    }
  }, [isOpen, selected]);

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleInputChange(e) {
    setQuery(e.target.value);
    setIsOpen(true);
  }

  function handleSelect(option) {
    onChange(option.id, option);
    setQuery(option.name ?? option.label ?? "");
    setIsOpen(false);
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange(null, null);
    setQuery("");
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className={className}>
      <div className="relative">
        <div
          className={joinClasses(
            "flex min-h-9 items-center rounded-lg border px-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition",
            hasValue ? "bg-[#eaf2ff]" : "bg-white",
            "border-slate-200 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100",
            disabled ? "cursor-not-allowed opacity-60" : "",
          )}
        >
          <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" />
          <input
            id={inputId}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            className={`h-9 w-full border-0 bg-transparent p-0 ${inputTextClassName} text-slate-700 outline-none placeholder:text-[13px] placeholder:text-[#a8b6c7]`}
          />
          {hasValue ? (
            <button
              type="button"
              onClick={handleClear}
              className="ml-2 flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <ChevronDown
              className={joinClasses(
                "ml-2 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
                isOpen ? "rotate-180" : "rotate-0",
              )}
            />
          )}
        </div>

        {isOpen ? (
          <div className="absolute z-30 mt-2 max-h-72 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.12)]">
            <div className="max-h-72 overflow-y-auto py-2">
              {filtered.length > 0 ? (
                filtered.map((option) => {
                  const isSelected = option.id === value;
                  const label = option.name ?? option.label ?? option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className={joinClasses(
                        `flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${inputTextClassName}`,
                        isSelected
                          ? "bg-emerald-50 text-emerald-700"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                      )}
                    >
                      <span className="truncate">{label}</span>
                      {isSelected ? (
                        <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <div
                  className={`px-4 py-3 ${inputTextClassName} text-slate-400`}
                >
                  {emptyMessage}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
