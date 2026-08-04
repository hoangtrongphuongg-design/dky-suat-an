'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icons';

export default function LoginForm() {
  const router = useRouter();
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const refs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  function updateDigit(index, raw) {
    const value = raw.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    setError('');
    if (value && index < 3) refs[index + 1].current?.focus();
  }

  function keyDown(index, event) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) refs[index - 1].current?.focus();
  }

  function paste(event) {
    const value = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!value) return;
    event.preventDefault();
    setDigits([...value.padEnd(4, '')]);
    refs[Math.min(value.length, 4) - 1]?.current?.focus();
  }

  async function submit(event) {
    event.preventDefault();
    const pin = digits.join('');
    if (pin.length !== 4) return setError('Vui lòng nhập đủ 4 chữ số.');
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/dashboard/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể xác thực.');
      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err.message);
      setDigits(['', '', '', '']);
      refs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <div className="login-decoration login-decoration-one" />
      <div className="login-decoration login-decoration-two" />
      <section className="login-card">
        <div className="login-logo"><Icon name="food" size={30} /></div>
        <span className="login-eyebrow">Đăng ký suất ăn</span>
        <h1>Dashboard tổng hợp</h1>
        <p>Nhập mã xem 4 chữ số để truy cập số liệu đăng ký.</p>
        <form onSubmit={submit}>
          <div className="pin-fields" onPaste={paste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={refs[index]}
                value={digit}
                onChange={(event) => updateDigit(index, event.target.value)}
                onKeyDown={(event) => keyDown(index, event)}
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label={`Chữ số ${index + 1}`}
                type="password"
                maxLength="1"
              />
            ))}
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="primary-button login-button" disabled={loading}>
            {loading ? <span className="button-spinner" /> : <Icon name="lock" />}
            {loading ? 'Đang xác thực...' : 'Mở dashboard'}
          </button>
        </form>
        <a className="back-registration" href="/">← Quay lại trang đăng ký</a>
      </section>
    </main>
  );
}
