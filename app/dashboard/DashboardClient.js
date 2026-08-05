'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icons';
import { ELECTRICAL_GROUPS, GROUPS, MECHANICAL_GROUPS } from '@/lib/groups';
import { MEAL_TYPE_LABELS, MEAL_TYPE_SHORT_LABELS } from '@/lib/mealTypes';

const PAGE_SIZE = 8;
const TYPE_FILTERS = [
  { value: 'xe', label: 'Suất xế' },
  { value: 'dem', label: 'Suất đêm' },
  { value: 'all', label: 'Tất cả' },
];

const EMPTY_ADMIN_FORM = { soDanhBo: '', hoTen: '', ngayDangKy: '', loaiSuat: 'xe', group: MECHANICAL_GROUPS[0], cnv: 0, contractor: 0, ghiChu: '', daHuy: false };

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
  if (row.sl_cnv_truoc !== row.sl_cnv_sau) changes.push(`Xưởng Sửa chữa: ${row.sl_cnv_truoc ?? 0} → ${row.sl_cnv_sau}`);
  if (row.sl_nha_thau_truoc !== row.sl_nha_thau_sau) changes.push(`Nhà thầu: ${row.sl_nha_thau_truoc ?? 0} → ${row.sl_nha_thau_sau}`);
  return <>{changes.length ? changes.join(' · ') : row.hanh_dong}</>;
}

function AdminRegistrationModal({ mode, form, saving, toggling, error, onChange, onClose, onSubmit, onToggleCancel }) {
  const readOnly = mode === 'edit';
  const update = (patch) => onChange({ ...form, ...patch });
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{readOnly ? 'Sửa đăng ký (quyền admin)' : 'Thêm đăng ký (quyền admin)'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng">×</button>
        </div>
        <form onSubmit={onSubmit} className="modal-form">
          <label className="field-label" htmlFor="admin-so-danh-bo">Số danh bộ</label>
          <input
            id="admin-so-danh-bo"
            inputMode="numeric"
            value={form.soDanhBo}
            disabled={readOnly}
            placeholder="Nhập số danh bộ"
            onChange={(event) => update({ soDanhBo: event.target.value.replace(/\D/g, '').slice(0, 20) })}
          />
          {readOnly && form.hoTen && <p className="helper-text">{form.hoTen}</p>}

          <label className="field-label" htmlFor="admin-ngay-an">Ngày ăn</label>
          <input
            id="admin-ngay-an"
            type="date"
            value={form.ngayDangKy}
            disabled={readOnly}
            onChange={(event) => update({ ngayDangKy: event.target.value })}
          />

          <label className="field-label" htmlFor="admin-loai-suat">Loại suất</label>
          <select id="admin-loai-suat" value={form.loaiSuat} disabled={readOnly} onChange={(event) => update({ loaiSuat: event.target.value })}>
            {Object.keys(MEAL_TYPE_LABELS).map((type) => <option key={type} value={type}>{MEAL_TYPE_LABELS[type]}</option>)}
          </select>

          <label className="field-label" htmlFor="admin-nhom">Nhóm phụ trách</label>
          <select id="admin-nhom" value={form.group} disabled={readOnly} onChange={(event) => update({ group: event.target.value })}>
            <optgroup label="Bảo trì cơ khí">{MECHANICAL_GROUPS.map((name) => <option key={name}>{name}</option>)}</optgroup>
            <optgroup label="Bảo trì điện">{ELECTRICAL_GROUPS.map((name) => <option key={name}>{name}</option>)}</optgroup>
          </select>

          <div className="modal-quantity-grid">
            <label className="field-label" htmlFor="admin-cnv">
              Xưởng Sửa chữa
              <input id="admin-cnv" type="number" min="0" inputMode="numeric" value={form.cnv}
                onChange={(event) => update({ cnv: Math.max(0, Math.trunc(Number(event.target.value)) || 0) })} />
            </label>
            <label className="field-label" htmlFor="admin-nha-thau">
              Nhà thầu
              <input id="admin-nha-thau" type="number" min="0" inputMode="numeric" value={form.contractor}
                onChange={(event) => update({ contractor: Math.max(0, Math.trunc(Number(event.target.value)) || 0) })} />
            </label>
          </div>

          <label className="field-label" htmlFor="admin-ghi-chu">Ghi chú (không bắt buộc)</label>
          <textarea
            id="admin-ghi-chu"
            className="note-textarea"
            rows={2}
            maxLength={500}
            placeholder="Lý do đăng ký suất ăn..."
            value={form.ghiChu}
            onChange={(event) => update({ ghiChu: event.target.value })}
          />

          {error && <p className="modal-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Hủy</button>
            <button type="submit" className="primary-button" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
          </div>

          {readOnly && (
            <div className="modal-danger-zone">
              {form.daHuy ? (
                <p className="modal-cancelled-note"><Icon name="trash" size={16} />Đăng ký này đang ở trạng thái đã hủy — không tính vào tổng suất ăn.</p>
              ) : null}
              <button
                type="button"
                className={form.daHuy ? 'secondary-button' : 'danger-button'}
                onClick={onToggleCancel}
                disabled={toggling}
              >
                <Icon name={form.daHuy ? 'refresh' : 'trash'} size={16} />
                {toggling ? 'Đang xử lý...' : form.daHuy ? 'Khôi phục đăng ký này' : 'Hủy đăng ký này'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default function DashboardClient({ today }) {
  const router = useRouter();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('xe');
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const [todayItems, setTodayItems] = useState([]);
  const [adminMode, setAdminMode] = useState('add');
  const [adminForm, setAdminForm] = useState(null);
  const [adminSaving, setAdminSaving] = useState(false);
  const [adminToggling, setAdminToggling] = useState(false);
  const [adminError, setAdminError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [typeFilter]);

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

  const loadTodayReport = useCallback(async () => {
    try {
      const params = new URLSearchParams({ from: today, to: today });
      const response = await fetch(`/api/dashboard/data?${params}`, { cache: 'no-store' });
      if (response.status === 401) {
        router.replace('/dashboard/login');
        return;
      }
      const data = await response.json();
      if (response.ok) setTodayItems(data.items || []);
    } catch {
      // giữ nguyên số liệu cũ nếu tải lỗi, không cần chặn dashboard
    }
  }, [today, router]);

  useEffect(() => { loadTodayReport(); }, [loadTodayReport]);

  const filteredItems = useMemo(
    () => (typeFilter === 'all' ? items : items.filter((item) => item.loai_suat === typeFilter)),
    [items, typeFilter],
  );
  const filteredHistory = useMemo(
    () => (typeFilter === 'all' ? history : history.filter((row) => row.loai_suat === typeFilter)),
    [history, typeFilter],
  );
  // Dòng đã hủy vẫn hiện trong bảng để theo dõi, nhưng không tính vào
  // KPI/biểu đồ/báo cáo nhanh.
  const activeItems = useMemo(() => filteredItems.filter((item) => !item.da_huy), [filteredItems]);

  const summary = useMemo(() => {
    const cnv = activeItems.reduce((sum, item) => sum + Number(item.sl_cnv || 0), 0);
    const contractor = activeItems.reduce((sum, item) => sum + Number(item.sl_nha_thau || 0), 0);
    return {
      cnv,
      contractor,
      total: cnv + contractor,
      groups: new Set(activeItems.map((item) => item.nhom_phu_trach)).size,
      leaders: new Set(activeItems.map((item) => item.so_danh_bo)).size,
    };
  }, [activeItems]);

  const groupTotals = useMemo(() => GROUPS.map((name) => ({
    name,
    total: activeItems
      .filter((item) => item.nhom_phu_trach === name)
      .reduce((sum, item) => sum + Number(item.sl_cnv || 0) + Number(item.sl_nha_thau || 0), 0),
  })), [activeItems]);

  const todayReport = useMemo(() => {
    const buckets = { xe: { cnv: 0, contractor: 0 }, dem: { cnv: 0, contractor: 0 } };
    for (const item of todayItems) {
      if (item.da_huy) continue;
      const bucket = buckets[item.loai_suat] || buckets.xe;
      bucket.cnv += Number(item.sl_cnv || 0);
      bucket.contractor += Number(item.sl_nha_thau || 0);
    }
    return buckets;
  }, [todayItems]);

  const maxGroup = Math.max(1, ...groupTotals.map((item) => item.total));
  const contractorPct = summary.total ? (summary.contractor / summary.total) * 100 : 0;
  const cnvPct = summary.total ? (summary.cnv / summary.total) * 100 : 0;
  const pages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const pageItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function logout() {
    await fetch('/api/dashboard/logout', { method: 'POST' });
    router.replace('/dashboard/login');
    router.refresh();
  }

  function refreshAll() {
    loadData();
    loadTodayReport();
  }

  function openAddModal() {
    setAdminMode('add');
    setAdminError('');
    setAdminForm({ ...EMPTY_ADMIN_FORM, ngayDangKy: today });
  }

  function openEditModal(item) {
    setAdminMode('edit');
    setAdminError('');
    setAdminForm({
      id: item.id,
      soDanhBo: item.so_danh_bo,
      hoTen: item.ho_ten,
      ngayDangKy: String(item.ngay_dang_ky).slice(0, 10),
      loaiSuat: item.loai_suat,
      group: item.nhom_phu_trach,
      cnv: Number(item.sl_cnv || 0),
      contractor: Number(item.sl_nha_thau || 0),
      ghiChu: item.ghi_chu || '',
      daHuy: Boolean(item.da_huy),
    });
  }

  function closeAdminModal() {
    setAdminForm(null);
  }

  async function submitAdminForm(event) {
    event.preventDefault();
    if (!adminForm) return;
    setAdminSaving(true);
    setAdminError('');
    try {
      const response = await fetch('/api/dashboard/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          so_danh_bo: adminForm.soDanhBo,
          nhom_phu_trach: adminForm.group,
          loai_suat: adminForm.loaiSuat,
          ngay_dang_ky: adminForm.ngayDangKy,
          sl_cnv: adminForm.cnv,
          sl_nha_thau: adminForm.contractor,
          ghi_chu: adminForm.ghiChu,
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.replace('/dashboard/login');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Không thể lưu thay đổi.');
      setAdminForm(null);
      await loadData();
      if (adminForm.ngayDangKy === today) await loadTodayReport();
    } catch (error) {
      setAdminError(error.message || 'Có lỗi xảy ra.');
    } finally {
      setAdminSaving(false);
    }
  }

  async function toggleCancelRegistration() {
    if (!adminForm?.id) return;
    const nextDaHuy = !adminForm.daHuy;
    if (nextDaHuy && !window.confirm('Hủy đăng ký này? Suất ăn sẽ không được tính vào tổng nữa.')) return;
    setAdminToggling(true);
    setAdminError('');
    try {
      const response = await fetch(`/api/dashboard/registration?id=${adminForm.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ da_huy: nextDaHuy }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.replace('/dashboard/login');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'Không thể cập nhật trạng thái.');
      setAdminForm(null);
      await loadData();
      if (adminForm.ngayDangKy === today) await loadTodayReport();
    } catch (error) {
      setAdminError(error.message || 'Có lỗi xảy ra.');
    } finally {
      setAdminToggling(false);
    }
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

        <section className="quick-report" id="quick-report">
          <div className="quick-report-header">
            <div className="quick-report-title"><Icon name="chart" /><h2>Báo cáo nhanh hôm nay</h2><span>{today}</span></div>
            <div className="quick-report-actions">
              <a className="export-button" href={exportUrl}><Icon name="download" size={19} />Xuất Excel</a>
              <button className="admin-add-button" type="button" onClick={openAddModal}><Icon name="plus" size={18} />Thêm đăng ký</button>
              <button className="refresh-button" onClick={refreshAll}><Icon name="refresh" size={18} />Cập nhật</button>
              <div className="updated-pill"><span />Đã cập nhật {updatedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          </div>
          <div className="quick-report-grid">
            <div className="quick-report-tile">
              <span className="quick-report-label"><Icon name="food" size={18} />Suất xế hôm nay</span>
              <strong>{todayReport.xe.cnv + todayReport.xe.contractor}</strong>
              <small>{todayReport.xe.cnv} Xưởng Sửa chữa · {todayReport.xe.contractor} Nhà thầu</small>
            </div>
            <div className="quick-report-tile">
              <span className="quick-report-label"><Icon name="moon" size={18} />Suất đêm hôm nay</span>
              <strong>{todayReport.dem.cnv + todayReport.dem.contractor}</strong>
              <small>{todayReport.dem.cnv} Xưởng Sửa chữa · {todayReport.dem.contractor} Nhà thầu</small>
              <small className="quick-report-note">Đã chốt từ hôm qua</small>
            </div>
          </div>
        </section>

        <section className="dashboard-toolbar">
          <label><span>Từ ngày</span><div className="toolbar-input"><Icon name="calendar" size={18} /><input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></div></label>
          <label><span>Đến ngày</span><div className="toolbar-input"><Icon name="calendar" size={18} /><input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></div></label>
          <label><span>Loại</span><div className="toolbar-input"><Icon name="list" size={18} />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              {TYPE_FILTERS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div></label>
          <label className="toolbar-search"><span>Tìm kiếm</span><div className="toolbar-input"><Icon name="search" size={18} /><input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Số danh bộ / họ tên / nhóm" /></div></label>
        </section>

        {error && <div className="dashboard-error">{error}</div>}

        <section className="kpi-grid" aria-busy={loading}>
          <KpiCard tone="blue" icon="food" label="Tổng suất" value={summary.total} />
          <KpiCard tone="blue" icon="user" label="Xưởng Sửa chữa" value={summary.cnv} />
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
                  <div className="bar-track"><div className="bar-fill" style={{ '--fill': `${Math.max(item.total ? 8 : 0, item.total / maxGroup * 100)}%` }} /></div>
                  <div className="bar-label" title={item.name}>{item.name}</div>
                </div>
              ))}
            </div>
          </article>

          <article className="dashboard-card donut-card">
            <div className="card-title"><div><Icon name="chart" /><h2>Tỷ lệ Xưởng Sửa chữa / Nhà thầu</h2></div></div>
            <div className="donut-content">
              <div className="donut" style={{ background: `conic-gradient(#1677ff 0 ${cnvPct}%, #ff7a1a ${cnvPct}% 100%)` }}>
                <div><strong>{summary.total}</strong><span>Tổng suất</span></div>
              </div>
              <div className="donut-legend">
                <div><span className="legend-dot blue" /><p><strong>Xưởng Sửa chữa</strong><small>{summary.cnv} ({cnvPct.toFixed(1)}%)</small></p></div>
                <div><span className="legend-dot orange" /><p><strong>Nhà thầu</strong><small>{summary.contractor} ({contractorPct.toFixed(1)}%)</small></p></div>
              </div>
            </div>
          </article>
        </section>

        <section className="data-grid">
          <article className="dashboard-card table-card" id="details">
            <div className="card-title"><div><Icon name="list" /><h2>Chi tiết đăng ký</h2></div><span>{filteredItems.length} bản ghi</span></div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Thời gian</th><th>Số danh bộ</th><th>Họ tên</th><th>Nhóm</th><th>Loại</th><th>Ghi chú</th><th>Xưởng Sửa chữa</th><th>Nhà thầu</th><th>Tổng</th><th>Trạng thái</th><th /></tr></thead>
                <tbody>
                  {pageItems.length ? pageItems.map((item) => (
                    <tr key={item.id} className={item.da_huy ? 'row-cancelled' : ''}>
                      <td data-label="Thời gian">{formatDateTime(item.thoi_gian_nhap)}{item.is_late && <span className="late-tag">Muộn</span>}</td>
                      <td data-label="Số danh bộ">{item.so_danh_bo}</td>
                      <td data-label="Họ tên">{item.ho_ten || '—'}</td>
                      <td data-label="Nhóm"><strong>{item.nhom_phu_trach}</strong></td>
                      <td data-label="Loại" title={MEAL_TYPE_LABELS[item.loai_suat] || ''}>{MEAL_TYPE_SHORT_LABELS[item.loai_suat] || item.loai_suat}</td>
                      <td data-label="Ghi chú">{item.ghi_chu || '—'}</td>
                      <td data-label="Xưởng Sửa chữa">{item.sl_cnv}</td>
                      <td data-label="Nhà thầu">{item.sl_nha_thau}</td>
                      <td data-label="Tổng"><strong>{item.sl_cnv + item.sl_nha_thau}</strong></td>
                      <td data-label="Trạng thái" className={item.da_huy ? 'text-danger' : 'text-success'}>{item.da_huy ? 'Đã hủy' : 'Đã xác nhận'}</td>
                      <td data-label=""><button type="button" className="table-edit-button" onClick={() => openEditModal(item)}><Icon name="edit" size={15} />Sửa</button></td>
                    </tr>
                  )) : <tr><td colSpan="11" className="table-empty">{loading ? 'Đang tải dữ liệu...' : 'Không có dữ liệu trong khoảng đã chọn.'}</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="table-footer">
              <span>Hiển thị {filteredItems.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filteredItems.length)} trong {filteredItems.length}</span>
              <div className="pagination">
                <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>‹</button>
                {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((number) => <button className={number === currentPage ? 'active' : ''} onClick={() => setPage(number)} key={number}>{number}</button>)}
                <button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>›</button>
              </div>
            </div>
          </article>

          <article className="dashboard-card history-card" id="history">
            <div className="card-title"><div><Icon name="history" /><h2>Lịch sử chỉnh sửa</h2></div><span>{filteredHistory.length} thay đổi</span></div>
            <div className="history-list">
              {filteredHistory.slice(0, 8).map((row) => (
                <div className="history-item" key={row.id}>
                  <span className="history-marker" />
                  <div className="history-body">
                    <div><strong>{row.ho_ten || row.so_danh_bo}</strong><time>{formatDateTime(row.thoi_gian)}</time></div>
                    <p>
                      <span className={`type-badge ${row.loai_suat}`}>{MEAL_TYPE_LABELS[row.loai_suat] || row.loai_suat}</span>{' '}
                      {row.nhom_phu_trach}
                      {String(row.hanh_dong || '').startsWith('Admin') && <span className="admin-badge">Quyền admin</span>}
                    </p>
                    <small><HistoryChange row={row} /></small>
                  </div>
                </div>
              ))}
              {!filteredHistory.length && <div className="table-empty">Chưa có lịch sử trong khoảng đã chọn.</div>}
            </div>
          </article>
        </section>
      </section>

      {adminForm && (
        <AdminRegistrationModal
          mode={adminMode}
          form={adminForm}
          saving={adminSaving}
          toggling={adminToggling}
          error={adminError}
          onChange={setAdminForm}
          onClose={closeAdminModal}
          onSubmit={submitAdminForm}
          onToggleCancel={toggleCancelRegistration}
        />
      )}
    </main>
  );
}
