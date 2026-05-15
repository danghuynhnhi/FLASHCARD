import { Router } from "express";
import { db, packsTable, wordsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/users/:userId/packs", async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const rows = await db
    .select({
      id: packsTable.id,
      userId: packsTable.userId,
      name: packsTable.name,
      language: packsTable.language,
      learned: packsTable.learned,
      wordCount: sql<number>`cast(count(${wordsTable.id}) as int)`,
    })
    .from(packsTable)
    .leftJoin(wordsTable, eq(wordsTable.packId, packsTable.id))
    .where(eq(packsTable.userId, userId))
    .groupBy(packsTable.id)
    .orderBy(packsTable.createdAt);
  res.json(rows);
});

router.post("/users/:userId/packs", async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const { name, language } = req.body;
  if (!name || !language) {
    res.status(400).json({ error: "name and language are required" });
    return;
  }
  const [created] = await db
    .insert(packsTable)
    .values({ userId, name: name.trim(), language, learned: 0 })
    .returning();
  res.status(201).json({ ...created, wordCount: 0 });
});

router.patch("/packs/:packId", async (req, res) => {
  const packId = parseInt(req.params.packId, 10);
  const { name, learned } = req.body;
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name.trim();
  if (learned !== undefined) updateData.learned = learned;

  const [updated] = await db
    .update(packsTable)
    .set(updateData)
    .where(eq(packsTable.id, packId))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Pack not found" });
    return;
  }
  const [{ wordCount }] = await db
    .select({ wordCount: sql<number>`cast(count(${wordsTable.id}) as int)` })
    .from(wordsTable)
    .where(eq(wordsTable.packId, packId));
  res.json({ ...updated, wordCount });
});

router.delete("/packs/:packId", async (req, res) => {
  const packId = parseInt(req.params.packId, 10);
  const deleted = await db
    .delete(packsTable)
    .where(eq(packsTable.id, packId))
    .returning();
  if (!deleted.length) {
    res.status(404).json({ error: "Pack not found" });
    return;
  }
  res.status(204).send();
});

export default router;
