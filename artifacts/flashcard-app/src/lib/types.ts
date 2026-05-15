export type ViewState =
  | { view: "users" }
  | { view: "packs"; userId: number; userName: string }
  | { view: "study"; userId: number; userName: string; packId: number; packName: string; packLanguage: string };
