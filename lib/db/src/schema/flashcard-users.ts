import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const flashcardUsersTable = pgTable("flashcard_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFlashcardUserSchema = createInsertSchema(flashcardUsersTable).omit({ id: true, createdAt: true });
export type InsertFlashcardUser = z.infer<typeof insertFlashcardUserSchema>;
export type FlashcardUser = typeof flashcardUsersTable.$inferSelect;
