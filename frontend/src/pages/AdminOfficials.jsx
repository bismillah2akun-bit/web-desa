import { useEffect, useMemo, useState } from "react";
import { Edit3, ImagePlus, Plus, Save, Settings2, Trash2, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useConfirm } from "@/components/confirmContext";
import { DEFAULT_CATEGORY, categoryConfig } from "@/lib/officialCategories";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const emptyForm = {
  category: DEFAULT_CATEGORY,
  position: "",
  name: "",
  description: "",
  photo_url: "",
  remove_photo: false,
  sort_order: 0,
  is_active: true,
};
const emptyCategoryForm = { name: "", title: "", description: "" };
const mediaUrl = (value) => value?.startsWith("/uploads/")
  ? `${new URL(API, window.location.origin).origin}${value}`
  : value;

export default function AdminOfficials() {
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(DEFAULT_CATEGORY);
  const [categoryForm, setCategoryForm] = useState(null);
  const [categoryEditingId, setCategoryEditingId] = useState(null);
  const [categorySaving, setCategorySaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoRevision, setPhotoRevision] = useState(0);
  const navigate = useNavigate();
  const photoPreview = useMemo(() => photoFile ? URL.createObjectURL(photoFile) : mediaUrl(form.photo_url), [photoFile, form.photo_url]);

  useEffect(() => () => { if (photoFile && photoPreview) URL.revokeObjectURL(photoPreview); }, [photoFile, photoPreview]);

  useEffect(() => {
    fetch(`${API}/admin/officials`, { credentials: "include" })
      .then(async (response) => {
        if (response.status === 401)
          return navigate("/admin/login", { replace: true });
        if (!response.ok)
          throw new Error("Data belum dapat dimuat");
        setItems((await response.json()).data);
      })
      .catch((error) => setNotice(error.message));
  }, [navigate]);

  useEffect(() => {
    fetch(`${API}/official-categories`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((body) => setCategories(body.data || []))
      .catch(() => setNotice("Daftar lembaga belum dapat dimuat"));
  }, []);

  function change(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function reset(category = activeCategory) {
    setEditingId(null);
    setForm({ ...emptyForm, category });
    setPhotoFile(null);
    setPhotoRevision((value) => value + 1);
  }

  function edit(item) {
    setEditingId(item.id);
    setActiveCategory(item.category || DEFAULT_CATEGORY);
    setForm({
      category: item.category || DEFAULT_CATEGORY,
      position: item.position || "",
      name: item.name || "",
      description: item.description || "",
      photo_url: item.photo_url || "",
      remove_photo: false,
      sort_order: item.sort_order ?? 0,
      is_active: Boolean(item.is_active),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setNotice("");
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.set(key, String(value)));
      if (photoFile) payload.set("photo", photoFile);
      const response = await fetch(
        `${API}/admin/officials${editingId ? `/${editingId}` : ""}`,
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
      setItems((current) => {
        const next = editingId
          ? current.map((item) => (item.id === editingId ? body.data : item))
          : [...current, body.data];
        return next.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
      });
      setNotice(body.message);
      setActiveCategory(form.category);
      reset(form.category);
    } catch (error) {
      setNotice(error.message || "Data belum dapat disimpan");
    } finally {
      setSaving(false);
    }
  }

  async function remove(item) {
    const itemConfig = categoryConfig(categories, item.category);
    confirm({
      title: `Hapus ${itemConfig.singular}?`,
      itemName: `${item.position}${item.name ? ` — ${item.name}` : ""}`,
      description:
        "Data akan dihapus permanen dan tidak lagi tampil pada halaman pemerintahan.",
      onConfirm: async () => {
        const response = await fetch(`${API}/admin/officials/${item.id}`, {
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

  function selectTab(value) {
    setActiveCategory(value);
    setCategoryForm(null);
    if (!editingId) change("category", value);
  }

  function openAddCategory() {
    setCategoryEditingId(null);
    setCategoryForm(emptyCategoryForm);
  }

  function openEditCategory() {
    const current = categories.find((item) => item.slug === activeCategory);
    if (!current) return;
    setCategoryEditingId(current.id);
    setCategoryForm({
      name: current.name || "",
      title: current.title || "",
      description: current.description || "",
    });
  }

  async function submitCategory(event) {
    event.preventDefault();
    setCategorySaving(true);
    setNotice("");
    try {
      const response = await fetch(
        `${API}/admin/official-categories${categoryEditingId ? `/${categoryEditingId}` : ""}`,
        {
          method: categoryEditingId ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(categoryForm),
        },
      );
      const body = await response.json();
      if (response.status === 401)
        return navigate("/admin/login", { replace: true });
      if (!response.ok) throw new Error(body.message);
      setCategories((current) =>
        categoryEditingId
          ? current.map((item) => (item.id === categoryEditingId ? body.data : item))
          : [...current, body.data],
      );
      setActiveCategory(body.data.slug);
      if (!editingId) change("category", body.data.slug);
      setCategoryForm(null);
      setCategoryEditingId(null);
      setNotice(body.message);
    } catch (error) {
      setNotice(error.message || "Lembaga belum dapat disimpan");
    } finally {
      setCategorySaving(false);
    }
  }

  function removeCategory() {
    const current = categories.find((item) => item.slug === activeCategory);
    if (!current) return;
    confirm({
      title: "Hapus lembaga?",
      itemName: current.name,
      description:
        "Lembaga akan dihapus dari daftar. Lembaga yang masih memiliki data tidak bisa dihapus, jadi pindahkan atau hapus dulu datanya.",
      onConfirm: async () => {
        const response = await fetch(`${API}/admin/official-categories/${current.id}`, {
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
        setCategories((list) => list.filter((item) => item.id !== current.id));
        setActiveCategory(DEFAULT_CATEGORY);
        if (!editingId) change("category", DEFAULT_CATEGORY);
        setCategoryForm(null);
        setNotice(body.message);
      },
    });
  }

  const config = categoryConfig(categories, activeCategory);
  const formConfig = categoryConfig(categories, form.category);
  const inCategory = (item, value) => (item.category || DEFAULT_CATEGORY) === value;
  const visibleItems = items.filter((item) => inCategory(item, activeCategory));

  return (
    <main className="min-h-screen bg-sage-50">
      {notice && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border border-sage-200 bg-white px-5 py-4 text-sm font-semibold text-forest-900 shadow-xl">
          {notice}
        </div>
      )}
      <div className="mx-auto max-w-7xl px-5 py-10">
        <div className="grid gap-7 lg:grid-cols-[.8fr_1.2fr]">
          <form
            onSubmit={submit}
            className="h-fit rounded-2xl border border-sage-200 bg-white p-6 md:p-8"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-forest-900 text-white">
                {editingId ? <Edit3 size={20} /> : <Plus size={20} />}
              </span>
              <div>
                <h1 className="font-serif text-2xl text-forest-950">
                  {editingId ? `Edit ${formConfig.singular}` : `Tambah ${formConfig.singular}`}
                </h1>
                <p className="text-sm text-stone-500">
                  Isi nama dan jabatan yang tampil kepada warga.
                </p>
              </div>
            </div>
            <div className="mt-7 space-y-5">
              <label className="block">
                <span className="text-sm font-semibold">Kategori</span>
                <select
                  value={form.category}
                  onChange={(e) => change("category", e.target.value)}
                  className="mt-2 w-full rounded-xl border bg-white px-3 py-3"
                >
                  {categories.map((option) => (
                    <option key={option.slug} value={option.slug}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Jabatan *</span>
                <input
                  required
                  value={form.position}
                  onChange={(e) => change("position", e.target.value)}
                  placeholder={formConfig.positionHint}
                  className="mt-2 w-full rounded-xl border px-3 py-3"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Nama lengkap</span>
                <input
                  value={form.name}
                  onChange={(e) => change("name", e.target.value)}
                  placeholder="Kosongkan jika belum tersedia"
                  className="mt-2 w-full rounded-xl border px-3 py-3"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold">Keterangan</span>
                <textarea
                  rows="4"
                  value={form.description}
                  onChange={(e) => change("description", e.target.value)}
                  placeholder={formConfig.descriptionHint}
                  className="mt-2 w-full rounded-xl border p-3"
                />
              </label>
              <div className="rounded-2xl border border-sage-200 bg-sage-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-forest-900"><ImagePlus size={18} /></span>
                  <div><p className="text-sm font-bold text-forest-950">Foto</p><p className="text-xs text-stone-500">JPG, PNG, atau WEBP · maksimal 5 MB</p></div>
                </div>
                {photoPreview && <div className="mt-4 overflow-hidden rounded-xl bg-stone-200"><img src={photoPreview} alt="Pratinjau foto" className="h-56 w-full object-cover object-top" /></div>}
                <input key={photoRevision} type="file" accept="image/jpeg,image/png,image/webp" className="mt-4 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-semibold file:text-forest-900" onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  if (file && file.size > 5 * 1024 * 1024) {
                    setNotice("Ukuran foto maksimal 5 MB");
                    event.target.value = "";
                    return;
                  }
                  setPhotoFile(file);
                  if (file) change("remove_photo", false);
                }} />
                {photoPreview && <button type="button" className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-red-700" onClick={() => {
                  setPhotoFile(null);
                  setPhotoRevision((value) => value + 1);
                  setForm((current) => ({ ...current, photo_url: "", remove_photo: true }));
                }}><X size={14} /> Hapus foto</button>}
              </div>
              <label className="block">
                <span className="text-sm font-semibold">Urutan tampil</span>
                <input
                  type="number"
                  min="0"
                  value={form.sort_order}
                  onChange={(e) => change("sort_order", Number(e.target.value))}
                  className="mt-2 w-full rounded-xl border px-3 py-3"
                />
              </label>
              <label className="flex items-center gap-3 rounded-xl bg-sage-50 p-4 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => change("is_active", e.target.checked)}
                />
                Tampilkan pada halaman pemerintahan
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-forest-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                <Save size={17} /> {saving ? "Menyimpan..." : "Simpan"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => reset()}
                  className="rounded-xl border px-5 py-3 text-sm font-bold"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
          <section>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-earth-500">
              {config.eyebrow}
            </p>
            <h2 className="mt-3 font-serif text-4xl text-forest-950">
              {config.title}
            </h2>
            <div
              className="mt-5 flex flex-wrap gap-2"
              role="tablist"
              aria-label="Kategori struktur desa"
            >
              {categories.map((option) => {
                const selected = option.slug === activeCategory;
                const count = items.filter((item) => inCategory(item, option.slug)).length;
                return (
                  <button
                    key={option.slug}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => selectTab(option.slug)}
                    className={`rounded-full border px-4 py-2 text-sm font-bold transition ${selected ? "border-forest-900 bg-forest-900 text-white" : "border-sage-200 bg-white text-forest-900 hover:bg-sage-100"}`}
                  >
                    {option.name}
                    <span className={`ml-1.5 text-xs ${selected ? "text-white/80" : "text-stone-400"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <button
                type="button"
                onClick={openAddCategory}
                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-forest-900 px-4 py-2 font-bold text-forest-900 hover:bg-sage-100"
              >
                <Plus size={15} /> Tambah lembaga
              </button>
              <button
                type="button"
                onClick={openEditCategory}
                className="inline-flex items-center gap-1.5 font-semibold text-stone-600 hover:text-forest-900"
              >
                <Settings2 size={15} /> Ubah lembaga ini
              </button>
              {activeCategory !== DEFAULT_CATEGORY && (
                <button
                  type="button"
                  onClick={removeCategory}
                  className="inline-flex items-center gap-1.5 font-semibold text-red-700 hover:underline"
                >
                  <Trash2 size={15} /> Hapus lembaga ini
                </button>
              )}
            </div>
            {categoryForm && (
              <form
                onSubmit={submitCategory}
                className="mt-4 rounded-2xl border border-sage-200 bg-white p-5"
              >
                <h3 className="font-serif text-xl text-forest-950">
                  {categoryEditingId ? "Ubah lembaga" : "Tambah lembaga baru"}
                </h3>
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="text-sm font-semibold">Nama lembaga *</span>
                    <input
                      required
                      maxLength={80}
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm((current) => ({ ...current, name: e.target.value }))}
                      placeholder="Contoh: Posyandu, Kelompok Tani, Karang Werda"
                      className="mt-2 w-full rounded-xl border bg-white px-3 py-3"
                    />
                    <span className="mt-1 block text-xs text-stone-500">
                      Nama ini tampil sebagai tab di halaman admin.
                    </span>
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold">Judul di halaman website</span>
                    <input
                      maxLength={150}
                      value={categoryForm.title}
                      onChange={(e) => setCategoryForm((current) => ({ ...current, title: e.target.value }))}
                      placeholder="Kosongkan untuk memakai nama lembaga"
                      className="mt-2 w-full rounded-xl border bg-white px-3 py-3"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold">Keterangan singkat di website</span>
                    <textarea
                      rows={2}
                      maxLength={1000}
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm((current) => ({ ...current, description: e.target.value }))}
                      placeholder="Contoh: Pengurus Posyandu Desa Tanjungjaya."
                      className="mt-2 w-full rounded-xl border bg-white px-3 py-3"
                    />
                  </label>
                </div>
                <div className="mt-5 flex gap-3">
                  <button
                    disabled={categorySaving}
                    className="flex items-center gap-2 rounded-xl bg-forest-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                  >
                    <Save size={17} /> {categorySaving ? "Menyimpan..." : "Simpan lembaga"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryForm(null)}
                    className="rounded-xl border px-5 py-3 text-sm font-bold"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}
            <div className="mt-7 space-y-3">
              {!visibleItems.length && (
                <p className="rounded-2xl border border-dashed border-sage-200 bg-white p-8 text-center text-sm text-stone-500">
                  Belum ada data untuk lembaga ini. Tambahkan lewat formulir di sebelah kiri.
                </p>
              )}
              {visibleItems.map((item) => (
                <article
                  key={item.id}
                  className="flex flex-col gap-4 rounded-2xl border border-sage-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-4">
                    {item.photo_url ? <img src={mediaUrl(item.photo_url)} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover object-top" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sage-100 text-forest-900"><Users size={18} /></span>}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-earth-500">
                        {item.position}
                      </p>
                      <h3 className="mt-1 font-bold text-forest-950">
                        {item.name || "Nama belum tersedia"}
                      </h3>
                      {item.description && (
                        <p className="mt-1 text-sm text-stone-500">
                          {item.description}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-stone-400">
                        Urutan {item.sort_order} ·{" "}
                        {item.is_active ? "Ditampilkan" : "Disembunyikan"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => edit(item)}
                      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700"
                    >
                      <Trash2 size={14} /> Hapus
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
