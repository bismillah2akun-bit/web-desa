import { useEffect, useState } from "react";
import { ArrowLeft, Download, Edit3, FileText, Plus, Save, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Brand from "@/components/VillageBrand";
import { useConfirm } from "@/components/confirmContext";
import AdminLetterEditor from "@/components/AdminLetterEditor";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const emptyRequirement = () => ({
  key: crypto.randomUUID(),
  label: "",
  field_type: "text",
  instructions: "",
  is_required: true,
  accepted_formats: "pdf,jpg,jpeg,png",
  max_file_size_mb: 5,
  options_text: "",
  template_file: null,
  is_letter: false,
});

export default function AdminServices() {
  const confirm = useConfirm();
  const [services, setServices] = useState([]);
  const [requirements, setRequirements] = useState([emptyRequirement()]);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [serviceActive, setServiceActive] = useState(true);
  const [catalog, setCatalog] = useState(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [letterEditor, setLetterEditor] = useState(null);
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
        itemIndex === index ? {
          ...item, [key]: value,
          ...(key === "field_type" && value !== "file" ? { is_letter: false, template_file: null, remove_template: true } : {}),
        } : item,
      ),
    );
  }

  async function openCatalog() {
    setShowCatalog((value) => !value);
    if (catalog) return;
    try {
      const response = await fetch(`${API}/admin/letter-catalog`, { credentials: "include" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setCatalog(result.data);
    } catch (error) { setNotice(error.message || "Katalog surat belum tersedia"); setShowCatalog(false); }
  }

  function useEditedTemplate(file) {
    setRequirements((current) => {
      if (letterEditor.key) return current.map((item) => item.key === letterEditor.key ? {
        ...item, template_file: file, remove_template: false, is_letter: true,
        template_revision: (item.template_revision || 0) + 1,
      } : item);
      const requirement = { ...emptyRequirement(), label: letterEditor.label, field_type: "file", is_letter: true,
        accepted_formats: "docx", template_file: file,
        instructions: "Buka editor surat, lengkapi isian, lalu pilih Gunakan surat ini.",
      };
      const untouched = current.length === 1 && !current[0].id && !current[0].label && !current[0].instructions && current[0].field_type === "text";
      return untouched ? [requirement] : [...current, requirement];
    });
    setLetterEditor(null);
    setShowCatalog(false);
    setNotice("Template siap digunakan. Tekan Simpan Layanan untuk menerapkan perubahan.");
  }

  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setNotice("");
    const payload = new FormData(formElement);
    payload.set("is_active", String(serviceActive));
    payload.set("requirements", JSON.stringify(requirements.map((requirement, index) => {
      if (requirement.template_file && requirement.field_type === "file") {
        payload.append(`template_${index}`, requirement.template_file);
      }
      return {
        id: requirement.id, label: requirement.label, field_type: requirement.field_type,
        instructions: requirement.instructions, is_required: requirement.is_required,
        accepted_formats: requirement.accepted_formats, max_file_size_mb: requirement.max_file_size_mb,
        is_letter: requirement.is_letter, remove_template: Boolean(requirement.remove_template),
        options: requirement.options_text.split(",").map((option) => option.trim()).filter(Boolean),
      };
    })));

    try {
      const response = await fetch(
        `${API}/admin/services${editingId ? `/${editingId}` : ""}`,
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
        key: crypto.randomUUID(),
        id: requirement.id,
        has_template: requirement.has_template,
        template_original_name: requirement.template_original_name,
        template_file: null,
        is_letter: Boolean(requirement.has_template),
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
    confirm({
      title: "Hapus layanan ini?",
      itemName: service.name,
      description:
        "Layanan akan dihapus dari daftar pilihan warga. Jika sudah memiliki pengajuan, layanan diarsipkan agar riwayat dan dokumen warga tetap dapat diproses.",
      onConfirm: async () => {
        const response = await fetch(`${API}/admin/services/${service.id}`, {
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
        setServices((current) =>
          current.filter((item) => item.id !== service.id),
        );
        if (editingId === service.id) {
          setEditingId(null);
          setRequirements([emptyRequirement()]);
          setServiceActive(true);
        }
        setNotice(body.message);
      },
    });
  }

  return (
    <main className="min-h-screen bg-sage-50">
      {letterEditor && <AdminLetterEditor source={letterEditor} onClose={() => setLetterEditor(null)} onSave={useEditedTemplate} />}
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
                  {service.is_builtin && <p className="mt-4 rounded-lg bg-sage-50 px-3 py-2 text-xs font-semibold text-forest-900">Layanan bawaan · Template dapat disesuaikan</p>}
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => edit(service)}
                      disabled={saving}
                      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"
                    >
                      <Edit3 size={14} />
                      Edit
                    </button>
                    {!service.is_builtin && <button
                      type="button"
                      onClick={() => remove(service)}
                      disabled={saving}
                      className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700"
                    >
                      <Trash2 size={14} />
                      Hapus
                    </button>}
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
          <fieldset disabled={saving} className="min-w-0">
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
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-forest-950">Persyaratan</h3>
                <p className="mt-1 text-xs text-stone-500">
                  Isian warga dan dokumen yang perlu dilampirkan.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
              <button type="button" onClick={openCatalog} aria-expanded={showCatalog}
                className="flex items-center gap-2 rounded-xl border border-forest-900 px-3 py-2 text-xs font-bold text-forest-900">
                <FileText size={15} /> Pilih surat dari assets
              </button>
              <button
                type="button"
                onClick={() =>
                  setRequirements((current) => [...current, emptyRequirement()])
                }
                className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold"
              >
                <Plus size={15} />
                Tambah isian
              </button>
              <button type="button" onClick={() => setRequirements((current) => {
                const letter = {
                  ...emptyRequirement(), field_type: "file", is_letter: true, accepted_formats: "docx",
                  instructions: "Buka editor surat, lengkapi isian, lalu pilih Gunakan surat ini. Surat otomatis dilampirkan saat pengajuan dikirim.",
                };
                const untouched = current.length === 1 && !current[0].id && !current[0].label && !current[0].instructions && current[0].field_type === "text";
                return untouched ? [letter] : [...current, letter];
              })} className="flex items-center gap-2 rounded-xl bg-forest-900 px-3 py-2 text-xs font-bold text-white">
                <FileText size={15} /> Tambah surat
              </button>
              </div>
            </div>
            {showCatalog && <section className="mt-5 rounded-xl border border-sage-200 bg-sage-50 p-4" aria-label="Katalog surat">
              <h4 className="font-bold text-forest-950">Tambahkan surat ke layanan</h4>
              <p className="mt-2 text-sm leading-6 text-stone-600">Pilih surat yang sudah disiapkan, lalu edit salinannya. Bersihkan data warga sebelum memakai template pada layanan publik.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {catalog === null ? <p role="status">Memuat surat…</p> : catalog.length ? catalog.map((item) => (
                  <button key={item.id} type="button" className="rounded-xl border bg-white p-4 text-left hover:border-forest-900"
                    onClick={() => setLetterEditor({ catalog_id: item.id, label: item.label })}>
                    <FileText size={20} className="mb-3 text-forest-900" /><b className="block text-sm">{item.label}</b>
                    <span className="mt-1 block text-xs text-stone-500">{item.filename}</span>
                    <span className="mt-3 block text-xs font-bold text-forest-900">Edit dan tambahkan →</span>
                  </button>
                )) : <p>Belum ada surat dalam katalog.</p>}
              </div>
            </section>}
            <div className="mt-5 space-y-4">
              {requirements.map((requirement, index) => (
                <div
                  key={requirement.key}
                  className="rounded-xl border border-sage-200 bg-sage-50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <b className="text-sm">{requirement.is_letter ? "Surat" : "Persyaratan"} {index + 1}</b>
                    {requirements.length > 1 && (
                      <button
                        type="button"
                        aria-label="Hapus persyaratan"
                        onClick={() =>
                          confirm({
                            title: "Hapus persyaratan ini?",
                            itemName:
                              requirement.label || `Persyaratan ${index + 1}`,
                            description:
                              "Persyaratan akan dihapus dari formulir ini. Perubahan diterapkan setelah layanan disimpan.",
                            onConfirm: () =>
                              setRequirements((current) =>
                                current.filter(
                                  (_, itemIndex) => itemIndex !== index,
                                ),
                              ),
                          })
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
                        placeholder={requirement.is_letter ? "Contoh: Surat rekomendasi" : "Contoh: Upload KTP"}
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
                        <div className="rounded-xl border border-sage-200 bg-white p-4 md:col-span-2">
                          <label className="block">
                            <span className="text-sm font-bold text-forest-950">Template surat {requirement.is_letter ? "*" : "(opsional)"}</span>
                            <span className="mt-1 block text-xs leading-5 text-stone-500">DOCX, maksimal 10 MB. Warga mengisi surat langsung di editor web. Gunakan satu surat kosong per template, tanpa data pribadi atau tanda tangan.</span>
                            <input key={requirement.template_revision || 0} type="file" accept=".docx"
                              required={requirement.is_letter && !(requirement.has_template && !requirement.remove_template) && !requirement.template_file}
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (!file) return;
                                if (!/\.docx$/i.test(file.name) || file.size > 10 * 1024 * 1024) {
                                  setNotice("Editor web membutuhkan template DOCX, maksimal 10 MB");
                                  event.target.value = "";
                                  return;
                                }
                                updateRequirement(index, "template_file", file);
                              }} className="mt-3 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-sage-50 file:px-3 file:py-2 file:font-semibold file:text-forest-900" />
                          </label>
                          {requirement.template_file ? <p className="mt-3 break-all text-sm font-medium text-forest-900">Siap disimpan: {requirement.template_file.name}</p> : requirement.has_template && !requirement.remove_template ? (
                            <a href={`${API}/admin/services/${editingId}/templates/${requirement.id}`} className="mt-3 flex items-center gap-2 break-all text-sm font-semibold text-forest-900 underline underline-offset-4"><Download size={16} className="shrink-0" /> {requirement.template_original_name}</a>
                          ) : null}
                          {(requirement.template_file || (requirement.has_template && !requirement.remove_template)) && (
                            <button type="button" className="mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-forest-900"
                              onClick={() => setLetterEditor({ key: requirement.key, label: requirement.label || "Template surat", template_file: requirement.template_file,
                                service_id: editingId, requirement_id: requirement.id })}>
                              <Edit3 size={15} /> Edit isi template
                            </button>
                          )}
                          {(requirement.template_file || (requirement.has_template && !requirement.remove_template)) && (
                            <button type="button" className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-red-700" onClick={() => confirm({
                              title: "Hapus template surat?", itemName: requirement.template_file?.name || requirement.template_original_name,
                              description: "Kolom upload tetap ada. Template dihapus setelah layanan disimpan.",
                              onConfirm: () => setRequirements((current) => current.map((item, i) => i === index ? { ...item, template_file: null, template_revision: (item.template_revision || 0) + 1, remove_template: true, is_letter: false } : item)),
                            })}><Trash2 size={14} /> Hapus template</button>
                          )}
                          {requirement.has_template && !requirement.template_file && !/\.docx$/i.test(requirement.template_original_name || "") && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Template lama masih DOC/PDF. Ganti dengan DOCX agar warga bisa mengedit di web.</p>}
                          <p className="mt-3 text-xs leading-5 text-stone-500">Tombol editor otomatis tampil pada formulir warga. Hasil isian dibuat menjadi DOCX dan dilampirkan langsung ketika pengajuan dikirim.</p>
                        </div>
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
          </fieldset>
        </form>
      </div>
    </main>
  );
}
