import { useState } from "react";
import { ArrowLeft, Search, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const formatTime = (value) =>
  `${new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value))} WIB`;

export default function TrackApplication() {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(`${API}/applications/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          Object.fromEntries(new FormData(event.currentTarget)),
        ),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      setResult(body.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="min-h-screen bg-sage-50 px-5 py-10">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/layanan"
          className="inline-flex items-center gap-2 text-sm font-bold text-forest-900"
        >
          <ArrowLeft size={16} />
          Kembali ke layanan
        </Link>
        <div className="mt-8 rounded-3xl border border-sage-200 bg-white p-6 md:p-9">
          <Search className="text-earth-500" />
          <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-earth-500">
            Pelacakan Layanan
          </p>
          <h1 className="mt-3 font-serif text-4xl text-forest-950">
            Cek status pengajuan
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-500">
            Masukkan kode pelacakan dan nomor WhatsApp yang digunakan saat
            mengajukan layanan.
          </p>
          <form onSubmit={submit} className="mt-7 space-y-5">
            <label className="block">
              <span className="text-sm font-semibold">Kode pelacakan</span>
              <input
                name="tracking_code"
                required
                placeholder="TJ-20260903-XXXXXX"
                className="mt-2 w-full rounded-xl border px-3 py-3 uppercase"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Nomor WhatsApp</span>
              <input
                name="whatsapp"
                type="tel"
                required
                className="mt-2 w-full rounded-xl border px-3 py-3"
              />
            </label>
            <button
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-forest-900 px-5 py-3 text-sm font-bold text-white"
            >
              <Search size={16} />
              {loading ? "Mencari..." : "Cek Status"}
            </button>
          </form>
          {error && (
            <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}
          {result && (
            <section className="mt-7 rounded-2xl border border-sage-200 bg-sage-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <ShieldCheck className="text-forest-900" />
                  <h2 className="mt-3 font-bold text-forest-950">
                    {result.serviceName}
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">
                    {result.trackingCode} · {result.fullName}
                  </p>
                </div>
                <span className="rounded-xl bg-forest-900 px-3 py-2 text-xs font-bold capitalize text-white">
                  {result.status}
                </span>
              </div>
              {result.adminNote && (
                <div className="mt-5 rounded-xl bg-white p-4">
                  <b className="text-sm">Catatan admin</b>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-600">
                    {result.adminNote}
                  </p>
                </div>
              )}
              <div className="mt-6 space-y-4 border-t border-sage-200 pt-5">
                {result.history.map((item, index) => (
                  <div
                    key={`${item.created_at}-${index}`}
                    className="border-l-2 border-earth-500 pl-4"
                  >
                    <b className="text-sm capitalize text-forest-950">
                      {item.status}
                    </b>
                    <p className="mt-1 text-xs text-stone-500">
                      {formatTime(item.created_at)}
                    </p>
                    {item.note && (
                      <p className="mt-1 text-sm text-stone-600">{item.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
