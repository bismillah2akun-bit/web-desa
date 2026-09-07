import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useConfirm } from "@/components/confirmContext";

import AdminDataTable, { RecordIdentity } from "@/components/AdminDataTable";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const formatTime = (value) =>
  `${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value))} WIB`;

export default function AdminContacts({ onDataChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
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
      .catch((error) => setNotice(error.message))
      .finally(() => setLoading(false));
  }, [navigate]);

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

  const columns = [
    { key: "name", label: "Pengirim", className: "admin-data-person", sortValue: (item) => item.name, render: (item) => <RecordIdentity name={item.name} subtitle={item.email || item.phone || "Warga desa"} tone="purple" /> },
    { key: "subject", label: "Pesan", className: "admin-data-text", sortValue: (item) => item.subject, render: (item) => <><strong className="admin-cell-title">{item.subject || "Tanpa subjek"}</strong><span className="admin-cell-preview">{item.message}</span></> },
    { key: "date", label: "Diterima", className: "admin-data-date", sortValue: (item) => item.created_at, render: (item) => <span className="admin-cell-meta">{formatTime(item.created_at)}</span> },
    { key: "status", label: "Status", sortValue: (item) => item.status, render: (item) => <select className="admin-status-select" data-status={item.status} aria-label={`Status pesan ${item.subject}`} value={item.status} onChange={(event) => changeStatus(item.id, event.target.value)}><option value="baru">Baru</option><option value="dibaca">Dibaca</option><option value="selesai">Selesai</option></select> },
    { key: "actions", label: "Aksi", className: "admin-data-actions", render: (item) => <button type="button" onClick={() => remove(item)} aria-label={`Hapus pesan ${item.subject}`} title="Hapus pesan" className="admin-row-action admin-row-action--danger"><Trash2 size={16} /></button> },
  ];

  return (
    <main className="min-h-screen bg-sage-50">
      {notice && <div role="status" className="fixed bottom-5 right-5 z-50 rounded-xl border bg-white px-5 py-4 text-sm font-semibold shadow-xl">{notice}</div>}
      <div className="mx-auto max-w-7xl px-5 py-10">
        <AdminDataTable title="Kotak masuk" description="Pesan dari warga, siap untuk ditinjau dan ditindaklanjuti."
          rows={items} columns={columns} loading={loading}
          searchText={(item) => [item.name, item.email, item.phone, item.subject, item.message].join(" ")}
          searchPlaceholder="Cari pengirim atau isi pesan…"
          filters={[{ value: "baru", label: "Baru" }, { value: "dibaca", label: "Dibaca" }, { value: "selesai", label: "Selesai" }]}
          defaultSort={{ key: "date", direction: "desc" }} emptyMessage="Belum ada pesan masuk"
          renderDetail={(item) => <dl className="admin-detail-grid"><div><dt>Email</dt><dd>{item.email || "—"}</dd></div><div><dt>Telepon</dt><dd>{item.phone || "—"}</dd></div><div className="admin-detail-wide"><dt>Isi pesan lengkap</dt><dd>{item.message || "—"}</dd></div></dl>}
        />
      </div>
    </main>
  );
}
