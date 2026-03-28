import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useCategories } from "@/hooks/useCategories";
import { Plus, Pencil, Trash2, Megaphone } from "lucide-react";

interface AnnForm {
  title: string; body: string;
  starts_at: string; ends_at_enabled: boolean; ends_at: string;
  link_type: "none" | "category" | "product";
  link_value: string; active: boolean;
}
const emptyForm = (): AnnForm => ({
  title: "", body: "",
  starts_at: new Date().toISOString().slice(0, 16),
  ends_at_enabled: false, ends_at: "",
  link_type: "none", link_value: "", active: true,
});

const AdminAnnouncements = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<AnnForm>(emptyForm());

  const { data: anns, isLoading } = useQuery({
    queryKey: ["announcements-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useCategories();

  const { data: products } = useQuery({
    queryKey: ["products-list"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name").order("name");
      return data ?? [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: form.title.trim(), body: form.body.trim(),
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: form.ends_at_enabled && form.ends_at ? new Date(form.ends_at).toISOString() : null,
        link_type: form.link_type === "none" ? null : form.link_type,
        link_value: form.link_type !== "none" && form.link_value ? form.link_value : null,
        active: form.active,
      };
      if (editId) {
        const { error } = await supabase.from("announcements").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("announcements").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements-admin"] });
      qc.invalidateQueries({ queryKey: ["announcements"] });
      toast.success(editId ? "تم التحديث" : "تم إنشاء الإعلان");
      setOpen(false); setEditId(null); setForm(emptyForm());
    },
    onError: (e: any) => toast.error("خطأ: " + e?.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["announcements-admin"] }); toast.success("تم الحذف"); },
  });

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("announcements").update({ active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["announcements-admin"] });
    qc.invalidateQueries({ queryKey: ["announcements"] });
  };

  const openEdit = (a: any) => {
    setEditId(a.id);
    setForm({
      title: a.title, body: a.body,
      starts_at: new Date(a.starts_at).toISOString().slice(0, 16),
      ends_at_enabled: !!a.ends_at, ends_at: a.ends_at ? new Date(a.ends_at).toISOString().slice(0, 16) : "",
      link_type: a.link_type ?? "none", link_value: a.link_value ?? "",
      active: a.active,
    });
    setOpen(true);
  };

  const isActive = (a: any) => {
    if (!a.active) return false;
    const now = new Date();
    if (new Date(a.starts_at) > now) return false;
    if (a.ends_at && new Date(a.ends_at) < now) return false;
    return true;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-cairo font-bold">الإعلانات</h2>
        <Button onClick={() => { setEditId(null); setForm(emptyForm()); setOpen(true); }} className="gradient-gold text-primary-foreground gap-2">
          <Plus className="h-4 w-4" />إعلان جديد
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : !anns?.length ? (
        <p className="text-muted-foreground text-center py-10">لا توجد إعلانات بعد</p>
      ) : (
        <div className="space-y-3">
          {anns.map(a => {
            const live = isActive(a);
            return (
              <div key={a.id} className={`border rounded-xl p-4 ${!live ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3">
                  <Megaphone className={`h-5 w-5 mt-0.5 shrink-0 ${live ? "text-accent" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-sm">{a.title}</p>
                      {live && <Badge className="text-xs bg-green-100 text-green-700 border-0">نشط الآن</Badge>}
                      {!a.active && <Badge variant="outline" className="text-xs text-muted-foreground">موقوف</Badge>}
                      {a.link_type && (
                        <Badge className="text-xs bg-blue-100 text-blue-700 border-0">
                          {a.link_type === "category" ? "قسم" : "منتج"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{a.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      من {new Date(a.starts_at).toLocaleDateString("ar-EG")}
                      {a.ends_at ? ` حتى ${new Date(a.ends_at).toLocaleDateString("ar-EG")}` : " (بلا نهاية)"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={a.active} onCheckedChange={v => toggleActive(a.id, v)} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                      onClick={() => confirm("حذف الإعلان؟") && deleteMutation.mutate(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cairo">{editId ? "تعديل الإعلان" : "إعلان جديد"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">

            <div>
              <label className="block text-sm font-medium mb-1">العنوان</label>
              <Input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="عنوان الإعلان" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">النص</label>
              <Textarea required rows={3} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="محتوى الإعلان..." />
            </div>

            {/* Timing */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">يبدأ في</label>
                <Input type="datetime-local" required value={form.starts_at}
                  onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} dir="ltr" className="text-left text-xs" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  ينتهي في
                  <Switch className="mr-2 scale-75" checked={form.ends_at_enabled} onCheckedChange={v => setForm(f => ({ ...f, ends_at_enabled: v }))} />
                </label>
                {form.ends_at_enabled ? (
                  <Input type="datetime-local" value={form.ends_at}
                    onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                    min={form.starts_at} dir="ltr" className="text-left text-xs" />
                ) : (
                  <p className="text-xs text-muted-foreground pt-2">بلا نهاية</p>
                )}
              </div>
            </div>

            {/* Link */}
            <div className="border rounded-xl p-3 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">الضغط على الإعلان يوصل لـ (اختياري)</label>
                <Select value={form.link_type} onValueChange={v => setForm(f => ({ ...f, link_type: v as any, link_value: "" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">بدون رابط</SelectItem>
                    <SelectItem value="category">قسم محدد</SelectItem>
                    <SelectItem value="product">منتج محدد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.link_type === "category" && (
                <div>
                  <label className="block text-sm font-medium mb-1">القسم</label>
                  <Select value={form.link_value} onValueChange={v => setForm(f => ({ ...f, link_value: v }))}>
                    <SelectTrigger><SelectValue placeholder="اختر قسم" /></SelectTrigger>
                    <SelectContent>
                      {categories?.map(cat => (
                        <SelectItem key={cat.slug} value={cat.slug}>{cat.emoji} {cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {form.link_type === "product" && (
                <div>
                  <label className="block text-sm font-medium mb-1">المنتج</label>
                  <Select value={form.link_value} onValueChange={v => setForm(f => ({ ...f, link_value: v }))}>
                    <SelectTrigger><SelectValue placeholder="اختر منتج" /></SelectTrigger>
                    <SelectContent>
                      {products?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border rounded-xl p-3">
              <span className="text-sm font-medium">الإعلان فعّال</span>
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
            </div>

            <Button type="submit" disabled={saveMutation.isPending} className="w-full gradient-gold text-primary-foreground font-bold h-11">
              {saveMutation.isPending ? "جاري الحفظ..." : editId ? "تحديث" : "نشر الإعلان"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAnnouncements;
