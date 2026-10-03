const DEFAULT_CATEGORY = 'pemerintahan'

// Data awal lembaga. Hanya dipakai SEKALI, saat tabel official_categories masih kosong.
// Setelah itu lembaga ditambah/diubah/dihapus langsung dari halaman admin, bukan dari kode.
const SEED_CATEGORIES = [
  { slug: 'pemerintahan', name: 'Pemerintahan & lembaga desa', title: 'Pemerintahan & lembaga desa', eyebrow: 'Pemerintahan Desa', singular: 'perangkat desa', position_hint: 'Contoh: Kepala Urusan Keuangan', description: 'Struktur perangkat Pemerintah Desa Tanjungjaya.' },
  { slug: 'rtrw', name: 'RT & RW', title: 'Ketua RT & RW', eyebrow: 'Pelayanan Kewilayahan', singular: 'pengurus RT/RW', position_hint: 'Contoh: Ketua RW 01 atau Ketua RT 02', description: 'Perangkat lingkungan Desa Tanjungjaya.' },
  { slug: 'bpd', name: 'BPD', title: 'Badan Permusyawaratan Desa', eyebrow: 'Lembaga Desa', singular: 'anggota BPD', position_hint: 'Contoh: Ketua BPD', description: 'Anggota Badan Permusyawaratan Desa (BPD) Tanjungjaya.' },
  { slug: 'lpm', name: 'LPM', title: 'Lembaga Pemberdayaan Masyarakat', eyebrow: 'Lembaga Desa', singular: 'pengurus LPM', position_hint: 'Contoh: Ketua LPM', description: 'Pengurus Lembaga Pemberdayaan Masyarakat (LPM) Tanjungjaya.' },
  { slug: 'pkk', name: 'PKK', title: 'Tim Penggerak PKK', eyebrow: 'Lembaga Desa', singular: 'pengurus PKK', position_hint: 'Contoh: Ketua Tim Penggerak PKK', description: 'Pengurus Tim Penggerak PKK Desa Tanjungjaya.' },
  { slug: 'karang_taruna', name: 'Karang Taruna', title: 'Karang Taruna', eyebrow: 'Lembaga Desa', singular: 'pengurus Karang Taruna', position_hint: 'Contoh: Ketua Karang Taruna', description: 'Pengurus Karang Taruna Desa Tanjungjaya.' },
  { slug: 'linmas', name: 'Linmas', title: 'Perlindungan Masyarakat', eyebrow: 'Lembaga Desa', singular: 'anggota Linmas', position_hint: 'Contoh: Ketua Linmas', description: 'Satuan Perlindungan Masyarakat (Linmas) Desa Tanjungjaya.' },
]

module.exports = { DEFAULT_CATEGORY, SEED_CATEGORIES }
