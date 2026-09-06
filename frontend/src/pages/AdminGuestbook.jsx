import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Search, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "@/components/VillageBrand";
import { useConfirm } from '@/components/confirmContext';

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const formatTime = (value) =>
  `${new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value))} WIB`;

async function downloadExport() {
  const response = await fetch(`${API}/admin/export.xlsx`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error("File Excel belum dapat dibuat");
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const filename =
    disposition.match(/filename="([^"]+)"/)?.[1] ||
    "data-desa-tanjungjaya.xlsx";
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminGuestbook({ onDataChanged }) {
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/admin/guestbook`, { credentials: "include" })
      .then(async (response) => {
        if (response.status === 401)
          return navigate("/admin/login", { replace: true });
        if (!response.ok) throw new Error("Buku tamu belum dapat dimuat");
        setItems((await response.json()).data);
      })
      .catch((error) => setNotice(error.message));
  }, [navigate]);

  const filtered = useMemo(() => {
    const keyword = query.toLowerCase();
    return items.filter((item) =>
      [item.name, item.institution, item.visit_purpose, item.email].some(
        (value) =>
          String(value || "")
            .toLowerCase()
            .includes(keyword),
      ),
    );
  }, [items, query]);

  async function changeStatus(id, status) {
    try {
    const response = await fetch(`${API}/admin/guestbook/${id}/status`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = await response.json();
    if (response.status === 401) return navigate('/admin/login', { replace: true });
    if (!response.ok) throw new Error(body.message);
    setItems((current) =>
      current.map((item) => (item.id === id ? body.data : item)),
    );
    setNotice(body.message);
    onDataChanged?.();
    } catch (error) { setNotice(error.message || 'Status belum dapat diperbarui.'); }
  }

  function remove(item) {
    confirm({ title: 'Hapus kunjungan ini?', itemName: `${item.name} — ${item.visit_purpose}`, description: 'Catatan kunjungan ini akan dihapus permanen dari buku tamu, ringkasan dashboard, dan ekspor Excel.', onConfirm: async () => {
      const response = await fetch(`${API}/admin/guestbook/${item.id}`, { method: 'DELETE', credentials: 'include' });
      const body = await response.json();
      if (!response.ok) throw new Error(response.status === 401 ? 'Sesi berakhir. Silakan login kembali.' : body.message);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setNotice(body.message);
      onDataChanged?.();
    } });
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
        <div role="status" className="fixed bottom-5 right-5 z-50 rounded-xl border bg-white px-5 py-4 text-sm font-semibold shadow-xl">
          {notice}
        </div>
      )}
      <div className="mx-auto max-w-7xl px-5 py-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-earth-500">
              Administrasi Kunjungan
            </p>
            <h1 className="mt-3 font-serif text-4xl text-forest-950">
              Data buku tamu
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              {items.length} kunjungan tersimpan.
            </p>
          </div>
          <button
            onClick={() =>
              downloadExport().catch((error) => setNotice(error.message))
            }
            className="flex w-fit items-center gap-2 rounded-xl bg-forest-900 px-4 py-3 text-sm font-bold text-white"
          >
            <Download size={17} />
            Export semua data Excel
          </button>
        </div>
        <label className="relative mt-7 block max-w-md">
          <Search
            size={17}
            className="absolute left-3 top-3.5 text-stone-400"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama, instansi, tujuan..."
            className="w-full rounded-xl border bg-white py-3 pl-10 pr-3"
          />
        </label>
        <div className="mt-6 overflow-hidden rounded-2xl border border-sage-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-forest-900 text-white">
                <tr>
                  {[
                    "Waktu WIB",
                    "Nama / Instansi",
                    "Kontak",
                    "Tujuan",
                    "Pesan",
                    "Tanggal Kunjungan",
                    "Status",
                    "Aksi",
                  ].map((title) => (
                    <th key={title} className="px-4 py-4 font-semibold">
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-sage-50">
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-stone-500">
                      {formatTime(item.created_at)}
                    </td>
                    <td className="px-4 py-4">
                      <b className="text-forest-950">{item.name}</b>
                      <p className="mt-1 text-xs text-stone-500">
                        {item.institution || "Tanpa instansi"}
                      </p>
                      <p className="mt-1 max-w-52 text-xs text-stone-400">
                        {item.address}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p>{item.phone || "—"}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {item.email || "—"}
                      </p>
                    </td>
                    <td className="max-w-60 px-4 py-4">{item.visit_purpose}</td>
                    <td className="max-w-60 px-4 py-4 text-stone-500">
                      {item.message || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      {new Intl.DateTimeFormat("id-ID", {
                        dateStyle: "medium",
                        timeZone: "Asia/Jakarta",
                      }).format(new Date(item.visit_date))}
                    </td>
                    <td className="px-4 py-4">
                      <select
                        aria-label={`Status kunjungan ${item.name}`}
                        value={item.status}
                        onChange={(event) =>
                          changeStatus(item.id, event.target.value)
                        }
                        className="rounded-lg border bg-white px-2 py-2 text-xs font-semibold"
                      >
                        <option value="baru">Baru</option>
                        <option value="dibaca">Dibaca</option>
                        <option value="selesai">Selesai</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      <button type="button" onClick={() => remove(item)} aria-label={`Hapus kunjungan ${item.name}`} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"><Trash2 size={16} />Hapus</button>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-5 py-12 text-center text-stone-500"
                    >
                      Data tidak ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
