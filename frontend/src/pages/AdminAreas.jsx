import { useEffect, useState } from "react";
import { Edit3, Save, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useConfirm } from "@/components/confirmContext";

import AdminDataTable, { StatusBadge } from "@/components/AdminDataTable";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const empty = {
  rw_number: "",
  rt_number: "",
  household_count: "",
  male_population: "",
  female_population: "",
  data_year: "",
  source: "",
  status: "belum_diverifikasi",
};

export default function AdminAreas() {
  const confirm = useConfirm();
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/demographics`)
      .then((response) => { if (!response.ok) throw new Error("Data belum dapat dimuat"); return response.json(); })
      .then((body) => setAreas(body.data?.areas || []))
      .catch(() => setNotice("Data RT/RW belum dapat dimuat"))
      .finally(() => setLoading(false));
  }, []);

  function change(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }
  function reset() {
    setForm(empty);
    setEditingId(null);
  }
  function edit(area) {
    setEditingId(area.id);
    setForm(
      Object.fromEntries(
        Object.keys(empty).map((key) => [key, area[key] ?? ""]),
      ),
    );
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch(
        `${API}/admin/demographics/areas${editingId ? `/${editingId}` : ""}`,
        {
          method: editingId ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const body = await response.json();
      if (response.status === 401)
        return navigate("/admin/login", { replace: true });
      if (!response.ok) throw new Error(body.message);
      setAreas((current) =>
        editingId
          ? current.map((area) => (area.id === editingId ? body.data : area))
          : [...current, body.data],
      );
      setNotice(body.message);
      reset();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(area) {
    confirm({
      title: "Hapus rekap RT/RW?",
      itemName: `RW ${area.rw_number} / RT ${area.rt_number}`,
      description:
        "Rekap penduduk dan KK untuk wilayah ini akan dihapus permanen.",
      onConfirm: async () => {
        const response = await fetch(
          `${API}/admin/demographics/areas/${area.id}`,
          { method: "DELETE", credentials: "include" },
        );
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? "Sesi berakhir. Silakan login kembali."
              : body.message,
          );
        setAreas((current) => current.filter((item) => item.id !== area.id));
        setNotice(body.message);
        if (editingId === area.id) reset();
      },
    });
  }

  const fields = [
    ["RW *", "rw_number"],
    ["RT *", "rt_number"],
    ["Jumlah KK", "household_count"],
    ["Laki-laki", "male_population"],
    ["Perempuan", "female_population"],
    ["Tahun data", "data_year"],
  ];
  const total = (value) =>
    value === null || value === ""
      ? "—"
      : Number(value).toLocaleString("id-ID");

  const columns = [
    { key: "area", label: "Wilayah", sortValue: (area) => `${area.rw_number}/${area.rt_number}`, render: (area) => <div className="admin-area-label"><strong>RW {area.rw_number}</strong><span>RT {area.rt_number}</span></div> },
    ...[["household_count", "KK"], ["male_population", "Laki-laki"], ["female_population", "Perempuan"]].map(([key, label]) => ({ key, label, className: "admin-data-number", sortValue: (area) => area[key] == null ? null : Number(area[key]), render: (area) => total(area[key]) })),
    { key: "total", label: "Penduduk", className: "admin-data-number", sortValue: (area) => area.male_population == null && area.female_population == null ? null : Number(area.male_population || 0) + Number(area.female_population || 0), render: (area) => <strong>{area.male_population == null && area.female_population == null ? "—" : total(Number(area.male_population || 0) + Number(area.female_population || 0))}</strong> },
    { key: "year", label: "Tahun", className: "admin-data-number", sortValue: (area) => area.data_year, render: (area) => area.data_year || "—" },
    { key: "status", label: "Verifikasi", sortValue: (area) => area.status, render: (area) => <StatusBadge value={area.status}>{area.status === "terverifikasi" ? "Terverifikasi" : "Belum diverifikasi"}</StatusBadge> },
    { key: "actions", label: "Aksi", className: "admin-data-actions", render: (area) => <div className="admin-row-actions"><button type="button" aria-label={`Edit RW ${area.rw_number} RT ${area.rt_number}`} title="Edit rekap" className="admin-row-action" onClick={() => { edit(area); document.getElementById("admin-area-form")?.scrollIntoView({ behavior: "instant", block: "center" }); }}><Edit3 size={16} /></button><button type="button" aria-label={`Hapus RW ${area.rw_number} RT ${area.rt_number}`} title="Hapus rekap" className="admin-row-action admin-row-action--danger" onClick={() => remove(area)}><Trash2 size={16} /></button></div> },
  ];

  return (
    <section className="mt-7 rounded-2xl border border-sage-200 bg-white p-6 md:p-8">
      {notice && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border bg-white px-5 py-4 text-sm font-semibold shadow-xl">
          {notice}
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-earth-500">
            Rincian Wilayah
          </p>
          <h2 className="mt-2 font-serif text-2xl text-forest-950">
            Rekap per RT/RW
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Masukkan satu baris untuk setiap kombinasi RW dan RT.
          </p>
        </div>
        <span className="text-sm font-semibold text-stone-500">
          {areas.length} baris data
        </span>
      </div>
      <form id="admin-area-form" onSubmit={submit} className="mt-7 rounded-2xl bg-sage-50 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([label, name]) => (
            <label key={name}>
              <span className="text-xs font-semibold">{label}</span>
              <input
                required={name === "rw_number" || name === "rt_number"}
                type={
                  ["rw_number", "rt_number"].includes(name) ? "text" : "number"
                }
                min={name === "data_year" ? 1900 : 0}
                max={name === "data_year" ? 2200 : undefined}
                value={form[name]}
                onChange={(event) => change(name, event.target.value)}
                className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5"
              />
            </label>
          ))}
        </div>
        <label className="mt-4 block">
          <span className="text-xs font-semibold">Sumber data</span>
          <input
            value={form.source}
            onChange={(event) => change("source", event.target.value)}
            className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5"
          />
        </label>
        <label className="mt-4 block">
          <span className="text-xs font-semibold">Status</span>
          <select
            value={form.status}
            onChange={(event) => change("status", event.target.value)}
            className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5"
          >
            <option value="belum_diverifikasi">Belum diverifikasi</option>
            <option value="terverifikasi">Terverifikasi</option>
          </select>
        </label>
        <div className="mt-5 flex gap-3">
          <button
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-forest-900 px-5 py-3 text-sm font-bold text-white"
          >
            <Save size={16} />
            {saving
              ? "Menyimpan..."
              : editingId
                ? "Simpan Perubahan"
                : "Tambah Data"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm font-bold"
            >
              <X size={16} />
              Batal
            </button>
          )}
        </div>
      </form>
      <div className="mt-7">
        <AdminDataTable title="Data wilayah" description="Rekap keluarga dan penduduk untuk setiap RT/RW."
          rows={areas} columns={columns} loading={loading}
          searchText={(area) => [`RW ${area.rw_number}`, `RT ${area.rt_number}`, area.data_year, area.source].join(" ")}
          searchPlaceholder="Cari RT, RW, atau tahun…"
          filters={[{ value: "terverifikasi", label: "Terverifikasi" }, { value: "belum_diverifikasi", label: "Belum diverifikasi" }]}
          defaultSort={{ key: "area", direction: "asc" }} emptyMessage="Belum ada rincian RT/RW"
        />
      </div>
    </section>
  );
}
