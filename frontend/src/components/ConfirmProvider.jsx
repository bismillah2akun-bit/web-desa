import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, LoaderCircle, Trash2, X } from "lucide-react";

import { ConfirmContext } from "./confirmContext";

function ConfirmDialog({ request, close }) {
  const dialog = useRef(null);
  const cancelButton = useRef(null);
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const node = dialog.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    node.showModal();
    cancelButton.current?.focus();
    return () => {
      node.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);
  async function accept() {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      await request.onConfirm();
      close();
    } catch (err) {
      setError(
        err.message === "Failed to fetch"
          ? "Koneksi terputus. Periksa koneksi lalu coba lagi."
          : err.message || "Data belum berhasil dihapus. Silakan coba lagi.",
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return createPortal(
    <dialog
      ref={dialog}
      className="delete-dialog"
      aria-labelledby="delete-title"
      aria-describedby="delete-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!running.current) close();
      }}
    >
      <div className="delete-dialog__body">
        <div className="delete-dialog__top">
          <span className="delete-dialog__icon">
            <Trash2 size={26} />
          </span>
          <button
            type="button"
            aria-label="Tutup konfirmasi"
            disabled={busy}
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        <p className="delete-dialog__eyebrow">KONFIRMASI TINDAKAN</p>
        <h2 id="delete-title">{request.title || "Hapus data ini?"}</h2>
        <p id="delete-description">
          {request.description ||
            "Data yang dihapus tidak dapat dikembalikan. Pastikan data sudah tidak diperlukan."}
        </p>
        {request.itemName && (
          <div className="delete-dialog__item">{request.itemName}</div>
        )}
        {error && (
          <div role="alert" className="delete-dialog__error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
      </div>
      <div className="delete-dialog__actions">
        <button ref={cancelButton} type="button" disabled={busy} onClick={close}>
          Batal
        </button>
        <button
          type="button"
          className="delete-dialog__confirm"
          disabled={busy}
          onClick={accept}
        >
          {busy ? (
            <LoaderCircle size={16} className="animate-spin" />
          ) : (
            <Trash2 size={16} />
          )}
          {busy ? "Memproses…" : request.confirmLabel || "Ya, hapus"}
        </button>
      </div>
    </dialog>,
    document.body,
  );
}

export default function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  return (
    <ConfirmContext.Provider value={setRequest}>
      {children}
      {request && (
        <ConfirmDialog request={request} close={() => setRequest(null)} />
      )}
    </ConfirmContext.Provider>
  );
}
