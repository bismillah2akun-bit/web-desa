import { useEffect, useRef, useState } from "react";
import { ImageOverlay, MapContainer, useMap } from "react-leaflet";
import L from "leaflet";
import { Download, ExternalLink, Maximize, Minus, Plus } from "lucide-react";
import mapImage from "@/assets/map.jpeg";

// Image coordinates only: this scan has not been georeferenced to latitude/longitude.
const bounds = L.latLngBounds([[0, 0], [1130, 1600]]);
const fitOptions = { padding: [12, 12], animate: false };

function DocumentControls() {
  const map = useMap();
  const controls = useRef(null);
  useEffect(() => {
    const element = controls.current;
    L.DomEvent.disableClickPropagation(element);
    L.DomEvent.disableScrollPropagation(element);
    const fit = () => {
      map.invalidateSize({ pan: false });
      map.setMinZoom(-5);
      map.fitBounds(bounds, fitOptions);
      map.setMinZoom(map.getZoom());
    };
    const observer = new ResizeObserver(fit);
    observer.observe(map.getContainer());
    fit();
    return () => { observer.disconnect(); L.DomEvent.off(element); };
  }, [map]);
  const buttonClass = "flex min-h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-stone-700 shadow-sm hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700";
  return (
    <div ref={controls} className="absolute left-3 top-3 z-[500] flex gap-1.5 rounded-xl border border-stone-200 bg-white/95 p-1.5 shadow-md">
      <button type="button" aria-label="Perbesar peta" title="Perbesar peta" className={buttonClass} onClick={() => map.zoomIn(0.5)}><Plus size={18} /></button>
      <button type="button" aria-label="Perkecil peta" title="Perkecil peta" className={buttonClass} onClick={() => map.zoomOut(0.5)}><Minus size={18} /></button>
      <button type="button" className={buttonClass} onClick={() => map.fitBounds(bounds, fitOptions)}><Maximize size={16} /> Peta utuh</button>
    </div>
  );
}

export default function VillageMapDocument({ compact = false }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      <figcaption className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4">
        <div>
          <p className="text-sm font-bold text-forest-950">Peta Jalan Desa Tanjungjaya</p>
          <p className="mt-1 text-xs text-stone-500">Kecamatan Cihampelas · Kabupaten Bandung Barat</p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-semibold text-forest-900">
          <a href={mapImage} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 hover:bg-sage-50"><ExternalLink size={14} /> Buka gambar penuh</a>
          {!compact && <a href={mapImage} download="Peta-Jalan-Desa-Tanjungjaya.jpeg" className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 hover:bg-sage-50"><Download size={14} /> Unduh peta</a>}
        </div>
      </figcaption>
      <div className="relative">
        <MapContainer crs={L.CRS.Simple} bounds={bounds} boundsOptions={fitOptions} minZoom={-5} maxZoom={2}
          zoomSnap={0.25} maxBounds={bounds.pad(0.5)} maxBoundsViscosity={1} zoomControl={false}
          attributionControl={false} scrollWheelZoom={false}
          aria-label="Peta jalan Desa Tanjungjaya, dapat diperbesar dan digeser"
          style={{ height: compact ? "320px" : "clamp(300px, 65vw, 850px)", width: "100%", background: "#f3f4f5" }}>
          <ImageOverlay url={mapImage} bounds={bounds} alt="Peta Jalan Desa Tanjungjaya Kecamatan Cihampelas; jaringan jalan, badan air, legenda, dan daftar ruas jalan sesuai dokumen sumber."
            eventHandlers={{ error: () => setFailed(true), load: () => setFailed(false) }} />
          <DocumentControls />
        </MapContainer>
        {failed && <p role="alert" className="absolute bottom-4 left-4 right-4 z-[500] rounded-xl bg-red-50 p-4 text-sm text-red-700">Gambar belum dapat dimuat. Coba muat ulang halaman atau buka gambar penuh.</p>}
      </div>
      <p className="border-t border-stone-100 px-5 py-3 text-xs leading-5 text-stone-500">Gunakan tombol + / − atau cubit layar untuk zoom. Geser peta untuk membaca detail; pilih <b>Peta utuh</b> untuk melihat seluruh dokumen.</p>
    </figure>
  );
}
