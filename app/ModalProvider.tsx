"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import { X } from "lucide-react";

// --- Types ---

interface ModalButton {
  label: string;
  onClick: () => void;
  variant?: "primary" | "danger" | "ghost";
}

interface AlertOptions {
  title: string;
  message?: string;
  buttons?: ModalButton[];
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
}

interface PromptOptions {
  title: string;
  message?: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  confirmLabel?: string;
}

interface ModalState {
  type: "alert" | "confirm" | "prompt";
  title: string;
  message?: string;
  buttons?: ModalButton[];
  // confirm
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  onConfirm?: () => void;
  onCancel?: () => void;
  // prompt
  placeholder?: string;
  promptOptions?: { label: string; value: string }[];
  onPromptSubmit?: (value: string | null) => void;
}

interface ModalContextType {
  alert: (options: AlertOptions) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within ModalProvider");
  return ctx;
}

// --- Provider ---

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState | null>(null);

  // Close on Escape
  useEffect(() => {
    if (!modal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modal]);

  const close = useCallback(() => setModal(null), []);

  const alertFn = useCallback((options: AlertOptions) => {
    setModal({
      type: "alert",
      title: options.title,
      message: options.message,
      buttons: options.buttons,
    });
  }, []);

  const confirmFn = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setModal({
          type: "confirm",
          title: options.title,
          message: options.message,
          confirmLabel: options.confirmLabel ?? "Confirm",
          cancelLabel: options.cancelLabel ?? "Cancel",
          variant: options.variant ?? "primary",
          onConfirm: () => {
            setModal(null);
            resolve(true);
          },
          onCancel: () => {
            setModal(null);
            resolve(false);
          },
        });
      });
    },
    []
  );

  const promptFn = useCallback(
    (options: PromptOptions): Promise<string | null> => {
      return new Promise((resolve) => {
        setModal({
          type: "prompt",
          title: options.title,
          message: options.message,
          placeholder: options.placeholder,
          promptOptions: options.options,
          confirmLabel: options.confirmLabel ?? "Submit",
          onPromptSubmit: (value) => {
            setModal(null);
            resolve(value);
          },
          onCancel: () => {
            setModal(null);
            resolve(null);
          },
        });
      });
    },
    []
  );

  return (
    <ModalContext.Provider
      value={{ alert: alertFn, confirm: confirmFn, prompt: promptFn }}
    >
      {children}
      {modal && (
        <ModalOverlay onClose={close}>
          {modal.type === "alert" && (
            <AlertModal modal={modal} onClose={close} />
          )}
          {modal.type === "confirm" && <ConfirmModal modal={modal} />}
          {modal.type === "prompt" && <PromptModal modal={modal} />}
        </ModalOverlay>
      )}
    </ModalContext.Provider>
  );
}

// --- Overlay ---

function ModalOverlay({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[#1a1a3e] rounded-2xl w-full max-w-sm shadow-2xl border border-white/5 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// --- Alert ---

function AlertModal({
  modal,
  onClose,
}: {
  modal: ModalState;
  onClose: () => void;
}) {
  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-1">
        <h2 className="text-lg font-bold">{modal.title}</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors -mt-1 -mr-1 p-1"
        >
          <X size={16} />
        </button>
      </div>
      {modal.message && (
        <p className="text-gray-400 text-sm mb-5">{modal.message}</p>
      )}
      <div className="flex justify-end gap-2">
        {modal.buttons && modal.buttons.length > 0 ? (
          modal.buttons.map((btn, i) => (
            <button
              key={i}
              onClick={() => {
                btn.onClick();
                onClose();
              }}
              className={buttonClass(btn.variant ?? "primary")}
            >
              {btn.label}
            </button>
          ))
        ) : (
          <button onClick={onClose} className={buttonClass("primary")}>
            OK
          </button>
        )}
      </div>
    </div>
  );
}

// --- Confirm ---

function ConfirmModal({ modal }: { modal: ModalState }) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-1">{modal.title}</h2>
      {modal.message && (
        <p className="text-gray-400 text-sm mb-5">{modal.message}</p>
      )}
      <div className="flex justify-end gap-2">
        <button onClick={modal.onCancel} className={buttonClass("ghost")}>
          {modal.cancelLabel}
        </button>
        <button
          onClick={modal.onConfirm}
          className={buttonClass(modal.variant ?? "primary")}
          autoFocus
        >
          {modal.confirmLabel}
        </button>
      </div>
    </div>
  );
}

// --- Prompt ---

function PromptModal({ modal }: { modal: ModalState }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-1">{modal.title}</h2>
      {modal.message && (
        <p className="text-gray-400 text-sm mb-4">{modal.message}</p>
      )}
      {modal.promptOptions ? (
        <div className="space-y-2 mb-5">
          {modal.promptOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                selected === opt.value
                  ? "bg-[#5865F2] text-white"
                  : "bg-[#0f0f23] text-gray-300 hover:bg-[#22224a]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : (
        <input
          type="text"
          placeholder={modal.placeholder}
          autoFocus
          className="w-full bg-[#0f0f23] rounded-lg px-4 py-3 text-white placeholder-gray-500 mb-5 outline-none focus:ring-2 focus:ring-[#5865F2]"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              modal.onPromptSubmit?.((e.target as HTMLInputElement).value);
            }
          }}
          onChange={(e) => setSelected(e.target.value)}
        />
      )}
      <div className="flex justify-end gap-2">
        <button onClick={modal.onCancel} className={buttonClass("ghost")}>
          Cancel
        </button>
        <button
          onClick={() => modal.onPromptSubmit?.(selected)}
          disabled={!selected}
          className={buttonClass("primary") + " disabled:opacity-40"}
        >
          {modal.confirmLabel}
        </button>
      </div>
    </div>
  );
}

// --- Helpers ---

function buttonClass(variant: "primary" | "danger" | "ghost") {
  const base =
    "px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer";
  switch (variant) {
    case "primary":
      return `${base} bg-[#5865F2] text-white hover:bg-[#4752C4]`;
    case "danger":
      return `${base} bg-red-500 text-white hover:bg-red-600`;
    case "ghost":
      return `${base} text-gray-400 hover:text-white hover:bg-[#22224a]`;
  }
}
