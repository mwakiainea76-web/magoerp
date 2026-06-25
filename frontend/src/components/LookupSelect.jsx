import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, LoaderCircle, Search } from "lucide-react";

function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ");
}

const labelClassName =
  "mb-1 block text-[13px] font-medium text-slate-600";

const inputTextClassName = "text-[14px] leading-5";

export function LookupSelect({
  label,
  value,
  onChange,
  fetchOptions,
  selectedOption = null,
  error,
  required = false,
  placeholder = "Search and select",
  emptyMessage = "No results found.",
  className = "",
  disabled = false,
}) {
  const inputId = useId();
  const containerRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedOption?.label ?? "");
    }
  }, [isOpen, selectedOption]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
      return undefined;
    }

    let isMounted = true;
    const timerId = window.setTimeout(
      async () => {
        setIsLoading(true);

        try {
          const result = await fetchOptions(query);
          if (isMounted) {
            setOptions(result ?? []);
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      },
      query ? 250 : 0,
    );

    return () => {
      isMounted = false;
      window.clearTimeout(timerId);
    };
  }, [fetchOptions, isOpen, query]);

  const selectedId = useMemo(() => value ?? "", [value]);
  const hasValue = selectedId !== "" || query.trim() !== "";

  function handleInputChange(event) {
    setQuery(event.target.value);
    setIsOpen(true);
  }

  function handleSelect(option) {
    onChange(option.id, option);
    setQuery(option.label);
    setIsLoading(false);
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className={className}>
      {label ? (
        <label htmlFor={inputId} className={labelClassName}>
          {label}
          {required ? <span className="text-red-400"> *</span> : null}
        </label>
      ) : null}

      <div className="relative">
        <div
          className={joinClasses(
            "flex min-h-9 items-center rounded-lg border px-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition",
            hasValue ? "bg-[#eaf2ff]" : "bg-white",
            error
              ? "border-red-300 focus-within:border-red-400 focus-within:ring-4 focus-within:ring-red-100"
              : "border-slate-200 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100",
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
          {isLoading ? (
            <LoaderCircle className="ml-2 h-4 w-4 shrink-0 animate-spin text-emerald-500" />
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
              {options.length > 0 ? (
                options.map((option) => {
                  const isSelected = option.id === selectedId;

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
                      <span className="truncate">{option.label}</span>
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
                  {isLoading ? "Searching..." : emptyMessage}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}


