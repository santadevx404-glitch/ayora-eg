import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Tag, X, Check, Loader2, AlertCircle } from "lucide-react";

interface AppliedCode {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  applies_to_category: string | null;
  applies_to_product: string | null;
}

const Checkout = () => {
  const { items, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });

  const [codeInput, setCodeInput]     = useState("");
  const [codeLoading, setCodeLoading] = useState(false);
  const [appliedCode, setAppliedCode] = useState<AppliedCode | null>(null);
  const [scopeWarning, setScopeWarning] = useState<string | null>(null);

  const applyCode = async () => {
    const raw = codeInput.trim().toUpperCase();
    if (!raw) return;
    setCodeLoading(true);
    setScopeWarning(null);

    const { data, error } = await supabase
      .from("discount_codes")
      .select("*")
      .eq("code", raw)
      .eq("active", true)
      .maybeSingle();

    if (error || !data) { toast.error("الكود غير صحيح أو غير فعّال"); setCodeLoading(false); return; }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { toast.error("انتهت صلاحية الكود"); setCodeLoading(false); return; }
    if (data.max_uses && data.used_count >= data.max_uses) { toast.error("تم استنفاد هذا الكود"); setCodeLoading(false); return; }

    // Check scope — does any cart item match?
    const catScope  = (data as any).applies_to_category as string | null;
    const prodScope = (data as any).applies_to_product  as string | null;

    if (catScope) {
      const hasMatch = items.some(i => i.category === catScope);
      if (!hasMatch) {
        toast.error(`هذا الكود يشتغل فقط على منتجات قسم: ${catScope}`);
        setCodeLoading(false);
        return;
      }
      // Warn if only some items qualify
      const allMatch = items.every(i => i.category === catScope);
      if (!allMatch) setScopeWarning(`الكود هيتطبق فقط على منتجات قسم "${catScope}"`);
    }

    if (prodScope) {
      const hasMatch = items.some(i => i.id === prodScope);
      if (!hasMatch) {
        toast.error("هذا الكود خاص بمنتج معين مش موجود في سلتك");
        setCodeLoading(false);
        return;
      }
      const allMatch = items.every(i => i.id === prodScope);
      if (!allMatch) setScopeWarning("الكود هيتطبق فقط على المنتج المحدد في سلتك");
    }

    setAppliedCode({
      id: data.id,
      code: data.code,
      type: data.type,
      value: data.value,
      applies_to_category: catScope,
      applies_to_product: prodScope,
    });
    toast.success(`تم تطبيق الكود: ${data.code}`);
    setCodeLoading(false);
  };

  const removeCode = () => { setAppliedCode(null); setCodeInput(""); setScopeWarning(null); };

  // Calculate eligible subtotal based on scope
  const eligibleSubtotal = (() => {
    if (!appliedCode) return 0;
    const { applies_to_category, applies_to_product } = appliedCode;
    if (!applies_to_category && !applies_to_product) return totalPrice; // all items
    return items.reduce((sum, item) => {
      const matchesCat  = applies_to_category && item.category === applies_to_category;
      const matchesProd = applies_to_product  && item.id === applies_to_product;
      if (matchesCat || matchesProd) {
        return sum + (item.price + item.addonsPrice) * item.quantity;
      }
      return sum;
    }, 0);
  })();

  const calcDiscount = () => {
    if (!appliedCode) return 0;
    if (appliedCode.type === "percent")
      return Math.round(eligibleSubtotal * appliedCode.value / 100 * 100) / 100;
    return Math.min(appliedCode.value, eligibleSubtotal);
  };

  const discount   = calcDiscount();
  const finalTotal = Math.max(0, totalPrice - discount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setLoading(true);
    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_name:    form.name,
          customer_phone:   form.phone,
          customer_address: form.address,
          notes:            form.notes || null,
          total:            finalTotal,
          discount_code:    appliedCode ? appliedCode.code : null,
          discount_amount:  appliedCode ? discount         : null,
          discount_code_id: appliedCode ? appliedCode.id   : null,
        })
        .select("id, order_number").single();
      if (orderError) throw new Error(orderError.message);

      for (const item of items) {
        const unitPrice = item.price + item.addonsPrice;
        const { data: oItem, error: oiErr } = await supabase
          .from("order_items")
          .insert({ order_id: order.id, product_id: item.id, product_name: item.name, quantity: item.quantity, price: unitPrice })
          .select("id").single();
        if (oiErr) throw new Error(oiErr.message);

        if (item.addons.length > 0) {
          await supabase.from("order_item_addons").insert(
            item.addons.map(a => ({
              order_item_id: oItem.id, addon_item_id: a.item.id,
              addon_name: `${a.group_name}: ${a.item.name}`, addon_price: a.item.price,
            }))
          );
        }
      }

      if (appliedCode) {
        await supabase.rpc("increment_discount_used", { code_id: appliedCode.id });
      }

      clearCart();
      navigate("/order-confirmation", { state: { orderNumber: (order as any).order_number } });
    } catch (err: any) {
      toast.error("حدث خطأ: " + (err?.message ?? "حاول مرة أخرى"));
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) return (
    <div className="min-h-screen flex flex-col"><Header />
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground text-lg">السلة فاضية، أضف منتجات أولاً</p>
      </div><Footer />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header /><CartDrawer />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-cairo font-bold mb-8">إتمام الطلب</h1>

        {/* Order summary */}
        <div className="bg-secondary/50 rounded-xl p-4 mb-4 space-y-2">
          {items.map(item => (
            <div key={item.cartKey}>
              <div className="flex justify-between text-sm">
                <span className="font-medium">{item.name} × {item.quantity}</span>
                <span className="font-bold">{((item.price + item.addonsPrice) * item.quantity).toFixed(2)} ج.م</span>
              </div>
              {item.addons.length > 0 && (
                <div className="mr-3 mt-0.5 space-y-0.5">
                  {item.addons.map((a, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      {a.group_name}: {a.item.name}{a.item.price > 0 && ` (+${a.item.price.toFixed(2)} ج.م)`}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600 border-t pt-2">
              <span>خصم ({appliedCode!.code}){appliedCode?.applies_to_category || appliedCode?.applies_to_product ? " — جزئي" : ""}</span>
              <span>-{discount.toFixed(2)} ج.م</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between font-cairo font-bold text-lg">
            <span>الإجمالي</span>
            <span className="text-accent">{finalTotal.toFixed(2)} ج.م</span>
          </div>
        </div>

        {/* Discount code input */}
        <div className="mb-6 space-y-2">
          {appliedCode ? (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <Check className="h-4 w-4 text-green-600 shrink-0" />
              <span className="text-green-700 text-sm font-medium flex-1">
                كود الخصم: <strong>{appliedCode.code}</strong>
                {" — "}
                {appliedCode.type === "percent" ? `${appliedCode.value}%` : `${appliedCode.value} ج.م`} خصم
                {(appliedCode.applies_to_category || appliedCode.applies_to_product) && (
                  <span className="text-green-600"> (على المنتجات المؤهلة فقط)</span>
                )}
              </span>
              <button onClick={removeCode} className="text-green-600 hover:text-green-800"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Tag className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={codeInput}
                  onChange={e => setCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), applyCode())}
                  placeholder="كود الخصم (اختياري)"
                  className="pr-9 font-mono tracking-wider" dir="ltr"
                />
              </div>
              <Button type="button" variant="outline" onClick={applyCode} disabled={codeLoading || !codeInput.trim()}>
                {codeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "تطبيق"}
              </Button>
            </div>
          )}
          {scopeWarning && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700">{scopeWarning}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">الاسم الكامل</label>
            <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="أدخل اسمك" className="text-right" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
            <Input required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="01xxxxxxxxx" dir="ltr" className="text-left" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">العنوان بالتفصيل</label>
            <Textarea required value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="المحافظة - المنطقة - الشارع - رقم العمارة" className="text-right" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">ملاحظات (اختياري)</label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="أي ملاحظات إضافية" className="text-right" />
          </div>
          <Button type="submit" disabled={loading} className="w-full gradient-gold text-primary-foreground h-14 text-lg font-bold shadow-elegant">
            {loading ? "جاري تقديم الطلب..." : `تأكيد الطلب · ${finalTotal.toFixed(2)} ج.م`}
          </Button>
        </form>
      </div>
      <div className="flex-1" /><Footer />
    </div>
  );
};

export default Checkout;
