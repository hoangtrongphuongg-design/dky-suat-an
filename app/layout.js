import './globals.css';

export const metadata = {
  title: 'Đăng ký suất ăn',
  description: 'Hệ thống đăng ký và tổng hợp suất ăn bảo trì',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0b63ce',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
