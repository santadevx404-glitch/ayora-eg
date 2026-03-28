import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  UserPlus, Trash2, RefreshCw, ShieldCheck, Users,
  Package, ShoppingCart, Shield, Pencil, AlertCircle,
} from "lucide-react";

type Permission = "orders" | "products" | "users";

const PERMS: { key: Permission; label: string; icon: any; desc: string }[] = [
  { key: "orders",   label: "إدارة الطلبات",  icon: ShoppingCart, desc: "عرض وتغيير حالة الطلبات" },
  { key: "products", label: "إدارة المنتجات", icon: Package,       desc: "إضافة وتعديل وحذف المنتجات" },
  { key: "users",    label: "إدارة الأدمنية", icon: Shield,        desc: "إضافة وحذف أدمنية وتعديل صلاحياتهم" },
];

interface AdminUser {
  user_id: string;
  email: string;
  created_at: string | null;
  permissions: Permission[];
}

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editPerms, setEditPerms] = useState<Permission[]>([]);

  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPerms, setNewPerms] = useState<Permission[]>(["orders", "products"]);
  const [saving, setSaving] = useState(false);

  // ── Fetch all admins + their permissions ──
  const { data: admins, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: views, error: vErr } = await supabase
        .from("admin_users_view")
        .select("id, email, created_at");
      if (vErr) throw vErr;

      const { data: permsRows, error: pErr } = await supabase
        .from("admin_permissions")
        .select("user_id, permission");
      if (pErr) throw pErr;

      return (views ?? []).map((v: any) => ({
        user_id: v.id,
        email: v.email,
        created_at: v.created_at,
        permissions: (permsRows ?? [])
          .filter((p: any) => p.user_id === v.id)
          .map((p: any) => p.permission as Permission),
      })) as AdminUser[];
    },
  });

  // ── Add new admin ──
  // Strategy: sign them up, then the trigger + manual insert handles the role
  // If signUp succeeds, user is created. We then insert role + permissions.
  // Note: signUp may return identities:[] if email already exists — we handle that.
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Step 1: Create the user account
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: newEmail,
        password: newPass,
        options: { emailRedirectTo: undefined },
      });

      if (signUpErr) throw new Error(signUpErr.message);

      const userId = signUpData?.user?.id;
      if (!userId) throw new Error("لم يتم إنشاء المستخدم — قد يكون الإيميل مسجل مسبقاً");

      // Step 2: Grant admin role
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });

      // Ignore duplicate key error (already admin)
      if (roleErr && !roleErr.message.includes("duplicate")) throw new Error(roleErr.message);

      // Step 3: Grant permissions
      if (newPerms.length > 0) {
        const { error: permErr } = await supabase
          .from("admin_permissions")
          .insert(newPerms.map(p => ({ user_id: userId, permission: p })));
        if (permErr && !permErr.message.includes("duplicate")) throw new Error(permErr.message);
      }

      toast.success(`تم إضافة ${newEmail} كأدمن ✅`);
      setAddOpen(false);
      setNewEmail(""); setNewPass(""); setNewPerms(["orders", "products"]);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast.error(err?.message ?? "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  // ── Update permissions ──
  const savePerms = useMutation({
    mutationFn: async ({ user_id, permissions }: { user_id: string; permissions: Permission[] }) => {
      // Delete all current permissions for this user
      const { error: delErr } = await supabase
        .from("admin_permissions")
        .delete()
        .eq("user_id", user_id);
      if (delErr) throw new Error(delErr.message);

      // Insert new permissions
      if (permissions.length > 0) {
        const { error: insErr } = await supabase
          .from("admin_permissions")
          .insert(permissions.map(p => ({ user_id, permission: p })));
        if (insErr) throw new Error(insErr.message);
      }
    },
    onSuccess: () => {
      toast.success("تم تحديث الصلاحيات ✅");
      setEditTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => toast.error("فشل التحديث: " + (err?.message ?? "")),
  });

  // ── Remove admin ──
  const removeAdmin = useMutation({
    mutationFn: async (user_id: string) => {
      const { error: p } = await supabase.from("admin_permissions").delete().eq("user_id", user_id);
      if (p) throw new Error(p.message);
      const { error: r } = await supabase.from("user_roles").delete()
        .eq("user_id", user_id).eq("role", "admin");
      if (r) throw new Error(r.message);
    },
    onSuccess: () => {
      toast.success("تم إزالة الأدمن");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => toast.error("فشل الحذف: " + (err?.message ?? "")),
  });

  const togglePerm = (p: Permission, list: Permission[], setList: (v: Permission[]) => void) =>
    setList(list.includes(p) ? list.filter(x => x !== p) : [...list, p]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 space-y-3">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <p className="text-destructive font-medium">فشل تحميل الأدمنية</p>
        <p className="text-sm text-muted-foreground">{(error as any)?.message}</p>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-cairo font-bold">إدارة الأدمنية</h2>
        <Button onClick={() => setAddOpen(true)} className="gradient-gold text-primary-foreground gap-2">
          <UserPlus className="h-4 w-4" />
          إضافة أدمن
        </Button>
      </div>

      {/* Info note */}
      <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 mb-5 flex gap-2 text-sm text-accent">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>الأدمن الجديد هيتبعتله إيميل تأكيد — لازم يأكده قبل ما يقدر يدخل</span>
      </div>

      {!admins || admins.length === 0 ? (
        <div className="text-center py-20">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">لا يوجد أدمنية</p>
        </div>
      ) : (
        <div className="space-y-3">
          {admins.map(admin => (
            <div key={admin.user_id} className="bg-card border rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center text-primary-foreground text-xs font-black shrink-0">
                      {admin.email.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm" dir="ltr">{admin.email}</p>
                        {admin.user_id === currentUser?.id && (
                          <Badge variant="outline" className="text-xs text-accent border-accent">أنت</Badge>
                        )}
                      </div>
                      {admin.created_at && (
                        <p className="text-xs text-muted-foreground">
                          انضم {new Date(admin.created_at).toLocaleDateString("ar-EG")}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {admin.permissions.length === 0 ? (
                      <Badge variant="outline" className="text-xs text-muted-foreground">بدون صلاحيات</Badge>
                    ) : (
                      admin.permissions.map(p => {
                        const pInfo = PERMS.find(x => x.key === p);
                        return (
                          <Badge key={p} className="text-xs bg-accent/10 text-accent border border-accent/20 gap-1">
                            {pInfo && <pInfo.icon className="h-3 w-3" />}
                            {pInfo?.label ?? p}
                          </Badge>
                        );
                      })
                    )}
                  </div>
                </div>

                {admin.user_id !== currentUser?.id && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline" size="sm" className="gap-1.5 text-xs"
                      onClick={() => { setEditTarget(admin); setEditPerms([...admin.permissions]); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      صلاحيات
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className="gap-1 text-xs text-destructive hover:text-destructive border-destructive/30"
                      onClick={() => confirm(`إزالة ${admin.email} من الأدمنية؟`) && removeAdmin.mutate(admin.user_id)}
                      disabled={removeAdmin.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Admin Dialog ── */}
      <Dialog open={addOpen} onOpenChange={v => { if (!saving) setAddOpen(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-accent" />
              إضافة أدمن جديد
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <Label className="mb-1.5 block">البريد الإلكتروني</Label>
              <Input
                type="email" required
                value={newEmail} onChange={e => setNewEmail(e.target.value)}
                placeholder="admin@example.com" dir="ltr" className="text-left"
                disabled={saving}
              />
            </div>
            <div>
              <Label className="mb-1.5 block">كلمة المرور الأولية</Label>
              <Input
                type="password" required minLength={6}
                value={newPass} onChange={e => setNewPass(e.target.value)}
                placeholder="6 أحرف على الأقل" dir="ltr" className="text-left"
                disabled={saving}
              />
            </div>

            <div>
              <Label className="mb-2 block">الصلاحيات</Label>
              <div className="space-y-2">
                {PERMS.map(perm => (
                  <div key={perm.key} className="flex items-center justify-between rounded-xl border p-3 hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <perm.icon className="h-4 w-4 text-accent shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{perm.label}</p>
                        <p className="text-xs text-muted-foreground">{perm.desc}</p>
                      </div>
                    </div>
                    <Switch
                      checked={newPerms.includes(perm.key)}
                      onCheckedChange={() => togglePerm(perm.key, newPerms, setNewPerms)}
                      disabled={saving}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)} disabled={saving}>
                إلغاء
              </Button>
              <Button type="submit" disabled={saving} className="flex-1 gradient-gold text-primary-foreground font-bold">
                {saving ? "جاري الإضافة..." : "إضافة الأدمن"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Permissions Dialog ── */}
      <Dialog open={!!editTarget} onOpenChange={v => !v && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-accent" />
              صلاحيات {editTarget?.email}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {PERMS.map(perm => (
              <div key={perm.key} className="flex items-center justify-between rounded-xl border p-3 hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-2.5">
                  <perm.icon className="h-4 w-4 text-accent shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{perm.label}</p>
                    <p className="text-xs text-muted-foreground">{perm.desc}</p>
                  </div>
                </div>
                <Switch
                  checked={editPerms.includes(perm.key)}
                  onCheckedChange={() => togglePerm(perm.key, editPerms, setEditPerms)}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setEditTarget(null)}>إلغاء</Button>
            <Button
              className="flex-1 gradient-gold text-primary-foreground font-bold"
              disabled={savePerms.isPending}
              onClick={() => editTarget && savePerms.mutate({ user_id: editTarget.user_id, permissions: editPerms })}
            >
              {savePerms.isPending ? "جاري الحفظ..." : "حفظ الصلاحيات"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
