import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, wordsTable, packsTable } from "@workspace/db";

const router = Router();

router.get("/packs/:packId/words", async (req, res) => {
  const packId = parseInt(req.params.packId, 10);

  const rows = await db
    .select()
    .from(wordsTable)
    .where(eq(wordsTable.packId, packId))
    .orderBy(wordsTable.createdAt);

  res.json(rows);
});

router.post("/packs/:packId/words", async (req, res) => {
  const packId = parseInt(req.params.packId, 10);
  const { term, pinyin, meaning } = req.body;

  if (!term || !meaning) {
    res.status(400).json({ error: "term and meaning are required" });
    return;
  }

  const [created] = await db
    .insert(wordsTable)
    .values({
      packId,
      term: term.trim(),
      pinyin: pinyin?.trim() || null,
      meaning: meaning.trim(),
    })
    .returning();

  res.status(201).json(created);
});
router.patch("/words/:wordId/star", async (req, res) => {
  const wordId = parseInt(req.params.wordId, 10);
  const { starred } = req.body;

  const [updated] = await db
    .update(wordsTable)
    .set({ starred: Boolean(starred) })
    .where(eq(wordsTable.id, wordId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Word not found" });
    return;
  }

  res.json(updated);
});
router.patch("/words/:wordId", async (req, res) => {
  try {
    const wordId = parseInt(req.params.wordId, 10);
    const { term, pinyin, meaning, starred } = req.body;

    console.log("PATCH WORD BODY:", req.body);

    const updateData: Record<string, unknown> = {};

    if (term !== undefined) updateData.term = term.trim();
    if (pinyin !== undefined) updateData.pinyin = pinyin.trim() || null;
    if (meaning !== undefined) updateData.meaning = meaning.trim();
    if (starred !== undefined) updateData.starred = Boolean(starred);

    console.log("PATCH WORD DATA:", updateData);

    const [updated] = await db
      .update(wordsTable)
      .set(updateData)
      .where(eq(wordsTable.id, wordId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Word not found" });
      return;
    }

    res.json(updated);
  } catch (err) {
    console.error("PATCH WORD ERROR:", err);
    res.status(500).json({
      error: "PATCH_WORD_FAILED",
      detail: String(err),
    });
  }
});
router.get("/users/:userId/starred/:language", async (req, res) => {
  const userId = parseInt(req.params.userId, 10);
  const language = req.params.language;

  const rows = await db
    .select({
      id: wordsTable.id,
      packId: wordsTable.packId,
      term: wordsTable.term,
      pinyin: wordsTable.pinyin,
      meaning: wordsTable.meaning,
      starred: wordsTable.starred,
      createdAt: wordsTable.createdAt,
      packName: packsTable.name,
    })
    .from(wordsTable)
    .innerJoin(packsTable, eq(wordsTable.packId, packsTable.id))
    .where(
      and(
        eq(wordsTable.starred, true),
        eq(packsTable.userId, userId),
        eq(packsTable.language, language)
      )
    )
    .orderBy(wordsTable.createdAt);

  res.json(rows);
});

router.delete("/words/:wordId", async (req, res) => {
  const wordId = parseInt(req.params.wordId, 10);

  const deleted = await db
    .delete(wordsTable)
    .where(eq(wordsTable.id, wordId))
    .returning();

  if (!deleted.length) {
    res.status(404).json({ error: "Word not found" });
    return;
  }

  res.status(204).send();
});

export default router;