import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function NewsGallery({ images, title, resolveUrl, fallback }) {
  const [selected, setSelected] = useState(0);
  const photos = images?.length ? images : [fallback];
  const active = Math.min(selected, photos.length - 1);
  return (
    <section aria-label="Galeri foto berita" className="mt-8">
      <figure className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
        <img src={resolveUrl(photos[active])} alt={`${title} — foto ${active + 1} dari ${photos.length}`} className="aspect-[4/3] w-full object-contain sm:aspect-[3/2]" />
        {photos.length > 1 && <figcaption className="flex items-center justify-between gap-4 border-t bg-white px-4 py-3 text-sm">
          <span className="text-stone-500">Foto {active + 1} dari {photos.length}</span>
          <div className="flex gap-2">
            <button type="button" aria-label="Foto sebelumnya" disabled={active === 0} onClick={() => setSelected(active - 1)} className="rounded-lg border p-2 text-forest-900 disabled:opacity-30"><ChevronLeft size={18} /></button>
            <button type="button" aria-label="Foto berikutnya" disabled={active === photos.length - 1} onClick={() => setSelected(active + 1)} className="rounded-lg border p-2 text-forest-900 disabled:opacity-30"><ChevronRight size={18} /></button>
          </div>
        </figcaption>}
      </figure>
      {photos.length > 1 && <div className="mt-3 flex gap-3 overflow-x-auto p-1" role="group" aria-label="Pilih foto berita">
        {photos.map((url, index) => <button key={url} type="button" aria-label={`Tampilkan foto ${index + 1}`} aria-pressed={active === index} onClick={() => setSelected(index)} className={`shrink-0 overflow-hidden rounded-xl border-2 ${active === index ? "border-forest-900 ring-2 ring-forest-900/15" : "border-transparent opacity-70 hover:opacity-100"}`}>
          <img src={resolveUrl(url)} alt="" loading="lazy" className="h-16 w-24 object-cover" />
        </button>)}
      </div>}
    </section>
  );
}
