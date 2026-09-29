-- Um evento por linha. "seq" é o cursor do sync: cada aparelho pede "o que veio depois do seq X".
CREATE TABLE IF NOT EXISTS eventos (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  dono TEXT NOT NULL,
  em INTEGER NOT NULL,
  aparelho TEXT NOT NULL,
  corpo TEXT NOT NULL,
  recebido INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS eventos_dono_seq ON eventos (dono, seq);
