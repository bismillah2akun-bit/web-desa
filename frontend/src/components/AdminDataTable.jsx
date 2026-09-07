import { Fragment, useId, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, Search, SearchX, LoaderCircle } from "lucide-react";

export function RecordIdentity({ name, subtitle, tone = "blue" }) {
  const initials = String(name || "?").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (
    <div className="admin-record">
      <span className="admin-record__avatar" data-tone={tone} aria-hidden="true">{initials}</span>
      <div><strong>{name || "—"}</strong>{subtitle && <span>{subtitle}</span>}</div>
    </div>
  );
}

export function StatusBadge({ value, children }) {
  return <span className="admin-data-status" data-status={value}><i aria-hidden="true" />{children || value}</span>;
}

export default function AdminDataTable({
  title, description, rows, columns, searchText, searchPlaceholder = "Cari data…",
  filters = [], filterKey = "status", actions, renderDetail, loading = false,
  emptyMessage = "Belum ada data tersimpan.", defaultSort,
}) {
  const tableId = useId();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState(defaultSort || null);
  const [expanded, setExpanded] = useState(null);
  const keyword = query.trim().toLocaleLowerCase("id-ID");
  const matched = rows.filter((row) => !keyword || String(searchText(row)).toLocaleLowerCase("id-ID").includes(keyword));
  const filtered = matched.filter((row) => !filter || row[filterKey] === filter);
  const sorted = [...filtered];
  const column = columns.find((item) => item.key === sort?.key);
  if (column?.sortValue) {
    sorted.sort((a, b) => {
      const first = column.sortValue(a);
      const second = column.sortValue(b);
      // Keep unavailable values last in either direction.
      if (first == null) return second == null ? 0 : 1;
      if (second == null) return -1;
      const comparison = typeof first === "number" && typeof second === "number"
        ? first - second
        : String(first).localeCompare(String(second), "id-ID", { numeric: true });
      return sort.direction === "asc" ? comparison : -comparison;
    });
  }
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const start = currentPage * pageSize;
  const visible = sorted.slice(start, start + pageSize);

  function changeSort(key) {
    setSort((current) => ({ key, direction: current?.key === key && current.direction === "asc" ? "desc" : "asc" }));
    setPage(0);
  }

  return (
    <section className="admin-data-panel" aria-labelledby={tableId + "-title"} aria-busy={loading}>
      <div className="admin-data-heading">
        <div><h2 id={tableId + "-title"}>{title}<span className="admin-data-count">{loading ? "…" : rows.length.toLocaleString("id-ID")}</span></h2>{description && <p>{description}</p>}</div>
        {actions && <div className="admin-data-heading__actions">{actions}</div>}
      </div>
      <div className="admin-data-toolbar">
        {filters.length > 0 && (
          <div className="admin-data-filters" role="group" aria-label={`Filter ${title.toLowerCase()}`}>
            {[{ value: "", label: "Semua" }, ...filters].map((item) => (
              <button key={item.value} type="button" aria-pressed={filter === item.value} onClick={() => { setFilter(item.value); setPage(0); }}>
                {item.label}<span>{matched.filter((row) => !item.value || row[filterKey] === item.value).length}</span>
              </button>
            ))}
          </div>
        )}
        <label className="admin-data-search">
          <Search size={17} aria-hidden="true" />
          <input type="search" aria-label={`Cari ${title.toLowerCase()}`} placeholder={searchPlaceholder} value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} />
        </label>
      </div>
      <div className="admin-data-scroll" role="region" aria-label={`Tabel ${title.toLowerCase()}, geser untuk melihat kolom lainnya`} tabIndex={0}>
        <table className="admin-data-table">
          <caption className="sr-only">{title}</caption>
          <thead><tr>{columns.map((item) => (
            <th scope="col" key={item.key} className={item.className} aria-sort={item.sortValue ? sort?.key === item.key ? sort.direction === "asc" ? "ascending" : "descending" : "none" : undefined}>
              {item.sortValue ? <button type="button" onClick={() => changeSort(item.key)} aria-label={`Urutkan ${item.label.toLowerCase()}`}>
                {item.label}{sort?.key === item.key ? sort.direction === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} /> : <ArrowUpDown size={13} />}
              </button> : item.label}
            </th>
          ))}{renderDetail && <th scope="col" className="admin-data-expand-column"><span className="sr-only">Detail</span></th>}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={columns.length + (renderDetail ? 1 : 0)}><div className="admin-data-empty" role="status"><LoaderCircle className="animate-spin" size={25} /><strong>Memuat data…</strong></div></td></tr> : visible.map((row) => (
              <Fragment key={row.id}>
                <tr data-expanded={expanded === row.id}>
                  {columns.map((item) => <td key={item.key} className={item.className}>{item.render(row)}</td>)}
                  {renderDetail && <td className="admin-data-expand-column"><button type="button" className="admin-row-action" aria-label={`Detail ${row.name || row.id}`} aria-expanded={expanded === row.id} aria-controls={`${tableId}-detail-${row.id}`} onClick={() => setExpanded(expanded === row.id ? null : row.id)}><ChevronDown size={17} /></button></td>}
                </tr>
                {renderDetail && expanded === row.id && <tr className="admin-data-detail-row"><td colSpan={columns.length + 1}><div id={`${tableId}-detail-${row.id}`} className="admin-data-detail">{renderDetail(row)}</div></td></tr>}
              </Fragment>
            ))}
            {!loading && !visible.length && <tr><td colSpan={columns.length + (renderDetail ? 1 : 0)}>
              <div className="admin-data-empty"><SearchX size={28} /><strong>{query || filter ? "Tidak ada hasil yang cocok" : emptyMessage}</strong><p>{query || filter ? "Coba kata kunci lain atau tampilkan semua status." : "Data baru akan tampil di sini setelah ditambahkan."}</p>{(query || filter) && <button type="button" onClick={() => { setQuery(""); setFilter(""); setPage(0); }}>Reset pencarian</button>}</div>
            </td></tr>}
          </tbody>
        </table>
      </div>
      <p className="admin-data-scroll-hint">Geser tabel ke samping untuk melihat status dan aksi.</p>
      <footer className="admin-data-footer">
        <p role="status">{loading ? "Memuat data" : <><strong>{sorted.length ? start + 1 : 0}–{Math.min(start + pageSize, sorted.length)}</strong> dari {sorted.length.toLocaleString("id-ID")} data</>}</p>
        <div className="admin-data-pagination">
          <label><span>Baris per halaman</span><select aria-label={`Baris per halaman ${title.toLowerCase()}`} value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }}>{[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
          <span>{currentPage + 1} / {pages}</span>
          <button type="button" aria-label={`Halaman sebelumnya ${title.toLowerCase()}`} disabled={!currentPage || loading} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={17} /></button>
          <button type="button" aria-label={`Halaman berikutnya ${title.toLowerCase()}`} disabled={currentPage >= pages - 1 || loading} onClick={() => setPage(currentPage + 1)}><ChevronRight size={17} /></button>
        </div>
      </footer>
    </section>
  );
}
