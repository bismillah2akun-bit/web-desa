import { useCallback, useState } from "react";
import LetterEditor from "@/pages/LetterEditor";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export default function AdminLetterEditor({ source, onClose, onSave }) {
  const [draft, setDraft] = useState(null);
  const payload = useCallback(() => {
    const form = new FormData();
    if (source.template_file) form.append("template_0", source.template_file);
    else if (source.catalog_id) form.set("catalog_id", source.catalog_id);
    else { form.set("service_id", source.service_id); form.set("requirement_id", source.requirement_id); }
    return form;
  }, [source]);
  const loadDocument = useCallback(async (signal) => {
    const response = await fetch(`${API}/admin/letter-editor/preview?native=1`, { method: "POST", credentials: "include", body: payload(), signal });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Template tidak dapat dibuka");
    return result.data;
  }, [payload]);
  async function save(changes) {
    const form = payload();
    const { file: editedFile, ...metadata } = changes;
    form.set("draft", JSON.stringify(metadata));
    if (editedFile) form.append("template_1", editedFile);
    const response = await fetch(`${API}/admin/letter-editor/render`, { method: "POST", credentials: "include", body: form });
    if (!response.ok) throw new Error((await response.json()).message || "Template tidak dapat dibuat");
    const name = `${source.label.replace(/[<>:"/\\|?*]/g, "-")}.docx`;
    const file = new File([await response.blob()], name, { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    if (file.size > 10 * 1024 * 1024) throw new Error("Hasil template melebihi batas 10 MB");
    onSave(file);
  }
  return <LetterEditor requirement={{ id: source.requirement_id || "new", label: source.label }} templateMode loadDocument={loadDocument}
    draft={draft} onDraftChange={setDraft} onClose={onClose} onUse={save} />;
}
