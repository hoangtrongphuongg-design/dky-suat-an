-- Chạy toàn bộ file này trong Neon SQL Editor trước khi đưa ứng dụng lên Vercel.
-- Múi giờ nghiệp vụ được xử lý tại ứng dụng theo Asia/Ho_Chi_Minh.

CREATE TABLE IF NOT EXISTS nhan_vien (
  so_danh_bo VARCHAR(20) PRIMARY KEY,
  ho_ten TEXT NOT NULL,
  dang_hoat_dong BOOLEAN NOT NULL DEFAULT TRUE,
  ngay_tao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE nhan_vien
  ADD COLUMN IF NOT EXISTS dang_hoat_dong BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS ngay_tao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS dang_ky_suat_an (
  id BIGSERIAL PRIMARY KEY,
  so_danh_bo VARCHAR(20) NOT NULL,
  ngay_dang_ky DATE NOT NULL,
  nhom_phu_trach TEXT NOT NULL,
  sl_cnv INTEGER NOT NULL DEFAULT 0,
  sl_nha_thau INTEGER NOT NULL DEFAULT 0,
  thoi_gian_nhap TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE dang_ky_suat_an
  ADD COLUMN IF NOT EXISTS id BIGSERIAL,
  ADD COLUMN IF NOT EXISTS nhom_phu_trach TEXT,
  ADD COLUMN IF NOT EXISTS thoi_gian_nhap TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE dang_ky_suat_an
SET nhom_phu_trach = 'Cối'
WHERE nhom_phu_trach IS NULL OR BTRIM(nhom_phu_trach) = '';

ALTER TABLE dang_ky_suat_an
  ALTER COLUMN nhom_phu_trach SET NOT NULL,
  ALTER COLUMN sl_cnv SET DEFAULT 0,
  ALTER COLUMN sl_nha_thau SET DEFAULT 0,
  ALTER COLUMN thoi_gian_nhap SET DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'dang_ky_suat_an'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE dang_ky_suat_an
      ADD CONSTRAINT dang_ky_suat_an_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- Loại bỏ unique cũ đúng theo (số danh bộ, ngày) để một trưởng nhóm đăng ký được nhiều nhóm.
DO $$
DECLARE
  constraint_name TEXT;
  index_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'dang_ky_suat_an'::regclass
      AND contype = 'u'
      AND REPLACE(pg_get_constraintdef(oid), ' ', '') = 'UNIQUE(so_danh_bo,ngay_dang_ky)'
  LOOP
    EXECUTE format('ALTER TABLE dang_ky_suat_an DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;

  FOR index_name IN
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'dang_ky_suat_an'
      AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
      AND REPLACE(indexdef, ' ', '') LIKE '%(so_danh_bo,ngay_dang_ky)%'
      AND indexname <> 'uq_dang_ky_suat_an_nguoi_ngay_nhom'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I', index_name);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dang_ky_suat_an_nguoi_ngay_nhom
  ON dang_ky_suat_an (so_danh_bo, ngay_dang_ky, nhom_phu_trach);

CREATE INDEX IF NOT EXISTS idx_dang_ky_suat_an_ngay
  ON dang_ky_suat_an (ngay_dang_ky DESC);

CREATE INDEX IF NOT EXISTS idx_dang_ky_suat_an_thoi_gian
  ON dang_ky_suat_an (thoi_gian_nhap DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_dang_ky_suat_an_sl_cnv'
  ) THEN
    ALTER TABLE dang_ky_suat_an
      ADD CONSTRAINT ck_dang_ky_suat_an_sl_cnv CHECK (sl_cnv >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_dang_ky_suat_an_sl_nha_thau'
  ) THEN
    ALTER TABLE dang_ky_suat_an
      ADD CONSTRAINT ck_dang_ky_suat_an_sl_nha_thau CHECK (sl_nha_thau >= 0) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_dang_ky_suat_an_co_suat'
  ) THEN
    ALTER TABLE dang_ky_suat_an
      ADD CONSTRAINT ck_dang_ky_suat_an_co_suat CHECK (sl_cnv > 0 OR sl_nha_thau > 0) NOT VALID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS lich_su_dang_ky_suat_an (
  id BIGSERIAL PRIMARY KEY,
  dang_ky_id BIGINT,
  so_danh_bo VARCHAR(20) NOT NULL,
  nhom_phu_trach TEXT NOT NULL,
  sl_cnv_truoc INTEGER,
  sl_cnv_sau INTEGER NOT NULL,
  sl_nha_thau_truoc INTEGER,
  sl_nha_thau_sau INTEGER NOT NULL,
  hanh_dong VARCHAR(30) NOT NULL,
  dia_chi_ip TEXT,
  thoi_gian TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lich_su_dang_ky_thoi_gian
  ON lich_su_dang_ky_suat_an (thoi_gian DESC);

CREATE INDEX IF NOT EXISTS idx_lich_su_dang_ky_so_danh_bo
  ON lich_su_dang_ky_suat_an (so_danh_bo, thoi_gian DESC);

-- Có thể bật khóa ngoại sau khi đã chắc chắn không có dữ liệu mồ côi.
-- ALTER TABLE dang_ky_suat_an
--   ADD CONSTRAINT fk_dang_ky_nhan_vien
--   FOREIGN KEY (so_danh_bo) REFERENCES nhan_vien(so_danh_bo);

-- ============================================================
-- Suất ăn đêm: thêm loai_suat ('xe' | 'dem') để phân biệt suất
-- ăn xế (ăn cùng ngày, chốt 9h sáng cùng ngày) và suất ăn đêm
-- (ăn 23h ngày X, chốt 9h sáng ngày X). ngay_dang_ky luôn là
-- ngày ĂN, không phải ngày nhập liệu.
-- ============================================================

ALTER TABLE dang_ky_suat_an
  ADD COLUMN IF NOT EXISTS loai_suat VARCHAR(10) NOT NULL DEFAULT 'xe';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_dang_ky_suat_an_loai_suat'
  ) THEN
    ALTER TABLE dang_ky_suat_an
      ADD CONSTRAINT ck_dang_ky_suat_an_loai_suat CHECK (loai_suat IN ('xe', 'dem'));
  END IF;
END $$;

-- Đổi unique index sang 4 cột (thêm loai_suat) để 1 người có thể
-- đăng ký cả suất xế lẫn suất đêm cho cùng nhóm/ngày mà không đụng nhau.
-- Phải DROP index cũ trước khi tạo index mới TÊN MỚI — nếu tái dùng
-- đúng tên cũ với IF NOT EXISTS, Postgres sẽ bỏ qua vì tên đã tồn tại
-- và constraint cũ (3 cột) vẫn còn hiệu lực, khiến ON CONFLICT (4 cột)
-- trong code lỗi ngay khi ghi dữ liệu.
DROP INDEX IF EXISTS uq_dang_ky_suat_an_nguoi_ngay_nhom;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dang_ky_suat_an_nguoi_ngay_nhom_loai
  ON dang_ky_suat_an (so_danh_bo, ngay_dang_ky, nhom_phu_trach, loai_suat);

ALTER TABLE lich_su_dang_ky_suat_an
  ADD COLUMN IF NOT EXISTS loai_suat VARCHAR(10) NOT NULL DEFAULT 'xe';

-- ngay_dang_ky trong lịch sử: dùng để lọc theo ngày ĂN thay vì ngày
-- nhập (thoi_gian), vì suất đêm có 2 ngày này lệch nhau 1 hôm.
ALTER TABLE lich_su_dang_ky_suat_an
  ADD COLUMN IF NOT EXISTS ngay_dang_ky DATE;

UPDATE lich_su_dang_ky_suat_an l
SET ngay_dang_ky = d.ngay_dang_ky
FROM dang_ky_suat_an d
WHERE d.id = l.dang_ky_id AND l.ngay_dang_ky IS NULL;

UPDATE lich_su_dang_ky_suat_an
SET ngay_dang_ky = (thoi_gian AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
WHERE ngay_dang_ky IS NULL;

ALTER TABLE lich_su_dang_ky_suat_an
  ALTER COLUMN ngay_dang_ky SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lich_su_dang_ky_ngay_dang_ky
  ON lich_su_dang_ky_suat_an (ngay_dang_ky DESC);

-- Ghi chú tùy chọn: trưởng nhóm ghi lý do đăng ký suất ăn hôm đó (không
-- bắt buộc), hiển thị trên dashboard và trong file xuất Excel.
ALTER TABLE dang_ky_suat_an
  ADD COLUMN IF NOT EXISTS ghi_chu TEXT;
