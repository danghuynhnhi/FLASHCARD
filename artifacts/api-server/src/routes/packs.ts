import { Router } from "express";
import { db, packsTable, wordsTable } from "@workspace/db";
import { and, eq, inArray, sql } from "drizzle-orm";

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
      sortOrder: packsTable.sortOrder,
      wordCount: sql<number>`cast(count(${wordsTable.id}) as int)`,
    })
    .from(packsTable)
    .leftJoin(wordsTable, eq(wordsTable.packId, packsTable.id))
    .where(eq(packsTable.userId, userId))
    .groupBy(packsTable.id)
    .orderBy(
      packsTable.language,
      packsTable.sortOrder,
      packsTable.createdAt,
    );

  res.json(rows);
});

router.post("/users/:userId/packs", async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const { name, language } = req.body;

  if (!name || !language) {
    res.status(400).json({ error: "name and language are required" });
    return;
  }

  const [{ maxOrder }] = await db
    .select({
      maxOrder: sql<number>`coalesce(max(${packsTable.sortOrder}), 0)`,
    })
    .from(packsTable)
    .where(
      and(
        eq(packsTable.userId, userId),
        eq(packsTable.language, language),
      ),
    );

  const [created] = await db
    .insert(packsTable)
    .values({
      userId,
      name: name.trim(),
      language,
      learned: 0,
      sortOrder: maxOrder + 1,
    })
    .returning();

  res.status(201).json({
    ...created,
    wordCount: 0,
  });
});

router.patch("/packs/:packId", async (req, res) => {
  const packId = parseInt(req.params.packId, 10);
  const { name, learned } = req.body;

  const updateData: Record<string, unknown> = {};

  if (name !== undefined) {
    updateData.name = name.trim();
  }

  if (learned !== undefined) {
    updateData.learned = learned;
  }

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
    .select({
      wordCount: sql<number>`cast(count(${wordsTable.id}) as int)`,
    })
    .from(wordsTable)
    .where(eq(wordsTable.packId, packId));

  res.json({
    ...updated,
    wordCount,
  });
});

router.patch("/users/:userId/packs/reorder", async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  const { language, packIds } = req.body;

  if (
    typeof language !== "string" ||
    !Array.isArray(packIds) ||
    packIds.some((id) => typeof id !== "number")
  ) {
    res.status(400).json({
      error: "language and packIds are required",
    });
    return;
  }

  const existing = await db
    .select({
      id: packsTable.id,
    })
    .from(packsTable)
    .where(
      and(
        eq(packsTable.userId, userId),
        eq(packsTable.language, language),
        inArray(packsTable.id, packIds),
      ),
    );

  if (existing.length !== packIds.length) {
    res.status(400).json({
      error: "Invalid packIds",
    });
    return;
  }

  for (let i = 0; i < packIds.length; i++) {
    await db
      .update(packsTable)
      .set({
        sortOrder: i + 1,
      })
      .where(
        and(
          eq(packsTable.userId, userId),
          eq(packsTable.language, language),
          eq(packsTable.id, packIds[i]),
        ),
      );
  }

  res.json({
    ok: true,
  });
});

router.delete("/packs/:packId", async (req, res) => {
  const packId = parseInt(req.params.packId, 10);

  const deleted = await db
    .delete(packsTable)
    .where(eq(packsTable.id, packId))
    .returning();

  if (!deleted.length) {
    res.status(404).json({
      error: "Pack not found",
    });
    return;
  }

  res.status(204).send();
});

export default router;