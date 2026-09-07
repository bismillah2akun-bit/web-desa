import { useEffect, useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminDataTable, { RecordIdentity } from "@/components/AdminDataTable";
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
  const [loading, setLoading] = useState(true);
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
      .catch((error) => setNotice(error.message))
      .finally(() => setLoading(false));
  }, [navigate]);

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

  const columns = [
    { key: "name", label: "Pengunjung", sortValue: (item) => item.name, className: "admin-data-person", render: (item) => <RecordIdentity name={item.name} subtitle={item.institution || "Pengunjung umum"} tone="amber" /> },
    { key: "purpose", label: "Tujuan kunjungan", sortValue: (item) => item.visit_purpose, className: "admin-data-text", render: (item) => <strong className="admin-cell-title">{item.visit_purpose}</strong> },
    { key: "date", label: "Tanggal kunjungan", sortValue: (item) => item.visit_date, className: "admin-data-date", render: (item) => <><strong className="admin-cell-title">{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(item.visit_date))}</strong><span className="admin-cell-meta">Dicatat {formatTime(item.created_at)}</span></> },
    { key: "status", label: "Status", sortValue: (item) => item.status, render: (item) => <select className="admin-status-select" data-status={item.status} aria-label={`Status kunjungan ${item.name}`} value={item.status} onChange={(event) => changeStatus(item.id, event.target.value)}><option value="baru">Baru</option><option value="dibaca">Dibaca</option><option value="selesai">Selesai</option></select> },
    { key: "actions", label: "Aksi", className: "admin-data-actions", render: (item) => <button type="button" onClick={() => remove(item)} aria-label={`Hapus kunjungan ${item.name}`} title="Hapus kunjungan" className="admin-row-action admin-row-action--danger"><Trash2 size={16} /></button> },
  ];

  return (
    <main className="min-h-screen bg-sage-50">
      {notice && <div role="status" className="fixed bottom-5 right-5 z-50 rounded-xl border bg-white px-5 py-4 text-sm font-semibold shadow-xl">{notice}</div>}
      <div className="mx-auto max-w-7xl px-5 py-10">
        <AdminDataTable
          title="Data buku tamu"
          description="Kelola kunjungan dan buka detail untuk melihat kontak serta catatan tamu."
          rows={items} columns={columns} loading={loading}
          searchText={(item) => [item.name, item.institution, item.visit_purpose, item.email, item.phone, item.message, item.address].join(" ")}
          searchPlaceholder="Cari nama, instansi, atau tujuan…"
          filters={[{ value: "baru", label: "Baru" }, { value: "dibaca", label: "Dibaca" }, { value: "selesai", label: "Selesai" }]}
          defaultSort={{ key: "date", direction: "desc" }}
          emptyMessage="Belum ada kunjungan tercatat"
          actions={<button type="button" className="admin-table-button" onClick={() => downloadExport().catch((error) => setNotice(error.message))}><Download size={16} />Ekspor semua data</button>}
          renderDetail={(item) => <dl className="admin-detail-grid"><div><dt>Telepon</dt><dd>{item.phone || "—"}</dd></div><div><dt>Email</dt><dd>{item.email || "—"}</dd></div><div><dt>Alamat asal</dt><dd>{item.address || "—"}</dd></div><div className="admin-detail-wide"><dt>Pesan atau catatan</dt><dd>{item.message || "Tidak ada catatan tambahan."}</dd></div></dl>}
        />
      </div>
    </main>
  );
}
