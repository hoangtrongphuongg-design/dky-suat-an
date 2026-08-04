'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icons';
import { GROUPS } from '@/lib/groups';

const PAGE_SIZE = 8;

function formatDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(value));
}

function KpiCard({ tone, icon, label, value }) {
  return (
    <div className="kpi-card">
      <span className={`kpi-icon ${tone}`}><Icon name={icon} size={25} /></span>
      <div><span>{label}</span><strong>{value}</strong></div>
    </div>
  );
}

function HistoryChange({ row }) {
  const changes = [];
  if (row.sl_cnv_truoc !== row.sl_cnv_sau) changes.push(`CNV: ${row.sl_cnv_truoc ?? 0} → ${row.sl_cnv_sau}`);
  if (row.sl_nha_thau_truoc !== row.sl_nha_thau_sau) changes.push(`Nhà thầu: ${row.sl_nha_thau_truoc ?? 0} → ${row.sl_nha_thau_sau}`);
  return <>{changes.length ? changes.join(' · ') : row.hanh_dong}</>;
}

export default function DashboardClient({ today }) {
  const router = useRouter();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [updatedAt, setUpdatedAt] = useState(new Date());

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ from, to });
      if (search) params.set('search', search);
      const response = await fetch(`/api/dashboard/data?${params}`, { cache: 'no-store' });
      const data = await response.json();
      if (response.status === 401) {
        router.replace('/dashboard/login');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Không thể tải dữ liệu.');
      setItems(data.items || []);
      setHistory(data.history || []);
      setPage(1);
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, [from, to, search, router]);

  useEffect(() => { loadData(); }, [loadData]);

  const summary = useMemo(() => {
    const cnv = items.reduce((sum, item) => sum + Number(item.sl_cnv || 0), 0);
    const contractor = items.reduce((sum, item) => sum + Number(item.sl_nha_thau || 0), 0);
    return {
      cnv,
      contractor,
      total: cnv + contractor,
      groups: new Set(items.map((item) => item.nhom_phu_trach)).size,
      leaders: new Set(items.map((item) => item.so_danh_bo)).size,
    };
  }, [items]);

  const groupTotals = useMemo(() => GROUPS.map((name) => ({
    name,
    total: items
      .filter((item) => item.nhom_phu_trach === name)
      .reduce((sum, item) => sum + Number(item.sl_cnv || 0) + Number(item.sl_nha_thau || 0), 0),
  })), [items]);

  const maxGroup = Math.max(1, ...groupTotals.map((item) => item.total));
  const contractorPct = summary.total ? (summary.contractor / summary.total) * 100 : 0;
  const cnvPct = summary.total ? (summary.cnv / summary.total) * 100 : 0;
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function logout() {
    await fetch('/api/dashboard/logout', { method: 'POST' });
    router.replace('/dashboard/login');
    router.refresh();
  }

  const exportUrl = `/api/dashboard/export?${new URLSearchParams({ from, to }).toString()}`;

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <a className="dashboard-brand" href="/"><span><Icon name="food" /></span><strong>Đăng ký suất ăn</strong></a>
        <nav>
          <a className="active" href="#overview"><Icon name="home" />Tổng quan</a>
          <a href="#details"><Icon name="list" />Chi tiết đăng ký</a>
          <a href="#history"><Icon name="history" />Lịch sử chỉnh sửa</a>
          <a href="#groups"><Icon name="users" />Nhóm bảo trì</a>
          <a href="/dashboard/login"><Icon name="settings" />Cài đặt mã xem</a>
        </nav>
        <div className="sidebar-profile">
          <span><Icon name="user" /></span>
          <div><strong>Quản lý hệ thống</strong><small>Phiên xem 8 giờ</small></div>
          <button onClick={logout} title="Đăng xuất"><Icon name="logout" size={19} /></button>
        </div>
      </aside>

      <section className="dashboard-main" id="overview">
        <header className="dashboard-header">
          <div><span className="dashboard-eyebrow">Tổng quan vận hành</span><h1>Dashboard tổng hợp suất ăn</h1><p>Theo dõi số lượng đăng ký theo ngày, nhóm và người đăng ký.</p></div>
          <a className="mobile-back-link" href="/">Trang đăng ký</a>
        </header>

        <section className="dashboard-toolbar">
          <label><span>Từ ngày</span><div className="toolbar-input"><Icon name="calendar" size={18} /><input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></div></label>
          <label><span>Đến ngày</span><div className="toolbar-input"><Icon name="calendar" size={18} /><input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></div></label>
          <label className="toolbar-search"><span>Tìm kiếm</span><div className="toolbar-input"><Icon name="search" size={18} /><input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Số danh bộ / họ tên / nhóm" /></div></label>
          <a className="export-button" href={exportUrl}><Icon name="download" size={19} />Xuất Excel</a>
          <button className="refresh-button" onClick={loadData}><Icon name="refresh" size={18} />Cập nhật</button>
          <div className="updated-pill"><span />Đã cập nhật {updatedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
        </section>

        {error && <div className="dashboard-error">{error}</div>}

        <section className="kpi-grid" aria-busy={loading}>
          <KpiCard tone="blue" icon="food" label="Tổng suất" value={summary.total} />
          <KpiCard tone="blue" icon="user" label="CNV" value={summary.cnv} />
          <KpiCard tone="orange" icon="food" label="Nhà thầu" value={summary.contractor} />
          <KpiCard tone="purple" icon="users" label="Số nhóm đã đăng ký" value={summary.groups} />
          <KpiCard tone="teal" icon="check" label="Số trưởng nhóm đã nhập" value={summary.leaders} />
        </section>

        <section className="chart-grid" id="groups">
          <article className="dashboard-card bar-card">
            <div className="card-title"><div><Icon name="chart" /><h2>Số suất theo nhóm</h2></div><span>{GROUPS.length} nhóm</span></div>
            <div className="bar-chart">
              {groupTotals.map((item) => (
                <div className="bar-column" key={item.name}>
                  <div className="bar-value">{item.total}</div>
                  <div className="bar-track"><div className="bar-fill" style={{ height: `${Math.max(item.total ? 8 : 0, item.total / maxGroup * 100)}%` }} /></div>
                  <div className="bar-label" title={item.name}>{item.name}</div>
                </div>
              ))}
            </div>
          </article>

          <article className="dashboard-card donut-card">
            <div className="card-title"><div><Icon name="chart" /><h2>Tỷ lệ CNV / Nhà thầu</h2></div></div>
            <div className="donut-content">
              <div className="donut" style={{ background: `conic-gradient(#1677ff 0 ${cnvPct}%, #ff7a1a ${cnvPct}% 100%)` }}>
                <div><strong>{summary.total}</strong><span>Tổng suất</span></div>
              </div>
              <div className="donut-legend">
                <div><span className="legend-dot blue" /><p><strong>CNV</strong><small>{summary.cnv} ({cnvPct.toFixed(1)}%)</small></p></div>
                <div><span className="legend-dot orange" /><p><strong>Nhà thầu</strong><small>{summary.contractor} ({contractorPct.toFixed(1)}%)</small></p></div>
              </div>
            </div>
          </article>
        </section>

        <section className="data-grid">
          <article className="dashboard-card table-card" id="details">
            <div className="card-title"><div><Icon name="list" /><h2>Chi tiết đăng ký</h2></div><span>{items.length} bản ghi</span></div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Thời gian</th><th>Số danh bộ</th><th>Họ tên</th><th>Nhóm</th><th>CNV</th><th>Nhà thầu</th><th>Tổng</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {pageItems.length ? pageItems.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDateTime(item.thoi_gian_nhap)}</td><td>{item.so_danh_bo}</td><td>{item.ho_ten || '—'}</td><td><strong>{item.nhom_phu_trach}</strong></td>
                      <td>{item.sl_cnv}</td><td>{item.sl_nha_thau}</td><td><strong>{item.sl_cnv + item.sl_nha_thau}</strong></td>
                      <td><span className="table-status"><Icon name="check" size={15} />Đã xác nhận</span></td>
                    </tr>
                  )) : <tr><td colSpan="8" className="table-empty">{loading ? 'Đang tải dữ liệu...' : 'Không có dữ liệu trong khoảng đã chọn.'}</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span>Hiển thị {items.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, items.length)} trong {items.length}</span>
              <div className="pagination">
                <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>‹</button>
                {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((number) => <button className={number === currentPage ? 'active' : ''} onClick={() => setPage(number)} key={number}>{number}</button>)}
                <button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>›</button>
              </div>
            </div>
          </article>

          <article className="dashboard-card history-card" id="history">
            <div className="card-title"><div><Icon name="history" /><h2>Lịch sử chỉnh sửa</h2></div><span>{history.length} thay đổi</span></div>
            <div className="history-list">
              {history.slice(0, 8).map((row) => (
                <div className="history-item" key={row.id}>
                  <span className="history-marker" />
                  <div className="history-body"><div><strong>{row.ho_ten || row.so_danh_bo}</strong><time>{formatDateTime(row.thoi_gian)}</time></div><p>{row.nhom_phu_trach}</p><small><HistoryChange row={row} /></small></div>
                </div>
              ))}
              {!history.length && <div className="table-empty">Chưa có lịch sử trong khoảng đã chọn.</div>}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
