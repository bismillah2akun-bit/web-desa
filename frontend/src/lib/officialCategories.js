// Daftar lembaga sekarang diambil dari server (tabel official_categories), bukan tertulis di kode.
// Admin menambah lembaga lewat tombol "Tambah lembaga" di menu Pemerintahan & lembaga desa.
export const DEFAULT_CATEGORY = "pemerintahan";

// Melengkapi data lembaga dengan teks bawaan bila ada yang kosong.
export function categoryConfig(categories, slug) {
  const found = categories.find((item) => item.slug === slug);
  const item = found || categories.find((entry) => entry.slug === DEFAULT_CATEGORY) || {
    slug: DEFAULT_CATEGORY,
    name: "Pemerintahan",
  };
  return {
    ...item,
    title: item.title || item.name,
    eyebrow: item.eyebrow || "Lembaga Desa",
    singular: item.singular || `pengurus ${item.name}`,
    positionHint: item.position_hint || "Contoh: Ketua",
    descriptionHint: "Contoh: Periode kepengurusan atau bidang",
  };
}
