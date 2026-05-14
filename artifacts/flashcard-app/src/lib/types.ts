export type Word = 
  | { hanzi: string; meaning: string }
  | { word: string; meaning: string };

export interface Pack {
  name: string;
  language: "chinese" | "english";
  learned: number;
  words: Word[];
}

export interface User {
  name: string;
  packs: Pack[];
}

export type ViewState = 
  | { view: 'users' }
  | { view: 'packs'; userName: string }
  | { view: 'study'; userName: string; packName: string };

export const INITIAL_DATA: User[] = [
  {
    name: "Ynax",
    packs: [
      {
        name: "HSK 2",
        language: "chinese",
        learned: 0,
        words: [
          { hanzi: "苹果", meaning: "quả táo" },
          { hanzi: "老师", meaning: "giáo viên" },
          { hanzi: "学校", meaning: "trường học" }
        ]
      }
    ]
  }
];
