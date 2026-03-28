import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Copy, RefreshCw, Percent, DollarSign, Layers, ShoppingBag, Globe } from "lucide-react";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const seg = (n: number) => Array.from({ length: n }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("");
const genCode = () => `${seg(4)}-${seg(4)}-${seg(4)}`;

interface DiscountCode {
  id: string; code: string; type: "percent" | "fixed"; value: number;
  max_uses: number | null; used_count: number; expires_at: string | null;
  active: boolean; applies_to_category: string | null; applies_to_product: string | null;
}

interface Form {
  code: string; type: "percent" | "fixed"; value: string;
  max_uses: string; expires_at: string; active: boolean;
  applies_to_category: string; applies_to_product: string;
}

const blankForm = (): Form => ({
  code: genCode(), type: "percent", value: "",
  max_uses: "", expires_at: "", active: true,
  applies_to_category: "", applies_to_product: "",
});

const FormFields = ({ form, setForm }: { form: Form; setForm: (p: Partial<Form>) => void }) => (
  <div className="space-y-4">
    <div>
      <label className="block text-sm font-medium mb-1">الكود</label>
      <div className="flex gap-2">
        <Input required value={form.code}
          onChange={e => setForm({ code: e.target.value.toUpperCase() })}
          className="font-mono tracking-widest text-center" dir="ltr" />
        <Button type="button" variant="outline" size="icon" onClick={() => setForm({ code: genCode() })}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-sm font-medium mb-1">نوع الخصم</label>
        <Select value={form.type} onValueChange={(v: any) => setForm({ type: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="percent">نسبة مئوية %</SelectItem>
            <SelectItem value="fixed">مبلغ ثابت ج.م</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">{form.type === "percent" ? "النسبة %" : "المبلغ ج.م"}</label>
        <Input required type="number" min="0" max={form.type === "percent" ? "100" : undefined}
          value={form.value} onChange={e => setForm({ value: e.target.value })}
          dir="ltr" className="text-left" placeholder={form.type === "percent" ? "20" : "50"} />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-sm font-medium mb-1">أقصى استخدام</label>
        <Input type="number" min="1" value={form.max_uses}
          onChange={e => setForm({ max_uses: e.target.value })}
          dir="ltr" className="text-left" placeholder="غير محدود" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">تاريخ الانتهاء</label>
        <Input type="datetime-local" value={form.expires_at}
          onChange={e => setForm({ expires_at: e.target.value })}
          dir="ltr" className="text-left" />
      </div>
    </div>
    <div className="flex items-center gap-3 border rounded-xl px-4 py-3">
      <Switch checked={form.active} onCheckedChange={v => setForm({ active: v })} />
      <label className="text-sm font-medium">كود نشط</label>
    </div>
  </div>
);

export default function AdminDiscounts() {
  const qc = useQueryClient();
  const [dialog, setDialog]     = useState<"none" | "general" | "special">("none");
  const [editId, setEditId]     = useState<string | null>(null);
  const [form, setFormState]    = useState<Form>(blankForm());
  const [scopeTab, setScopeTab] = useState<"category" | "product">("category");

  const setForm = (patch: Partial<Form>) => setFormState(prev => ({ ...prev, ...patch }));

  const { data: categories = [] } = useCategories();
  const { data: products = [] } = useQuery({
    queryKey: ["dc-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name, category").order("name");
      if (error) throw error;
      return data as { id: string; name: string; category: string }[];
    },
  });
  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["discount-codes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("discount_codes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as DiscountCode[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const isSpecial = dialog === "special";
      const payload = {
        code:     form.code.toUpperCase().trim(),
        type:     form.type,
        value:    parseFloat(form.value),
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        active:   form.active,
        applies_to_category: isSpecial && scopeTab === "category" && form.applies_to_category ? form.applies_to_category : null,
        applies_to_product:  isSpecial && scopeTab === "product"  && form.applies_to_product  ? form.applies_to_product  : null,
      };
      if (editId) {
        const { error } = await supabase.from("discount_codes").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("discount_codes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["discount-codes"] });
      toast.success(editId ? "تم التحديث" : "تم إضافة الكود");
      setDialog("none"); setEditId(null);
    },
    onError: (e: any) => toast.error("خطأ: " + (e?.message ?? "حاول مرة أخرى")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("discount_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["discount-codes"] }); toast.success("تم الحذف"); },
    onError: (e: any) => toast.error("فشل: " + e?.message),
  });

  const toggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("discount_codes").update({ active }).eq("id", id);
    if (error) { toast.error("فشل: " + error.message); return; }
    qc.invalidateQueries({ queryKey: ["discount-codes"] });
  };

  const openGeneral = (c?: DiscountCode) => {
    setEditId(c?.id ?? null);
    setFormState(c ? {
      code: c.code, type: c.type, value: c.value.toString(),
      max_uses: c.max_uses?.toString() ?? "",
      expires_at: c.expires_at ? new Date(c.expires_at).toISOString().slice(0, 16) : "",
      active: c.active, applies_to_category: "", applies_to_product: "",
    } : blankForm());
    setDialog("general");
  };

  const openSpecial = (c?: DiscountCode) => {
    setEditId(c?.id ?? null);
    const tab: "category" | "product" = c?.applies_to_product ? "product" : "category";
    setScopeTab(tab);
    setFormState(c ? {
      code: c.code, type: c.type, value: c.value.toString(),
      max_uses: c.max_uses?.toString() ?? "",
      expires_at: c.expires_at ? new Date(c.expires_at).toISOString().slice(0, 16) : "",
      active: c.active,
      applies_to_category: c.applies_to_category ?? "",
      applies_to_product:  c.applies_to_product  ?? "",
    } : { ...blankForm(), applies_to_category: "", applies_to_product: "" });
    setDialog("special");
  };

  const handleEdit = (c: DiscountCode) =>
    (c.applies_to_category || c.applies_to_product) ? openSpecial(c) : openGeneral(c);

  const canSave = !!form.value && !isNaN(parseFloat(form.value)) &&
    !(dialog === "special" && scopeTab === "category" && !form.applies_to_category) &&
    !(dialog === "special" && scopeTab === "product"  && !form.applies_to_product);

  const isExpired   = (c: DiscountCode) => !!c.expires_at && new Date(c.expires_at) < new Date();
  const isExhausted = (c: DiscountCode) => !!c.max_uses && c.used_count >= c.max_uses;
  const statusOf    = (c: DiscountCode) => {
    if (isExpired(c))   return { label: "منتهي",   cls: "bg-red-100 text-red-700 border-red-200" };
    if (isExhausted(c)) return { label: "استُنفد", cls: "bg-red-100 text-red-700 border-red-200" };
    if (!c.active)      return { label: "موقوف",   cls: "bg-gray-100 text-gray-600 border-gray-200" };
    return               { label: "نشط",    cls: "bg-green-100 text-green-700 border-green-200" };
  };
  const scopeBadge = (c: DiscountCode) => {
    if (c.applies_to_product) {
      const p = products.find(p => p.id === c.applies_to_product);
      return <Badge variant="outline" className="text-xs gap-1 border-blue-300 text-blue-700 bg-blue-50"><ShoppingBag className="h-3 w-3" />منتج: {p?.name ?? "—"}</Badge>;
    }
    if (c.applies_to_category) {
      const cat = categories.find(c2 => c2.slug === c.applies_to_category);
      return <Badge variant="outline" className="text-xs gap-1 border-blue-300 text-blue-700 bg-blue-50"><Layers className="h-3 w-3" />قسم: {cat ? (cat.emoji ? cat.emoji + " " : "") + cat.label : c.applies_to_category}</Badge>;
    }
    return <Badge variant="outline" className="text-xs gap-1 text-muted-foreground"><Globe className="h-3 w-3" />عام</Badge>;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-cairo font-bold">أكواد الخصم</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openGeneral()} className="gap-2">
            <Plus className="h-4 w-4" /><Globe className="h-4 w-4" />كود خصم عام
          </Button>
          <Button onClick={() => openSpecial()} className="gradient-gold text-primary-foreground gap-2">
            <Plus className="h-4 w-4" /><Layers className="h-4 w-4" />كود خصم خاص
          </Button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : codes.length === 0 ? (
        <p className="text-muted-foreground text-center py-16">لا توجد أكواد خصم بعد</p>
      ) : (
        <div className="space-y-3">
          {codes.map(c => {
            const st = statusOf(c);
            return (
              <div key={c.id} className="bg-card border rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-lg tracking-widest">{c.code}</span>
                    <Badge className={`text-xs border ${st.cls}`}>{st.label}</Badge>
                    <Badge variant="outline" className="text-xs gap-1">
                      {c.type === "percent" ? <><Percent className="h-3 w-3" />{c.value}%</> : <><DollarSign className="h-3 w-3" />{c.value} ج.م</>}
                    </Badge>
                    {scopeBadge(c)}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                    <span>استُخدم: {c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</span>
                    {c.expires_at && <span>ينتهي: {new Date(c.expires_at).toLocaleDateString("ar-EG")}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => { navigator.clipboard.writeText(c.code); toast.success("تم النسخ"); }}
                    className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <Switch checked={c.active} onCheckedChange={v => toggleActive(c.id, v)} />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                    onClick={() => confirm("حذف الكود؟") && deleteMutation.mutate(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog: عام */}
      <Dialog open={dialog === "general"} onOpenChange={o => !o && setDialog("none")}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              {editId ? "تعديل كود خصم عام" : "كود خصم عام"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
            <FormFields form={form} setForm={setForm} />
            <Button type="submit" disabled={!canSave || saveMutation.isPending}
              className="w-full gradient-gold text-primary-foreground font-bold h-11">
              {saveMutation.isPending ? "جاري الحفظ..." : editId ? "تحديث الكود" : "إضافة الكود"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: خاص */}
      <Dialog open={dialog === "special"} onOpenChange={o => !o && setDialog("none")}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-cairo flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              {editId ? "تعديل كود خصم خاص" : "كود خصم خاص"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
            <FormFields form={form} setForm={setForm} />

            {/* Scope */}
            <div className="border-2 border-blue-100 bg-blue-50/30 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-blue-800">الكود يشتغل على</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setScopeTab("category")}
                  className={`rounded-xl border-2 py-3 text-sm font-medium flex flex-col items-center gap-1.5 transition-all ${
                    scopeTab === "category" ? "border-blue-500 bg-blue-600 text-white" : "border-blue-200 bg-white text-blue-700 hover:border-blue-400"}`}>
                  <Layers className="h-5 w-5" />قسم معين
                </button>
                <button type="button" onClick={() => setScopeTab("product")}
                  className={`rounded-xl border-2 py-3 text-sm font-medium flex flex-col items-center gap-1.5 transition-all ${
                    scopeTab === "product" ? "border-blue-500 bg-blue-600 text-white" : "border-blue-200 bg-white text-blue-700 hover:border-blue-400"}`}>
                  <ShoppingBag className="h-5 w-5" />منتج معين
                </button>
              </div>

              {scopeTab === "category" && (
                <div>
                  <Select value={form.applies_to_category} onValueChange={v => setForm({ applies_to_category: v })}>
                    <SelectTrigger className={`bg-white ${!form.applies_to_category ? "border-amber-400" : "border-blue-500"}`}>
                      <SelectValue placeholder="اختر القسم..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.slug} value={cat.slug}>
                          {cat.emoji ? cat.emoji + " " : ""}{cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.applies_to_category && (
                    <p className="text-xs text-blue-700 mt-2 flex items-center gap-1 font-medium">
                      <Layers className="h-3.5 w-3.5" />
                      الكود هيشتغل فقط على قسم «{categories.find(c => c.slug === form.applies_to_category)?.label ?? form.applies_to_category}»
                    </p>
                  )}
                </div>
              )}

              {scopeTab === "product" && (
                <div>
                  <Select value={form.applies_to_product} onValueChange={v => setForm({ applies_to_product: v })}>
                    <SelectTrigger className={`bg-white ${!form.applies_to_product ? "border-amber-400" : "border-blue-500"}`}>
                      <SelectValue placeholder="اختر المنتج..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => {
                        const ps = products.filter(p => p.category === cat.slug);
                        if (!ps.length) return null;
                        return (
                          <div key={cat.slug}>
                            <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground bg-muted/60">
                              {cat.emoji ? cat.emoji + " " : ""}{cat.label}
                            </div>
                            {ps.map(p => <SelectItem key={p.id} value={p.id} className="pr-6">{p.name}</SelectItem>)}
                          </div>
                        );
                      })}
                      {(() => {
                        const slugs = categories.map(c => c.slug);
                        const rest  = products.filter(p => !slugs.includes(p.category));
                        if (!rest.length) return null;
                        return (
                          <div>
                            <div className="px-2 py-1.5 text-xs font-bold text-muted-foreground bg-muted/60">أخرى</div>
                            {rest.map(p => <SelectItem key={p.id} value={p.id} className="pr-6">{p.name}</SelectItem>)}
                          </div>
                        );
                      })()}
                    </SelectContent>
                  </Select>
                  {form.applies_to_product && (
                    <p className="text-xs text-blue-700 mt-2 flex items-center gap-1 font-medium">
                      <ShoppingBag className="h-3.5 w-3.5" />
                      الكود هيشتغل فقط على منتج «{products.find(p => p.id === form.applies_to_product)?.name ?? "—"}»
                    </p>
                  )}
                </div>
              )}
            </div>

            <Button type="submit" disabled={!canSave || saveMutation.isPending}
              className="w-full gradient-gold text-primary-foreground font-bold h-11">
              {saveMutation.isPending ? "جاري الحفظ..." : editId ? "تحديث الكود" : "إضافة الكود"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
