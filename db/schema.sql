-- Tiệm Bánh Matcha: lưu tiệm lên mây, bảng xếp hạng, thông báo đẩy. Chạy lại nhiều lần vẫn an toàn.
CREATE TABLE IF NOT EXISTS shops (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code_hash   text        NOT NULL UNIQUE,            -- sha256 của mã tiệm; mã gốc chỉ nằm trên máy người chơi
  name        text        NOT NULL DEFAULT '',        -- tên hiện trên bảng xếp hạng ('' = ẩn)
  earned      bigint      NOT NULL DEFAULT 0,         -- tổng xu kiếm được (tiêu chí xếp hạng)
  lv          integer     NOT NULL DEFAULT 1,
  state       jsonb       NOT NULL,                   -- toàn bộ tiến trình (bản sao lưu)
  app_ver     text        NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
-- bảng xếp hạng: chỉ tiệm có tên, sắp theo xu
CREATE INDEX IF NOT EXISTS shops_rank_idx ON shops (earned DESC, id) WHERE name <> '';

CREATE TABLE IF NOT EXISTS push_subs (
  endpoint    text        PRIMARY KEY,
  shop_id     bigint      NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  sub         jsonb       NOT NULL,                   -- PushSubscription (endpoint + keys)
  her         text        NOT NULL DEFAULT '',        -- tên để chào trong thông báo
  morning     boolean     NOT NULL DEFAULT true,      -- 7:00
  night       boolean     NOT NULL DEFAULT true,      -- 23:00
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_subs_shop_idx ON push_subs (shop_id);
