import { useState } from "react";
import {
  useListWords,
  useUpdatePack,
  useCreateWord,
  getListWordsQueryKey,
  getListPacksQueryKey,
  VocabWord,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Plus, Trash2, ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { deleteWord, useUpdateWord } from "@workspace/api-client-react";
import { Pencil, Check, X as XIcon } from "lucide-react";
import { toPinyin } from "@/lib/pinyin";

interface EditPackScreenProps {
  userId: number;
  packId: number;
  packName: string;
  packLanguage: string;
  onBack: () => void;
}

function parseBulkText(text: string): Array<{ term: string; meaning: string }> {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      let term = "", meaning = "";
      if (line.includes("\t")) {
        [term, meaning] = line.split("\t");
      } else if (line.includes(" - ")) {
        const idx = line.indexOf(" - ");
        term = line.slice(0, idx);
        meaning = line.slice(idx + 3);
      } else if (line.includes(",")) {
        const idx = line.indexOf(",");
        term = line.slice(0, idx);
        meaning = line.slice(idx + 1);
      } else {
        term = line;
      }
      return { term: term.trim(), meaning: meaning.trim() };
    })
    .filter((w) => w.term && w.meaning);
}

export function EditPackScreen({ userId, packId, packName: initialPackName, packLanguage, onBack }: EditPackScreenProps) {
  const qc = useQueryClient();
  const { data: words = [], isLoading } = useListWords(packId);
  const updatePack = useUpdatePack();
  const createWord = useCreateWord();

  const updateWord = useUpdateWord();

  const [name, setName] = useState(initialPackName);
  const [nameSaved, setNameSaved] = useState(true);
  const [termInput, setTermInput] = useState("");
  const [meaningInput, setMeaningInput] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [importing, setImporting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTerm, setEditTerm] = useState("");
  const [editMeaning, setEditMeaning] = useState("");
  const { toast } = useToast();

  const isChinese = packLanguage === "chinese";

  const invalidatePacks = () => qc.invalidateQueries({ queryKey: getListPacksQueryKey(userId) });
  const invalidateWords = () => qc.invalidateQueries({ queryKey: getListWordsQueryKey(packId) });

  const handleSaveName = () => {
    if (!name.trim() || name.trim() === initialPackName) { setNameSaved(true); return; }
    updatePack.mutate(
      { packId, data: { name: name.trim() } },
      {
        onSuccess: () => { setNameSaved(true); invalidatePacks(); toast({ title: "Đã đổi tên bộ từ" }); },
        onError: () => toast({ title: "Lỗi", description: "Không thể đổi tên", variant: "destructive" }),
      }
    );
  };

  const handleAddWord = () => {
    if (!termInput.trim() || !meaningInput.trim()) return;
    createWord.mutate(
      { packId, data: { term: termInput.trim(), meaning: meaningInput.trim() } },
      {
        onSuccess: () => {
          setTermInput(""); setMeaningInput("");
          invalidateWords(); invalidatePacks();
        },
        onError: () => toast({ title: "Lỗi", description: "Không thể thêm từ", variant: "destructive" }),
      }
    );
  };

  const handleBulkImport = async () => {
    const parsed = parseBulkText(bulkText);
    if (parsed.length === 0) {
      toast({ title: "Không tìm thấy từ hợp lệ", description: "Mỗi dòng cần có từ và nghĩa, cách nhau bằng tab, \" - \", hoặc dấu phẩy", variant: "destructive" });
      return;
    }
    setImporting(true);
    let added = 0;
    for (const w of parsed) {
      try {
        await new Promise<void>((resolve, reject) => {
          createWord.mutate(
            { packId, data: { term: w.term, meaning: w.meaning } },
            { onSuccess: () => resolve(), onError: reject }
          );
        });
        added++;
      } catch {
        // skip duplicates / errors silently
      }
    }
    invalidateWords();
    invalidatePacks();
    setBulkText("");
    setShowBulk(false);
    setImporting(false);
    toast({ title: `Đã thêm ${added} từ` });
  };

  const handleStartEdit = (word: VocabWord) => {
    setEditingId(word.id);
    setEditTerm(word.term);
    setEditMeaning(word.meaning);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTerm("");
    setEditMeaning("");
  };

  const handleSaveEdit = (wordId: number) => {
    if (!editTerm.trim() || !editMeaning.trim()) return;
    updateWord.mutate(
      { wordId, data: { term: editTerm.trim(), meaning: editMeaning.trim() } },
      {
        onSuccess: () => {
          invalidateWords();
          handleCancelEdit();
          toast({ title: "Đã lưu" });
        },
        onError: () => toast({ title: "Lỗi", description: "Không thể lưu từ", variant: "destructive" }),
      }
    );
  };

  const handleDeleteWord = async (word: VocabWord) => {
    setDeletingId(word.id);
    try {
      await deleteWord(word.id);
      invalidateWords(); invalidatePacks();
    } catch {
      toast({ title: "Lỗi", description: "Không thể xóa từ", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };
  const exportCsv = () => {
    const escapeCsv = (value: unknown) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;
  
    const isChinesePack = packLanguage === "chinese";
  
    const rows = isChinesePack
      ? [
          ["STT", "Từ", "Pinyin", "Nghĩa"],
          ...words.map((w, i) => [
            i + 1,
            w.term,
            toPinyin(w.term),
            w.meaning,
          ]),
        ]
      : [
          ["STT", "Từ", "Nghĩa"],
          ...words.map((w, i) => [
            i + 1,
            w.term,
            w.meaning,
          ]),
        ];
  
    const csv =
      "\uFEFF" +
      rows
        .map((row) => row.map(escapeCsv).join(";"))
        .join("\n");
  
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
  
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
  
    const safeName = name
      .trim()
      .replace(/[\\/:*?"<>|]/g, "-");
  
    a.href = url;
    a.download = `${safeName || "flashcard"}.csv`;
    a.click();
  
    URL.revokeObjectURL(url);
  };
  const previewCount = bulkText.trim() ? parseBulkText(bulkText).length : 0;

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="flex items-center gap-3 pt-4">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="button-back-packs">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold text-foreground">Chỉnh sửa bộ từ</h2>
      </div>

      <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-1">
          Tên bộ từ vựng
        </p>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); setNameSaved(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
            className="flex-1 h-10"
            data-testid="input-pack-name"
          />
          <Button
            onClick={handleSaveName}
            disabled={nameSaved || updatePack.isPending}
            className="h-10 px-4"
            data-testid="button-save-name"
          >
            {updatePack.isPending ? "Đang lưu..." : "Lưu tên"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Ngôn ngữ: <span className="font-medium text-foreground">{isChinese ? "Tiếng Trung" : "Tiếng Anh"}</span>
        </p>
      </div>

      <div className="bg-card border border-border rounded-lg p-5 flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Thêm từ mới
        </p>
        <div className="flex gap-2">
          <Input
            value={termInput}
            onChange={(e) => setTermInput(e.target.value)}
            placeholder={isChinese ? "Chữ Hán..." : "Từ tiếng Anh..."}
            className="flex-1 h-10"
            data-testid="input-word-term"
            onKeyDown={(e) => e.key === "Enter" && handleAddWord()}
          />
          <Input
            value={meaningInput}
            onChange={(e) => setMeaningInput(e.target.value)}
            placeholder="Nghĩa tiếng Việt..."
            className="flex-1 h-10"
            data-testid="input-word-meaning"
            onKeyDown={(e) => e.key === "Enter" && handleAddWord()}
          />
          <Button
            onClick={handleAddWord}
            disabled={createWord.isPending}
            className="h-10 w-10 p-0 shrink-0"
            data-testid="button-add-word"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => setShowBulk((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/40 transition-colors"
          data-testid="button-toggle-bulk"
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Nhập danh sách hàng loạt</span>
            <span className="text-xs text-muted-foreground">(dán từ Excel, Google Sheets...)</span>
          </div>
          {showBulk ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {showBulk && (
          <div className="px-5 pb-5 flex flex-col gap-3 border-t border-border">
            <p className="text-xs text-muted-foreground pt-3">
              Mỗi dòng một từ. Phân cách bằng <strong>Tab</strong> (từ Excel/Sheets), <strong>" - "</strong>, hoặc dấu <strong>phẩy</strong>.<br />
              Ví dụ: <code className="bg-muted px-1 rounded">踢{"\t"}đá</code> hoặc <code className="bg-muted px-1 rounded">踢 - đá</code>
            </p>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={"踢\tđá\n跑\tchạy\n走\tđi bộ"}
              className="w-full h-36 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-ring"
              data-testid="textarea-bulk"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleBulkImport}
                disabled={!bulkText.trim() || importing}
                className="flex-1 h-9"
                data-testid="button-bulk-import"
              >
                {importing ? "Đang lưu..." : `Thêm ${previewCount} từ vào bộ`}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setBulkText(""); setShowBulk(false); }}
                className="h-9 px-4"
                disabled={importing}
              >
                Hủy
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
  <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
    Danh sách từ {isLoading ? "" : `(${words.length} từ)`}
  </p>

  <Button
    size="sm"
    variant="outline"
    onClick={exportCsv}
  >
    Xuất CSV
  </Button>
</div>
        {isLoading ? (
          <p className="px-5 pb-4 text-sm text-muted-foreground">Đang tải...</p>
        ) : words.length === 0 ? (
          <p className="px-5 pb-4 text-sm text-muted-foreground">Chưa có từ nào</p>
        ) : (
          <ul className="divide-y divide-border">
            {words.map((w, i) => (
              <li key={w.id} data-testid={`word-item-${w.id}`}>
                {editingId === w.id ? (
                  <div className="flex flex-col gap-2 px-5 py-3">
                    <div className="flex gap-2">
                      <Input
                        value={editTerm}
                        onChange={(e) => setEditTerm(e.target.value)}
                        placeholder={isChinese ? "Chữ Hán..." : "Từ..."}
                        className={`flex-1 h-9 text-sm ${isChinese ? "font-serif" : ""}`}
                        autoFocus
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(w.id); if (e.key === "Escape") handleCancelEdit(); }}
                      />
                      <Input
                        value={editMeaning}
                        onChange={(e) => setEditMeaning(e.target.value)}
                        placeholder="Nghĩa..."
                        className="flex-1 h-9 text-sm"
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(w.id); if (e.key === "Escape") handleCancelEdit(); }}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleSaveEdit(w.id)}
                        disabled={updateWord.isPending}
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" /> Lưu
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <XIcon className="h-3.5 w-3.5" /> Huỷ
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span className="text-muted-foreground text-xs w-5 shrink-0">{i + 1}</span>
                    <div className="flex-1 flex flex-col min-w-0">
                      <span className={`font-semibold truncate ${isChinese ? "font-serif text-base" : ""}`}>{w.term}</span>
                      {isChinese && <span className="text-xs text-muted-foreground tracking-wide">{toPinyin(w.term)}</span>}
                    </div>
                    <span className="text-muted-foreground flex-1 truncate">{w.meaning}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleStartEdit(w)}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                        data-testid={`button-edit-word-${w.id}`}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteWord(w)}
                        disabled={deletingId === w.id}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                        data-testid={`button-delete-word-${w.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
