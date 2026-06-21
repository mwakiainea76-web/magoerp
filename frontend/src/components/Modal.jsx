import { X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TRANSITION_MS = 220;

const sizeClassNames = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  full: "max-w-[min(96vw,80rem)]",
};

function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ");
}

function getFocusableElements(container) {
  if (!container) return [];

  return Array.from(
    container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true",
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  closeOnEscape = true,
  closeOnOverlayClick = true,
  showCloseButton = true,
  initialFocusRef = null,
  className = "",
  panelClassName = "",
  overlayClassName = "",
}) {
  const [isRendered, setIsRendered] = useState(open);
  const [isVisible, setIsVisible] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef(null);
  const previousFocusedElementRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }

      setIsRendered(true);
      previousFocusedElementRef.current = document.activeElement;

      const frame = requestAnimationFrame(() => {
        setIsVisible(true);
      });

      return () => cancelAnimationFrame(frame);
    }

    setIsVisible(false);
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsRendered(false);
    }, TRANSITION_MS);

    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, [open]);

  useEffect(() => {
    if (!isRendered) return undefined;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isRendered]);

  useEffect(() => {
    if (!open || !isRendered) return undefined;

    const focusTimer = window.setTimeout(() => {
      const fallbackElement = panelRef.current;
      const nextFocusTarget =
        initialFocusRef?.current ??
        getFocusableElements(panelRef.current)[0] ??
        fallbackElement;
      nextFocusTarget?.focus?.();
    }, 20);

    return () => window.clearTimeout(focusTimer);
  }, [open, isRendered, initialFocusRef]);

  useEffect(() => {
    if (open || !previousFocusedElementRef.current) return undefined;

    const restoreTimer = window.setTimeout(() => {
      previousFocusedElementRef.current?.focus?.();
    }, TRANSITION_MS);

    return () => window.clearTimeout(restoreTimer);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements(panelRef.current);
      if (focusableElements.length === 0) {
        event.preventDefault();
        panelRef.current?.focus?.();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, closeOnEscape, onClose]);

  const sizeClassName = sizeClassNames[size] ?? sizeClassNames.md;

  if (!isRendered || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className={joinClasses(
        "fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6",
        className,
      )}
      aria-hidden={open ? "false" : "true"}
    >
      <div
        className={joinClasses(
          "absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] transition-all duration-200 ease-out",
          isVisible ? "opacity-100" : "opacity-0",
          overlayClassName,
        )}
        onClick={closeOnOverlayClick ? () => onClose?.() : undefined}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={joinClasses(
          "relative z-101 w-full overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] outline-none transition-all duration-200 ease-out",
          sizeClassName,
          isVisible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-[0.98] opacity-0",
          panelClassName,
        )}
      >
        {title || description || showCloseButton ? (
          <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 px-5 py-4 sm:px-6">
            <div className="space-y-1">
              {title ? (
                <h2
                  id={titleId}
                  className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950"
                >
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p
                  id={descriptionId}
                  className="text-[13px] leading-6 text-slate-500"
                >
                  {description}
                </p>
              ) : null}
            </div>

            {showCloseButton ? (
              <button
                type="button"
                onClick={() => onClose?.()}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 outline-none transition hover:bg-slate-50 hover:text-slate-800 focus:ring-4 focus:ring-emerald-100"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ) : null}

        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ModalBody({ children, className = "" }) {
  return (
    <div className={joinClasses("px-5 py-5 sm:px-6", className)}>
      {children}
    </div>
  );
}

export function ModalFooter({ children, className = "" }) {
  return (
    <div className="border-t border-slate-200/80 px-5 py-4 sm:px-6">
      <div
        className={joinClasses(
          "flex flex-col gap-3 sm:flex-row sm:justify-end",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
