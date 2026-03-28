import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Package, Clock, RefreshCw, Truck, CheckCircle2, XCircle, Home, Tag } from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار", processing: "جاري التجهيز",
  shipped: "تم الشحن", delivered: "تم التوصيل", cancelled: "ملغي",
};
const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  shipped: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};
const StatusIcon: Record<string, any> = {
  pending: Clock, processing: RefreshCw,
  shipped: Truck, delivered: CheckCircle2, cancelled: XCircle,
};

const steps = ["pending", "processing", "shipped", "delivered"];
const stepLabels = ["استُلم", "جاري التجهيز", "تم الشحن", "تم التوصيل"];

const TrackOrder = () => {
  const location = useLocation();
  const prefill = (location.state as any)?.prefill ?? "";
  const [input, setInput]     = useState(prefill);
  const [loading, setLoading] = useState(false);
  const [order, setOrder]     = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  const search = async () => {
    const val = input.trim().toUpperCase();
    if (!val) return;
    setLoading(true);
    setNotFound(false);
    setOrder(null);

    const { data, error } = await supabase
      .from("orders")
      .select(`*, order_items(id, product_name, quantity, price, order_item_addons(*))`)
      .eq("order_number", val)
      .maybeSingle();

    setLoading(false);
    if (error || !data) { setNotFound(true); return; }
    setOrder(data);
  };

  const Icon = order ? (StatusIcon[order.status] ?? Package) : Package;
  const currentStep = steps.indexOf(order?.status);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <div className="flex-1 container mx-auto px-4 py-10 max-w-xl">
        <div className="mb-2">
          <Link to="/"><Button variant="ghost" size="sm" className="gap-2 text-muted-foreground"><Home className="h-4 w-4" />الرئيسية</Button></Link>
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full gradient-gold flex items-center justify-center mx-auto mb-4 shadow-elegant">
            <Package className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-cairo font-black mb-2">تتبع طلبك</h1>
          <p className="text-muted-foreground text-sm">أدخل رقم الطلبية اللي وصلك بعد الشراء</p>
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-8">
          <Input
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === "Enter" && search()}
            placeholder="مثال: AYRABC123XY"
            dir="ltr"
            className="font-mono tracking-widest text-center text-base h-12"
          />
          <Button onClick={search} disabled={loading || !input.trim()} className="gradient-gold text-primary-foreground h-12 px-5 gap-2">
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {notFound && (
          <div className="text-center py-10 border border-dashed rounded-2xl">
            <XCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold">رقم الطلبية غير موجود</p>
            <p className="text-sm text-muted-foreground mt-1">تأكد من الرقم وحاول مرة أخرى</p>
          </div>
        )}

        {order && (
          <div className="border rounded-2xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="gradient-gold p-4 text-primary-foreground">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-80 mb-0.5">رقم الطلبية</p>
                  <p className="font-mono font-bold text-lg tracking-wider">{order.order_number}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs opacity-80 mb-0.5">الإجمالي</p>
                  <p className="font-cairo font-black text-xl">{order.total.toFixed(2)} ج.م</p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-5">
              {/* Status badge */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <Badge className={`text-sm border ${statusColors[order.status]}`}>
                    {statusLabels[order.status]}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.created_at ? new Date(order.created_at).toLocaleString("ar-EG") : ""}
                  </p>
                </div>
              </div>

              {/* Progress bar — only for non-cancelled */}
              {order.status !== "cancelled" && (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    {steps.map((s, i) => (
                      <div key={s} className="flex flex-col items-center gap-1 flex-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                          i <= currentStep
                            ? "gradient-gold text-primary-foreground border-transparent"
                            : "bg-secondary text-muted-foreground border-border"
                        }`}>{i + 1}</div>
                        <span className={`text-[10px] text-center leading-tight ${i <= currentStep ? "text-accent font-medium" : "text-muted-foreground"}`}>
                          {stepLabels[i]}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="relative h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="absolute h-full gradient-gold rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(0, (currentStep / (steps.length - 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Customer info */}
              <div className="bg-secondary/40 rounded-xl p-3 text-sm space-y-1">
                <p className="font-semibold">{order.customer_name}</p>
                <p className="text-muted-foreground" dir="ltr">{order.customer_phone}</p>
                <p className="text-muted-foreground">{order.customer_address}</p>
              </div>

              {/* Discount */}
              {order.discount_code && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                  <Tag className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-sm text-green-700">كود خصم: <strong>{order.discount_code}</strong> — وفّرت {order.discount_amount?.toFixed(2)} ج.م</span>
                </div>
              )}

              {/* Items */}
              {order.order_items?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">المنتجات</p>
                  {order.order_items.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium">{item.product_name} × {item.quantity}</p>
                        {item.order_item_addons?.map((a: any) => (
                          <p key={a.id} className="text-xs text-muted-foreground">{a.addon_name}{a.addon_price > 0 ? ` (+${a.addon_price} ج.م)` : ""}</p>
                        ))}
                      </div>
                      <span className="font-bold shrink-0">{(item.price * item.quantity).toFixed(2)} ج.م</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default TrackOrder;
