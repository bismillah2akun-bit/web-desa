import { useEffect, useMemo, useState } from "react";
import { Mail, Search, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useConfirm } from "@/components/confirmContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const formatTime = (value) =>
  `${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value))} WIB`;

export default function AdminContacts({ onDataChanged }) {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const navigate = useNavigate();
  const confirm = useConfirm();

  useEffect(() => {
    fetch(`${API}/admin/contacts`, { credentials: "include" })
      .then(async (response) => {
        if (response.status === 401)
          return navigate("/admin/login", { replace: true });
        if (!response.ok) throw new Error("Pesan warga belum dapat dimuat");
        setItems((await response.json()).data);
      })
      .catch((error) => setNotice(error.message));
  }, [navigate]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return items.filter((item) =>
      [item.name, item.email, item.phone, item.subject, item.message].some(
        (value) => String(value || "").toLowerCase().includes(keyword),
      ),
    );
  }, [items, query]);

  async function changeStatus(id, status) {
    try {
      const response = await fetch(`${API}/admin/contacts/${id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await response.json();
      if (response.status === 401)
        return navigate("/admin/login", { replace: true });
      if (!response.ok) throw new Error(body.message);
      setItems((current) =>
        current.map((item) => (item.id === id ? body.data : item)),
      );
      setNotice(body.message);
      onDataChanged?.();
    } catch (error) {
      setNotice(error.message || "Status pesan belum dapat diperbarui.");
    }
  }

  function remove(item) {
    confirm({
      title: "Hapus pesan warga?",
      itemName: `${item.name} — ${item.subject}`,
      description:
        "Pesan ini akan dihapus permanen dari dashboard dan ekspor Excel.",
      onConfirm: async () => {
        const response = await fetch(`${API}/admin/contacts/${item.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? "Sesi berakhir. Silakan login kembali."
              : body.message,
          );
        setItems((current) =>
          current.filter((entry) => entry.id !== item.id),
        );
        setNotice(body.message);
        onDataChanged?.();
      },
    });
  }

  return (
    <main className="min-h-screen bg-sage-50">
      {notice && (
        <div role="status" className="fixed bottom-5 right-5 z-50 rounded-xl border bg-white px-5 py-4 text-sm font-semibold shadow-xl">
          {notice}
        </div>
      )}
      <div className="mx-auto max-w-7xl px-5 py-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-earth-500">Kotak Masuk Desa</p>
            <h1 className="mt-3 font-serif text-4xl text-forest-950">Pesan warga</h1>
            <p className="mt-2 text-sm text-stone-500">{items.length} pesan tersimpan.</p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-xl bg-sage-100 px-4 py-3 text-sm font-semibold text-forest-900">
            <Mail size={17} /> {items.filter((item) => item.status === "baru").length} pesan baru
          </span>
        </div>
        <label className="relative mt-7 block max-w-md">
          <Search size={17} className="absolute left-3 top-3.5 text-stone-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, subjek, atau isi pesan..." className="w-full rounded-xl border bg-white py-3 pl-10 pr-3" />
        </label>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {filtered.map((item) => (
            <article key={item.id} className="rounded-2xl border border-sage-200 bg-white p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-stone-500">{formatTime(item.created_at)}</p>
                  <h2 className="mt-2 text-lg font-bold text-forest-950">{item.subject}</h2>
                </div>
                <select aria-label={`Status pesan ${item.subject}`} value={item.status} onChange={(event) => changeStatus(item.id, event.target.value)} className="rounded-lg border bg-white px-2 py-2 text-xs font-semibold">
                  <option value="baru">Baru</option><option value="dibaca">Dibaca</option><option value="selesai">Selesai</option>
                </select>
              </div>
              <p className="mt-4 whitespace-pre-line rounded-xl bg-sage-50 p-4 text-sm leading-7 text-stone-700">{item.message}</p>
              <div className="mt-4 flex flex-col gap-3 border-t pt-4 text-sm sm:flex-row sm:items-end sm:justify-between">
                <div><b className="text-forest-950">{item.name}</b><p className="mt-1 break-all text-stone-500">{item.email}{item.phone ? ` · ${item.phone}` : ""}</p></div>
                <button type="button" onClick={() => remove(item)} aria-label={`Hapus pesan ${item.subject}`} className="inline-flex w-fit items-center gap-2 rounded-lg border border-red-200 px-3 py-2 font-semibold text-red-700 hover:bg-red-50"><Trash2 size={16} /> Hapus</button>
              </div>
            </article>
          ))}
          {!filtered.length && <div className="col-span-full rounded-2xl border border-dashed bg-white p-12 text-center text-stone-500"><Mail className="mx-auto mb-4" />Pesan tidak ditemukan.</div>}
        </div>
      </div>
    </main>
  );
}
