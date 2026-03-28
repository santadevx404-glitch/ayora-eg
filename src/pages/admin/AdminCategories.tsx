import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, Percent, Clock } from "lucide-react";

interface CatForm {
  slug: string; label: string; emoji: string; sort_order: string; active: boolean;
  discount_enabled: boolean; discount_percent: string;
  discount_limited: boolean; discount_ends_at: string;
}
const emptyForm = (): CatForm => ({
  slug: "", label: "", emoji: "", sort_order: "0", active: true,
  discount_enabled: false, discount_percent: "",
  discount_limited: false, discount_ends_at: "",
});

const AdminCategories = () => {
  const qc = useQueryClient();
  const [open, setOpen]     = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm]     = useState<CatForm>(emptyForm());

  const { data: cats, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        slug:       form.slug.trim().toLowerCase().replace(/\s+/g, "-"),
        label:      form.label.trim(),
        emoji:      form.emoji.trim() || null,
        sort_order: parseInt(form.sort_order) || 0,
        active:     form.active,
        discount_percent: form.discount_enabled && form.discount_percent ? parseFloat(form.discount_percent) : null,
        discount_ends_at: form.discount_enabled && form.discount_limited && form.discount_ends_at
          ? new Date(form.discount_ends_at).toISOString() : null,
      };
      if (editId) {
        const { error } = await supabase.from("categories").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success(editId ? "تم التحديث" : "تم إنشاء القسم");
      setOpen(false); setEditId(null); setForm(emptyForm());
    },
    onError: (e: any) => toast.error("خطأ: " + e?.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("تم الحذف");
    },
  });

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("categories").update({ active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-categories"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const openAdd = () => { setEditId(null); setForm(emptyForm()); setOpen(true); };
  const openEdit = (c: any) => {
    setEditId(c.id);
    setForm({
      slug: c.slug, label: c.label, emoji: c.emoji || "",
      sort_order: c.sort_order.toString(), active: c.active,
      discount_enabled: !!c.discount_percent,
      discount_percent: c.discount_percent?.toString() ?? "",
      discount_limited: !!c.discount_ends_at,
      discount_ends_at: c.discount_ends_at ? new Date(c.discount_ends_at).toISOString().slice(0, 16) : "",
    });
    setOpen(true);
  };

  const isDiscountActive = (c: any) => {
    if (!c.discount_percent) return false;
    if (!c.discount_ends_at) return true;
    return new Date(c.discount_ends_at) > new Date();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-cairo font-bold">الأقسام</h2>
        <Button onClick={openAdd} className="gradient-gold text-primary-foreground gap-2">
          <Plus className="h-4 w-4" />قسم جديد
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : !cats?.length ? (
        <p className="text-muted-foreground text-center py-10">لا توجد أقسام</p>
      ) : (
        <div className="space-y-3">
          {cats.map(c => (
            <div key={c.id} className={`flex items-center gap-3 border rounded-xl p-4 ${!c.active ? "opacity-60" : ""}`}>
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-2xl">{c.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{c.label}</span>
                  <code className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">{c.slug}</code>
                  {!c.active && <Badge variant="outline" className="text-xs">موقوف</Badge>}
                  {isDiscountActive(c) && (
                    <Badge className="text-xs bg-orange-100 text-orange-700 border-0 gap-1">
                      <Percent className="h-2.5 w-2.5" />{c.discount_percent}% خصم
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={c.active} onCheckedChange={v => toggleActive(c.id, v)} />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                  onClick={() => confirm(`حذف قسم "${c.label}"؟`) && deleteMutation.mutate(c.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-cairo">{editId ? "تعديل القسم" : "قسم جديد"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">اسم القسم</label>
                <Input required value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="مثال: المجات" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">إيموجي (اختياري)</label>
                <Input value={form.emoji} onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))} placeholder="☕" className="text-center text-xl" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الـ Slug (بالإنجليزية)</label>
              <Input required value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="mugs" dir="ltr" className="font-mono" />
              <p className="text-xs text-muted-foreground mt-1">هيظهر في رابط الصفحة: /products/<strong>{form.slug || "slug"}</strong></p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الترتيب</label>
              <Input type="number" min="0" value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} dir="ltr" />
            </div>

            {/* Discount */}
            <div className="border rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-1.5"><Percent className="h-4 w-4" />خصم على القسم كله</span>
                <Switch checked={form.discount_enabled} onCheckedChange={v => setForm(f => ({ ...f, discount_enabled: v }))} />
              </div>
              {form.discount_enabled && (
                <>
                  <Input type="number" min="1" max="99" required value={form.discount_percent}
                    onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))}
                    placeholder="نسبة الخصم %" dir="ltr" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm flex items-center gap-1.5"><Clock className="h-4 w-4" />ينتهي في تاريخ محدد</span>
                    <Switch checked={form.discount_limited} onCheckedChange={v => setForm(f => ({ ...f, discount_limited: v }))} />
                  </div>
                  {form.discount_limited && (
                    <Input type="datetime-local" value={form.discount_ends_at}
                      onChange={e => setForm(f => ({ ...f, discount_ends_at: e.target.value }))}
                      min={new Date().toISOString().slice(0, 16)} dir="ltr" />
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-between border rounded-xl p-3">
              <span className="text-sm font-medium">القسم مفعّل</span>
              <Switch checked={form.active} onCheckedChange={v => setForm(f => ({ ...f, active: v }))} />
            </div>

            <Button type="submit" disabled={saveMutation.isPending} className="w-full gradient-gold text-primary-foreground font-bold h-11">
              {saveMutation.isPending ? "جاري الحفظ..." : editId ? "تحديث" : "إنشاء القسم"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCategories;
