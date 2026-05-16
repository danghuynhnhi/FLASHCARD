import { VocabWord } from "@workspace/api-client-react";

export type StudyMode = "word_to_meaning" | "meaning_to_word";

export type ViewState =
  | { view: "users" }
  | { view: "packs"; userId: number; userName: string }
  | { view: "create-pack"; userId: number; userName: string }
  | { view: "edit-pack"; userId: number; userName: string; packId: number; packName: string; packLanguage: string }
  | { view: "word-select"; userId: number; userName: string; packId: number; packName: string; packLanguage: string }
  | { view: "study"; userId: number; userName: string; packId: number; packName: string; packLanguage: string; selectedWords?: VocabWord[] }
  | {
      view: "results";
      userId: number;
      userName: string;
      packId: number;
      packName: string;
      packLanguage: string;
      mode: StudyMode;
      score: number;
      wrongWords: VocabWord[];
      totalWords: number;
    };
