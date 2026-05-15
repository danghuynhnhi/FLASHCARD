import { useState } from "react";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { User as UserIcon, Plus, Pencil, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface UsersScreenProps {
  onSelectUser: (userId: number, userName: string) => void;
}

export function UsersScreen({ onSelectUser }: UsersScreenProps) {
  const qc = useQueryClient();
  const { data: users = [], isLoading } = useListUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [newUserName, setNewUserName] = useState("");
  const [editingUser, setEditingUser] = useState<{ id: number; newName: string } | null>(null);
  const [deletingUser, setDeletingUser] = useState<{ id: number; name: string } | null>(null);
  const { toast } = useToast();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListUsersQueryKey() });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    createUser.mutate(
      { data: { name: newUserName.trim() } },
      {
        onSuccess: () => { setNewUserName(""); invalidate(); },
        onError: () => toast({ title: "Lỗi", description: "Tên người dùng đã tồn tại", variant: "destructive" }),
      }
    );
  };

  const handleRename = () => {
    if (!editingUser || !editingUser.newName.trim()) return;
    updateUser.mutate(
      { userId: editingUser.id, data: { name: editingUser.newName.trim() } },
      {
        onSuccess: () => { setEditingUser(null); invalidate(); },
        onError: () => toast({ title: "Lỗi", description: "Tên đã tồn tại", variant: "destructive" }),
      }
    );
  };

  const handleDelete = () => {
    if (!deletingUser) return;
    deleteUser.mutate(
      { userId: deletingUser.id },
      { onSuccess: () => { setDeletingUser(null); invalidate(); } }
    );
  };

  return (
    <div className="w-full flex flex-col gap-6 pt-8">
      <div className="text-center mb-2">
        <h1 className="text-3xl font-bold text-foreground mb-1">Flashcard App</h1>
        <p className="text-muted-foreground text-sm">Chọn người dùng để bắt đầu</p>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
          Thêm người dùng
        </p>
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            placeholder="Tên người dùng"
            className="flex-1 h-10"
            data-testid="input-new-user"
          />
          <Button type="submit" className="h-10 px-4 gap-1.5" disabled={createUser.isPending} data-testid="button-create-user">
            <Plus className="h-4 w-4" /> Tạo
          </Button>
        </form>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="py-10 text-center text-muted-foreground text-sm">Đang tải...</div>
        ) : users.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            Chưa có người dùng nào
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {users.map((user) => (
              <li
                key={user.id}
                className="flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors group"
                data-testid={`row-user-${user.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.packCount} bộ từ</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => setEditingUser({ id: user.id, newName: user.name })}
                      data-testid={`button-edit-user-${user.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeletingUser({ id: user.id, name: user.name })}
                      data-testid={`button-delete-user-${user.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-4 text-sm"
                    onClick={() => onSelectUser(user.id, user.name)}
                    data-testid={`button-select-user-${user.id}`}
                  >
                    Chọn
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Đổi tên người dùng</DialogTitle></DialogHeader>
          <div className="py-4">
            <Label>Tên mới</Label>
            <Input
              value={editingUser?.newName || ""}
              onChange={(e) => setEditingUser((p) => p ? { ...p, newName: e.target.value } : null)}
              className="mt-2"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Hủy</Button>
            <Button onClick={handleRename} disabled={updateUser.isPending}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xóa người dùng?</DialogTitle></DialogHeader>
          <p className="py-4 text-muted-foreground text-sm">
            Xóa <span className="font-semibold text-foreground">{deletingUser?.name}</span>? Tất cả bộ từ sẽ mất.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingUser(null)}>Hủy</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteUser.isPending}>Xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
