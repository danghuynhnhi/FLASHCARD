import { Router } from "express";
import { db, wordsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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
  const { term, meaning } = req.body;
  if (!term || !meaning) {
    res.status(400).json({ error: "term and meaning are required" });
    return;
  }
  const [created] = await db
    .insert(wordsTable)
    .values({ packId, term: term.trim(), meaning: meaning.trim() })
    .returning();
  res.status(201).json(created);
});

router.patch("/words/:wordId", async (req, res) => {
  const wordId = parseInt(req.params.wordId, 10);
  const { term, meaning } = req.body;
  const updates: Record<string, string> = {};
  if (term) updates.term = term.trim();
  if (meaning) updates.meaning = meaning.trim();
  if (!Object.keys(updates).length) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }
  const [updated] = await db
    .update(wordsTable)
    .set(updates)
    .where(eq(wordsTable.id, wordId))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Word not found" });
    return;
  }
  res.json(updated);
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
