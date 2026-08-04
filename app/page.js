'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/components/Icons';
import { ELECTRICAL_GROUPS, MECHANICAL_GROUPS } from '@/lib/groups';

const DEFAULT_CONFIG = {
  dateLabel: 'Hôm nay',
  cutoff: null,
  locked: false,
};

function Quantity({ label, value, onChange }) {
  const update = (next) => onChange(Math.max(0, Number.isFinite(next) ? Math.trunc(next) : 0));
  return (
    <div className="quantity-field">
      <label>{label}</label>
      <div className="stepper">
        <button type="button" aria-label={`Giảm ${label}`} onClick={() => update(value - 1)}>−</button>
        <input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={value}
          onChange={(event) => update(Number(event.target.value))}
        />
        <button type="button" aria-label={`Tăng ${label}`} onClick={() => update(value + 1)}>+</button>
      </div>
    </div>
  );
}

export default function RegistrationPage() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [employeeState, setEmployeeState] = useState('idle');
  const [group, setGroup] = useState(MECHANICAL_GROUPS[0]);
  const [cnv, setCnv] = useState(0);
  const [contractor, setContractor] = useState(0);
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const abortRef = useRef(null);

  useEffect(() => {
    fetch('/api/config', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setConfig({ ...DEFAULT_CONFIG, ...data }))
      .catch(() => setConfig(DEFAULT_CONFIG));
  }, []);

  const loadToday = useCallback(async (id) => {
    if (!id) return setItems([]);
    try {
      const response = await fetch(`/api/dang-ky?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await response.json();
      if (response.ok) setItems(data.items || []);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    const id = employeeId.trim();
    setEmployeeName('');
    setItems([]);
    if (id.length < 4) {
      setEmployeeState('idle');
      return undefined;
    }

    setEmployeeState('loading');
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const params = new URLSearchParams({ id });
        const response = await fetch(`/api/nhan-vien?${params}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Không tìm thấy nhân viên.');
        setEmployeeName(data.ho_ten);
        setEmployeeState('valid');
        loadToday(id);
      } catch (error) {
        if (error.name === 'AbortError') return;
        setEmployeeName(error.message || 'Không thể tra cứu danh bộ.');
        setEmployeeState('invalid');
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [employeeId, loadToday]);

  const total = cnv + contractor;
  const canSubmit = employeeState === 'valid' && total > 0 && !submitting && !config.locked;

  const currentAction = useMemo(
    () => items.some((item) => item.nhom_phu_trach === group) ? 'Cập nhật đăng ký' : 'Xác nhận đăng ký',
    [items, group],
  );

  async function submit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const response = await fetch('/api/dang-ky', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          so_danh_bo: employeeId.trim(),
          nhom_phu_trach: group,
          sl_cnv: cnv,
          sl_nha_thau: contractor,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể lưu đăng ký.');
      setNotice({ type: 'success', text: data.message });
      await loadToday(employeeId.trim());
      setCnv(0);
      setContractor(0);
      document.getElementById('today-list')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Có lỗi xảy ra.' });
    } finally {
      setSubmitting(false);
    }
  }

  function editItem(item) {
    setGroup(item.nhom_phu_trach);
    setCnv(Number(item.sl_cnv || 0));
    setContractor(Number(item.sl_nha_thau || 0));
    window.scrollTo({ top: 230, behavior: 'smooth' });
  }

  function resetQuantities() {
    setCnv(0);
    setContractor(0);
    setNotice(null);
  }

  return (
    <main className="registration-shell" id="top">
      <header className="mobile-hero">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="brand-row">
          <div className="brand-mark"><Icon name="food" size={24} /></div>
          <a href="/dashboard" className="dashboard-link">Xem tổng hợp</a>
        </div>
        <h1>Đăng ký suất ăn</h1>
        <p>Đăng ký cho tổ/nhóm phụ trách</p>
      </header>

      <section className="registration-content">
        <div className="date-status-card">
          <div className="date-line"><Icon name="calendar" size={20} /><strong>{config.dateLabel}</strong></div>
          <span className={`status-pill ${config.locked ? 'locked' : 'open'}`}>
            <span className="status-dot" />
            {config.locked ? 'Đã khóa đăng ký' : 'Đang mở đăng ký'}
          </span>
        </div>

        <form onSubmit={submit} className="registration-form">
          <section className="form-card">
            <div className="section-heading">
              <span className="section-icon"><Icon name="user" /></span>
              <div><span className="section-kicker">Bước 1</span><h2>Thông tin trưởng nhóm</h2></div>
            </div>

            <label className="field-label" htmlFor="employee-id">Số danh bộ</label>
            <div className={`input-wrap ${employeeState}`}>
              <input
                id="employee-id"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Nhập số danh bộ"
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value.replace(/\D/g, '').slice(0, 20))}
              />
              {employeeState === 'loading' && <span className="mini-spinner" />}
              {employeeState === 'valid' && <span className="input-state valid"><Icon name="check" size={19} /></span>}
            </div>

            <label className="field-label" htmlFor="employee-name">Họ và tên</label>
            <div className={`read-only-field ${employeeState === 'invalid' ? 'error-text' : ''}`} id="employee-name">
              {employeeName || 'Họ tên sẽ tự động hiển thị'}
            </div>
            <p className="helper-text">Trưởng nhóm có thể cập nhật nhiều lần trước giờ khóa{config.cutoff ? ` ${config.cutoff}` : ''}.</p>
          </section>

          <section className="form-card">
            <div className="section-heading">
              <span className="section-icon"><Icon name="users" /></span>
              <div><span className="section-kicker">Bước 2</span><h2>Nhóm phụ trách</h2></div>
            </div>
            <label className="field-label" htmlFor="group">Chọn nhóm đăng ký</label>
            <div className="select-wrap">
              <select id="group" value={group} onChange={(event) => setGroup(event.target.value)}>
                <optgroup label="Bảo trì cơ khí">
                  {MECHANICAL_GROUPS.map((item) => <option key={item}>{item}</option>)}
                </optgroup>
                <optgroup label="Bảo trì điện">
                  {ELECTRICAL_GROUPS.map((item) => <option key={item}>{item}</option>)}
                </optgroup>
              </select>
              <Icon name="chevron" size={20} />
            </div>
            <p className="helper-text">Có thể đăng ký lần lượt cho nhiều nhóm. Mỗi nhóm được lưu thành một dòng riêng.</p>
          </section>

          <section className="form-card">
            <div className="section-heading">
              <span className="section-icon"><Icon name="food" /></span>
              <div><span className="section-kicker">Bước 3</span><h2>Số lượng suất ăn</h2></div>
            </div>
            <div className="quantity-grid">
              <Quantity label="Suất Xưởng Sửa chữa" value={cnv} onChange={setCnv} />
              <Quantity label="Suất nhà thầu" value={contractor} onChange={setContractor} />
            </div>
            <div className="quantity-total"><span>Tổng số suất</span><strong>{total}</strong></div>
            {total === 0 && <p className="validation-note">Ít nhất một loại suất ăn phải lớn hơn 0.</p>}

            <button className="primary-button" type="submit" disabled={!canSubmit}>
              {submitting ? <span className="button-spinner" /> : <Icon name="check" />}
              {submitting ? 'Đang lưu...' : currentAction}
            </button>
            <button className="secondary-button" type="button" onClick={resetQuantities}>
              <Icon name="refresh" size={19} /> Nhập lại số lượng
            </button>
          </section>
        </form>

        {notice && <div className={`notice ${notice.type}`} role="status">{notice.text}</div>}

        <section className="today-card" id="today-list">
          <div className="today-header">
            <div className="section-heading compact">
              <span className="section-icon"><Icon name="list" /></span>
              <div><span className="section-kicker">Hôm nay</span><h2>Đăng ký của trưởng nhóm</h2></div>
            </div>
            <span className="record-count">{items.length} nhóm</span>
          </div>

          {employeeState !== 'valid' ? (
            <div className="empty-state"><Icon name="user" size={30} /><p>Nhập số danh bộ để xem các đăng ký hôm nay.</p></div>
          ) : items.length === 0 ? (
            <div className="empty-state"><Icon name="list" size={30} /><p>Chưa có nhóm nào được đăng ký hôm nay.</p></div>
          ) : (
            <div className="today-list">
              {items.map((item) => (
                <div className="today-row" key={item.id || item.nhom_phu_trach}>
                  <div className="today-row-main">
                    <strong>{item.nhom_phu_trach}</strong>
                    <span>{Number(item.sl_cnv)} Xưởng Sửa chữa&nbsp;&nbsp;/&nbsp;&nbsp;{Number(item.sl_nha_thau)} NT</span>
                  </div>
                  <button type="button" onClick={() => editItem(item)} disabled={config.locked}>
                    <Icon name="edit" size={18} /> Sửa
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>

      <nav className="mobile-bottom-nav" aria-label="Điều hướng">
        <a className="active" href="#top"><Icon name="list" /><span>Đăng ký</span></a>
        <a href="#today-list"><Icon name="history" /><span>Lịch sử</span></a>
      </nav>
    </main>
  );
}
