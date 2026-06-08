import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { packsTable } from "./packs";

export const wordsTable = pgTable("words", {
  id: serial("id").primaryKey(),
  packId: integer("pack_id").notNull().references(() => packsTable.id, { onDelete: "cascade" }),
  term: text("term").notNull(),
  pinyin: text("pinyin"),
    meaning: text("meaning").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWordSchema = createInsertSchema(wordsTable).omit({ id: true, createdAt: true });
export type InsertWord = z.infer<typeof insertWordSchema>;
export type Word = typeof wordsTable.$inferSelect;
