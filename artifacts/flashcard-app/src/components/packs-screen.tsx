import { useMemo, useState } from "react";
import {
  useListPacks,
  useDeletePack,
  getListPacksQueryKey,
  PackWithCount,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
} from "lucide-react";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface PacksScreenProps {
  userId: number;
  userName: string;
  onBack: () => void;
  onCreatePack: () => void;
  onEditPack: (packId: number, packName: string, packLanguage: string) => void;
  onStudy: (packId: number, packName: string, packLanguage: string) => void;
}

type PackWithSort = PackWithCount & {
  sortOrder?: number;
};

type DuplicateGroup = {
  term: string;
  words: Array<{
    id: number;
    packId: number;
    term: string;
    pinyin?: string | null;
    meaning: string;
    packName?: string | null;
  }>;
};

async function reorderPacks(
  userId: number,
  language: string,
  packIds: number[]
) {
  const res = await fetch(`/api/users/${userId}/packs/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language, packIds }),
  });

  if (!res.ok) throw new Error("Cannot reorder packs");
  return res.json();
}

function SortablePackCard({
  pack,
  onEditPack,
  onStudy,
  onDelete,
  mergeMode,
  selected,
  onToggleSelect,
}: {
  pack: PackWithSort;
  onEditPack: (packId: number, packName: string, packLanguage: string) => void;
  onStudy: (packId: number, packName: string, packLanguage: string) => void;
  onDelete: (pack: PackWithSort) => void;
  mergeMode: boolean;
  selected: boolean;
  onToggleSelect: (packId: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: pack.id,
    disabled: mergeMode,
  });

  const pct =
    pack.wordCount > 0
      ? Math.round((pack.learned / pack.wordCount) * 100)
      : 0;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border rounded-lg p-4 group hover:shadow-sm transition-all ${
        selected ? "border-primary ring-1 ring-primary/30" : "border-border"
      } ${isDragging ? "opacity-60 shadow-md z-10" : ""}`}
      data-testid={`card-pack-${pack.id}`}
    >
      {mergeMode && (
        <label className="mb-3 flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(pack.id)}
            className="h-4 w-4"
          />
          Chọn để gộp
        </label>
      )}

      <div className="flex items-start justify-between mb-1">
        <div className="flex items-start gap-2 min-w-0">
          {!mergeMode && (
            <button
              type="button"
              className="mt-0.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
              {...attributes}
              {...listeners}
              title="Kéo để sắp xếp"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}

          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">
              {pack.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pack.wordCount} từ vựng
            </p>
          </div>
        </div>

        {!mergeMode && (
          <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1 -mt-1 -mr-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => onEditPack(pack.id, pack.name, pack.language)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(pack)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <div className="my-3">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-muted-foreground">Tốt nhất</span>
          <span className="text-xs font-medium text-foreground">{pct}%</span>
        </div>

        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <Button
        className="w-full h-9 text-sm"
        onClick={() => onStudy(pack.id, pack.name, pack.language)}
        disabled={mergeMode}
      >
        Học ngay
      </Button>
    </div>
  );
}

export function PacksScreen({
  userId,
  userName,
  onBack,
  onCreatePack,
  onEditPack,
  onStudy,
}: PacksScreenProps) {
  const qc = useQueryClient();
  const { data: packs = [], isLoading } = useListPacks(userId);
  const deletePack = useDeletePack();

  const [mergeMode, setMergeMode] = useState(false);
  const [selectedPacks, setSelectedPacks] = useState<number[]>([]);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeName, setMergeName] = useState("");
  const [duplicateWords, setDuplicateWords] = useState<DuplicateGroup[]>([]);
  const [removeWordIds, setRemoveWordIds] = useState<number[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [step, setStep] = useState<"name" | "duplicates">("name");

  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [mergeResult, setMergeResult] = useState<{
    added: number;
    removed: number;
  } | null>(null);

  const [deletingPack, setDeletingPack] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const invalidate = () =>
    qc.invalidateQueries({
      queryKey: getListPacksQueryKey(userId),
    });

  const sortedPacks = useMemo(() => {
    return [...(packs as PackWithSort[])].sort((a, b) => {
      const lang = a.language.localeCompare(b.language);
      if (lang !== 0) return lang;

      const orderA = a.sortOrder ?? 0;
      const orderB = b.sortOrder ?? 0;

      if (orderA !== orderB) return orderA - orderB;

      return a.id - b.id;
    });
  }, [packs]);

  const chinesePacks = sortedPacks.filter((p) => p.language === "chinese");
  const englishPacks = sortedPacks.filter((p) => p.language === "english");

  const selectedPackObjects = sortedPacks.filter((p) =>
    selectedPacks.includes(p.id)
  );

  const selectedLanguages = new Set(
    selectedPackObjects.map((p) => p.language)
  );

  const canMerge = selectedPacks.length >= 2 && selectedLanguages.size === 1;

  const toggleSelectPack = (packId: number) => {
    setSelectedPacks((prev) =>
      prev.includes(packId)
        ? prev.filter((id) => id !== packId)
        : [...prev, packId]
    );
  };

  const resetMerge = () => {
    setMergeDialogOpen(false);
    setMergeName("");
    setDuplicateWords([]);
    setRemoveWordIds([]);
    setStep("name");
  };

  const openMergeDialog = () => {
    if (!canMerge) return;

    const names = selectedPackObjects.map((p) => p.name).join(" + ");
    setMergeName(names.length > 45 ? "Bộ từ đã gộp" : names);
    setStep("name");
    setDuplicateWords([]);
    setRemoveWordIds([]);
    setMergeDialogOpen(true);
  };

  const handleMergePreview = async () => {
    if (!canMerge || !mergeName.trim()) return;

    const firstPack = selectedPackObjects[0];

    try {
      setPreviewLoading(true);

      const previewRes = await fetch(
        `/api/users/${userId}/packs/merge/preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            packIds: selectedPacks,
            language: firstPack.language,
          }),
        }
      );

      if (!previewRes.ok) {
        throw new Error(await previewRes.text());
      }

      const preview = await previewRes.json();

      setDuplicateWords(preview.duplicates ?? []);
      setRemoveWordIds([]);
      setStep("duplicates");
    } catch (err) {
      console.error(err);
      alert("Không xem được danh sách từ trùng");
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmMerge = async () => {
    const firstPack = selectedPackObjects[0];
    if (!firstPack) return;

    try {
      setMerging(true);

      const res = await fetch(`/api/users/${userId}/packs/merge/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packIds: selectedPacks,
          name: mergeName.trim(),
          language: firstPack.language,
          removeWordIds,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const result = await res.json();

      setMergeResult({
        added: result.addedCount,
        removed: result.removedCount,
      });

      setResultDialogOpen(true);
      setMergeDialogOpen(false);
      setMergeMode(false);
      setSelectedPacks([]);
      setDuplicateWords([]);
      setRemoveWordIds([]);
      setStep("name");

      invalidate();
    } catch (err) {
      console.error(err);
      alert("Gộp thất bại");
    } finally {
      setMerging(false);
    }
  };

  const handleDelete = () => {
    if (!deletingPack) return;

    deletePack.mutate(
      { packId: deletingPack.id },
      {
        onSuccess: () => {
          setDeletingPack(null);
          invalidate();
        },
      }
    );
  };

  const handleDragEnd = async (
    event: DragEndEvent,
    language: "chinese" | "english",
    sectionPacks: PackWithSort[]
  ) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = sectionPacks.findIndex((p) => p.id === active.id);
    const newIndex = sectionPacks.findIndex((p) => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newPacks = arrayMove(sectionPacks, oldIndex, newIndex);
    const packIds = newPacks.map((p) => p.id);

    qc.setQueryData(
      getListPacksQueryKey(userId),
      (old: PackWithSort[] = []) => {
        const other = old.filter((p) => p.language !== language);
        const reordered = newPacks.map((p, i) => ({
          ...p,
          sortOrder: i + 1,
        }));

        return [...other, ...reordered];
      }
    );

    try {
      await reorderPacks(userId, language, packIds);
      invalidate();
    } catch {
      invalidate();
      alert("Không thể lưu thứ tự mới. Thử lại nha.");
    }
  };

  const PackSection = ({
    label,
    language,
    sectionPacks,
    starredPackId,
    starredPackName,
  }: {
    label: string;
    language: "chinese" | "english";
    sectionPacks: PackWithSort[];
    starredPackId: number;
    starredPackName: string;
  }) => (
    <div>
     <div className="flex items-center justify-between mb-3">
  <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
    {label}
  </p>

  <div className="inline-flex items-center overflow-hidden rounded-md border border-input bg-background">
    <button
      type="button"
      onClick={() => onStudy(starredPackId, starredPackName, language)}
      disabled={mergeMode}
      className="h-8 px-3 text-xs font-medium hover:bg-muted disabled:opacity-50"
    >
      ⭐ Dấu sao
    </button>

    <button
      type="button"
      onClick={() =>
        onStudy(
          starredPackId === -100 ? -200 : -201,
          starredPackName,
          language
        )
      }
      disabled={mergeMode}
      className="h-8 border-l border-input px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
    >
      Sửa
    </button>
  </div>
</div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(event) => handleDragEnd(event, language, sectionPacks)}
      >
        <SortableContext
          items={sectionPacks.map((p) => p.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {sectionPacks.map((pack) => (
              <SortablePackCard
                key={pack.id}
                pack={pack}
                mergeMode={mergeMode}
                selected={selectedPacks.includes(pack.id)}
                onToggleSelect={toggleSelectPack}
                onEditPack={onEditPack}
                onStudy={onStudy}
                onDelete={(p) =>
                  setDeletingPack({
                    id: p.id,
                    name: p.name,
                  })
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-5">
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-back-users"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div>
            <h2 className="text-xl font-bold text-foreground">{userName}</h2>
            <p className="text-xs text-muted-foreground">
              Bộ từ vựng của bạn
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setMergeMode((v) => !v);
              setSelectedPacks([]);
              resetMerge();
            }}
            className="h-9 px-4 text-sm"
          >
            {mergeMode ? "Hủy gộp" : "Gộp bộ từ"}
          </Button>

          <Button
            onClick={onCreatePack}
            className="h-9 px-4 gap-1.5 text-sm"
            data-testid="button-create-pack"
            disabled={mergeMode}
          >
            <Plus className="h-4 w-4" /> Tạo bộ mới
          </Button>
        </div>
      </div>

      {mergeMode && (
        <div className="bg-muted/40 border border-border rounded-lg p-4 flex flex-col gap-3">
          <p className="text-sm text-foreground">
            Đã chọn{" "}
            <span className="font-semibold">{selectedPacks.length}</span>{" "}
            bộ từ.
          </p>

          {selectedLanguages.size > 1 && (
            <p className="text-sm text-destructive">
              Chỉ gộp được các bộ cùng ngôn ngữ. Hãy chọn toàn bộ tiếng Trung
              hoặc toàn bộ tiếng Anh.
            </p>
          )}

          <Button
            className="w-full"
            onClick={openMergeDialog}
            disabled={!canMerge}
          >
            Gộp {selectedPacks.length} bộ đã chọn
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Đang tải...
        </div>
      ) : sortedPacks.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg">
          Chưa có bộ từ nào
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {chinesePacks.length > 0 && (
            <PackSection
              label="Tiếng Trung"
              language="chinese"
              sectionPacks={chinesePacks}
              starredPackId={-100}
              starredPackName="⭐ Dấu sao - Tiếng Trung"
            />
          )}

          {englishPacks.length > 0 && (
            <PackSection
              label="Tiếng Anh"
              language="english"
              sectionPacks={englishPacks}
              starredPackId={-101}
              starredPackName="⭐ Dấu sao - Tiếng Anh"
            />
          )}
        </div>
      )}

      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gộp bộ từ</DialogTitle>
          </DialogHeader>

          {step === "name" && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-sm">
                  Đã chọn {selectedPacks.length} bộ từ.
                </p>
              </div>

              <Input
                value={mergeName}
                onChange={(e) => setMergeName(e.target.value)}
                placeholder="Tên bộ mới..."
                autoFocus
              />
            </div>
          )}

          {step === "duplicates" && (
            <div className="space-y-3 max-h-[430px] overflow-y-auto pr-1">
              <p className="text-sm text-muted-foreground">
                Chọn các từ muốn bỏ khỏi bộ mới.
              </p>

              {duplicateWords.length === 0 && (
                <div className="rounded-lg border p-4 text-center">
                  Không có từ trùng 🎉
                </div>
              )}

              {duplicateWords.map((group, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="font-semibold mb-2">{group.term}</div>

                  <div className="space-y-2">
                    {group.words.map((word) => (
                      <label
                        key={word.id}
                        className="flex items-start gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/40"
                      >
                        <input
                          type="checkbox"
                          checked={removeWordIds.includes(word.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRemoveWordIds((prev) => [...prev, word.id]);
                            } else {
                              setRemoveWordIds((prev) =>
                                prev.filter((id) => id !== word.id)
                              );
                            }
                          }}
                          className="mt-1"
                        />

                        <span className="text-sm">
                          <span className="font-medium">{word.term}</span>
                          {word.pinyin && (
                            <span className="text-muted-foreground">
                              {" "}
                              · {word.pinyin}
                            </span>
                          )}
                          <br />
                          <span className="text-muted-foreground">
                            {word.meaning} ({word.packName})
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={resetMerge}
              disabled={merging || previewLoading}
            >
              Hủy
            </Button>

            {step === "name" ? (
              <Button
                onClick={handleMergePreview}
                disabled={!mergeName.trim() || previewLoading}
              >
                {previewLoading ? "Đang kiểm tra từ trùng..." : "Tiếp tục"}
              </Button>
            ) : (
              <Button onClick={confirmMerge} disabled={merging}>
                {merging ? "Đang gộp..." : "Xác nhận gộp"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>✅ Gộp bộ từ thành công</DialogTitle>
          </DialogHeader>

          {mergeResult && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-green-50 p-3">
                <p className="font-medium text-green-700">
                  Đã tạo bộ từ mới thành công
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-4 text-center">
                  <div className="text-2xl font-bold">
                    {mergeResult.added}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Từ giữ lại
                  </div>
                </div>

                <div className="rounded-lg border p-4 text-center">
                  <div className="text-2xl font-bold text-red-500">
                    {mergeResult.removed}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Từ loại bỏ
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setResultDialogOpen(false)}>Xong</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deletingPack}
        onOpenChange={(open) => !open && setDeletingPack(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa bộ từ?</DialogTitle>
          </DialogHeader>

          <p className="py-4 text-muted-foreground text-sm">
            Xóa{" "}
            <span className="font-semibold text-foreground">
              {deletingPack?.name}
            </span>
            ? Tất cả từ sẽ mất.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingPack(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePack.isPending}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}