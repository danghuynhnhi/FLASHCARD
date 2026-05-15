import { Router } from "express";
import { db, flashcardUsersTable, packsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/users", async (req, res) => {
  const rows = await db
    .select({
      id: flashcardUsersTable.id,
      name: flashcardUsersTable.name,
      packCount: sql<number>`cast(count(${packsTable.id}) as int)`,
    })
    .from(flashcardUsersTable)
    .leftJoin(packsTable, eq(packsTable.userId, flashcardUsersTable.id))
    .groupBy(flashcardUsersTable.id)
    .orderBy(flashcardUsersTable.createdAt);
  res.json(rows);
});

router.post("/users", async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const existing = await db
    .select()
    .from(flashcardUsersTable)
    .where(eq(flashcardUsersTable.name, name.trim()))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Name already taken" });
    return;
  }
  const [created] = await db
    .insert(flashcardUsersTable)
    .values({ name: name.trim() })
    .returning();
  res.status(201).json({ ...created, packCount: 0 });
});

router.patch("/users/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  const [updated] = await db
    .update(flashcardUsersTable)
    .set({ name: name.trim() })
    .where(eq(flashcardUsersTable.id, userId))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const [{ packCount }] = await db
    .select({ packCount: sql<number>`cast(count(${packsTable.id}) as int)` })
    .from(packsTable)
    .where(eq(packsTable.userId, userId));
  res.json({ ...updated, packCount });
});

router.delete("/users/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const deleted = await db
    .delete(flashcardUsersTable)
    .where(eq(flashcardUsersTable.id, userId))
    .returning();
  if (!deleted.length) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.status(204).send();
});

export default router;
