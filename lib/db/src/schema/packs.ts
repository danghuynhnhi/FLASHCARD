import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { flashcardUsersTable } from "./flashcard-users";

export const packsTable = pgTable("packs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => flashcardUsersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  language: text("language").notNull(),
  learned: integer("learned").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPackSchema = createInsertSchema(packsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertPack = z.infer<typeof insertPackSchema>;
export type Pack = typeof packsTable.$inferSelect;