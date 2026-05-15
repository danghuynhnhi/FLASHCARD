import { useState } from "react";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { User as UserIcon, BookOpen, Plus, Pencil, Trash2 } from "lucide-react";
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
  const [editingUser, setEditingUser] = useState<{ id: number; oldName: string; newName: string } | null>(null);
  const [deletingUser, setDeletingUser] = useState<{ id: number; name: string } | null>(null);
  const { toast } = useToast();

  const invalidate = () => qc.invalidateQueries({ queryKey: getListUsersQueryKey() });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    createUser.mutate(
      { data: { name: newUserName.trim() } },
      {
        onSuccess: () => {
          setNewUserName("");
          invalidate();
        },
        onError: () => {
          toast({ title: "Lỗi", description: "Tên người dùng đã tồn tại", variant: "destructive" });
        },
      }
    );
  };

  const handleRename = () => {
    if (!editingUser || !editingUser.newName.trim()) return;
    updateUser.mutate(
      { userId: editingUser.id, data: { name: editingUser.newName.trim() } },
      {
        onSuccess: () => {
          setEditingUser(null);
          invalidate();
        },
        onError: () => {
          toast({ title: "Lỗi", description: "Tên đã tồn tại hoặc không hợp lệ", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deletingUser) return;
    deleteUser.mutate(
      { userId: deletingUser.id },
      {
        onSuccess: () => {
          setDeletingUser(null);
          invalidate();
        },
      }
    );
  };

  return (
    <div className="w-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-center justify-center pt-8 pb-4 text-center">
        <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 text-primary shadow-sm rotate-3">
          <BookOpen className="h-8 w-8 -rotate-3" />
        </div>
        <h1 className="text-4xl font-serif font-bold text-foreground mb-2">Flashcard App</h1>
        <p className="text-muted-foreground text-lg">Bạn học tiếng mới hôm nay nhé!</p>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm shadow-sm border-muted">
        <CardContent className="pt-6">
          <form onSubmit={handleCreate} className="flex gap-3">
            <div className="flex-1 relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Nhập tên của bạn..."
                className="pl-10 h-12 text-lg bg-background/50 border-muted"
                data-testid="input-new-user"
              />
            </div>
            <Button type="submit" className="h-12 px-6 gap-2" disabled={createUser.isPending} data-testid="button-create-user">
              <Plus className="h-5 w-5" /> Tạo User
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Đang tải...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <Card
              key={user.id}
              className="group hover:shadow-md transition-all duration-300 border-border/50 hover:border-primary/20 bg-card overflow-hidden"
              data-testid={`card-user-${user.id}`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-secondary rounded-full flex items-center justify-center text-primary font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-xl font-semibold group-hover:text-primary transition-colors">
                        {user.name}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">{user.packCount} bộ từ</CardDescription>
                    </div>
                  </div>
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditingUser({ id: user.id, oldName: user.name, newName: user.name })}
                      data-testid={`button-edit-user-${user.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => setDeletingUser({ id: user.id, name: user.name })}
                      data-testid={`button-delete-user-${user.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full bg-secondary hover:bg-primary hover:text-primary-foreground text-secondary-foreground transition-all duration-300 shadow-sm"
                  onClick={() => onSelectUser(user.id, user.name)}
                  data-testid={`button-study-user-${user.id}`}
                >
                  Vào học
                </Button>
              </CardContent>
            </Card>
          ))}
          {users.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl border-muted">
              Chưa có người dùng nào. Hãy tạo một user để bắt đầu nhé!
            </div>
          )}
        </div>
      )}

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đổi tên người dùng</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename-user">Tên mới</Label>
            <Input
              id="rename-user"
              value={editingUser?.newName || ""}
              onChange={(e) => setEditingUser((prev) => (prev ? { ...prev, newName: e.target.value } : null))}
              className="mt-2"
              data-testid="input-rename-user"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Hủy</Button>
            <Button onClick={handleRename} disabled={updateUser.isPending} data-testid="button-confirm-rename">
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Xóa người dùng?</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-muted-foreground">
            Bạn có chắc chắn muốn xóa người dùng{" "}
            <span className="font-semibold text-foreground">{deletingUser?.name}</span>? Tất cả các bộ từ sẽ bị mất.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingUser(null)}>Hủy</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteUser.isPending} data-testid="button-confirm-delete">
              Xóa người dùng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
