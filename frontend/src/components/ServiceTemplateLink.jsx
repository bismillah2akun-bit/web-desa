import { CheckCircle2, FilePenLine, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useConfirm } from "@/components/confirmContext";

export default function ServiceTemplateLink({ serviceId, requirement, compact = false, draft, onEdit, onRemove }) {
  const confirm = useConfirm();
  if (!requirement.has_template) return null;
  const href = `/layanan?layanan=${serviceId}&surat=${requirement.id}`;
  if (compact) return (
    <Link to={href} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-forest-900 underline underline-offset-4">
      <FilePenLine size={14} /> Isi surat di web
    </Link>
  );
  return (
    <div className="my-3 rounded-xl border border-sage-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className="rounded-lg bg-sage-50 p-2 text-forest-900">{draft?.confirmed ? <CheckCircle2 size={20} /> : <FilePenLine size={20} />}</span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-forest-950">{draft?.confirmed ? "Surat siap dilampirkan" : "Isi surat langsung di web"}</p>
          <p className="mt-1 break-all text-xs text-stone-500">{requirement.template_original_name}</p>
        </div>
      </div>
      <p className="my-3 text-xs leading-5 text-stone-600">Buka editor, isi template, lalu pilih “Gunakan surat ini”. Surat otomatis disertakan saat pengajuan dikirim.</p>
      {requirement.can_edit_online === false ? <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">Template ini masih DOC/PDF. Admin perlu menggantinya dengan DOCX agar dapat diisi di web.</p> : (
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-2 rounded-lg bg-forest-900 px-3 py-2 text-sm font-semibold text-white">
          <FilePenLine size={16} /> {draft ? "Lanjutkan edit surat" : "Buka editor surat"}
        </button>
      )}
      {draft && !draft.confirmed && <p className="mt-3 text-xs text-amber-700">Ada perubahan yang belum dikonfirmasi. Buka editor dan pilih “Gunakan surat ini”.</p>}
      {draft && onRemove && <button type="button" className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-red-700" onClick={() => confirm({
        title: "Hapus isian surat ini?", itemName: requirement.label,
        description: "Hanya isian Anda pada formulir ini yang dihapus. Template asli tetap tersedia dan dapat diisi kembali.",
        onConfirm: onRemove,
      })}><Trash2 size={14} /> Hapus isian surat</button>}
    </div>
  );
}
