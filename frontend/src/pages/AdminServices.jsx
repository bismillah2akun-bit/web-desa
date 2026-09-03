import { useEffect, useState } from "react";
import { ArrowLeft, Edit3, FileText, Plus, Save, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "@/components/VillageBrand";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const emptyRequirement = () => ({
  label: "",
  field_type: "text",
  instructions: "",
  is_required: true,
  accepted_formats: "pdf,jpg,jpeg,png",
  max_file_size_mb: 5,
  options_text: "",
});

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [requirements, setRequirements] = useState([emptyRequirement()]);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [serviceActive, setServiceActive] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/admin/services`, { credentials: "include" })
      .then(async (response) => {
        if (response.status === 401)
          return navigate("/admin/login", { replace: true });
        if (!response.ok) throw new Error("Daftar layanan belum dapat dimuat");
        setServices((await response.json()).data);
      })
      .catch((error) => setNotice(error.message));
  }, [navigate]);

  function updateRequirement(index, key, value) {
    setRequirements((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  }

  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setNotice("");
    const form = Object.fromEntries(new FormData(formElement));
    const payload = {
      ...form,
      is_active: serviceActive,
      requirements: requirements.map(
        ({ options_text: optionsText, ...requirement }) => ({
          ...requirement,
          options: optionsText
            .split(",")
            .map((option) => option.trim())
            .filter(Boolean),
        }),
      ),
    };

    try {
      const response = await fetch(
        `${API}/admin/services${editingId ? `/${editingId}` : ""}`,
        {
          method: editingId ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = await response.json();
      if (response.status === 401)
        return navigate("/admin/login", { replace: true });
      if (!response.ok) throw new Error(body.message);

      setServices((current) => {
        const next = editingId
          ? current.map((service) =>
              service.id === editingId ? body.data : service,
            )
          : [...current, body.data];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      setEditingId(null);
      setServiceActive(true);
      setRequirements([emptyRequirement()]);
      formElement.reset();
      setNotice(body.message);
    } catch (error) {
      setNotice(error.message || "Layanan belum dapat disimpan");
    } finally {
      setSaving(false);
    }
  }

  function edit(service) {
    setEditingId(service.id);
    setServiceActive(Boolean(service.is_active));
    setRequirements(
      service.requirements.map((requirement) => ({
        label: requirement.label,
        field_type: requirement.field_type,
        instructions: requirement.instructions || "",
        is_required: Boolean(requirement.is_required),
        accepted_formats: requirement.accepted_formats || "pdf,jpg,jpeg,png",
        max_file_size_mb: requirement.max_file_size_mb || 5,
        options_text: (requirement.options || []).join(", "),
      })),
    );
    setTimeout(() => document.querySelector('[name="name"]')?.focus(), 0);
  }

  async function remove(service) {
    if (
      !window.confirm(
        `Hapus layanan “${service.name}” beserta seluruh persyaratannya?`,
      )
    )
      return;
    const response = await fetch(`${API}/admin/services/${service.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const body = await response.json();
    if (!response.ok) return setNotice(body.message);
    setServices((current) => current.filter((item) => item.id !== service.id));
    if (editingId === service.id) setEditingId(null);
    setNotice(body.message);
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
            <ArrowLeft size={16} /> Dashboard
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

      <div className="mx-auto grid max-w-7xl gap-7 px-5 py-10 lg:grid-cols-[.8fr_1.2fr]">
        <section>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-earth-500">
            Layanan Desa
          </p>
          <h1 className="mt-3 font-serif text-4xl text-forest-950">
            Daftar layanan
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Layanan aktif nantinya dapat dipilih warga pada formulir pengajuan.
          </p>
          <div className="mt-7 space-y-4">
            {services.length ? (
              services.map((service) => (
                <article
                  key={service.id}
                  className="rounded-2xl border border-sage-200 bg-white p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-bold text-forest-950">
                        {service.name}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-stone-500">
                        {service.description || "Tanpa deskripsi"}
                      </p>
                    </div>
                    <span className="rounded-lg bg-sage-100 px-2.5 py-1 text-xs font-semibold text-forest-900">
                      {service.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <p className="mt-4 border-t border-stone-100 pt-4 text-xs text-stone-500">
                    {service.requirements.length} persyaratan · Estimasi{" "}
                    {service.estimated_days ?? "—"} hari
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => edit(service)}
                      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"
                    >
                      <Edit3 size={14} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(service)}
                      className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700"
                    >
                      <Trash2 size={14} />
                      Hapus
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-sage-200 p-8 text-center text-sm text-stone-500">
                Belum ada layanan.
              </div>
            )}
          </div>
        </section>

        <form
          onSubmit={submit}
          className="h-fit rounded-2xl border border-sage-200 bg-white p-6 md:p-8"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-forest-900 text-white">
              <FileText size={20} />
            </span>
            <div>
              <h2 className="font-serif text-2xl text-forest-950">
                {editingId ? "Edit layanan" : "Tambah layanan"}
              </h2>
              <p className="text-sm text-stone-500">
                Susun persyaratan sesuai kebutuhan desa.
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-5 md:grid-cols-2">
            <label>
              <span className="text-sm font-semibold">Nama layanan *</span>
              <input
                key={`name-${editingId}`}
                name="name"
                required
                defaultValue={
                  editingId
                    ? services.find((item) => item.id === editingId)?.name
                    : ""
                }
                className="mt-2 w-full rounded-xl border px-3 py-3 outline-none focus:border-forest-900"
              />
            </label>
            <label>
              <span className="text-sm font-semibold">Estimasi hari</span>
              <input
                key={`days-${editingId}`}
                name="estimated_days"
                type="number"
                min="0"
                max="365"
                defaultValue={
                  editingId
                    ? (services.find((item) => item.id === editingId)
                        ?.estimated_days ?? "")
                    : ""
                }
                className="mt-2 w-full rounded-xl border px-3 py-3 outline-none focus:border-forest-900"
              />
            </label>
            <label className="md:col-span-2">
              <span className="text-sm font-semibold">Deskripsi</span>
              <textarea
                key={`description-${editingId}`}
                name="description"
                rows="3"
                defaultValue={
                  editingId
                    ? services.find((item) => item.id === editingId)
                        ?.description || ""
                    : ""
                }
                className="mt-2 w-full rounded-xl border p-3 outline-none focus:border-forest-900"
              />
            </label>
            <label className="flex items-center gap-3 rounded-xl bg-sage-50 p-4 text-sm font-semibold md:col-span-2">
              <input
                type="checkbox"
                checked={serviceActive}
                onChange={(event) => setServiceActive(event.target.checked)}
              />
              Tampilkan layanan kepada warga
            </label>
          </div>

          <div className="mt-8 border-t pt-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-forest-950">Persyaratan</h3>
                <p className="mt-1 text-xs text-stone-500">
                  Minimal satu persyaratan.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setRequirements((current) => [...current, emptyRequirement()])
                }
                className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold"
              >
                <Plus size={15} />
                Tambah
              </button>
            </div>
            <div className="mt-5 space-y-4">
              {requirements.map((requirement, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-sage-200 bg-sage-50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <b className="text-sm">Persyaratan {index + 1}</b>
                    {requirements.length > 1 && (
                      <button
                        type="button"
                        aria-label="Hapus persyaratan"
                        onClick={() =>
                          setRequirements((current) =>
                            current.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                        className="text-red-600"
                      >
                        <Trash2 size={17} />
                      </button>
                    )}
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label>
                      <span className="text-xs font-semibold">
                        Nama persyaratan *
                      </span>
                      <input
                        value={requirement.label}
                        onChange={(event) =>
                          updateRequirement(index, "label", event.target.value)
                        }
                        required
                        className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5"
                        placeholder="Contoh: Upload KTP"
                      />
                    </label>
                    <label>
                      <span className="text-xs font-semibold">Jenis isian</span>
                      <select
                        value={requirement.field_type}
                        onChange={(event) =>
                          updateRequirement(
                            index,
                            "field_type",
                            event.target.value,
                          )
                        }
                        className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5"
                      >
                        <option value="text">Teks singkat</option>
                        <option value="textarea">Teks panjang</option>
                        <option value="number">Angka</option>
                        <option value="date">Tanggal</option>
                        <option value="select">Pilihan</option>
                        <option value="file">Upload dokumen</option>
                      </select>
                    </label>
                    <label className="md:col-span-2">
                      <span className="text-xs font-semibold">Petunjuk</span>
                      <input
                        value={requirement.instructions}
                        onChange={(event) =>
                          updateRequirement(
                            index,
                            "instructions",
                            event.target.value,
                          )
                        }
                        className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5"
                        placeholder="Keterangan untuk warga"
                      />
                    </label>
                    {requirement.field_type === "select" && (
                      <label className="md:col-span-2">
                        <span className="text-xs font-semibold">
                          Pilihan (pisahkan dengan koma)
                        </span>
                        <input
                          value={requirement.options_text}
                          onChange={(event) =>
                            updateRequirement(
                              index,
                              "options_text",
                              event.target.value,
                            )
                          }
                          className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5"
                          placeholder="Pilihan A, Pilihan B"
                        />
                      </label>
                    )}
                    {requirement.field_type === "file" && (
                      <>
                        <label>
                          <span className="text-xs font-semibold">
                            Format file
                          </span>
                          <input
                            value={requirement.accepted_formats}
                            onChange={(event) =>
                              updateRequirement(
                                index,
                                "accepted_formats",
                                event.target.value,
                              )
                            }
                            className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5"
                          />
                        </label>
                        <label>
                          <span className="text-xs font-semibold">
                            Maksimal ukuran (MB)
                          </span>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={requirement.max_file_size_mb}
                            onChange={(event) =>
                              updateRequirement(
                                index,
                                "max_file_size_mb",
                                event.target.value,
                              )
                            }
                            className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5"
                          />
                        </label>
                      </>
                    )}
                    <label className="flex items-center gap-2 text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={requirement.is_required}
                        onChange={(event) =>
                          updateRequirement(
                            index,
                            "is_required",
                            event.target.checked,
                          )
                        }
                      />{" "}
                      Wajib dipenuhi
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-forest-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              <Save size={17} />
              {saving
                ? "Menyimpan..."
                : editingId
                  ? "Simpan Perubahan"
                  : "Simpan Layanan"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setServiceActive(true);
                  setRequirements([emptyRequirement()]);
                }}
                className="rounded-xl border px-5 py-3 text-sm font-bold"
              >
                Batal edit
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
