/* Tạo bảng trên Neon: node --env-file=.env.local scripts/db-init.mjs */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL);
const ddl = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8")
  .split("\n").map(l => l.replace(/--.*$/, "")).join("\n")
  .split(";").map(s => s.trim()).filter(Boolean);
for (const q of ddl) await sql.query(q);
const t = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1`;
console.log("Bảng:", t.map(r => r.table_name).join(", "));
