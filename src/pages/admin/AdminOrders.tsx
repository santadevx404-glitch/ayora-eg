import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RefreshCw, Phone, MapPin, FileText, Package, Tag, Hash, Trash2, Search, X } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار", processing: "جاري التجهيز",
  shipped: "تم الشحن", delivered: "تم التوصيل", cancelled: "ملغي",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  shipped: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const AdminOrders = () => {
  const queryClient = useQueryClient();

  // General search (name / phone / address)
  const [generalSearch, setGeneralSearch] = useState("");
  // Separate order-number search
  const [orderNumSearch, setOrderNumSearch] = useState("");
  const [orderNumInput, setOrderNumInput] = useState("");

  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`*, order_items(*, order_item_addons(*))`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-orders"] }); toast.success("تم تحديث الحالة"); },
    onError: (err: any) => toast.error("فشل: " + err?.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-orders"] }); toast.success("تم حذف الطلب"); },
    onError: (err: any) => toast.error("فشل الحذف: " + err?.message),
  });

  const clearAll = async () => {
    if (!confirm("هتحذف كل الطلبات؟ العملية مش هترجع!")) return;
    const { error } = await supabase.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) { toast.error("فشل: " + error.message); return; }
    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    toast.success("تم تصفير جميع الطلبات");
  };

  // Apply filters
  const filteredOrders = orders?.filter(order => {
    // If order-number search is active, it takes full priority
    if (orderNumSearch) {
      return ((order as any).order_number ?? "").toUpperCase().includes(orderNumSearch.toUpperCase());
    }
    // Otherwise apply general search
    if (generalSearch.trim()) {
      const q = generalSearch.toLowerCase();
      return (
        order.customer_name?.toLowerCase().includes(q) ||
        order.customer_phone?.toLowerCase().includes(q) ||
        order.customer_address?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (isLoading) return (
    <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="bg-card border rounded-xl p-4 animate-pulse h-28" />)}</div>
  );

  if (error) return (
    <div className="text-center py-16 space-y-3">
      <p className="text-destructive">{(error as any)?.message}</p>
      <Button variant="outline" onClick={() => refetch()} className="gap-2"><RefreshCw className="h-4 w-4" />إعادة المحاولة</Button>
    </div>
  );

  const stats = {
    total:      orders?.length ?? 0,
    pending:    orders?.filter(o => o.status === "pending").length ?? 0,
    processing: orders?.filter(o => o.status === "processing").length ?? 0,
    revenue:    orders?.filter(o => o.status !== "cancelled").reduce((s, o) => s + o.total, 0) ?? 0,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-cairo font-bold">إدارة الطلبات</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2"><RefreshCw className="h-4 w-4" />تحديث</Button>
          {(orders?.length ?? 0) > 0 && (
            <Button variant="destructive" size="sm" onClick={clearAll} className="gap-2"><Trash2 className="h-4 w-4" />تصفير الكل</Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border rounded-xl p-3 text-center">
          <p className="text-2xl font-cairo font-black">{stats.total}</p>
          <p className="text-xs text-muted-foreground mt-1">إجمالي الطلبات</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-cairo font-black text-yellow-700">{stats.pending}</p>
          <p className="text-xs text-yellow-600 mt-1">قيد الانتظار</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-cairo font-black text-blue-700">{stats.processing}</p>
          <p className="text-xs text-blue-600 mt-1">جاري التجهيز</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <p className="text-2xl font-cairo font-black text-green-700">{stats.revenue.toFixed(0)}</p>
          <p className="text-xs text-green-600 mt-1">إيرادات (ج.م)</p>
        </div>
      </div>

      {/* Search bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {/* General search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={generalSearch}
            onChange={e => setGeneralSearch(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف أو العنوان..."
            className="pr-9"
          />
          {generalSearch && (
            <button onClick={() => setGeneralSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Order number search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Hash className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={orderNumInput}
              onChange={e => setOrderNumInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && setOrderNumSearch(orderNumInput.trim())}
              placeholder="بحث برقم الطلبية..."
              className="pr-9 font-mono tracking-wider"
              dir="ltr"
            />
            {orderNumSearch && (
              <button onClick={() => { setOrderNumSearch(""); setOrderNumInput(""); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant={orderNumSearch ? "default" : "outline"}
            onClick={() => setOrderNumSearch(orderNumInput.trim())}
            className="gap-1 shrink-0"
          >
            <Search className="h-4 w-4" />بحث
          </Button>
        </div>
      </div>

      {orderNumSearch && (
        <p className="text-sm text-muted-foreground mb-3">
          نتائج البحث عن رقم الطلبية: <code className="font-mono font-bold text-accent">{orderNumSearch}</code>
          {" "}— {filteredOrders?.length ?? 0} نتيجة
        </p>
      )}

      {!filteredOrders?.length ? (
        <div className="text-center py-20">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-lg">{(generalSearch || orderNumSearch) ? "لا توجد نتائج" : "لا توجد طلبات"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => (
            <div key={order.id} className="bg-card border rounded-xl p-4 space-y-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1.5">
                  {/* Order number — always show, fallback to id prefix */}
                  <div className="flex items-center gap-1.5 mb-1">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    <code className="font-mono text-xs font-bold tracking-wider text-accent">
                      {(order as any).order_number ?? order.id.slice(0, 8).toUpperCase()}
                    </code>
                  </div>
                  <p className="font-cairo font-bold">{order.customer_name}</p>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /><span dir="ltr">{order.customer_phone}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>{order.customer_address}</span>
                  </div>
                  {order.notes && (
                    <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                      <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>{order.notes}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <p className="text-xl font-cairo font-black text-accent">{order.total.toFixed(2)} ج.م</p>
                  {(order as any).discount_code && (
                    <div className="flex items-center gap-1 bg-green-50 border border-green-200 rounded-lg px-2 py-1">
                      <Tag className="h-3 w-3 text-green-600" />
                      <span className="text-xs font-mono font-bold text-green-700">{(order as any).discount_code}</span>
                      <span className="text-xs text-green-600">— {(order as any).discount_amount?.toFixed(2)} ج.م</span>
                    </div>
                  )}
                  <Select value={order.status}
                    onValueChange={v => updateStatus.mutate({ id: order.id, status: v })}
                    disabled={updateStatus.isPending}>
                    <SelectTrigger className="w-44 h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" className="h-8 text-destructive hover:text-destructive gap-1.5 text-xs"
                    onClick={() => confirm("حذف هذا الطلب؟") && deleteMutation.mutate(order.id)}>
                    <Trash2 className="h-3.5 w-3.5" />حذف الطلب
                  </Button>
                </div>
              </div>

              {order.order_items?.length > 0 && (
                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">المنتجات</p>
                  {order.order_items.map((item: any) => (
                    <div key={item.id} className="text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{item.product_name} <span className="text-muted-foreground">× {item.quantity}</span></span>
                        <span className="font-medium">{(item.price * item.quantity).toFixed(2)} ج.م</span>
                      </div>
                      {item.order_item_addons?.map((a: any) => (
                        <p key={a.id} className="text-xs text-muted-foreground mr-3">
                          {a.addon_name}{a.addon_price > 0 && ` (+${a.addon_price.toFixed(2)} ج.م)`}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <Badge className={`text-xs border ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</Badge>
                <span className="text-xs text-muted-foreground">
                  {order.created_at ? new Date(order.created_at).toLocaleString("ar-EG") : "—"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
