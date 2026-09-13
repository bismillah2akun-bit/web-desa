import { useEffect, useRef } from "react";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/confirmContext";

function Preview({ entry, resolveUrl, index }) {
  const image = useRef(null);
  useEffect(() => {
    if (!entry.file) return;
    const url = URL.createObjectURL(entry.file);
    image.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [entry.file]);
  return <img ref={image} src={entry.url ? resolveUrl(entry.url) : undefined} alt={`Pratinjau foto ${index + 1}`} className="aspect-[4/3] w-full object-cover" />;
}

export default function NewsImagePicker({ value, onChange, resolveUrl, disabled, onError }) {
  const confirm = useConfirm();
  function addFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (value.length + files.length > 10) return onError("Maksimal 10 foto per berita. Hapus beberapa foto sebelum menambahkan lagi.");
    if (files.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      return onError("Gunakan gambar JPG, PNG, atau WEBP.");
    }
    if (files.some((file) => file.size > 5 * 1024 * 1024)) return onError("Ukuran setiap foto maksimal 5 MB.");
    onChange([...value, ...files.map((file) => ({ key: crypto.randomUUID(), file }))]);
    onError("");
  }
  function remove(entry, index) {
    confirm({
      title: "Hapus foto dari berita?",
      itemName: entry.file?.name || `Foto ${index + 1}`,
      description: "Foto akan dikeluarkan dari galeri. Perubahan berlaku setelah Anda menyimpan berita.",
      onConfirm: () => onChange(value.filter((item) => item.key !== entry.key)),
    });
  }
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="text-sm font-semibold">Galeri foto berita <span className="ml-2 font-normal text-stone-500">{value.length}/10</span></legend>
      <p className="mt-2 text-xs leading-6 text-stone-500">Pilih beberapa foto sekaligus. Foto utama tampil di kartu berita. JPG, PNG, atau WEBP · maksimal 5 MB per foto.</p>
      <label className="mt-3 flex cursor-pointer flex-col gap-3 rounded-xl border border-dashed border-sage-200 bg-sage-50 p-4">
        <span className="flex items-center gap-2 text-sm font-semibold text-forest-900"><ImagePlus size={19} />Tambah foto</span>
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={addFiles} disabled={disabled || value.length >= 10} aria-label="Tambah foto berita" className="block w-full min-w-0 text-sm" />
      </label>
      {value.length > 0 && <div className="mt-4 grid grid-cols-2 gap-3">
        {value.map((entry, index) => <figure key={entry.key} className="min-w-0 overflow-hidden rounded-xl border border-sage-200 bg-white">
          <Preview entry={entry} resolveUrl={resolveUrl} index={index} />
          <figcaption className="space-y-2 p-3">
            <p className="truncate text-xs text-stone-500" title={entry.file?.name}>{entry.file?.name || `Foto tersimpan ${index + 1}`}</p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" aria-pressed={index === 0} onClick={() => onChange([entry, ...value.filter((item) => item.key !== entry.key)])} className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold ${index === 0 ? "bg-sage-100 text-forest-900" : "border text-stone-600"}`}><Star size={13} fill={index === 0 ? "currentColor" : "none"} />{index === 0 ? "Utama" : "Jadikan utama"}</button>
              <button type="button" aria-label={`Hapus foto ${index + 1}`} onClick={() => remove(entry, index)} className="rounded-lg border border-red-100 p-2 text-red-700 hover:bg-red-50"><Trash2 size={14} /></button>
            </div>
          </figcaption>
        </figure>)}
      </div>}
    </fieldset>
  );
}
