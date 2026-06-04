import { useMemo, useState } from "react";
import {
  useListPacks,
  useDeletePack,
  getListPacksQueryKey,
  PackWithCount,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChevronLeft, Plus, Pencil, Trash2, GripVertical } from "lucide-react";

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

async function reorderPacks(userId: number, language: string, packIds: number[]) {
  const res = await fetch(`/api/users/${userId}/packs/reorder`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      language,
      packIds,
    }),
  });

  if (!res.ok) {
    throw new Error("Cannot reorder packs");
  }

  return res.json();
}

function SortablePackCard({
  pack,
  onEditPack,
  onStudy,
  onDelete,
}: {
  pack: PackWithSort;
  onEditPack: (packId: number, packName: string, packLanguage: string) => void;
  onStudy: (packId: number, packName: string, packLanguage: string) => void;
  onDelete: (pack: PackWithSort) => void;
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
  });

  const pct =
    pack.wordCount > 0 ? Math.round((pack.learned / pack.wordCount) * 100) : 0;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-card border border-border rounded-lg p-4 group hover:shadow-sm transition-all ${
        isDragging ? "opacity-60 shadow-md z-10" : ""
      }`}
      data-testid={`card-pack-${pack.id}`}
    >
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-start gap-2 min-w-0">
          <button
            type="button"
            className="mt-0.5 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
            title="Kéo để sắp xếp"
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">
              {pack.name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pack.wordCount} từ vựng
            </p>
          </div>
        </div>

        <div className="flex opacity-0 group-hover:opacity-100 transition-opacity gap-1 -mt-1 -mr-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => onEditPack(pack.id, pack.name, pack.language)}
            data-testid={`button-edit-pack-${pack.id}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(pack)}
            data-testid={`button-delete-pack-${pack.id}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
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
        data-testid={`button-study-pack-${pack.id}`}
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

  const [deletingPack, setDeletingPack] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
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
  const hasBoth = chinesePacks.length > 0 && englishPacks.length > 0;

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

    qc.setQueryData(getListPacksQueryKey(userId), (old: PackWithSort[] = []) => {
      const other = old.filter((p) => p.language !== language);
      const reordered = newPacks.map((p, i) => ({
        ...p,
        sortOrder: i + 1,
      }));

      return [...other, ...reordered];
    });

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
  }: {
    label: string;
    language: "chinese" | "english";
    sectionPacks: PackWithSort[];
  }) => (
    <div>
      {hasBoth && (
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
          {label}
        </p>
      )}

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
            <p className="text-xs text-muted-foreground">Bộ từ vựng của bạn</p>
          </div>
        </div>

        <Button
          onClick={onCreatePack}
          className="h-9 px-4 gap-1.5 text-sm"
          data-testid="button-create-pack"
        >
          <Plus className="h-4 w-4" /> Tạo bộ mới
        </Button>
      </div>

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
            />
          )}

          {englishPacks.length > 0 && (
            <PackSection
              label="Tiếng Anh"
              language="english"
              sectionPacks={englishPacks}
            />
          )}
        </div>
      )}

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