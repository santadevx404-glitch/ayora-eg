import { useCategories } from "@/hooks/useCategories";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag, Clock, ChevronDown, ChevronUp, GripVertical, X } from "lucide-react";
import type { AddonGroup, AddonItem } from "@/integrations/supabase/types";

// ── Types ──────────────────────────────────────────────
interface ProductForm {
  name: string; description: string; price: string;
  category: string; image_url: string;
  discount_enabled: boolean; discount_percent: string;
  discount_limited: boolean; discount_ends_at: string;
}
const emptyForm: ProductForm = {
  name: "", description: "", price: "", category: "", image_url: "",
  discount_enabled: false, discount_percent: "", discount_limited: false, discount_ends_at: "",
};

interface LocalGroup { tempId: string; name: string; max_select: number; required: boolean; items: LocalItem[]; }
interface LocalItem  { tempId: string; name: string; price: string; }
const newTempId = () => Math.random().toString(36).slice(2);

// ── Helpers ─────────────────────────────────────────────
const calcDiscounted = (price: number, pct: number) => Math.round(price * (1 - pct / 100) * 100) / 100;
const isDiscountActive = (p: any) => {
  if (!p.discount_percent) return false;
  if (!p.discount_ends_at) return true;
  return new Date(p.discount_ends_at) > new Date();
};

// ══════════════════════════════════════════════════════════
const AdminProducts = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editingId,  setEditingId]    = useState<string | null>(null);
  const [form,       setForm]         = useState<ProductForm>(emptyForm);
  const [uploading,  setUploading]    = useState(false);
  // Addon groups local state inside the dialog
  const [groups,     setGroups]       = useState<LocalGroup[]>([]);

  // ── Fetch dynamic categories ──
  const { data: categories } = useCategories();

  // ── Fetch products ──
  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // ── Save product + addon groups ──
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: form.name, description: form.description || null,
        price: parseFloat(form.price), category: form.category,
        image_url: form.image_url || null,
        discount_percent: null, discount_ends_at: null,
      };
      if (form.discount_enabled && form.discount_percent) {
        const pct = parseFloat(form.discount_percent);
        if (pct > 0 && pct < 100) {
          payload.discount_percent = pct;
          if (form.discount_limited && form.discount_ends_at)
            payload.discount_ends_at = new Date(form.discount_ends_at).toISOString();
        }
      }

      let productId = editingId;
      if (editingId) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        productId = data.id;
      }

      // Delete old addon groups (cascade deletes items too)
      await supabase.from("product_addon_groups").delete().eq("product_id", productId!);

      // Re-insert groups + items
      for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi];
        if (!g.name.trim()) continue;
        const { data: gRow, error: gErr } = await supabase
          .from("product_addon_groups")
          .insert({ product_id: productId!, name: g.name.trim(), max_select: g.max_select, required: g.required, sort_order: gi })
          .select("id").single();
        if (gErr) throw gErr;

        const validItems = g.items.filter(i => i.name.trim());
        if (validItems.length > 0) {
          const { error: iErr } = await supabase.from("product_addon_items").insert(
            validItems.map((item, ii) => ({
              group_id: gRow.id, name: item.name.trim(),
              price: parseFloat(item.price) || 0, sort_order: ii,
            }))
          );
          if (iErr) throw iErr;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["featured-products"] });
      toast.success(editingId ? "تم تحديث المنتج" : "تم إضافة المنتج");
      setDialogOpen(false); setForm(emptyForm); setEditingId(null); setGroups([]);
    },
    onError: (err: any) => toast.error("خطأ: " + (err?.message ?? "")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-products"] }); toast.success("تم الحذف"); },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    const fileName = `${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("product-images").upload(fileName, file);
    if (error) { toast.error("فشل رفع الصورة"); }
    else {
      const { data } = supabase.storage.from("product-images").getPublicUrl(fileName);
      setForm(f => ({ ...f, image_url: data.publicUrl }));
      toast.success("تم رفع الصورة");
    }
    setUploading(false);
  };

  // Load existing addon groups when editing
  const loadGroups = async (productId: string) => {
    const { data: gRows } = await supabase
      .from("product_addon_groups").select("*, product_addon_items(*)")
      .eq("product_id", productId).order("sort_order");
    if (!gRows) return;
    setGroups(gRows.map((g: any) => ({
      tempId: newTempId(), name: g.name, max_select: g.max_select, required: g.required,
      items: (g.product_addon_items ?? [])
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((i: any) => ({ tempId: newTempId(), name: i.name, price: i.price.toString() })),
    })));
  };

  const openEdit = async (product: any) => {
    const hasDiscount = !!product.discount_percent;
    const hasExpiry   = !!product.discount_ends_at;
    let endsAt = hasExpiry ? new Date(product.discount_ends_at).toISOString().slice(0, 16) : "";
    setEditingId(product.id);
    setForm({ name: product.name, description: product.description || "", price: product.price.toString(),
      category: product.category, image_url: product.image_url || "",
      discount_enabled: hasDiscount, discount_percent: product.discount_percent?.toString() ?? "",
      discount_limited: hasExpiry, discount_ends_at: endsAt });
    await loadGroups(product.id);
    setDialogOpen(true);
  };

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setGroups([]); setDialogOpen(true); };

  // ── Addon group helpers ──
  const addGroup = () => setGroups(g => [...g, { tempId: newTempId(), name: "", max_select: 1, required: false, items: [] }]);
  const removeGroup = (tid: string) => setGroups(g => g.filter(x => x.tempId !== tid));
  const updateGroup = (tid: string, patch: Partial<LocalGroup>) =>
    setGroups(g => g.map(x => x.tempId === tid ? { ...x, ...patch } : x));
  const addItem = (gTid: string) =>
    setGroups(g => g.map(x => x.tempId === gTid ? { ...x, items: [...x.items, { tempId: newTempId(), name: "", price: "0" }] } : x));
  const removeItem = (gTid: string, iTid: string) =>
    setGroups(g => g.map(x => x.tempId === gTid ? { ...x, items: x.items.filter(i => i.tempId !== iTid) } : x));
  const updateItem = (gTid: string, iTid: string, patch: Partial<LocalItem>) =>
    setGroups(g => g.map(x => x.tempId === gTid ? { ...x, items: x.items.map(i => i.tempId === iTid ? { ...i, ...patch } : i) } : x));

  const previewPrice = form.price && form.discount_enabled && form.discount_percent
    ? calcDiscounted(parseFloat(form.price), parseFloat(form.discount_percent)) : null;

  // ── Render ──
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-cairo font-bold">إدارة المنتجات</h2>
        <Button onClick={openAdd} className="gradient-gold text-primary-foreground gap-2">
          <Plus className="h-4 w-4" />إضافة منتج
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="rounded-xl bg-muted animate-pulse aspect-video" />)}
        </div>
      ) : !products?.length ? (
        <p className="text-muted-foreground text-center py-10">لا توجد منتجات. أضف منتجك الأول!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(product => {
            const imgUrl = product.image_url
              ? (product.image_url.startsWith("http") ? product.image_url
                : supabase.storage.from("product-images").getPublicUrl(product.image_url).data.publicUrl)
              : "/placeholder.svg";
            const active = isDiscountActive(product);
            const discountedPrice = active && product.discount_percent ? calcDiscounted(product.price, product.discount_percent) : null;
            return (
              <div key={product.id} className="bg-card border rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative aspect-video bg-secondary">
                  <img src={imgUrl} alt={product.name} className="w-full h-full object-cover" />
                  {active && product.discount_percent && (
                    <Badge className="absolute top-2 right-2 bg-red-500 text-white border-0 font-bold text-xs gap-1">
                      <Tag className="h-3 w-3" />-{product.discount_percent}%
                    </Badge>
                  )}
                  {product.discount_percent && !active && (
                    <Badge variant="outline" className="absolute top-2 right-2 bg-background/80 text-xs text-muted-foreground gap-1">
                      <Clock className="h-3 w-3" />انتهى الخصم
                    </Badge>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-cairo font-bold">{product.name}</h3>
                    <div className="text-left">
                      {discountedPrice !== null ? (
                        <>
                          <p className="text-xs text-muted-foreground line-through">{product.price.toFixed(2)} ج.م</p>
                          <p className="text-accent font-black text-sm">{discountedPrice.toFixed(2)} ج.م</p>
                        </>
                      ) : (
                        <p className="text-accent font-bold text-sm">{product.price.toFixed(2)} ج.م</p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{product.category}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(product)} className="gap-1 flex-1 text-xs">
                      <Pencil className="h-3 w-3" />تعديل
                    </Button>
                    <Button variant="outline" size="sm"
                      onClick={() => confirm("هل أنت متأكد؟") && deleteMutation.mutate(product.id)}
                      className="gap-1 text-destructive hover:text-destructive text-xs">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ Dialog ═══ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cairo">{editingId ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">

            {/* ── Basic ── */}
            <div>
              <label className="block text-sm font-medium mb-1">اسم المنتج</label>
              <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">الوصف</label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">السعر (ج.م)</label>
                <Input required type="number" step="0.01" min="0"
                  value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  dir="ltr" className="text-left" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">القسم</label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories?.map(cat => (
                      <SelectItem key={cat.slug} value={cat.slug}>{cat.emoji} {cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">صورة المنتج</label>
              <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
              {form.image_url && <img src={form.image_url} alt="preview" className="mt-2 h-20 w-20 rounded-lg object-cover border" />}
            </div>

            {/* ── Discount ── */}
            <div className="border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-accent" />
                  <span className="text-sm font-semibold">تفعيل خصم</span>
                </div>
                <Switch checked={form.discount_enabled} onCheckedChange={v => setForm(f => ({ ...f, discount_enabled: v }))} />
              </div>
              {form.discount_enabled && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-sm font-medium mb-1">نسبة الخصم (%)</label>
                    <Input type="number" min="1" max="99" value={form.discount_percent}
                      onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))}
                      placeholder="مثال: 20" dir="ltr" className="text-left" />
                    {previewPrice !== null && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground line-through">{parseFloat(form.price).toFixed(2)} ج.م</span>
                        <span className="text-green-600 font-bold">← {previewPrice.toFixed(2)} ج.م</span>
                        <Badge className="bg-red-500 text-white border-0 text-xs">-{form.discount_percent}%</Badge>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <div>
                        <p className="text-sm font-medium">لفترة محدودة</p>
                        <p className="text-xs text-muted-foreground">يُكتب "لفترة محدودة" على المنتج</p>
                      </div>
                    </div>
                    <Switch checked={form.discount_limited} onCheckedChange={v => setForm(f => ({ ...f, discount_limited: v }))} />
                  </div>
                  {form.discount_limited && (
                    <div>
                      <label className="block text-sm font-medium mb-1">تاريخ ووقت انتهاء الخصم</label>
                      <Input type="datetime-local" value={form.discount_ends_at}
                        onChange={e => setForm(f => ({ ...f, discount_ends_at: e.target.value }))}
                        dir="ltr" className="text-left" min={new Date().toISOString().slice(0, 16)} />
                      <p className="text-xs text-muted-foreground mt-1">بعد هذا الوقت الخصم بيتشال تلقائياً</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Addon Groups ── */}
            <div className="border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-accent" />
                  <span className="text-sm font-semibold">أقسام الإضافات</span>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addGroup} className="gap-1 text-xs">
                  <Plus className="h-3 w-3" />قسم جديد
                </Button>
              </div>

              {groups.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">لا توجد أقسام إضافية — اضغط "قسم جديد" لإضافة</p>
              )}

              {groups.map((group, gi) => (
                <div key={group.tempId} className="border rounded-xl p-3 space-y-3 bg-secondary/30">
                  {/* Group header */}
                  <div className="flex items-center gap-2">
                    <Input
                      value={group.name}
                      onChange={e => updateGroup(group.tempId, { name: e.target.value })}
                      placeholder="اسم القسم (مثال: الحجم، الإضافات)"
                      className="flex-1 h-8 text-sm"
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0"
                      onClick={() => removeGroup(group.tempId)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Group settings */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground whitespace-nowrap">أقصى اختيار:</label>
                      <Input type="number" min="1" max="20"
                        value={group.max_select}
                        onChange={e => updateGroup(group.tempId, { max_select: parseInt(e.target.value) || 1 })}
                        className="w-16 h-7 text-xs text-center" dir="ltr" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={group.required} onCheckedChange={v => updateGroup(group.tempId, { required: v })}
                        className="scale-75" />
                      <label className="text-xs text-muted-foreground">إلزامي</label>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <div key={item.tempId} className="flex items-center gap-2">
                        <Input
                          value={item.name}
                          onChange={e => updateItem(group.tempId, item.tempId, { name: e.target.value })}
                          placeholder="اسم الخيار"
                          className="flex-1 h-8 text-sm"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <Input
                            type="number" min="0" step="0.5"
                            value={item.price}
                            onChange={e => updateItem(group.tempId, item.tempId, { price: e.target.value })}
                            placeholder="0"
                            className="w-20 h-8 text-xs text-left" dir="ltr"
                          />
                          <span className="text-xs text-muted-foreground">ج.م</span>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0"
                          onClick={() => removeItem(group.tempId, item.tempId)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="ghost" size="sm" onClick={() => addItem(group.tempId)}
                      className="text-xs gap-1 h-7 text-accent hover:text-accent">
                      <Plus className="h-3 w-3" />إضافة خيار
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button type="submit" disabled={saveMutation.isPending}
              className="w-full gradient-gold text-primary-foreground font-bold h-11">
              {saveMutation.isPending ? "جاري الحفظ..." : editingId ? "تحديث المنتج" : "إضافة المنتج"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;
