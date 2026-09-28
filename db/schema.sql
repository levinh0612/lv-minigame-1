-- Tiệm Bánh Matcha: tài khoản (username + PIN), lưu tiến trình, bảng xếp hạng, thông báo đẩy.
-- Chạy lại nhiều lần vẫn an toàn: npm run db:init
CREATE TABLE IF NOT EXISTS users (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username     text        NOT NULL UNIQUE,            -- chữ thường a-z 0-9 . _ ; cũng là tên tiệm
  pin_hash     text        NOT NULL,                   -- scrypt(PIN 4 số)
  question     text        NOT NULL,                   -- câu hỏi bí mật (quên PIN)
  answer_hash  text        NOT NULL,
  fails        integer     NOT NULL DEFAULT 0,         -- nhập sai liên tiếp
  locked_until timestamptz,                            -- sai 5 lần: khoá 15 phút
  state        jsonb,                                  -- toàn bộ tiến trình
  earned       bigint      NOT NULL DEFAULT 0,         -- tổng tiền bán hàng (bảng xếp hạng)
  lv           integer     NOT NULL DEFAULT 1,
  rev          integer     NOT NULL DEFAULT 0,
  follow_id    bigint      REFERENCES users(id) ON DELETE SET NULL,   -- người ấy (hiện cạnh nhau)
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_earned_idx ON users (earned DESC, id);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  text        PRIMARY KEY,                 -- sha256 của token trên máy
  user_id     bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  seen_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);

-- tiền bán hàng theo tuần (thứ Hai, giờ Việt Nam)
CREATE TABLE IF NOT EXISTS week_earn (
  week     date   NOT NULL,
  user_id  bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  earned   bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (week, user_id)
);
CREATE INDEX IF NOT EXISTS week_earn_rank_idx ON week_earn (week, earned DESC);

CREATE TABLE IF NOT EXISTS push_subs (
  endpoint    text        PRIMARY KEY,
  user_id     bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sub         jsonb       NOT NULL,
  her         text        NOT NULL DEFAULT '',
  morning     boolean     NOT NULL DEFAULT true,
  night       boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_subs_user_idx ON push_subs (user_id);
