import { useState } from "react";
import {
  useListPacks,
  useCreatePack,
  useUpdatePack,
  useDeletePack,
  getListPacksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PackWithCount } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronLeft, Plus, Pencil, Trash2, Library } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface PacksScreenProps {
  userId: number;
  userName: string;
  onBack: () => void;
  onStudy: (packId: number, packName: string, packLanguage: string) => void;
}

export function PacksScreen({ userId, userName, onBack, onStudy }: PacksScreenProps) {
  const qc = useQueryClient();
  const { data: packs = [], isLoading } = useListPacks(userId);
  const createPack = useCreatePack();
  const updatePack = useUpdatePack();
  const deletePack = useDeletePack();

  const [newPackName, setNewPackName] = useState("");
  const [newPackLang, setNewPackLang] = useState<"chinese" | "english">("chinese");
  const [editingPack, setEditingPack] = useState<{ id: number; oldName: string; newName: string } | null>(null);
  const [deletingPack, setDeletingPack] = useState<{ id: number; name: string } | null>(null);
  const { toast } = useToast();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListPacksQueryKey(userId) });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPackName.trim()) return;
    createPack.mutate(
      { userId, data: { name: newPackName.trim(), language: newPackLang } },
      {
        onSuccess: () => {
          setNewPackName("");
          invalidate();
        },
        onError: () => {
          toast({ title: "Lỗi", description: "Không thể tạo bộ từ", variant: "destructive" });
        },
      }
    );
  };

  const handleRename = () => {
    if (!editingPack || !editingPack.newName.trim()) return;
    updatePack.mutate(
      { packId: editingPack.id, data: { name: editingPack.newName.trim() } },
      {
        onSuccess: () => {
          setEditingPack(null);
          invalidate();
        },
        onError: () => {
          toast({ title: "Lỗi", description: "Không thể đổi tên", variant: "destructive" });
        },
      }
    );
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

  const hasChinese = packs.some((p) => p.language === "chinese");
  const hasEnglish = packs.some((p) => p.language === "english");
  const twoColumns = hasChinese && hasEnglish;

  const PackCard = ({ pack }: { pack: PackWithCount }) => {
    const progress = pack.wordCount > 0 ? Math.round((pack.learned / pack.wordCount) * 100) : 0;
    return (
      <Card
        className="group hover:shadow-md transition-all duration-300 border-border/50 hover:border-primary/20 bg-card overflow-hidden"
        data-testid={`card-pack-${pack.id}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl font-semibold group-hover:text-primary transition-colors">
                {pack.name}
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                {pack.wordCount} từ • Đã học {progress}%
              </CardDescription>
            </div>
            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setEditingPack({ id: pack.id, oldName: pack.name, newName: pack.name })}
                data-testid={`button-edit-pack-${pack.id}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                onClick={() => setDeletingPack({ id: pack.id, name: pack.name })}
                data-testid={`button-delete-pack-${pack.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="h-2" />
          <Button
            className="w-full shadow-sm hover:shadow"
            onClick={() => onStudy(pack.id, pack.name, pack.language)}
            data-testid={`button-study-pack-${pack.id}`}
          >
            Học ngay
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in slide-in-from-right-8 duration-300">
      <div className="flex items-center gap-4 py-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full shrink-0" data-testid="button-back-users">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Bộ từ của {userName}</h2>
          <p className="text-muted-foreground text-sm">Chọn một bộ từ để bắt đầu ôn tập</p>
        </div>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm shadow-sm border-muted">
        <CardContent className="pt-6">
          <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Library className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={newPackName}
                onChange={(e) => setNewPackName(e.target.value)}
                placeholder="Tên bộ từ mới..."
                className="pl-10 h-12 text-base bg-background/50 border-muted"
                data-testid="input-new-pack"
              />
            </div>
            <div className="w-full sm:w-[180px]">
              <Select value={newPackLang} onValueChange={(val: "chinese" | "english") => setNewPackLang(val)}>
                <SelectTrigger className="h-12 bg-background/50 border-muted" data-testid="select-pack-lang">
                  <SelectValue placeholder="Ngôn ngữ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chinese">Tiếng Trung</SelectItem>
                  <SelectItem value="english">Tiếng Anh</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="h-12 px-6 gap-2 w-full sm:w-auto" disabled={createPack.isPending} data-testid="button-create-pack">
              <Plus className="h-5 w-5" /> Tạo Bộ từ
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Đang tải...</div>
      ) : packs.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl border-muted">
          Bạn chưa có bộ từ nào. Hãy tạo một bộ từ mới nhé!
        </div>
      ) : (
        <div className={`grid gap-8 ${twoColumns ? "lg:grid-cols-2" : "grid-cols-1"}`}>
          {hasChinese && (
            <div className="space-y-4">
              {twoColumns && (
                <h3 className="text-lg font-semibold text-foreground/80 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500/80"></span> Tiếng Trung
                </h3>
              )}
              <div className={`grid gap-4 ${!twoColumns ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
                {packs.filter((p) => p.language === "chinese").map((pack) => (
                  <PackCard key={pack.id} pack={pack} />
                ))}
              </div>
            </div>
          )}
          {hasEnglish && (
            <div className="space-y-4">
              {twoColumns && (
                <h3 className="text-lg font-semibold text-foreground/80 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500/80"></span> Tiếng Anh
                </h3>
              )}
              <div className={`grid gap-4 ${!twoColumns ? "sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
                {packs.filter((p) => p.language === "english").map((pack) => (
                  <PackCard key={pack.id} pack={pack} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!editingPack} onOpenChange={(open) => !open && setEditingPack(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi tên bộ từ</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename-pack">Tên mới</Label>
            <Input
              id="rename-pack"
              value={editingPack?.newName || ""}
              onChange={(e) => setEditingPack((prev) => (prev ? { ...prev, newName: e.target.value } : null))}
              className="mt-2"
              data-testid="input-rename-pack"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPack(null)}>Hủy</Button>
            <Button onClick={handleRename} disabled={updatePack.isPending} data-testid="button-confirm-rename-pack">
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingPack} onOpenChange={(open) => !open && setDeletingPack(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Xóa bộ từ?</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-muted-foreground">
            Bạn có chắc chắn muốn xóa bộ từ{" "}
            <span className="font-semibold text-foreground">{deletingPack?.name}</span>? Tất cả các từ sẽ bị mất.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingPack(null)}>Hủy</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deletePack.isPending} data-testid="button-confirm-delete-pack">
              Xóa bộ từ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
