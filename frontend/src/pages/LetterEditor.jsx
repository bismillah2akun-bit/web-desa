import { Component, lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Check, FilePenLine, LoaderCircle, ShieldCheck } from "lucide-react";
import "./letter-editor.css";

const NativeDocumentEditor = lazy(() => import("@/components/NativeDocumentEditor"));
const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

class DocumentBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p role="alert" className="letter-editor-warning">Dokumen tidak dapat ditampilkan. Tutup editor lalu coba kembali, atau minta admin memeriksa berkas DOCX.</p> : this.props.children; }
}

export default function LetterEditor({ serviceId, requirement, draft, onDraftChange, onClose, onUse, loadDocument, templateMode = false }) {
  const dialog = useRef(null);
  const editor = useRef(null);
  const initialDraft = useRef(draft);
  const [documentData, setDocumentData] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [preview, setPreview] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const node = dialog.current;
    const focus = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    node.showModal();
    return () => {
      node.close();
      document.body.style.overflow = overflow;
      if (focus?.isConnected) focus.focus();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function open() {
      const data = loadDocument ? await loadDocument(controller.signal) : await fetch(`${API}/services/${serviceId}/templates/${requirement.id}/editor?native=1`, { signal: controller.signal })
        .then(async (response) => {
          const body = await response.json();
          if (!response.ok) throw new Error(body.message || "Template belum dapat dibuka");
          return body.data;
        });
      const saved = initialDraft.current;
      const current = saved?.version === data.version && saved?.file instanceof Blob;
      const bytes = current ? new Uint8Array(await saved.file.arrayBuffer()) : Uint8Array.from(atob(data.docx), (char) => char.charCodeAt(0));
      if (!controller.signal.aborted) setDocumentData({ ...data, bytes, restored: current, previousDraft: Boolean(saved) });
    }
    open().catch((err) => { if (!controller.signal.aborted) setError(err.message === "Failed to fetch" ? "Koneksi terputus. Coba buka kembali template." : err.message); });
    return () => controller.abort();
  }, [serviceId, requirement.id, retry, loadDocument]);

  async function snapshot(isConfirmed) {
    const buffer = await editor.current?.save();
    if (!buffer) throw new Error("Dokumen belum selesai dibuka. Tunggu sebentar lalu coba kembali.");
    const file = new File([buffer], documentData.filename || "surat.docx", { type: MIME });
    if (file.size > 10 * 1024 * 1024) throw new Error("Dokumen maksimal 10 MB.");
    return { version: documentData.version, format: "docx", confirmed: isConfirmed, file };
  }
  async function close() {
    if (busy) return;
    setBusy(true);
    try {
      if (ready) onDraftChange(await snapshot(dirty ? false : Boolean(draft?.confirmed && documentData.restored)));
      onClose();
    } catch (err) { setSaveError(err.message); }
    finally { setBusy(false); }
  }
  async function useLetter() {
    if (!confirmed || !ready || busy) return;
    setBusy(true);
    setSaveError("");
    try { await onUse(await snapshot(true)); }
    catch (err) { setSaveError(err.message || "Dokumen belum dapat disimpan"); }
    finally { setBusy(false); }
  }
  function changed() {
    setDirty(true);
    setConfirmed(false);
    onDraftChange({ ...draft, version: documentData.version, confirmed: false });
  }

  return createPortal(
    <dialog ref={dialog} className="letter-editor" aria-labelledby="letter-editor-title" onCancel={(event) => { event.preventDefault(); void close(); }}>
      <header className="letter-editor-header">
        <button type="button" className="letter-back" disabled={busy} onClick={close}><ArrowLeft size={18} /><span>{templateMode ? "Kembali ke layanan" : "Kembali ke pengajuan"}</span></button>
        <div className="letter-editor-heading"><FilePenLine size={22} /><div><p>RUANG DOKUMEN · DESA TANJUNGJAYA</p><h1 id="letter-editor-title">{requirement.label}</h1></div></div>
        <span className="letter-draft-badge">{dirty ? "Belum diterapkan" : templateMode ? "Template admin" : "Draf pengajuan"}</span>
      </header>
      <div className="letter-editor-layout">
        <aside className="letter-editor-sidebar">
          <p className="letter-step">DOCX / EDITOR DOKUMEN</p>
          <h2>Surat, siap diisi.</h2>
          <p>{templateMode ? "Edit isi surat langsung pada halaman dokumen. Gunakan penanda [[Nama]] atau [[NIK]] pada paragraf tersendiri untuk membuat kolom isian warga." : "Klik isian pada dokumen untuk mengeditnya. Gunakan zoom untuk memperbesar tanpa mengubah ukuran halaman surat."}</p>
          <div className="letter-editor-tabs" aria-label="Mode editor">
            <button type="button" aria-pressed={!preview} onClick={() => setPreview(false)}>Edit dokumen</button>
            <button type="button" aria-pressed={preview} onClick={() => setPreview(true)}>Pratinjau</button>
          </div>
          <div className="letter-editor-tip"><ShieldCheck size={20} /><p>Kop surat dikunci dan ukuran halaman asli dipertahankan. Perubahan isi disimpan sebagai DOCX, bukan hasil konversi halaman HTML.</p></div>
          {!templateMode && documentData?.fields?.length > 0 && <p className="letter-editor-note">Ganti penanda berikut dengan data Anda: {documentData.fields.map((field) => `[[${field}]]`).join(", ")}. Bagian tetap surat tidak dapat diubah.</p>}
          {!templateMode && documentData?.dateFields?.length > 0 && <p className="letter-editor-note">Baris tanggal surat dapat diisi langsung pada dokumen. Gunakan format <b>18 September 2026</b> atau <b>18/09/2026</b>.</p>}
          <p className="letter-editor-note">{templateMode ? "Periksa seluruh halaman dan hapus data pribadi warga sebelum template dipublikasikan. Berkas sumber tidak ikut diubah." : "Nomor surat, tanda tangan, dan pengesahan tetap menjadi kewenangan petugas desa."}</p>
          <label className="letter-editor-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={busy || !ready} /><span>{templateMode ? "Template sudah saya periksa dan tidak memuat data pribadi warga." : "Saya sudah memeriksa isian surat ini."}</span></label>
          {saveError && <p role="alert" className="letter-editor-warning">{saveError}</p>}
          <button type="button" className="letter-use" disabled={busy || !confirmed || !ready} onClick={useLetter}>{busy ? <LoaderCircle className="animate-spin" size={18} /> : <Check size={18} />}{busy ? "Memproses…" : templateMode ? "Gunakan template ini" : "Gunakan surat ini"}</button>
          <p className="letter-editor-note">{templateMode ? "Lanjutkan dengan Simpan Layanan untuk menerapkan template." : "Surat otomatis dilampirkan saat Kirim Pengajuan."} Gunakan tombol kembali di atas agar draf tersimpan sementara. Jangan memuat ulang tab sebelum selesai.</p>
        </aside>
        <section className="letter-editor-canvas" aria-label="Dokumen surat">
          {error ? <div className="letter-editor-message" role="alert"><p>{error}</p><button type="button" onClick={() => { setError(""); setRetry((value) => value + 1); }}>Coba lagi</button></div> : !documentData ? (
            <div className="letter-editor-message" role="status"><LoaderCircle className="animate-spin" /><p>Membuka dokumen…</p></div>
          ) : <>
            {documentData.previousDraft && !documentData.restored && <p className="letter-editor-warning" role="alert">Template atau format editor telah diperbarui. Periksa kembali isian surat sebelum melanjutkan.</p>}
            <DocumentBoundary><Suspense fallback={<div className="letter-editor-message" role="status">Menyiapkan editor DOCX…</div>}>
              <NativeDocumentEditor ref={editor} bytes={documentData.bytes} filename={documentData.filename} preview={preview || busy}
                onReady={() => setReady(true)} onChange={changed} onSave={useLetter} />
            </Suspense></DocumentBoundary>
          </>}
        </section>
      </div>
    </dialog>, document.body,
  );
}
