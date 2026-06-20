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
    .orderBy(packsTable.language, packsTable.sortOrder, packsTable.createdAt);

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
        eq(packsTable.language, language)
      )
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

router.post("/users/:userId/packs/merge", async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const { packIds, name, language } = req.body as {
    packIds: number[];
    name: string;
    language: string;
  };

  if (!Array.isArray(packIds) || packIds.length < 2 || !name || !language) {
    res.status(400).json({
      error: "packIds, name, language are required",
    });
    return;
  }

  const sourcePacks = await db
    .select({
      id: packsTable.id,
      language: packsTable.language,
      userId: packsTable.userId,
    })
    .from(packsTable)
    .where(inArray(packsTable.id, packIds));

  if (sourcePacks.length !== packIds.length) {
    res.status(400).json({
      error: "Some packs do not exist",
    });
    return;
  }

  const invalidPack = sourcePacks.find(
    (p) => p.userId !== userId || p.language !== language
  );

  if (invalidPack) {
    res.status(400).json({
      error: "All packs must belong to this user and same language",
    });
    return;
  }

  const sourceWords = await db
    .select()
    .from(wordsTable)
    .where(inArray(wordsTable.packId, packIds));

  const seen = new Map<string, (typeof sourceWords)[number]>();
  const duplicates: typeof sourceWords = [];

  for (const w of sourceWords) {
    const key = w.term.trim().toLowerCase();

    if (seen.has(key)) {
      duplicates.push(w);
    } else {
      seen.set(key, w);
    }
  }

  const [{ maxOrder }] = await db
    .select({
      maxOrder: sql<number>`coalesce(max(${packsTable.sortOrder}), 0)`,
    })
    .from(packsTable)
    .where(
      and(
        eq(packsTable.userId, userId),
        eq(packsTable.language, language)
      )
    );

  const [createdPack] = await db
    .insert(packsTable)
    .values({
      userId,
      name: name.trim(),
      language,
      learned: 0,
      sortOrder: maxOrder + 1,
    })
    .returning();

  const uniqueWords = Array.from(seen.values());

  if (uniqueWords.length > 0) {
    await db.insert(wordsTable).values(
      uniqueWords.map((w) => ({
        packId: createdPack.id,
        term: w.term,
        pinyin: w.pinyin,
        meaning: w.meaning,
      }))
    );
  }

  res.status(201).json({
    pack: createdPack,
    addedCount: uniqueWords.length,
    duplicateCount: duplicates.length,
    duplicates,
  });
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

router.post("/users/:userId/packs/merge/preview", async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const { packIds, language } = req.body;

  if (!Array.isArray(packIds) || packIds.length < 2 || !language) {
    return res.status(400).json({
      error: "packIds and language are required",
    });
  }

  const sourceWords = await db
    .select({
      id: wordsTable.id,
      packId: wordsTable.packId,
      term: wordsTable.term,
      pinyin: wordsTable.pinyin,
      meaning: wordsTable.meaning,
      packName: packsTable.name,
    })
    .from(wordsTable)
    .leftJoin(packsTable, eq(wordsTable.packId, packsTable.id))
    .where(inArray(wordsTable.packId, packIds));

  const groups = new Map<string, typeof sourceWords>();

  for (const word of sourceWords) {
    const key = word.term.trim().toLowerCase();

    const arr = groups.get(key) ?? [];
    arr.push(word);

    groups.set(key, arr);
  }

  const duplicates = Array.from(groups.entries())
    .filter(([, words]) => words.length > 1)
    .map(([term, words]) => ({
      term,
      words,
    }));

  res.json({
    totalWords: sourceWords.length,
    duplicateGroupCount: duplicates.length,
    duplicates,
  });
});
router.post("/users/:userId/packs/merge/confirm", async (req, res) => {
  const userId = parseInt(req.params.userId, 10);

  const {
    packIds,
    name,
    language,
    removeWordIds,
  } = req.body;

  if (
    !Array.isArray(packIds) ||
    packIds.length < 2 ||
    !name ||
    !language
  ) {
    return res.status(400).json({
      error: "packIds, name, language are required",
    });
  }

  const idsToRemove = new Set(removeWordIds ?? []);

  const sourceWords = await db
    .select()
    .from(wordsTable)
    .where(inArray(wordsTable.packId, packIds));

  const wordsToInsert = sourceWords.filter(
    (w) => !idsToRemove.has(w.id)
  );

  const [{ maxOrder }] = await db
    .select({
      maxOrder: sql<number>`
        coalesce(max(${packsTable.sortOrder}),0)
      `,
    })
    .from(packsTable)
    .where(
      and(
        eq(packsTable.userId, userId),
        eq(packsTable.language, language)
      )
    );

  const [createdPack] = await db
    .insert(packsTable)
    .values({
      userId,
      name: name.trim(),
      language,
      learned: 0,
      sortOrder: maxOrder + 1,
    })
    .returning();

  if (wordsToInsert.length > 0) {
    await db.insert(wordsTable).values(
      wordsToInsert.map((w) => ({
        packId: createdPack.id,
        term: w.term,
        pinyin: w.pinyin,
        meaning: w.meaning,
      }))
    );
  }

  res.status(201).json({
    pack: createdPack,
    addedCount: wordsToInsert.length,
    removedCount: idsToRemove.size,
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