import React, { useState } from 'react';
import { User, Pack } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { ChevronLeft, Plus, Pencil, Trash2, Library } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface PacksScreenProps {
  users: User[];
  userName: string;
  createPack: (userName: string, packName: string, language: "chinese" | "english") => boolean;
  renamePack: (userName: string, oldPackName: string, newPackName: string) => boolean;
  deletePack: (userName: string, packName: string) => void;
  onBack: () => void;
  onStudy: (packName: string) => void;
}

export function PacksScreen({ users, userName, createPack, renamePack, deletePack, onBack, onStudy }: PacksScreenProps) {
  const user = users.find(u => u.name === userName);
  const [newPackName, setNewPackName] = useState('');
  const [newPackLang, setNewPackLang] = useState<"chinese" | "english">("chinese");
  const [editingPack, setEditingPack] = useState<{ oldName: string, newName: string } | null>(null);
  const [deletingPack, setDeletingPack] = useState<string | null>(null);
  const { toast } = useToast();

  if (!user) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPackName.trim()) return;
    
    if (createPack(userName, newPackName, newPackLang)) {
      setNewPackName('');
    } else {
      toast({ title: 'Lỗi', description: 'Tên bộ từ đã tồn tại hoặc không hợp lệ', variant: 'destructive' });
    }
  };

  const handleRename = () => {
    if (!editingPack) return;
    if (renamePack(userName, editingPack.oldName, editingPack.newName)) {
      setEditingPack(null);
    } else {
      toast({ title: 'Lỗi', description: 'Tên bộ từ đã tồn tại hoặc không hợp lệ', variant: 'destructive' });
    }
  };

  const handleDelete = () => {
    if (!deletingPack) return;
    deletePack(userName, deletingPack);
    setDeletingPack(null);
  };

  const hasChinese = user.packs.some(p => p.language === "chinese");
  const hasEnglish = user.packs.some(p => p.language === "english");
  const twoColumns = hasChinese && hasEnglish;

  const PackCard = ({ pack }: { pack: Pack }) => {
    const totalWords = pack.words.length;
    const progress = totalWords > 0 ? Math.round((pack.learned / totalWords) * 100) : 0;
    
    return (
      <Card className="group hover:shadow-md transition-all duration-300 border-border/50 hover:border-primary/20 bg-card overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl font-semibold group-hover:text-primary transition-colors">{pack.name}</CardTitle>
              <CardDescription className="text-sm mt-1">{totalWords} từ • Đã học {progress}%</CardDescription>
            </div>
            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setEditingPack({ oldName: pack.name, newName: pack.name })}
                data-testid={`button-edit-pack-${pack.name}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                onClick={() => setDeletingPack(pack.name)}
                data-testid={`button-delete-pack-${pack.name}`}
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
            onClick={() => onStudy(pack.name)}
            data-testid={`button-study-pack-${pack.name}`}
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
              <Select value={newPackLang} onValueChange={(val: "chinese"|"english") => setNewPackLang(val)}>
                <SelectTrigger className="h-12 bg-background/50 border-muted" data-testid="select-pack-lang">
                  <SelectValue placeholder="Ngôn ngữ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chinese">Tiếng Trung</SelectItem>
                  <SelectItem value="english">Tiếng Anh</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="h-12 px-6 gap-2 w-full sm:w-auto" data-testid="button-create-pack">
              <Plus className="h-5 w-5" /> Tạo Bộ từ
            </Button>
          </form>
        </CardContent>
      </Card>

      {user.packs.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl border-muted">
          Bạn chưa có bộ từ nào. Hãy tạo một bộ từ mới nhé!
        </div>
      ) : (
        <div className={`grid gap-8 ${twoColumns ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
          {hasChinese && (
            <div className="space-y-4">
              {twoColumns && <h3 className="text-lg font-semibold text-foreground/80 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500/80"></span> Tiếng Trung
              </h3>}
              <div className={`grid gap-4 ${!twoColumns ? 'sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {user.packs.filter(p => p.language === "chinese").map(pack => (
                  <PackCard key={pack.name} pack={pack} />
                ))}
              </div>
            </div>
          )}
          
          {hasEnglish && (
            <div className="space-y-4">
              {twoColumns && <h3 className="text-lg font-semibold text-foreground/80 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500/80"></span> Tiếng Anh
              </h3>}
              <div className={`grid gap-4 ${!twoColumns ? 'sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {user.packs.filter(p => p.language === "english").map(pack => (
                  <PackCard key={pack.name} pack={pack} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <Dialog open={!!editingPack} onOpenChange={(open) => !open && setEditingPack(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi tên bộ từ</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename-pack">Tên mới</Label>
            <Input 
              id="rename-pack"
              value={editingPack?.newName || ''} 
              onChange={(e) => setEditingPack(prev => prev ? { ...prev, newName: e.target.value } : null)}
              className="mt-2"
              data-testid="input-rename-pack"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPack(null)}>Hủy</Button>
            <Button onClick={handleRename} data-testid="button-confirm-rename-pack">Lưu thay đổi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingPack} onOpenChange={(open) => !open && setDeletingPack(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Xóa bộ từ?</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-muted-foreground">
            Bạn có chắc chắn muốn xóa bộ từ <span className="font-semibold text-foreground">{deletingPack}</span>? Tất cả các từ trong bộ này sẽ bị mất.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingPack(null)}>Hủy</Button>
            <Button variant="destructive" onClick={handleDelete} data-testid="button-confirm-delete-pack">Xóa bộ từ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
