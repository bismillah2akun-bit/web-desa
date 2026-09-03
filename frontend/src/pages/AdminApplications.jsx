import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Download,
  FileCheck2,
  MessageCircle,
  RefreshCw,
  Save,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "@/components/VillageBrand";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const statuses = [
  "diajukan",
  "diperiksa",
  "revisi",
  "disetujui",
  "selesai",
  "ditolak",
];
const formatTime = (value) =>
  `${new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value))} WIB`;

function whatsappUrl(application) {
  let number = String(application.whatsapp || "").replace(/\D/g, "");
  if (number.startsWith("0")) number = `62${number.slice(1)}`;
  if (!number.startsWith("62")) number = `62${number}`;

  const status = application.status === "selesai" ? "telah selesai" : "telah disetujui";
  const note = application.admin_note
    ? `\n\nCatatan petugas:\n${application.admin_note}`
    : "";
  const message = `Halo ${application.full_name}, pengajuan ${application.service_name} dengan kode ${application.tracking_code} ${status}.${note}\n\nSilakan cek status melalui website Desa Tanjungjaya.`;

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export default function AdminApplications() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function api(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      credentials: "include",
      ...options,
    });
    const body = await response.json();
    if (response.status === 401) navigate("/admin/login", { replace: true });
    if (!response.ok) throw new Error(body.message);
    return body.data;
  }

  async function load() {
    try {
      setLoading(true);
      setItems(await api("/admin/applications"));
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function open(item) {
    try {
      setSelected(await api(`/admin/applications/${item.id}`));
    } catch (error) {
      setNotice(error.message);
    }
  }

  async function updateStatus(event) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const data = await api(`/admin/applications/${selected.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSelected(data);
      setItems((current) =>
        current.map((item) => (item.id === data.id ? data : item)),
      );
      setNotice("Status pengajuan berhasil diperbarui");
    } catch (error) {
      setNotice(error.message);
    }
  }

  return (
    <main className="min-h-screen bg-sage-50">
      <header className="border-b border-sage-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Brand />
          <Link
            to="/admin"
            className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"
          >
            <ArrowLeft size={16} />
            Dashboard
          </Link>
        </div>
      </header>
      {notice && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border bg-white px-5 py-4 text-sm font-semibold shadow-xl">
          {notice}
        </div>
      )}
      <div className="mx-auto max-w-7xl px-5 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-earth-500">
              Layanan Warga
            </p>
            <h1 className="mt-3 font-serif text-4xl text-forest-950">
              Daftar pengajuan
            </h1>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold"
          >
            <RefreshCw size={16} />
            Muat ulang
          </button>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <section className="space-y-3">
            {loading ? (
              <p className="rounded-xl bg-white p-6 text-sm text-stone-500">
                Memuat pengajuan...
              </p>
            ) : items.length ? (
              items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => open(item)}
                  className={`w-full rounded-2xl border p-5 text-left ${selected?.id === item.id ? "border-forest-900 bg-sage-100" : "border-sage-200 bg-white"}`}
                >
                  <div className="flex justify-between gap-4">
                    <b className="text-sm text-forest-950">{item.full_name}</b>
                    <span className="rounded-lg bg-sage-100 px-2 py-1 text-xs font-bold capitalize text-forest-900">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-stone-600">
                    {item.service_name}
                  </p>
                  <p className="mt-3 text-xs text-stone-400">
                    {item.tracking_code} · {formatTime(item.submitted_at)}
                  </p>
                </button>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-stone-500">
                Belum ada pengajuan warga.
              </p>
            )}
          </section>
          <section>
            {selected ? (
              <article className="rounded-2xl border border-sage-200 bg-white p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <p className="text-xs font-bold text-earth-500">
                      {selected.tracking_code}
                    </p>
                    <h2 className="mt-2 font-serif text-3xl text-forest-950">
                      {selected.service_name}
                    </h2>
                    <p className="mt-2 text-sm text-stone-500">
                      Diajukan {formatTime(selected.submitted_at)}
                    </p>
                  </div>
                  <span className="rounded-xl bg-forest-900 px-4 py-2 text-sm font-bold capitalize text-white">
                    {selected.status}
                  </span>
                </div>
                <div className="mt-7 grid gap-4 rounded-xl bg-sage-50 p-5 sm:grid-cols-2">
                  <Info label="Nama" value={selected.full_name} />
                  <Info label="NIK" value={selected.nik} />
                  <Info label="WhatsApp" value={selected.whatsapp} />
                  <Info label="Email" value={selected.email} />
                  <Info label="Alamat" value={selected.address} />
                </div>
                <div className="mt-7">
                  <h3 className="font-bold text-forest-950">
                    Data persyaratan
                  </h3>
                  <div className="mt-3 space-y-3">
                    {selected.values.map((value) => (
                      <Info
                        key={value.id}
                        label={value.label}
                        value={value.value_text}
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-7">
                  <h3 className="font-bold text-forest-950">Dokumen</h3>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {selected.files.map((file) => (
                      <a
                        key={file.id}
                        href={`${API}/admin/application-files/${file.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold text-forest-900"
                      >
                        <Download size={16} />
                        {file.label}{" "}
                        <span className="text-xs font-normal text-stone-400">
                          ({Math.ceil(file.file_size / 1024)} KB)
                        </span>
                      </a>
                    ))}
                    {!selected.files.length && (
                      <p className="text-sm text-stone-500">
                        Tidak ada dokumen.
                      </p>
                    )}
                  </div>
                </div>
                <form onSubmit={updateStatus} className="mt-8 border-t pt-7">
                  <h3 className="font-bold text-forest-950">
                    Proses pengajuan
                  </h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label>
                      <span className="text-sm font-semibold">Status</span>
                      <select
                        name="status"
                        defaultValue={selected.status}
                        key={selected.status}
                        className="mt-2 w-full rounded-xl border bg-white px-3 py-3"
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status[0].toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="sm:col-span-2">
                      <span className="text-sm font-semibold">
                        Catatan admin / revisi
                      </span>
                      <textarea
                        name="note"
                        rows="4"
                        defaultValue={selected.admin_note || ""}
                        className="mt-2 w-full rounded-xl border p-3"
                      />
                    </label>
                  </div>
                  <button className="mt-4 flex items-center gap-2 rounded-xl bg-forest-900 px-5 py-3 text-sm font-bold text-white">
                    <Save size={16} />
                    Simpan Status
                  </button>
                </form>
                {["disetujui", "selesai"].includes(selected.status) && (
                  <a
                    href={whatsappUrl(selected)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 flex w-fit items-center gap-2 rounded-xl bg-forest-800 px-5 py-3 text-sm font-bold text-white"
                  >
                    <MessageCircle size={17} />
                    Kirim pemberitahuan WhatsApp
                  </a>
                )}
                <div className="mt-8 border-t pt-7">
                  <h3 className="font-bold text-forest-950">Riwayat status</h3>
                  <div className="mt-4 space-y-4">
                    {selected.history.map((history, index) => (
                      <div
                        key={`${history.created_at}-${index}`}
                        className="flex gap-3"
                      >
                        <FileCheck2
                          size={17}
                          className="mt-0.5 shrink-0 text-earth-500"
                        />
                        <div>
                          <b className="text-sm capitalize">{history.status}</b>
                          <p className="mt-1 text-xs text-stone-500">
                            {formatTime(history.created_at)}
                            {history.note ? ` · ${history.note}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ) : (
              <div className="grid min-h-80 place-items-center rounded-2xl border border-dashed border-sage-200 bg-white text-sm text-stone-500">
                Pilih pengajuan untuk melihat detail.
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-stone-400">
        {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">
        {value || "—"}
      </p>
    </div>
  );
}
