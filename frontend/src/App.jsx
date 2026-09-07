import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  MapPin,
  ArrowRight,
  Sprout,
  Store,
  GraduationCap,
  Building2,
  Palette,
  Clock,
  Phone,
  Mail,
  Mountain,
  Newspaper,
  Send,
  LocateFixed,
  Info,
  Users,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Save,
  ArrowLeft,
  FileText,
} from "lucide-react";
import {
  Navbar,
  NavBody,
  NavItems,
  NavbarButton,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
} from "@/components/ui/resizable-navbar";
import AdminServices from "@/pages/AdminServices";
import AdminNews from "@/pages/AdminNews";
import AdminApplications from "@/pages/AdminApplications";
import TrackApplication from "@/pages/TrackApplication";
import AdminGuestbook from "@/pages/AdminGuestbook";
import AdminAreas from "@/pages/AdminAreas";
import AdminOfficials from "@/pages/AdminOfficials";
import AdminContacts from "@/pages/AdminContacts";
import AdminWorkspace from '@/pages/AdminWorkspace';
import Brand from "@/components/VillageBrand";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  center = [-6.9208, 107.426],
  note = "Data akan diperbarui oleh admin desa.";
const mediaUrl = (value) =>
  value?.startsWith("/uploads/")
    ? `${new URL(API, window.location.origin).origin}${value}`
    : value;
const pics = {
  village:
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1800&q=85",
  farm: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=900&q=80",
  shop: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80",
  culture:
    "https://images.unsplash.com/photo-1590422749897-47726c3f7c93?auto=format&fit=crop&w=900&q=80",
};
const nav = [
  ["Beranda", "/"],
  ["Profil Desa", "/profil-desa"],
  ["Pemerintahan", "/pemerintahan"],
  ["Potensi Desa", "/potensi-desa"],
  ["Layanan", "/layanan"],
  ["WebGIS", "/webgis"],
  ["Berita", "/berita"],
  ["Kontak", "/kontak"],
];
const pots = [
  [
    "Pertanian",
    Sprout,
    "Lahan pertanian dan komoditas lokal yang menjadi bagian penting ekonomi warga.",
    pics.farm,
  ],
  [
    "UMKM",
    Store,
    "Produk rumahan dan usaha kreatif warga yang terus bertumbuh.",
    pics.shop,
  ],
  [
    "Wisata",
    Mountain,
    "Bentang alam dan pengalaman desa yang dapat dikembangkan.",
    pics.village,
  ],
  [
    "Budaya",
    Palette,
    "Tradisi yang memperkuat identitas dan kebersamaan warga.",
    pics.culture,
  ],
  [
    "Pendidikan",
    GraduationCap,
    "Sarana belajar dan pengembangan generasi muda.",
    pics.village,
  ],
  [
    "Fasilitas Umum",
    Building2,
    "Fasilitas penunjang pelayanan dan aktivitas masyarakat.",
    pics.shop,
  ],
];
const boundary = {
  type: "Feature",
  properties: {
    name: "Batas referensi visual Google Maps",
    source: "Digitasi referensi dari tampilan Google Maps, September 2026",
    status: "Bukan batas resmi",
  },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [107.405, -6.903],
        [107.4105, -6.9052],
        [107.414, -6.907],
        [107.418, -6.9062],
        [107.421, -6.909],
        [107.425, -6.9098],
        [107.428, -6.9075],
        [107.431, -6.9082],
        [107.433, -6.9115],
        [107.436, -6.91],
        [107.439, -6.912],
        [107.4425, -6.9112],
        [107.445, -6.914],
        [107.449, -6.9148],
        [107.4525, -6.913],
        [107.455, -6.9165],
        [107.4535, -6.92],
        [107.4555, -6.923],
        [107.453, -6.926],
        [107.45, -6.925],
        [107.448, -6.928],
        [107.445, -6.9265],
        [107.443, -6.9305],
        [107.44, -6.9275],
        [107.438, -6.933],
        [107.435, -6.93],
        [107.432, -6.936],
        [107.4295, -6.9315],
        [107.426, -6.9355],
        [107.423, -6.931],
        [107.4195, -6.937],
        [107.4165, -6.932],
        [107.413, -6.9345],
        [107.411, -6.93],
        [107.407, -6.932],
        [107.405, -6.928],
        [107.401, -6.927],
        [107.399, -6.9235],
        [107.402, -6.921],
        [107.398, -6.918],
        [107.401, -6.915],
        [107.397, -6.912],
        [107.4015, -6.91],
        [107.4035, -6.907],
        [107.405, -6.903],
      ],
    ],
  },
};
const points = [
  {
    id: 1,
    type: "office",
    name: "Balai Desa Tanjungjaya",
    cat: "Kantor Desa",
    pos: [-6.9248, 107.428],
    desc: "Posisi referensi dari tampilan Google Maps; perlu verifikasi lapangan.",
  },
  {
    id: 2,
    type: "facility",
    name: "Fasilitas Pendidikan",
    cat: "Fasilitas Umum",
    pos: [-6.9195, 107.4205],
    desc: note,
  },
  {
    id: 3,
    type: "facility",
    name: "Fasilitas Kesehatan",
    cat: "Fasilitas Umum",
    pos: [-6.922, 107.433],
    desc: note,
  },
  {
    id: 4,
    type: "potential",
    name: "Sentra UMKM",
    cat: "Potensi Desa",
    pos: [-6.9165, 107.4125],
    desc: "Lokasi contoh potensi UMKM.",
  },
  {
    id: 5,
    type: "potential",
    name: "Area Pertanian",
    cat: "Potensi Desa",
    pos: [-6.928, 107.438],
    desc: "Lokasi contoh area pertanian.",
  },
];
const icon = (t) =>
  L.divIcon({
    className: `map-marker marker-${t}`,
    html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></svg>',
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  });

function Header() {
  const [o, setO] = useState(false),
    [scrolled, setScrolled] = useState(false),
    [services, setServices] = useState([]),
    home = useLocation().pathname === "/",
    transparent = home && !scrolled;
  useEffect(() => {
    fetch(`${API}/services`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((r) => setServices(r.data))
      .catch(() => setServices([]));
  }, []);
  const items = nav.map(([name, link]) => ({
    name,
    link,
    children:
      name === "Kontak"
        ? [
            { name: "Hubungi Desa", link: "/kontak" },
            { name: "Buku Tamu", link: "/kontak#buku-tamu" },
          ]
        : name === "Layanan"
          ? [
              { name: "Cek Status Pengajuan", link: "/layanan/cek-status" },
              ...services.map((service) => ({
                name: service.name,
                link: `/layanan#${service.slug}`,
              })),
            ]
          : undefined,
  }));
  useEffect(() => {
    const check = () => setScrolled(window.scrollY > 60);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);
  return (
    <Navbar className="fixed inset-x-0 top-3 z-[1000] md:top-5">
      <NavBody
        className={
          transparent
            ? "border border-transparent bg-transparent shadow-none"
            : "border border-stone-200 bg-white/95 shadow-sm"
        }
      >
        <Brand light={transparent} />
        <NavItems
          items={items}
          className={
            transparent ? "[&>div>a]:!text-white" : "[&>div>a]:!text-stone-600"
          }
        />
        <div className="flex items-center gap-3">
          <NavbarButton
            as={Link}
            to="/webgis"
            variant={transparent ? "secondary" : "primary"}
            className={
              transparent
                ? "border border-white/30 !bg-white/10 !text-white"
                : "!bg-forest-900 !text-white"
            }
          >
            Peta Desa
          </NavbarButton>
        </div>
      </NavBody>
      <MobileNav
        className={
          transparent
            ? "border-transparent bg-transparent"
            : "border-b border-stone-200 bg-white"
        }
      >
        <MobileNavHeader>
          <Brand light={transparent} />
          <span
            className={transparent ? "rounded-lg bg-white p-1" : "contents"}
          >
            <MobileNavToggle isOpen={o} onClick={() => setO(!o)} />
          </span>
        </MobileNavHeader>
        <MobileNavMenu isOpen={o} onClose={() => setO(false)}>
          {items.map((item, i) => (
            <div key={i} className="w-full">
              <Link
                to={item.link}
                onClick={() => setO(false)}
                className="relative block w-full rounded-lg px-2 py-2 font-semibold text-neutral-700"
              >
                {item.name}
              </Link>
              {item.children?.map((child) => (
                <Link
                  key={child.link}
                  to={child.link}
                  onClick={() => setO(false)}
                  className="block rounded-lg py-2 pl-6 pr-2 text-sm text-stone-500"
                >
                  {child.name}
                </Link>
              ))}
            </div>
          ))}
          <div className="flex w-full flex-col gap-4">
            <NavbarButton
              as={Link}
              to="/webgis"
              onClick={() => setO(false)}
              variant="primary"
              className="w-full !bg-forest-900 !text-white"
            >
              Buka Peta Desa
            </NavbarButton>
          </div>
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
}
function Footer() {
  return (
    <footer className="bg-forest-950 text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Brand light />
          <p className="mt-5 max-w-md text-sm leading-7 text-stone-300">
            Portal informasi dan pelayanan digital Desa Tanjungjaya, Kecamatan
            Cihampelas.
          </p>
        </div>
        <div>
          <b>Tautan cepat</b>
          <div className="mt-4 grid gap-3 text-sm text-stone-300">
            {nav.slice(1, 5).map(([n, p]) => (
              <Link key={p} to={p}>
                {n}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <b>Kantor Desa</b>
          <p className="mt-4 text-sm leading-7 text-stone-300">
            Desa Tanjungjaya, Kec. Cihampelas
            <br />
            Kab. Bandung Barat, Jawa Barat 40562
          </p>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-stone-400">
        © 2026 Pemerintah Desa Tanjungjaya · Data contoh akan diperbarui admin
        desa.
      </div>
    </footer>
  );
}
function ScrollReveal() {
  const { pathname } = useLocation();
  useEffect(() => {
    const elements = [
      ...document.querySelectorAll(
        "main > section:not(:first-child), main > article",
      ),
    ];
    elements.forEach((el) => el.classList.add("reveal-section"));
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -50px" },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}
function Demographics() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(`${API}/demographics`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((r) => setData(r.data))
      .catch(() => setData({ summary: null, areas: [] }));
  }, []);
  const s = data?.summary,
    show = (v) =>
      v === null || v === undefined
        ? "Belum diisi"
        : Number(v).toLocaleString("id-ID"),
    cards = [
      [
        "Jumlah Penduduk",
        s?.male_population == null && s?.female_population == null
          ? null
          : (s.male_population || 0) + (s.female_population || 0),
        "Jiwa",
      ],
      ["Laki-laki", s?.male_population, "Jiwa"],
      ["Perempuan", s?.female_population, "Jiwa"],
      ["Jumlah KK", s?.household_count, "Kartu keluarga"],
      ["Jumlah RW", s?.rw_count, "Wilayah RW"],
      ["Jumlah RT", s?.rt_count, "Wilayah RT"],
    ];
  const areaYears = [
    ...new Set((data?.areas || []).map((area) => area.data_year).filter(Boolean)),
  ];
  const areaYearLabel = areaYears.length === 1
    ? `Tahun rincian ${areaYears[0]}`
    : areaYears.length > 1
      ? "Tahun berbeda per wilayah"
      : "Tahun rincian belum diisi";
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-5">
        <Heading
          tag="Demografi Terperinci"
          title="Penduduk dan wilayah administrasi"
          desc="Rekap penduduk dan keluarga berdasarkan RT/RW. Angka hanya ditampilkan setelah diisi dan diverifikasi Pemerintah Desa."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {cards.map(([label, value, unit]) => (
            <article
              key={label}
              className="rounded-2xl border border-stone-200 bg-sage-50 p-5"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                {label}
              </p>
              <p className="mt-4 text-2xl font-bold text-forest-900">
                {show(value)}
              </p>
              <p className="mt-1 text-xs text-stone-500">
                {value == null ? note : unit}
              </p>
            </article>
          ))}
        </div>
        <div className="mt-10 overflow-hidden rounded-2xl border border-stone-200">
          <div className="flex flex-col gap-3 border-b border-stone-200 bg-sage-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-forest-950">
                Rekap KK dan penduduk per RT/RW
              </h3>
              <p className="mt-1 text-xs text-stone-500">
                Data individu tidak ditampilkan untuk melindungi informasi
                pribadi warga.
              </p>
            </div>
            <span className="w-fit rounded-lg bg-earth-100 px-3 py-2 text-xs font-semibold text-earth-500">
              {areaYearLabel}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead className="bg-forest-900 text-white">
                <tr>
                  {[
                    "RW",
                    "RT",
                    "Jumlah KK",
                    "Laki-laki",
                    "Perempuan",
                    "Total Penduduk",
                    "Tahun Data",
                    "Status",
                  ].map((h) => (
                    <th key={h} className="px-5 py-4 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.areas?.length ? (
                  data.areas.map((a) => (
                    <tr key={a.id} className="border-b border-stone-100">
                      <td className="px-5 py-4 font-bold">{a.rw_number}</td>
                      <td className="px-5 py-4 font-bold">{a.rt_number}</td>
                      <td className="px-5 py-4">{show(a.household_count)}</td>
                      <td className="px-5 py-4">{show(a.male_population)}</td>
                      <td className="px-5 py-4">{show(a.female_population)}</td>
                      <td className="px-5 py-4">{show(a.total_population)}</td>
                      <td className="px-5 py-4">{a.data_year || "Belum diisi"}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-earth-100 px-2.5 py-1 text-xs font-semibold text-earth-500">
                          {a.status === "terverifikasi"
                            ? "Terverifikasi"
                            : "Belum diverifikasi"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-5 py-10 text-center text-stone-500"
                    >
                      Data RT/RW belum diisi oleh admin desa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-stone-200 bg-stone-50 px-5 py-4 text-xs text-stone-500">
            Sumber: {s?.source || "Menunggu data Pemerintah Desa Tanjungjaya"}.
          </div>
        </div>
      </div>
    </section>
  );
}
function VillageHistory() {
  const leaders = [
    ["1945–1960", "Padmi", "Desa Rancairung, sebelum pemekaran"],
    ["1960–1968", "Winata Karta Sasmita", "Desa Rancairung, sebelum pemekaran"],
    ["1968–1970", "Uro Suparman", "Desa Rancairung, sebelum pemekaran"],
    [
      "1970–1986",
      "Soheh Hidayat",
      "Masa pemekaran dan dua periode awal Tanjungjaya",
    ],
    ["1986–1994", "Tatang Hendiatmana", "Kepala Desa Tanjungjaya"],
    ["1994–2002", "Aep Abdillah", "Kepala Desa Tanjungjaya"],
    ["2002–2013", "Ohan Haryono", "Dua periode Kepala Desa Tanjungjaya"],
    ["2013–2019", "Tintin Marlina", "Data terakhir pada arsip sumber"],
  ];
  return (
    <section className="bg-forest-950 py-20 text-white">
      <div className="mx-auto max-w-7xl px-5">
        <div className="grid gap-12 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-sage-200">
              Sejarah Desa
            </p>
            <h2 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">
              Dari Rancairung menuju Tanjungjaya
            </h2>
            <div className="mt-7 space-y-5 leading-8 text-stone-300">
              <p>
                Catatan Pemerintah Desa menyebut wilayah Tanjungjaya semula
                menjadi bagian dari Desa Rancairung. Gagasan pemekaran kemudian
                disepakati dan memperoleh izin pemerintah pada 17 November 1972.
                Dari proses tersebut lahir Desa Tanjungjaya, dengan Soheh
                Hidayat sebagai kepala desa transisi sekaligus kepala desa
                pertama.
              </p>
              <p>
                Nama “Tanjungjaya” dijelaskan berasal dari kata <i>tanjung</i>,
                yang menggambarkan wilayah di ujung semenanjung kawasan Danau
                Saguling, dan <i>jaya</i>, yang mewakili harapan warga agar desa
                tetap maju dan berhasil.
              </p>
              <p>
                Sejak masa awal, kehidupan masyarakat bertumpu pada pertanian.
                Setelah kemerdekaan, sebagian warga juga mulai mengembangkan
                peternakan. Memasuki sekitar 1970, kegiatan bercocok tanam
                berkembang dari cara sederhana menuju produksi yang dapat
                dipasarkan dan menjadi sumber penghasilan masyarakat.
              </p>
            </div>
            <a
              href="https://desatanjungjaya.blogspot.com/2015/04/sejarah-desa.html"
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm font-bold text-white hover:bg-white/10"
            >
              Lihat arsip sumber <ArrowRight size={16} />
            </a>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="font-serif text-2xl">Linimasa kepemimpinan</h3>
            <div className="mt-6 space-y-1">
              {leaders.map(([year, name, desc]) => (
                <div
                  key={`${year}-${name}`}
                  className="grid grid-cols-[90px_1fr] gap-4 border-b border-white/10 py-4 last:border-0"
                >
                  <span className="text-xs font-bold text-sage-200">
                    {year}
                  </span>
                  <div>
                    <b className="text-sm">{name}</b>
                    <p className="mt-1 text-xs leading-5 text-stone-400">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-5 text-stone-400">
              Catatan: linimasa mengikuti arsip desa yang diterbitkan pada 2015
              dan hanya memuat data sampai periode 2019. Periode berikutnya
              perlu diperbarui oleh Pemerintah Desa.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
function GuestBook() {
  const [status, setStatus] = useState(""),
    [sending, setSending] = useState(false);
  async function submit(e) {
    e.preventDefault();
    const formElement = e.currentTarget;
    setSending(true);
    setStatus("");
    try {
      const r = await fetch(`${API}/guestbook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            Object.fromEntries(new FormData(formElement)),
          ),
        }),
        json = await r.json();
      if (!r.ok) throw new Error(json.message);
      setStatus(
        "Kunjungan berhasil dicatat. Terima kasih telah mengisi buku tamu.",
      );
      formElement.reset();
    } catch (err) {
      setStatus(err.message || "Data kunjungan belum berhasil disimpan.");
    } finally {
      setSending(false);
    }
  }
  return (
    <section className="bg-sage-50 py-20">
      <div className="mx-auto max-w-5xl px-5">
        <Heading
          tag="Buku Tamu Digital"
          title="Catat kunjungan Anda"
          desc="Formulir ini digunakan untuk pencatatan kunjungan ke Pemerintah Desa Tanjungjaya. Data kontak hanya dapat diakses petugas yang berwenang."
        />
        <form
          onSubmit={submit}
          className="rounded-3xl border border-sage-200 bg-white p-6 shadow-sm md:p-9"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Nama lengkap *"
              name="name"
              required
              maxLength="150"
            />
            <Field
              label="Instansi / organisasi"
              name="institution"
              maxLength="180"
            />
            <Field
              label="Nomor telepon"
              name="phone"
              type="tel"
              maxLength="30"
            />
            <Field label="Email" name="email" type="email" maxLength="180" />
            <Field label="Tanggal kunjungan" name="visit_date" type="date" />
            <Field
              label="Tujuan kunjungan *"
              name="visit_purpose"
              required
              maxLength="255"
            />
            <label className="md:col-span-2">
              <span className="text-sm font-semibold">Alamat asal</span>
              <textarea
                name="address"
                rows="3"
                className="mt-2 w-full rounded-xl border border-stone-300 p-3 outline-none focus:border-forest-900"
              />
            </label>
            <label className="md:col-span-2">
              <span className="text-sm font-semibold">Pesan atau catatan</span>
              <textarea
                name="message"
                rows="4"
                className="mt-2 w-full rounded-xl border border-stone-300 p-3 outline-none focus:border-forest-900"
              />
            </label>
          </div>
          <div className="mt-6 flex flex-col gap-4 border-t border-stone-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-xs leading-5 text-stone-500">
              Dengan mengirim formulir, Anda menyetujui penggunaan data untuk
              administrasi kunjungan desa. Data tidak ditampilkan kepada publik.
            </p>
            <button
              disabled={sending}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-forest-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              <Send size={16} />
              {sending ? "Menyimpan..." : "Catat Kunjungan"}
            </button>
          </div>
          {status && (
            <p className="mt-5 rounded-xl bg-sage-100 p-4 text-sm font-semibold text-forest-900">
              {status}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
function Layout({ children }) {
  const path = useLocation().pathname,
    home = path === "/",
    profile = path === "/profil-desa",
    contact = path === "/kontak";
  return (
    <>
      <Header />
      <ScrollReveal />
      <main className={home ? "home-main" : "pt-20 md:pt-24"}>
        {children}
        {profile && <VillageHistory />}
        {profile && <Demographics />}
        {contact && <div id="buku-tamu" className="scroll-mt-28" />}
        {contact && <GuestBook />}
      </main>
      <Footer />
    </>
  );
}
function Btn({ to, children, light }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition hover:-translate-y-0.5 ${light ? "border border-stone-300 bg-white text-forest-900" : "bg-forest-900 text-white"}`}
    >
      {children}
      <ArrowRight size={16} />
    </Link>
  );
}
function Heading({ tag, title, desc }) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <p className="mb-3 text-xs font-bold uppercase tracking-[.2em] text-earth-500">
        {tag}
      </p>
      <h2 className="font-serif text-3xl text-forest-950 md:text-4xl">
        {title}
      </h2>
      {desc && <p className="mt-4 leading-7 text-stone-600">{desc}</p>}
    </div>
  );
}
function PageHero({ tag, title, desc }) {
  return (
    <section className="border-b border-sage-200 bg-sage-50">
      <div className="mx-auto max-w-7xl px-5 py-16 md:py-20">
        <p className="mb-4 text-xs font-bold uppercase tracking-[.2em] text-earth-500">
          {tag}
        </p>
        <h1 className="max-w-4xl font-serif text-4xl leading-tight text-forest-950 md:text-6xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-8 text-stone-600 md:text-lg">
          {desc}
        </p>
      </div>
    </section>
  );
}
function Home() {
  return (
    <Layout>
      <section className="relative min-h-[680px] overflow-hidden bg-forest-950">
        <img
          src={pics.village}
          className="absolute inset-0 h-full w-full object-cover opacity-35"
          alt="Pemandangan pedesaan"
        />
        <div className="absolute inset-y-0 left-0 w-2 bg-earth-500" />
        <div className="relative mx-auto flex min-h-[680px] max-w-7xl items-center px-5 py-24">
          <div className="max-w-3xl text-white">
            <p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-sage-200">
              <MapPin size={15} /> Kecamatan Cihampelas · Jawa Barat
            </p>
            <h1 className="font-serif text-5xl leading-[1.05] md:text-7xl lg:text-8xl">
              Desa Tanjungjaya
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-200">
              Kecamatan Cihampelas, Kabupaten Bandung Barat — tumbuh melalui
              pelayanan terbuka, potensi lokal, dan gotong royong.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Btn to="/profil-desa" light>
                Jelajahi Desa
              </Btn>
              <Link
                to="/webgis"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-sm font-bold"
              >
                <MapPin size={17} />
                Lihat Peta Desa
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-2 md:items-center">
        <div className="relative">
          <img
            src={pics.farm}
            alt="Placeholder kepala desa"
            className="aspect-[4/3] w-full rounded-3xl object-cover"
          />
          <span className="absolute bottom-4 left-4 rounded-xl bg-white px-4 py-3 text-xs font-bold shadow-lg">
            Foto Kepala Desa · Placeholder
          </span>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-earth-500">
            Sambutan Kepala Desa
          </p>
          <h2 className="mt-4 font-serif text-4xl text-forest-950">
            Bersama membangun desa yang terbuka dan berdaya
          </h2>
          <p className="mt-6 leading-8 text-stone-600">
            Selamat datang di portal Desa Tanjungjaya. Website ini disiapkan
            sebagai ruang informasi, pengenalan potensi, dan akses layanan bagi
            warga.
          </p>
          <p className="mt-4 text-sm font-semibold text-forest-900">
            Nama Kepala Desa — {note}
          </p>
        </div>
      </section>
      <section className="bg-sage-50 py-20">
        <div className="mx-auto max-w-7xl px-5">
          <Heading
            tag="Informasi Desa"
            title="Akses yang lebih dekat untuk warga"
          />
          <div className="grid gap-5 md:grid-cols-3">
            {[
              [
                Newspaper,
                "Informasi Terkini",
                "Ikuti kabar dan pengumuman desa.",
                "/berita",
              ],
              [
                Users,
                "Pemerintahan Desa",
                "Kenali perangkat pemerintahan desa.",
                "/pemerintahan",
              ],
              [
                MapPin,
                "Peta Interaktif",
                "Jelajahi fasilitas dan potensi desa.",
                "/webgis",
              ],
            ].map(([I, t, d, p]) => (
              <Link
                to={p}
                key={t}
                className="rounded-2xl border border-sage-200 bg-white p-7"
              >
                <I className="text-earth-500" />
                <h3 className="mt-7 text-lg font-bold">{t}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-600">{d}</p>
                <ArrowRight className="mt-6 text-forest-900" size={19} />
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-20">
        <Heading tag="Potensi Lokal" title="Kekuatan yang tumbuh dari desa" />
        <PotentialGrid short />
      </section>
      <section className="bg-forest-900 py-20 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-sage-200">
              WebGIS Desa
            </p>
            <h2 className="mt-3 max-w-2xl font-serif text-4xl">
              Kenali wilayah desa melalui peta interaktif
            </h2>
            <p className="mt-4 text-sm text-stone-300">
              Data lokasi masih berupa contoh dan menunggu verifikasi resmi.
            </p>
          </div>
          <Btn to="/webgis" light>
            Buka Peta
          </Btn>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-20">
        <Heading tag="Kabar Desa" title="Informasi terbaru dari Tanjungjaya" />
        <NewsGrid />
      </section>
    </Layout>
  );
}
function Profile() {
  const [data, setData] = useState(null);
  const [demographics, setDemographics] = useState(null);
  useEffect(() => {
    fetch(`${API}/profile`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((r) => setData(r.data))
      .catch(() => {});
  }, []);
  useEffect(() => {
    fetch(`${API}/demographics`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((r) => setDemographics(r.data?.summary || null))
      .catch(() => {});
  }, []);
  const fallback = "Data akan diperbarui oleh admin desa.",
    location = data
      ? `${data.name} berada di Kecamatan ${data.district || "—"}, Kabupaten ${data.regency || "—"}, Provinsi ${data.province || "—"}${data.postal_code ? ` ${data.postal_code}` : ""}.`
      : "Desa Tanjungjaya berada di Kecamatan Cihampelas, Kabupaten Bandung Barat.";
  const totalPopulation = demographics?.male_population == null && demographics?.female_population == null
    ? null
    : Number(demographics?.male_population || 0) + Number(demographics?.female_population || 0);
  const basicData = [
    ["Luas Wilayah", data?.area_size_ha == null ? null : `${Number(data.area_size_ha).toLocaleString("id-ID")} ha`],
    ["Jumlah Penduduk", totalPopulation == null ? null : `${totalPopulation.toLocaleString("id-ID")} jiwa`],
    ["Jumlah Dusun", data?.hamlet_count == null ? null : `${Number(data.hamlet_count).toLocaleString("id-ID")} dusun`],
    ["Jumlah RW / RT", demographics?.rw_count == null && demographics?.rt_count == null ? null : `${demographics?.rw_count ?? "—"} RW / ${demographics?.rt_count ?? "—"} RT`],
  ];
  const boundaries = [
    ["Utara", data?.boundary_north],
    ["Timur", data?.boundary_east],
    ["Selatan", data?.boundary_south],
    ["Barat", data?.boundary_west],
  ];
  return (
    <Layout>
      <PageHero
        tag="Tentang Tanjungjaya"
        title="Mengenal desa, sejarah, dan arah pembangunannya"
        desc="Informasi profil dikelola melalui panel administrasi Pemerintah Desa."
      />
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 md:grid-cols-2">
        {[
          ["Sejarah Singkat", data?.history || fallback],
          ["Visi", data?.vision || fallback],
          ["Misi", data?.mission || fallback],
          ["Informasi Geografis", location],
        ].map(([t, d]) => (
          <article
            key={t}
            className="rounded-2xl border border-stone-200 bg-white p-7"
          >
            <h2 className="font-serif text-3xl text-forest-950">{t}</h2>
            <p className="mt-5 whitespace-pre-line leading-8 text-stone-600">
              {d}
            </p>
          </article>
        ))}
      </section>
      <section className="bg-sage-50 py-16">
        <div className="mx-auto max-w-7xl px-5">
          <Heading tag="Wilayah & Penduduk" title="Data dasar desa" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {basicData.map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-sage-200 bg-white p-6"
              >
                <p className="text-sm text-stone-500">{label}</p>
                <p className="mt-4 text-xl font-bold text-forest-900">
                  {value || "Belum tersedia"}
                </p>
                {!value && <p className="mt-2 text-xs text-stone-500">{note}</p>}
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-sage-200 bg-white p-7">
            <h3 className="font-bold">Batas Wilayah</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {boundaries.map(([direction, value]) => <div key={direction} className="rounded-xl bg-sage-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-earth-500">{direction}</p><p className="mt-2 text-sm text-stone-700">{value || "Belum diisi"}</p></div>)}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
function Government() {
  const [officials, setOfficials] = useState([]);
  useEffect(() => {
    fetch(`${API}/officials`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((body) => setOfficials(body.data))
      .catch(() => setOfficials([]));
  }, []);
  return (
    <Layout>
      <PageHero
        tag="Pemerintahan Desa"
        title="Pelayanan yang hadir untuk masyarakat"
        desc="Struktur perangkat Pemerintah Desa Tanjungjaya."
      />
      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {officials.map((official, i) => (
            <article
              key={official.id}
              className="official-card"
            >
              <div className="official-card__top" aria-hidden="true">
                <span className="official-card__icon"><Users size={22} strokeWidth={1.6} /></span>
                <span className="official-card__number">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <p className="official-card__position">
                {official.position}
              </p>
              <h3 className="official-card__name">
                {official.name || "Nama belum tersedia"}
              </h3>
              <p className="official-card__description">
                {official.description || note}
              </p>
            </article>
          ))}
          {!officials.length && (
            <p className="col-span-full rounded-2xl border border-dashed p-10 text-center text-sm text-stone-500">
              Struktur perangkat desa belum diisi oleh admin.
            </p>
          )}
        </div>
      </section>
    </Layout>
  );
}
function PotentialGrid({ short }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {pots.slice(0, short ? 3 : 6).map(([t, I, d, im]) => (
        <article
          key={t}
          className="overflow-hidden rounded-2xl border border-stone-200 bg-white"
        >
          <img
            src={im}
            alt={`Placeholder ${t}`}
            className="h-48 w-full object-cover"
          />
          <div className="p-6">
            <I className="text-earth-500" />
            <h2 className="mt-4 text-xl font-bold">{t}</h2>
            <p className="mt-3 text-sm leading-7 text-stone-600">{d}</p>
            <p className="mt-4 text-xs text-stone-400">{note}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
function Potentials() {
  return (
    <Layout>
      <PageHero
        tag="Potensi Desa"
        title="Ragam potensi yang dapat terus dikembangkan"
        desc="Pemetaan awal sektor desa untuk mendukung kolaborasi dan pemberdayaan masyarakat."
      />
      <section className="mx-auto max-w-7xl px-5 py-16">
        <PotentialGrid />
      </section>
    </Layout>
  );
}
function NewsGrid() {
  const [items, setItems] = useState(null);
  useEffect(() => {
    fetch(`${API}/news`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((r) => setItems(r.data))
      .catch(() => setItems([]));
  }, []);
  const formatDate = (value) =>
    new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeZone: "Asia/Jakarta",
    }).format(new Date(value));
  if (items === null)
    return (
      <p className="text-center text-sm text-stone-500">Memuat berita...</p>
    );
  if (!items.length)
    return (
      <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-stone-500">
        Belum ada kabar yang ditampilkan.
      </p>
    );
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {items.map((n) => (
        <article
          key={n.id}
          className="overflow-hidden rounded-2xl border border-stone-200 bg-white"
        >
          <img
            src={mediaUrl(n.image_url) || pics.village}
            alt={n.title}
            className="h-48 w-full object-cover"
          />
          <div className="p-6">
            <div className="flex justify-between gap-3 text-xs">
              <b className="text-earth-500">{n.category || "Informasi"}</b>
              <span className="text-stone-500">
                {formatDate(n.published_at)}
              </span>
            </div>
            <h2 className="mt-4 text-xl font-bold leading-7">{n.title}</h2>
            <p className="mt-3 line-clamp-3 text-sm leading-7 text-stone-600">
              {n.summary || n.content}
            </p>
            <Link
              to={`/berita/${n.id}`}
              className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-forest-900"
            >
              Baca Selengkapnya <ArrowRight size={15} />
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
function News() {
  return (
    <Layout>
      <PageHero
        tag="Berita Desa"
        title="Kabar dan informasi untuk warga"
        desc="Ikuti agenda, pengumuman, serta cerita kegiatan masyarakat."
      />
      <section className="mx-auto max-w-7xl px-5 py-16">
        <NewsGrid />
      </section>
    </Layout>
  );
}
function NewsDetail() {
  const { id } = useParams(),
    [item, setItem] = useState(undefined);
  useEffect(() => {
    fetch(`${API}/news/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((r) => setItem(r.data))
      .catch(() => setItem(null));
  }, [id]);
  if (item === undefined)
    return (
      <Layout>
        <div className="p-24 text-center">Memuat berita...</div>
      </Layout>
    );
  if (!item)
    return (
      <Layout>
        <div className="p-24 text-center">
          Berita tidak ditemukan atau tidak ditampilkan.
        </div>
      </Layout>
    );
  const date = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: "Asia/Jakarta",
  }).format(new Date(item.published_at));
  return (
    <Layout>
      <article className="mx-auto max-w-3xl px-5 py-16">
        <Link to="/berita" className="font-bold text-forest-900">
          ← Kembali
        </Link>
        <p className="mt-10 text-xs font-bold text-earth-500">
          {item.category || "Informasi"} · {date}
        </p>
        <h1 className="mt-4 font-serif text-4xl text-forest-950 md:text-5xl">
          {item.title}
        </h1>
        <img
          src={mediaUrl(item.image_url) || pics.village}
          alt={item.title}
          className="mt-8 aspect-[2/1] w-full rounded-2xl object-cover"
        />
        {item.summary && (
          <p className="mt-8 text-lg font-semibold leading-8 text-stone-700">
            {item.summary}
          </p>
        )}
        <div className="mt-6 whitespace-pre-line leading-8 text-stone-600">
          {item.content || "Isi berita belum tersedia."}
        </div>
      </article>
    </Layout>
  );
}
function Reset() {
  const m = useMap();
  return (
    <button
      onClick={() => m.setView(center, 14)}
      className="absolute right-3 top-3 z-[500] flex gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold shadow-lg"
    >
      <LocateFixed size={16} />
      Lokasi awal
    </button>
  );
}
function WebMap({
  active = { office: true, facility: true, potential: true },
  height = "640px",
}) {
  return (
    <MapContainer
      center={center}
      zoom={14}
      style={{ height, width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <GeoJSON
        data={boundary}
        style={{
          color: "#173d32",
          weight: 2,
          fillColor: "#d4e0cf",
          fillOpacity: 0.2,
          dashArray: "7 7",
        }}
      />
      {points
        .filter((p) => active[p.type])
        .map((p) => (
          <Marker key={p.id} position={p.pos} icon={icon(p.type)}>
            <Popup>
              <div className="w-52">
                <b>{p.name}</b>
                <p className="text-xs text-earth-500">{p.cat}</p>
                <p className="text-xs">
                  Alamat akan diperbarui.
                  <br />
                  {p.desc}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      <Reset />
    </MapContainer>
  );
}
function WebGIS() {
  const [a, setA] = useState({ office: true, facility: true, potential: true });
  return (
    <Layout>
      <PageHero
        tag="WebGIS Desa"
        title="Jelajahi wilayah Tanjungjaya"
        desc="Peta untuk mengenali lokasi layanan, fasilitas umum, dan potensi desa."
      />
      <section className="mx-auto max-w-[1500px] px-3 py-8">
        <div className="mb-5 flex gap-3 rounded-xl bg-earth-100 p-4 text-sm">
          <Info />
          <p>
            <b>Catatan:</b> koordinat dan batas merupakan data contoh, bukan
            batas resmi. Perbarui menggunakan data Pemerintah Desa atau BIG.
          </p>
        </div>
        <div className="grid overflow-hidden rounded-2xl border border-stone-200 bg-white lg:grid-cols-[280px_1fr]">
          <aside className="border-r border-stone-200 p-5">
            <h2 className="font-bold">Filter kategori</h2>
            <div className="mt-5 space-y-3">
              {[
                ["office", "Kantor Desa"],
                ["facility", "Fasilitas Umum"],
                ["potential", "Potensi & UMKM"],
              ].map(([k, n]) => (
                <label key={k} className="flex gap-3 rounded-xl border p-3">
                  <input
                    type="checkbox"
                    checked={a[k]}
                    onChange={() => setA({ ...a, [k]: !a[k] })}
                  />
                  <span className={`h-3 w-3 rounded-full marker-${k}`} />
                  <span className="text-sm font-semibold">{n}</span>
                </label>
              ))}
            </div>
            <p className="mt-8 border-t pt-5 text-xs leading-6 text-stone-500">
              <b>Legenda</b>
              <br />
              Garis putus-putus: batas contoh
              <br />
              Marker: titik lokasi contoh
            </p>
          </aside>
          <div className="relative min-h-[520px]">
            <WebMap active={a} />
          </div>
        </div>
      </section>
    </Layout>
  );
}
function Field({ label, ...p }) {
  return (
    <label>
      <span className="text-sm font-semibold">{label}</span>
      <input
        {...p}
        className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-3 outline-none focus:border-forest-900"
      />
    </label>
  );
}
function ServiceApplicationForm({ service }) {
  const [open, setOpen] = useState(false),
    [sending, setSending] = useState(false),
    [result, setResult] = useState(null),
    [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setSending(true);
    setError("");
    try {
      const response = await fetch(
          `${API}/services/${service.id}/applications`,
          { method: "POST", body: new FormData(form) },
        ),
        body = await response.json();
      if (!response.ok) throw new Error(body.message);
      setResult(body.data);
      form.reset();
    } catch (err) {
      setError(err.message || "Pengajuan belum dapat dikirim.");
    } finally {
      setSending(false);
    }
  }
  if (result)
    return (
      <div className="mt-6 rounded-2xl border border-sage-200 bg-sage-50 p-5">
        <ShieldCheck className="text-forest-900" />
        <h3 className="mt-3 font-bold text-forest-950">
          Pengajuan berhasil dikirim
        </h3>
        <p className="mt-2 text-sm text-stone-600">
          Simpan kode pelacakan berikut:
        </p>
        <code className="mt-3 block rounded-xl bg-white px-4 py-3 text-center text-lg font-bold text-forest-900">
          {result.trackingCode}
        </code>
        <p className="mt-3 text-xs leading-5 text-stone-500">
          Status awal: Diajukan. Kode ini diperlukan untuk melihat perkembangan
          pengajuan.
        </p>
      </div>
    );
  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-6 w-full rounded-xl bg-forest-900 px-5 py-3 text-sm font-bold text-white"
      >
        Ajukan layanan ini
      </button>
    );
  return (
    <form
      onSubmit={submit}
      className="mt-6 rounded-2xl border border-sage-200 bg-sage-50 p-5"
    >
      <h3 className="font-bold text-forest-950">Data pemohon</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Nama lengkap *" name="full_name" required />
        <Field label="NIK" name="nik" inputMode="numeric" maxLength="16" />
        <Field label="Nomor WhatsApp *" name="whatsapp" type="tel" required />
        <Field label="Email" name="email" type="email" />
        <label className="sm:col-span-2">
          <span className="text-sm font-semibold">Alamat</span>
          <textarea
            name="address"
            rows="3"
            className="mt-2 w-full rounded-xl border bg-white p-3"
          />
        </label>
      </div>
      <h3 className="mt-7 border-t border-sage-200 pt-6 font-bold text-forest-950">
        Persyaratan layanan
      </h3>
      <div className="mt-4 space-y-4">
        {service.requirements.map((requirement) => {
          const name = `requirement_${requirement.id}`,
            required = Boolean(requirement.is_required),
            common = {
              name,
              required,
              className: "mt-2 w-full rounded-xl border bg-white px-3 py-3",
            };
          return (
            <label key={requirement.id} className="block">
              <span className="text-sm font-semibold">
                {requirement.label}
                {required ? " *" : ""}
              </span>
              {requirement.instructions && (
                <span className="mt-1 block text-xs text-stone-500">
                  {requirement.instructions}
                </span>
              )}
              {requirement.field_type === "textarea" ? (
                <textarea {...common} rows="4" />
              ) : requirement.field_type === "select" ? (
                <select {...common}>
                  <option value="">Pilih salah satu</option>
                  {(requirement.options || []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : requirement.field_type === "file" ? (
                <>
                  <input
                    {...common}
                    type="file"
                    accept={(requirement.accepted_formats || "pdf,jpg,jpeg,png")
                      .split(",")
                      .map((value) => `.${value.trim()}`)
                      .join(",")}
                  />
                  <span className="mt-1 block text-xs text-stone-400">
                    Format: {requirement.accepted_formats || "pdf, jpg, png"} ·
                    Maks. {requirement.max_file_size_mb || 5} MB
                  </span>
                </>
              ) : (
                <input {...common} type={requirement.field_type} />
              )}
            </label>
          );
        })}
      </div>
      {error && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          disabled={sending}
          className="flex items-center gap-2 rounded-xl bg-forest-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          <Send size={16} />
          {sending ? "Mengirim..." : "Kirim Pengajuan"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl border bg-white px-5 py-3 text-sm font-bold"
        >
          Batal
        </button>
      </div>
      <p className="mt-5 text-xs leading-5 text-stone-500">
        Dokumen disimpan secara privat dan hanya dapat diakses petugas yang
        berwenang.
      </p>
    </form>
  );
}
function Services() {
  const [services, setServices] = useState(null);
  useEffect(() => {
    fetch(`${API}/services`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((r) => setServices(r.data))
      .catch(() => setServices([]));
  }, []);
  const labels = {
    text: "Isian teks",
    textarea: "Keterangan",
    number: "Angka",
    date: "Tanggal",
    select: "Pilihan",
    file: "Upload dokumen",
  };
  return (
    <Layout>
      <PageHero
        tag="Pelayanan Desa"
        title="Ajukan layanan desa secara lebih mudah"
        desc="Pilih layanan untuk melihat persyaratan yang telah ditetapkan Pemerintah Desa Tanjungjaya."
      />
      <section className="mx-auto max-w-7xl px-5 py-16">
        {services === null ? (
          <p className="text-center text-sm text-stone-500">
            Memuat daftar layanan...
          </p>
        ) : services.length ? (
          <div className="grid gap-6 md:grid-cols-2">
            {services.map((service) => (
              <article
                id={service.slug}
                key={service.id}
                className="scroll-mt-32 rounded-2xl border border-sage-200 bg-white p-6 md:p-8"
              >
                <div className="flex items-start justify-between gap-5">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-forest-900 text-white">
                    <FileText size={21} />
                  </span>
                  <span className="rounded-lg bg-earth-100 px-3 py-1.5 text-xs font-semibold text-earth-500">
                    {service.estimated_days == null
                      ? "Estimasi belum ditentukan"
                      : `${service.estimated_days} hari kerja`}
                  </span>
                </div>
                <h2 className="mt-6 font-serif text-3xl text-forest-950">
                  {service.name}
                </h2>
                <p className="mt-3 leading-7 text-stone-600">
                  {service.description ||
                    "Informasi layanan akan diperbarui oleh admin desa."}
                </p>
                <div className="mt-6 border-t border-stone-100 pt-5">
                  <h3 className="text-sm font-bold text-forest-950">
                    Persyaratan
                  </h3>
                  <ul className="mt-3 space-y-3">
                    {service.requirements.map((requirement) => (
                      <li
                        key={requirement.id}
                        className="flex items-start justify-between gap-4 rounded-xl bg-sage-50 px-4 py-3 text-sm"
                      >
                        <div>
                          <b className="text-stone-700">{requirement.label}</b>
                          {requirement.instructions && (
                            <p className="mt-1 text-xs leading-5 text-stone-500">
                              {requirement.instructions}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-stone-400">
                          {labels[requirement.field_type]}
                          {requirement.is_required ? " · Wajib" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <ServiceApplicationForm service={service} />
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-sage-200 bg-sage-50 p-12 text-center">
            <FileText className="mx-auto text-earth-500" />
            <h2 className="mt-5 font-serif text-2xl text-forest-950">
              Layanan belum tersedia
            </h2>
            <p className="mt-2 text-sm text-stone-500">
              Admin desa belum menambahkan layanan aktif.
            </p>
          </div>
        )}
      </section>
    </Layout>
  );
}
function Contact() {
  const [s, setS] = useState("");
  async function submit(e) {
    e.preventDefault();
    const formElement = e.currentTarget;
    try {
      const r = await fetch(`${API}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(formElement))),
      });
      if (!r.ok) throw Error();
      setS("Pesan berhasil dikirim.");
      formElement.reset();
    } catch {
      setS("Backend belum terhubung. Pesan belum tersimpan.");
    }
  }
  return (
    <Layout>
      <PageHero
        tag="Kontak Desa"
        title="Hubungi Pemerintah Desa Tanjungjaya"
        desc="Sampaikan pertanyaan atau kebutuhan informasi melalui kanal berikut."
      />
      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-[.8fr_1.2fr]">
        <div className="space-y-4">
          {[
            [
              MapPin,
              "Alamat",
              "Desa Tanjungjaya, Cihampelas, Bandung Barat 40562",
            ],
            [Phone, "Telepon", note],
            [Mail, "Email", note],
            [
              Clock,
              "Jam Pelayanan",
              "Senin–Jumat, jadwal rinci akan diperbarui",
            ],
          ].map(([I, t, d]) => (
            <div key={t} className="flex gap-4 rounded-2xl border bg-white p-5">
              <I className="text-earth-500" />
              <div>
                <b>{t}</b>
                <p className="mt-1 text-sm text-stone-600">{d}</p>
              </div>
            </div>
          ))}
          <div className="overflow-hidden rounded-2xl">
            <WebMap
              active={{ office: true, facility: false, potential: false }}
              height="320px"
            />
          </div>
        </div>
        <form onSubmit={submit} className="rounded-2xl border bg-white p-8">
          <h2 className="font-serif text-3xl">Kirim pesan</h2>
          <div className="mt-7 grid gap-5 md:grid-cols-2">
            <Field label="Nama lengkap *" name="name" required />
            <Field label="Email *" name="email" type="email" required />
            <Field label="Nomor telepon" name="phone" />
            <Field label="Subjek *" name="subject" required />
            <label className="md:col-span-2">
              <b className="text-sm">Pesan *</b>
              <textarea
                name="message"
                required
                rows="6"
                className="mt-2 w-full rounded-xl border p-3"
              />
            </label>
          </div>
          <button className="mt-5 flex gap-2 rounded-xl bg-forest-900 px-5 py-3 text-sm font-bold text-white">
            <Send size={16} />
            Kirim Pesan
          </button>
          {s && <p className="mt-4 text-sm font-semibold">{s}</p>}
        </form>
      </section>
    </Layout>
  );
}
function AdminLogin() {
  const [show, setShow] = useState(false),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    navigate = useNavigate();
  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: "include" })
      .then((r) => {
        if (r.ok) navigate("/admin", { replace: true });
      })
      .catch(() => {});
  }, [navigate]);
  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`${API}/auth/login`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            Object.fromEntries(new FormData(e.currentTarget)),
          ),
        }),
        json = await r.json();
      if (!r.ok) throw new Error(json.message);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err.message || "Login tidak dapat diproses.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="grid min-h-screen bg-sage-50 lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden bg-forest-950 lg:block">
        <img
          src={pics.village}
          alt="Pemandangan Desa Tanjungjaya"
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-y-0 left-0 w-2 bg-earth-500" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <Brand light />
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-sage-200">
              Panel Administrasi Desa
            </p>
            <h1 className="mt-5 font-serif text-5xl leading-tight">
              Kelola informasi desa dalam satu tempat.
            </h1>
            <p className="mt-5 leading-8 text-stone-300">
              Perbarui profil, demografi, berita, WebGIS, pesan warga, dan buku
              tamu secara aman.
            </p>
          </div>
          <p className="text-xs text-stone-400">
            Pemerintah Desa Tanjungjaya · Kecamatan Cihampelas
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <div className="mb-9 lg:hidden">
            <Brand />
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-forest-900 text-white">
            <LockKeyhole size={22} />
          </span>
          <p className="mt-7 text-xs font-bold uppercase tracking-[.2em] text-earth-500">
            Akses Terbatas
          </p>
          <h1 className="mt-3 font-serif text-4xl text-forest-950">
            Masuk sebagai admin
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            Gunakan akun resmi pengelola website Desa Tanjungjaya.
          </p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <Field
              label="Username"
              name="username"
              autoComplete="username"
              required
              autoFocus
            />
            <label className="block">
              <span className="text-sm font-semibold">Kata sandi</span>
              <div className="relative mt-2">
                <input
                  name="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-stone-300 py-3 pl-3 pr-12 outline-none focus:border-forest-900"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={
                    show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                  }
                  className="absolute inset-y-0 right-0 grid w-12 place-items-center text-stone-500"
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
            <button
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-forest-900 px-5 py-3.5 text-sm font-bold text-white hover:bg-forest-800 disabled:opacity-60"
            >
              <ShieldCheck size={18} />
              {loading ? "Memverifikasi..." : "Masuk ke Dashboard"}
            </button>
          </form>
          <Link
            to="/"
            className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-forest-900"
          >
            ← Kembali ke website desa
          </Link>
          <p className="mt-10 border-t border-stone-200 pt-5 text-xs leading-5 text-stone-500">
            Jangan membagikan kata sandi. Keluar dari dashboard setelah selesai
            menggunakan perangkat bersama.
          </p>
        </div>
      </section>
    </main>
  );
}
function AdminContentEditor() {
  const [profile, setProfile] = useState(null),
    [demographics, setDemographics] = useState(null),
    [notice, setNotice] = useState(""),
    [saving, setSaving] = useState(""),
    navigate = useNavigate();
  useEffect(() => {
    Promise.all([
      fetch(`${API}/auth/me`, { credentials: "include" }),
      fetch(`${API}/profile`),
      fetch(`${API}/demographics`),
    ])
      .then(async ([session, profileResponse, demographicResponse]) => {
        if (!session.ok) return navigate("/admin/login", { replace: true });
        if (!profileResponse.ok || !demographicResponse.ok) throw new Error();
        setProfile((await profileResponse.json()).data);
        setDemographics((await demographicResponse.json()).data.summary);
      })
      .catch(() => setNotice("Data belum dapat dimuat."));
  }, [navigate]);
  async function save(e, path, type) {
    e.preventDefault();
    setSaving(type);
    setNotice("");
    try {
      const response = await fetch(`${API}/admin/${path}`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            Object.fromEntries(new FormData(e.currentTarget)),
          ),
        }),
        json = await response.json();
      if (response.status === 401)
        return navigate("/admin/login", { replace: true });
      if (!response.ok) throw new Error(json.message);
      if (type === "profile") setProfile(json.data);
      else setDemographics(json.data.summary);
      setNotice(json.message);
    } catch (err) {
      setNotice(err.message || "Perubahan belum dapat disimpan.");
    } finally {
      setSaving("");
    }
  }
  if (!profile || !demographics)
    return (
      <div className="grid min-h-screen place-items-center bg-sage-50 text-sm font-semibold text-forest-900">
        {notice || "Memuat data..."}
      </div>
    );
  const areaFields = [
    ["Jumlah laki-laki", "male_population"],
    ["Jumlah perempuan", "female_population"],
    ["Jumlah KK", "household_count"],
    ["Jumlah RW", "rw_count"],
    ["Jumlah RT", "rt_count"],
    ["Tahun ringkasan desa", "data_year"],
  ];
  return (
    <main className="min-h-screen bg-sage-50">
      <header className="border-b border-sage-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Brand />
          <Link
            to="/admin"
            className="flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold"
          >
            <ArrowLeft size={16} />
            Dashboard
          </Link>
        </div>
      </header>
      {notice && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-[2000] max-w-sm rounded-xl border border-sage-200 bg-white px-5 py-4 text-sm font-semibold text-forest-900 shadow-xl"
        >
          {notice}
        </div>
      )}
      <div className="mx-auto max-w-5xl px-5 py-10">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-earth-500">
          Pengelolaan Data
        </p>
        <h1 className="mt-3 font-serif text-4xl text-forest-950">
          Profil dan demografi desa
        </h1>
        <p className="mt-3 text-stone-600">
          Pastikan angka dan informasi resmi memiliki sumber yang dapat
          diverifikasi.
        </p>
        <form
          onSubmit={(e) => save(e, "profile", "profile")}
          className="mt-8 rounded-2xl border border-sage-200 bg-white p-6 md:p-8"
        >
          <div className="mb-7">
            <h2 className="font-serif text-2xl text-forest-950">Profil Desa</h2>
            <p className="mt-1 text-sm text-stone-500">
              Identitas, sejarah, visi, dan misi yang tampil pada website.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Nama desa *"
              name="name"
              required
              defaultValue={profile.name}
            />
            <Field
              label="Kecamatan"
              name="district"
              defaultValue={profile.district || ""}
            />
            <Field
              label="Kabupaten"
              name="regency"
              defaultValue={profile.regency || ""}
            />
            <Field
              label="Provinsi"
              name="province"
              defaultValue={profile.province || ""}
            />
            <Field
              label="Kode pos"
              name="postal_code"
              defaultValue={profile.postal_code || ""}
            />
            <Field
              label="Luas wilayah (hektare)"
              name="area_size_ha"
              type="number"
              min="0"
              step="0.01"
              defaultValue={profile.area_size_ha ?? ""}
            />
            <Field
              label="Jumlah dusun"
              name="hamlet_count"
              type="number"
              min="0"
              defaultValue={profile.hamlet_count ?? ""}
            />
            <div className="md:col-span-2 mt-2 border-t border-stone-100 pt-6">
              <h3 className="font-bold text-forest-950">Batas Wilayah</h3>
              <p className="mt-1 text-xs text-stone-500">Isi berdasarkan dokumen batas wilayah yang terverifikasi.</p>
            </div>
            <Field label="Batas utara" name="boundary_north" defaultValue={profile.boundary_north || ""} />
            <Field label="Batas timur" name="boundary_east" defaultValue={profile.boundary_east || ""} />
            <Field label="Batas selatan" name="boundary_south" defaultValue={profile.boundary_south || ""} />
            <Field label="Batas barat" name="boundary_west" defaultValue={profile.boundary_west || ""} />
            <label className="md:col-span-2">
              <span className="text-sm font-semibold">Sejarah desa</span>
              <textarea
                name="history"
                rows="7"
                defaultValue={profile.history || ""}
                className="mt-2 w-full rounded-xl border border-stone-300 p-3 outline-none focus:border-forest-900"
              />
            </label>
            <label className="md:col-span-2">
              <span className="text-sm font-semibold">Visi</span>
              <textarea
                name="vision"
                rows="4"
                defaultValue={profile.vision || ""}
                className="mt-2 w-full rounded-xl border border-stone-300 p-3 outline-none focus:border-forest-900"
              />
            </label>
            <label className="md:col-span-2">
              <span className="text-sm font-semibold">Misi</span>
              <textarea
                name="mission"
                rows="6"
                defaultValue={profile.mission || ""}
                className="mt-2 w-full rounded-xl border border-stone-300 p-3 outline-none focus:border-forest-900"
              />
            </label>
          </div>
          <button
            disabled={saving === "profile"}
            className="mt-6 flex items-center gap-2 rounded-xl bg-forest-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            <Save size={17} />
            {saving === "profile" ? "Menyimpan..." : "Simpan Profil"}
          </button>
        </form>
        <form
          onSubmit={(e) => save(e, "demographics", "demographics")}
          className="mt-7 rounded-2xl border border-sage-200 bg-white p-6 md:p-8"
        >
          <div className="mb-7">
            <h2 className="font-serif text-2xl text-forest-950">
              Ringkasan Demografi
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Kosongkan angka jika data resminya belum tersedia.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {areaFields.map(([label, name]) => (
              <Field
                key={name}
                label={label}
                name={name}
                type="number"
                min={name === "data_year" ? 1900 : 0}
                max={name === "data_year" ? 2200 : undefined}
                defaultValue={demographics[name] ?? ""}
              />
            ))}
          </div>
          <label className="mt-5 block">
            <span className="text-sm font-semibold">Sumber data</span>
            <textarea
              name="source"
              rows="3"
              defaultValue={demographics.source || ""}
              className="mt-2 w-full rounded-xl border border-stone-300 p-3 outline-none focus:border-forest-900"
            />
          </label>
          <label className="mt-5 block">
            <span className="text-sm font-semibold">Status data</span>
            <select
              name="status"
              defaultValue={demographics.status || "belum_diverifikasi"}
              className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-3 py-3 outline-none focus:border-forest-900"
            >
              <option value="belum_diverifikasi">Belum diverifikasi</option>
              <option value="terverifikasi">Terverifikasi</option>
            </select>
          </label>
          <button
            disabled={saving === "demographics"}
            className="mt-6 flex items-center gap-2 rounded-xl bg-forest-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            <Save size={17} />
            {saving === "demographics" ? "Menyimpan..." : "Simpan Demografi"}
          </button>
        </form>
        <AdminAreas />
      </div>
    </main>
  );
}
function AdminDashboard() {
  const { pathname } = useLocation();
  const initialPanel = { '/admin/buku-tamu': 'guestbook', '/admin/pesan': 'contacts', '/admin/pengajuan': 'applications', '/admin/berita': 'news', '/admin/layanan': 'services', '/admin/profil': 'profile', '/admin/perangkat-desa': 'officials' }[pathname] || 'dashboard';
  return <AdminWorkspace initialPanel={initialPanel} panels={{ guestbook: AdminGuestbook, contacts: AdminContacts, applications: AdminApplications, news: AdminNews, services: AdminServices, profile: AdminContentEditor, officials: AdminOfficials }} />;
}
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/profil-desa" element={<Profile />} />
        <Route path="/pemerintahan" element={<Government />} />
        <Route path="/potensi-desa" element={<Potentials />} />
        <Route path="/layanan" element={<Services />} />
        <Route path="/layanan/cek-status" element={<TrackApplication />} />
        <Route path="/webgis" element={<WebGIS />} />
        <Route path="/berita" element={<News />} />
        <Route path="/berita/:id" element={<NewsDetail />} />
        <Route path="/kontak" element={<Contact />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/profil" element={<AdminDashboard />} />
        <Route path="/admin/layanan" element={<AdminDashboard />} />
        <Route path="/admin/berita" element={<AdminDashboard />} />
        <Route path="/admin/pengajuan" element={<AdminDashboard />} />
        <Route path="/admin/buku-tamu" element={<AdminDashboard />} />
        <Route path="/admin/pesan" element={<AdminDashboard />} />
        <Route path="/admin/perangkat-desa" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
