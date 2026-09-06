import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Building2,
  Download,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Mail,
  MapPinned,
  Menu,
  Newspaper,
  RefreshCw,
  Settings2,
  Users,
  X,
} from "lucide-react";
import Brand from "@/components/VillageBrand";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const navigation = [
  [
    "dashboard",
    "Ringkasan",
    LayoutDashboard,
    "Aktivitas dan informasi terkini",
  ],
  [
    "applications",
    "Pengajuan warga",
    FileText,
    "Tinjau dan proses permohonan warga",
  ],
  ["services", "Layanan desa", Settings2, "Atur layanan dan persyaratannya"],
  ["news", "Kabar & informasi", Newspaper, "Kelola berita untuk masyarakat"],
  ["guestbook", "Buku tamu", BookOpen, "Catatan kunjungan ke kantor desa"],
  ["officials", "Perangkat desa", Users, "Kelola struktur pemerintahan"],
  [
    "profile",
    "Profil & penduduk",
    Building2,
    "Identitas, wilayah, dan demografi desa",
  ],
];
const dateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      }).format(new Date(value)) + " WIB"
    : "—";

export default function AdminWorkspace({ panels, initialPanel = "dashboard" }) {
  const [active, setActive] = useState(initialPanel);
  const [visited, setVisited] = useState([initialPanel]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigate = useNavigate();
  const load = useCallback(async () => {
    try {
      const [session, dashboard] = await Promise.all([
        fetch(`${API}/auth/me`, { credentials: "include" }),
        fetch(`${API}/admin/dashboard`, { credentials: "include" }),
      ]);
      if (session.status === 401 || dashboard.status === 401) {
        navigate("/admin/login", { replace: true });
        return;
      }
      if (!session.ok || !dashboard.ok)
        throw new Error("Dashboard belum dapat dimuat. Silakan coba lagi.");
      setAdmin((await session.json()).data);
      setSummary((await dashboard.json()).data);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [navigate]);
  useEffect(() => {
    void load();
  }, [load]);
  function reload() {
    setLoading(true);
    void load();
  }
  function selectPanel(key) {
    setActive(key);
    setVisited((current) =>
      current.includes(key) ? current : [...current, key],
    );
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
    if (key === "dashboard") reload();
  }
  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const response = await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok)
        throw new Error("Belum dapat keluar. Silakan coba lagi.");
      navigate("/admin/login", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoggingOut(false);
    }
  }
  const counts = summary?.counts || {};
  const selected = navigation.find(([key]) => key === active) || navigation[0];
  const stats = [
    [
      "Pengajuan aktif",
      counts.active_application_count || 0,
      FileText,
      "applications",
      "Menunggu tindak lanjut",
    ],
    [
      "Tamu baru",
      counts.new_guestbook_count || 0,
      BookOpen,
      "guestbook",
      "Kunjungan belum ditinjau",
    ],
    [
      "Berita",
      counts.news_count || 0,
      Newspaper,
      "news",
      "Konten dalam pengelolaan",
    ],
    [
      "Pesan baru",
      counts.new_contact_count || 0,
      Mail,
      "contacts",
      "Pesan masuk dari warga",
    ],
  ];
  if (!admin)
    return (
      <div className="admin-loading">
        <LayoutDashboard size={32} />
        <h1>Menyiapkan ruang kerja Anda</h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <button type="button" onClick={reload}>
              Coba lagi
            </button>
          </>
        ) : (
          <LoaderCircle className="animate-spin" size={22} />
        )}
      </div>
    );
  return (
    <div className="admin-workspace">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <Brand />
          <span>RUANG ADMINISTRASI</span>
        </div>
        <p className="admin-sidebar__label">MENU UTAMA</p>
        <nav aria-label="Menu administrasi">
          {navigation.map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              aria-current={active === key ? "page" : undefined}
              onClick={() => selectPanel(key)}
            >
              <Icon size={19} />
              <span>{label}</span>
              {key === "applications" &&
                counts.active_application_count > 0 && (
                  <small>{counts.active_application_count}</small>
                )}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar__bottom">
          <Link to="/" target="_blank" rel="noreferrer">
            Lihat website desa <ArrowUpRight size={17} />
          </Link>
          <button type="button" className="admin-logout" onClick={logout} disabled={loggingOut}>
            {loggingOut ? <LoaderCircle size={19} className="animate-spin" /> : <LogOut size={19} />}
            <span>{loggingOut ? "Sedang keluar…" : "Keluar"}</span>
          </button>
        </div>
      </aside>
      <div className="admin-workspace__body">
        <header className="admin-topbar">
          <div className="admin-topbar__title">
            <button
              className="admin-mobile-toggle"
              type="button"
              aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={mobileOpen}
              aria-controls="admin-mobile-nav"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div>
              <p>
                Administrasi <span>/</span> {selected[1]}
              </p>
              <small>Desa Tanjungjaya · Bandung Barat</small>
            </div>
          </div>
          <div className="admin-topbar__account">
            <span className="admin-avatar">
              {admin.displayName?.charAt(0) || "A"}
            </span>
            <div>
              <b>{admin.displayName}</b>
              <small>{admin.role}</small>
            </div>
          </div>
        </header>
        {mobileOpen && (
          <nav
            id="admin-mobile-nav"
            className="admin-mobile-nav"
            aria-label="Menu administrasi seluler"
          >
            {navigation.map(([key, label, Icon]) => (
              <button
                type="button"
                key={key}
                aria-current={active === key ? "page" : undefined}
                onClick={() => selectPanel(key)}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
            <button type="button" className="admin-logout" onClick={logout} disabled={loggingOut}>
              {loggingOut ? <LoaderCircle size={19} className="animate-spin" /> : <LogOut size={19} />}
              <span>{loggingOut ? "Sedang keluar…" : "Keluar"}</span>
            </button>
          </nav>
        )}
        <div className="admin-content">
          {error && (
            <p role="alert" className="admin-error">
              {error}
            </p>
          )}
          <div hidden={active !== "dashboard"}>
            <section className="admin-welcome">
              <div>
                <span className="admin-eyebrow">DASHBOARD DESA</span>
                <h1>Selamat datang kembali.</h1>
                <p>
                  Informasi tertata, pelayanan warga lebih mudah.
                  <br />
                  Mulai hari ini dari satu ruang kerja.
                </p>
                <button
                  type="button"
                  onClick={() => selectPanel("applications")}
                >
                  Tinjau pengajuan <ArrowRight size={17} />
                </button>
              </div>
              <div className="admin-welcome__aside">
                <span className="admin-welcome__date">
                  {new Intl.DateTimeFormat("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "Asia/Jakarta",
                  }).format(new Date())}
                </span>
                <Building2 size={76} strokeWidth={1} />
                <span>PEMERINTAH DESA TANJUNGJAYA</span>
              </div>
            </section>
            <div className="admin-section-heading">
              <div>
                <h2>Gambaran hari ini</h2>
                <p>Ringkasan data dan aktivitas website desa.</p>
              </div>
              <button type="button" disabled={loading} onClick={reload}>
                <RefreshCw
                  size={15}
                  className={loading ? "animate-spin" : ""}
                />
                {loading ? "Memuat…" : "Perbarui data"}
              </button>
            </div>
            <section className="admin-stats" aria-label="Ringkasan aktivitas">
              {stats.map(([label, value, Icon, key, caption]) => (
                <button
                  type="button"
                  key={key}
                  className="admin-stat"
                  onClick={() =>
                    key === "contacts"
                      ? document
                          .getElementById("admin-contacts")
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          })
                      : selectPanel(key)
                  }
                >
                  <div>
                    <span className="admin-stat__icon">
                      <Icon size={21} />
                    </span>
                    <ArrowUpRight size={17} />
                  </div>
                  <p>{label}</p>
                  <strong>{Number(value).toLocaleString("id-ID")}</strong>
                  <small>{caption}</small>
                </button>
              ))}
            </section>
            <section className="admin-quick">
              <div>
                <h2>Akses cepat</h2>
                <p>Kelola kebutuhan harian desa.</p>
              </div>
              <button type="button" onClick={() => selectPanel("news")}>
                <Newspaper size={18} />
                Kelola berita
                <ArrowRight size={16} />
              </button>
              <button type="button" onClick={() => selectPanel("services")}>
                <Settings2 size={18} />
                Atur layanan
                <ArrowRight size={16} />
              </button>
              <a href={`${API}/admin/export.xlsx`}>
                <Download size={18} />
                Ekspor Excel
                <ArrowRight size={16} />
              </a>
            </section>
            <section className="admin-activity-grid">
              <Activity
                title="Kunjungan terbaru"
                subtitle="Lima kunjungan terakhir ke kantor desa"
                icon={BookOpen}
                items={summary?.recentGuestbook || []}
                empty="Belum ada kunjungan tercatat."
                onView={() => selectPanel("guestbook")}
              />
              <Activity
                title="Pesan warga"
                subtitle="Pesan terbaru dari halaman kontak"
                icon={Mail}
                items={summary?.recentContacts || []}
                empty="Belum ada pesan masuk."
                id="admin-contacts"
              />
            </section>
            <footer className="admin-overview-footer">
              <span>Desa Tanjungjaya · Ruang administrasi</span>
              <span>
                <MapPinned size={14} />
                {counts.facility_count || 0} fasilitas ·{" "}
                {counts.potential_count || 0} potensi desa
              </span>
            </footer>
          </div>
          {visited
            .filter((key) => key !== "dashboard")
            .map((key) => {
              const Panel = panels[key];
              return Panel ? (
                <div key={key} hidden={active !== key}>
                  <div className="admin-module-heading">
                    <span className="admin-eyebrow">PENGELOLAAN DESA</span>
                    <h1>{navigation.find(([id]) => id === key)?.[1]}</h1>
                    <p>{navigation.find(([id]) => id === key)?.[3]}</p>
                  </div>
                  <div className="admin-embedded">
                    <Panel />
                  </div>
                </div>
              ) : null;
            })}
        </div>
      </div>
    </div>
  );
}

function Activity({ title, subtitle, icon: Icon, items, empty, onView, id }) {
  return (
    <article className="admin-activity" id={id}>
      <header>
        <span className="admin-activity__icon">
          <Icon size={20} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {onView && (
          <button
            type="button"
            onClick={onView}
            aria-label="Lihat semua buku tamu"
          >
            <ArrowUpRight size={19} />
          </button>
        )}
      </header>
      <div>
        {items.length ? (
          items.map((item) => (
            <div className="admin-activity__row" key={item.id}>
              <span className="admin-initial">
                {item.name?.charAt(0)?.toUpperCase() || "W"}
              </span>
              <div>
                <h3>{item.name}</h3>
                <p>{item.visit_purpose || item.subject}</p>
                <small>{dateTime(item.created_at)}</small>
              </div>
              <span className="admin-status">{item.status}</span>
            </div>
          ))
        ) : (
          <div className="admin-empty">
            <Icon size={30} />
            <p>{empty}</p>
          </div>
        )}
      </div>
    </article>
  );
}
