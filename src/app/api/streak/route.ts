import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts } from "@/db/schema";

export const dynamic = "force-dynamic";

/** GET /api/streak — consecutive active days (any language), today optional */
export async function GET() {
  const rows = db
    .select({
      day: sql<string>`date(${attempts.createdAt} / 1000, 'unixepoch', 'localtime')`.as("day"),
    })
    .from(attempts)
    .groupBy(sql`day`)
    .orderBy(sql`day desc`)
    .limit(400)
    .all()
    .map((r) => r.day);

  const daySet = new Set(rows);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const today = new Date();
  const todayStr = fmt(today);
  const activeToday = daySet.has(todayStr);

  // start from today if active, else yesterday
  const cursor = new Date(today);
  if (!activeToday) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (daySet.has(fmt(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return NextResponse.json({ streak, activeToday });
}
