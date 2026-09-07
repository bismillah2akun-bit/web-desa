import { useEffect, useState } from "react";
import { Edit3, Save, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useConfirm } from "@/components/confirmContext";
import AdminDataTable, { RecordIdentity } from "@/components/AdminDataTable";
import { LayersControl, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { GeoJSON } from "react-leaflet";
import boundary from "@/data/tanjungjaya-boundary.json";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const empty = {
  name: "",
  category: "",
  address: "",
  description: "",
  image_url: "",
  longitude: "",
  latitude: "",
};
const villageCenter = [-6.922, 107.425];
const boundaryBounds = L.geoJSON(boundary).getBounds();

function isInsideRing(latitude, longitude, ring) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [currentLongitude, currentLatitude] = ring[index];
    const [previousLongitude, previousLatitude] = ring[previous];
    const crosses = currentLatitude > latitude !== previousLatitude > latitude;
    if (crosses && longitude < ((previousLongitude - currentLongitude) * (latitude - currentLatitude)) / (previousLatitude - currentLatitude) + currentLongitude) inside = !inside;
  }
  return inside;
}

function isInsideVillage(latitude, longitude) {
  return boundary.features.some((feature) => {
    const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    return polygons.some((polygon) => isInsideRing(latitude, longitude, polygon[0]) && !polygon.slice(1).some((hole) => isInsideRing(latitude, longitude, hole)));
  });
}
const locationIcon = L.divIcon({
  className: "admin-location-marker",
  html: '<span aria-hidden="true"></span>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

function LocationPicker({ position, onChange }) {
  const map = useMap();
  useMapEvents({
    click(event) {
      if (isInsideVillage(event.latlng.lat, event.latlng.lng)) onChange(event.latlng.lat, event.latlng.lng);
    },
  });

  useEffect(() => {
    if (position) map.setView(position, Math.max(map.getZoom(), 16), { animate: true });
  }, [map, position]);

  return position ? (
    <Marker
      position={position}
      icon={locationIcon}
      draggable
      eventHandlers={{ dragend: (event) => {
        const marker = event.target;
        const next = marker.getLatLng();
        if (isInsideVillage(next.lat, next.lng)) onChange(next.lat, next.lng);
        else marker.setLatLng(position);
      } }}
    >
      <Popup>Lokasi potensi terpilih</Popup>
    </Marker>
  ) : null;
}

export default function AdminPotentials() {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [imageFile, setImageFile] = useState(null);

  useEffect(() => {
    fetch(`${API}/potentials`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Data potensi belum dapat dimuat");
        setItems((await response.json()).data || []);
      })
      .catch((error) => setNotice(error.message))
      .finally(() => setLoading(false));
  }, []);

  function change(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function setCoordinates(latitude, longitude) {
    setForm((current) => ({
      ...current,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
    }));
  }

  function reset() {
    setForm(empty);
    setEditingId(null);
    setImageFile(null);
  }

  function edit(item) {
    setEditingId(item.id);
    setForm(Object.fromEntries(Object.keys(empty).map((key) => [key, item[key] ?? ""])));
    setImageFile(null);
    document.getElementById("admin-potential-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value ?? ""));
      if (imageFile) payload.append("image", imageFile);
      const response = await fetch(`${API}/admin/potentials${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        credentials: "include",
        body: payload,
      });
      const body = await response.json();
      if (response.status === 401) return navigate("/admin/login", { replace: true });
      if (!response.ok) throw new Error(body.message || "Potensi belum dapat disimpan");
      setItems((current) => editingId
        ? current.map((item) => (item.id === editingId ? body.data : item))
        : [...current, body.data]);
      setNotice(body.message);
      reset();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  }

  function remove(item) {
    confirm({
      title: "Hapus potensi lokal?",
      itemName: item.name,
      description: "Data potensi ini akan dihapus permanen dari website dan peta desa.",
      onConfirm: async () => {
        const response = await fetch(`${API}/admin/potentials/${item.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const body = await response.json();
        if (!response.ok) throw new Error(response.status === 401 ? "Sesi berakhir. Silakan login kembali." : body.message);
        setItems((current) => current.filter((entry) => entry.id !== item.id));
        setNotice(body.message);
        if (editingId === item.id) reset();
      },
    });
  }

  const fields = [
    ["Nama potensi *", "name", "text"],
    ["Kategori", "category", "text"],
    ["Bujur *", "longitude", "number"],
    ["Lintang *", "latitude", "number"],
  ];
  const columns = [
    { key: "name", label: "Potensi", sortValue: (item) => item.name, render: (item) => <RecordIdentity name={item.name} subtitle={item.category || "Tanpa kategori"} tone="red" /> },
    { key: "address", label: "Lokasi", sortValue: (item) => item.address, render: (item) => <span className="admin-data-text">{item.address || "—"}</span> },
    { key: "coordinates", label: "Koordinat", render: (item) => <span className="admin-data-text">{Number(item.latitude).toFixed(5)}, {Number(item.longitude).toFixed(5)}</span> },
    { key: "actions", label: "Aksi", className: "admin-data-actions", render: (item) => <div className="admin-row-actions"><button type="button" className="admin-row-action" aria-label={`Edit ${item.name}`} title="Edit potensi" onClick={() => edit(item)}><Edit3 size={16} /></button><button type="button" className="admin-row-action admin-row-action--danger" aria-label={`Hapus ${item.name}`} title="Hapus potensi" onClick={() => remove(item)}><Trash2 size={16} /></button></div> },
  ];
  const latitude = Number(form.latitude);
  const longitude = Number(form.longitude);
  const position = Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
    && isInsideVillage(latitude, longitude)
    ? [latitude, longitude]
    : null;

  return (
    <section className="admin-potentials-module">
      {notice && <div className="admin-notice" role="status">{notice}</div>}
      <form id="admin-potential-form" onSubmit={submit} className="admin-potential-form">
        <div className="admin-form-heading">
          <div><h2>{editingId ? "Edit potensi lokal" : "Tambah potensi lokal"}</h2><p>Kelola potensi yang tampil di halaman Potensi Lokal dan peta desa.</p></div>
        </div>
        <div className="admin-potential-fields">
          {fields.slice(0, 2).map(([label, name, type]) => <label key={name}><span>{label}</span><input required={label.endsWith("*")} type={type} value={form[name]} onChange={(event) => change(name, event.target.value)} /></label>)}
        </div>
        <div className="admin-location-picker">
          <div className="admin-location-picker__heading"><div><span className="admin-location-picker__label">Lokasi di peta</span><p>Klik titik lokasi atau geser marker. Koordinat akan terisi otomatis.</p></div><span className="admin-location-picker__hint">Peta interaktif</span></div>
          <MapContainer center={position || villageCenter} zoom={position ? 16 : 13} scrollWheelZoom className="admin-location-map" maxBounds={boundaryBounds} maxBoundsViscosity={1}>
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Citra satelit">
                <>
                  <TileLayer
                    attribution='Imagery &copy; Esri, Maxar, Earthstar Geographics'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={19}
                  />
                  <TileLayer
                    attribution='Labels &copy; Esri'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={19}
                  />
                </>
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Peta jalan & bangunan">
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  maxZoom={19}
                />
              </LayersControl.BaseLayer>
            </LayersControl>
            <GeoJSON data={boundary} style={{ color: "#b51f16", weight: 3, fillColor: "#b51f16", fillOpacity: 0.12 }} />
            <LocationPicker position={position} onChange={setCoordinates} />
          </MapContainer>
        </div>
        <div className="admin-potential-fields admin-potential-fields--coordinates">
          {fields.slice(2).map(([label, name, type]) => <label key={name}><span>{label}</span><input required={label.endsWith("*")} type={type} step="any" value={form[name]} onChange={(event) => change(name, event.target.value)} /></label>)}
        </div>
        <label><span>Alamat</span><input value={form.address} onChange={(event) => change("address", event.target.value)} /></label>
        <label><span>Gambar potensi</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] || null)} />{imageFile && <small className="admin-file-name">File baru: {imageFile.name}</small>}{!imageFile && form.image_url && <small className="admin-file-name">Gambar saat ini tersimpan. Pilih file baru untuk menggantinya.</small>}</label>
        <label><span>Deskripsi</span><textarea rows="4" value={form.description} onChange={(event) => change("description", event.target.value)} /></label>
        <div className="admin-form-actions"><button disabled={saving} className="admin-primary-button"><Save size={16} />{saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Potensi"}</button>{editingId && <button type="button" className="admin-secondary-button" onClick={reset}><X size={16} />Batal</button>}</div>
      </form>
      <AdminDataTable title="Daftar potensi lokal" description="Data ini akan digunakan pada landing page, halaman potensi, dan WebGIS." rows={items} columns={columns} loading={loading} searchText={(item) => [item.name, item.category, item.address, item.description].join(" ")} searchPlaceholder="Cari nama, kategori, atau lokasi..." defaultSort={{ key: "name", direction: "asc" }} emptyMessage="Belum ada potensi lokal" renderDetail={(item) => <div className="admin-detail-grid"><div className="admin-detail-wide"><dt>Deskripsi</dt><dd>{item.description || "—"}</dd></div><div><dt>Gambar</dt><dd>{item.image_url || "—"}</dd></div></div>} />
    </section>
  );
}
