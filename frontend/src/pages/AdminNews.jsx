import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Edit3,
  Eye,
  EyeOff,
  Newspaper,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "@/components/VillageBrand";
import { useConfirm } from "@/components/confirmContext";

import NewsImagePicker from "@/components/NewsImagePicker";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const mediaUrl = (value) =>
  value?.startsWith("/uploads/")
    ? `${new URL(API, window.location.origin).origin}${value}`
    : value;
const emptyForm = {
  title: "",
  category: "",
  summary: "",
  content: "",
  is_published: true,
  published_at: "",
};

export default function AdminNews({ onDataChanged }) {
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/admin/news`, { credentials: "include" })
      .then(async (response) => {
        if (response.status === 401)
          return navigate("/admin/login", { replace: true });
        if (!response.ok) throw new Error("Berita belum dapat dimuat");
        setItems((await response.json()).data);
      })
      .catch((error) => setNotice(error.message));
  }, [navigate]);

  function change(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function edit(item) {
    setImages((item.image_urls || (item.image_url ? [item.image_url] : [])).map((url) => ({ key: url, url })));
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      category: item.category || "",
      summary: item.summary || "",
      content: item.content || "",
      is_published: Boolean(item.is_published),
      published_at: item.published_at
        ? new Date(item.published_at).toISOString().slice(0, 16)
        : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm);
    setImages([]);
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) =>
        payload.append(key, String(value ?? "")),
      );
      let uploadIndex = 0;
      const order = images.map((entry) => {
        if (!entry.file) return { existing: entry.url };
        payload.append("images", entry.file);
        return { upload: uploadIndex++ };
      });
      payload.append("image_order", JSON.stringify(order));
      const response = await fetch(
        `${API}/admin/news${editingId ? `/${editingId}` : ""}`,
        {
          method: editingId ? "PUT" : "POST",
          credentials: "include",
          body: payload,
        },
      );
      const body = await response.json();
      if (response.status === 401)
        return navigate("/admin/login", { replace: true });
      if (!response.ok) throw new Error(body.message);
      setItems((current) =>
        editingId
          ? current.map((item) => (item.id === editingId ? body.data : item))
          : [body.data, ...current],
      );
      setNotice(body.message);
      reset();
      onDataChanged?.();
    } catch (error) {
      setNotice(error.message || "Berita belum dapat disimpan");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    confirm({
      title: "Hapus berita ini?",
      itemName: item.title,
      description:
        "Berita beserta gambar unggahannya akan dihapus permanen dan tidak lagi tampil kepada warga.",
      onConfirm: async () => {
        const response = await fetch(`${API}/admin/news/${item.id}`, {
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
        setItems((current) => current.filter((entry) => entry.id !== item.id));
        if (editingId === item.id) reset();
        setNotice(body.message);
      },
    });
  }

  async function toggle(item) {
    const response = await fetch(`${API}/admin/news/${item.id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...item, is_published: !item.is_published }),
    });
    const body = await response.json();
    if (!response.ok) return setNotice(body.message);
    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? body.data : entry)),
    );
    setNotice(
      item.is_published
        ? "Berita disembunyikan dari warga"
        : "Berita ditampilkan kepada warga",
    );
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
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-sage-200 bg-white px-5 py-4 text-sm font-semibold text-forest-900 shadow-xl"
        >
          {notice}
        </div>
      )}
      <div className="mx-auto max-w-7xl px-5 py-10">
        <div className="grid gap-7 lg:grid-cols-[.9fr_1.1fr]">
          <form
            onSubmit={submit}
            className="h-fit rounded-2xl border border-sage-200 bg-white p-6 md:p-8"
          >
            <fieldset disabled={saving} className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-forest-900 text-white">
                {editingId ? <Edit3 size={20} /> : <Plus size={20} />}
              </span>
              <div>
                <h1 className="font-serif text-2xl text-forest-950">
                  {editingId ? "Edit berita" : "Tambah berita"}
                </h1>
                <p className="text-sm text-stone-500">
                  Kabar dan informasi untuk warga.
                </p>
              </div>
            </div>
            <div className="mt-7 space-y-5">
              <label className="block">
                <span className="text-sm font-semibold">Judul *</span>
                <input
                  required
                  value={form.title}
                  onChange={(e) => change("title", e.target.value)}
                  className="mt-2 w-full rounded-xl border px-3 py-3"
                />
              </label>
              <div className="grid gap-5 sm:grid-cols-2">
                <label>
                  <span className="text-sm font-semibold">Kategori</span>
                  <input
                    value={form.category}
                    onChange={(e) => change("category", e.target.value)}
                    className="mt-2 w-full rounded-xl border px-3 py-3"
                  />
                </label>
                <label>
                  <span className="text-sm font-semibold">Tanggal terbit</span>
                  <input
                    type="datetime-local"
                    value={form.published_at}
                    onChange={(e) => change("published_at", e.target.value)}
                    className="mt-2 w-full rounded-xl border px-3 py-3"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-semibold">Ringkasan</span>
                <textarea
                  rows="3"
                  value={form.summary}
                  onChange={(e) => change("summary", e.target.value)}
                  className="mt-2 w-full rounded-xl border p-3"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Isi berita</span>
                <textarea
                  rows="9"
                  value={form.content}
                  onChange={(e) => change("content", e.target.value)}
                  className="mt-2 w-full rounded-xl border p-3"
                />
              </label>
              <NewsImagePicker value={images} onChange={setImages} resolveUrl={mediaUrl} disabled={saving} onError={setNotice} />
              <label className="flex items-center gap-3 rounded-xl bg-sage-50 p-4 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => change("is_published", e.target.checked)}
                />
                Tampilkan kepada warga
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-forest-900 px-5 py-3 text-sm font-bold text-white"
              >
                <Save size={17} />
                {saving ? "Menyimpan..." : "Simpan Berita"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border px-5 py-3 text-sm font-bold"
                >
                  Batal
                </button>
              )}
            </div>
            </fieldset>
          </form>
          <section>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-earth-500">
              Daftar Konten
            </p>
            <h2 className="mt-3 font-serif text-4xl text-forest-950">
              Kabar & informasi
            </h2>
            <div className="mt-7 space-y-4">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-sage-200 bg-white p-5"
                >
                  {item.image_url && (
                    <img
                      src={mediaUrl(item.image_url)}
                      alt=""
                      className="mb-4 h-36 w-full rounded-xl object-cover"
                    />
                  )}
                  {item.image_urls?.length > 0 && <p className="mb-3 text-xs text-stone-500">{item.image_urls.length} foto dalam galeri</p>}
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wide text-earth-500">
                        {item.category || "Informasi"}
                      </span>
                      <h3 className="mt-2 font-bold text-forest-950">
                        {item.title}
                      </h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-500">
                        {item.summary || item.content || "Tanpa ringkasan"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${item.is_published ? "bg-sage-100 text-forest-900" : "bg-stone-100 text-stone-500"}`}
                    >
                      {item.is_published ? "Tampil" : "Draf"}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                    <button
                      disabled={saving}
                      onClick={() => edit(item)}
                      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"
                    >
                      <Edit3 size={14} />
                      Edit
                    </button>
                    <button
                      disabled={saving}
                      onClick={() => toggle(item).catch((error) => setNotice(error.message || "Status berita belum dapat diperbarui"))}
                      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"
                    >
                      {item.is_published ? (
                        <EyeOff size={14} />
                      ) : (
                        <Eye size={14} />
                      )}{" "}
                      {item.is_published ? "Sembunyikan" : "Tampilkan"}
                    </button>
                    {item.is_published && (
                      <Link
                        target="_blank"
                        to={`/berita/${item.id}`}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"
                      >
                        <Eye size={14} />
                        Lihat
                      </Link>
                    )}
                    <button
                      disabled={saving}
                      onClick={() => remove(item)}
                      className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700"
                    >
                      <Trash2 size={14} />
                      Hapus
                    </button>
                  </div>
                </article>
              ))}
              {!items.length && (
                <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-stone-500">
                  <Newspaper className="mx-auto mb-4" />
                  Belum ada berita.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
