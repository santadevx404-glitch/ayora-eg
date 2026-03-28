import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  LogOut, ShoppingBag, Phone, MapPin, FileText,
  ShieldCheck, LayoutDashboard, Search, Package,
  Clock, CheckCircle2, Truck, XCircle, RefreshCw, Hash,
} from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "قيد الانتظار",
  processing: "جاري التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  shipped: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const StatusIcon: Record<string, any> = {
  pending: Clock,
  processing: RefreshCw,
  shipped: Truck,
  delivered: CheckCircle2,
  cancelled: XCircle,
};

const Profile = () => {
  const { user, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();

  // Search by order number only
  const [orderNumInput, setOrderNumInput] = useState("");
  const [searchOrderNum, setSearchOrderNum] = useState("");

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["profile-orders-by-num", searchOrderNum],
    enabled: !!searchOrderNum,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`*, order_items(id, product_name, quantity, price)`)
        .eq("order_number", searchOrderNum.toUpperCase())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const doSearch = () => {
    const val = orderNumInput.trim().toUpperCase();
    if (val) setSearchOrderNum(val);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full gradient-gold animate-pulse" />
      </div>
    );
  }

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "?";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <CartDrawer />

      <div className="container mx-auto px-4 py-10 max-w-2xl flex-1">

        {/* ── Profile card ── */}
        <div className="rounded-2xl border bg-card shadow-elegant p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full gradient-gold flex items-center justify-center shadow-elegant shrink-0">
              <span className="text-xl font-cairo font-black text-primary-foreground">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-cairo font-bold text-lg truncate">{user?.email ?? "زائر"}</p>
              <p className="text-sm text-muted-foreground">
                {user ? "عضو في أيورا" : "غير مسجل"}
              </p>
              {isAdmin && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                  <span className="text-xs font-semibold text-accent">أدمن</span>
                </div>
              )}
            </div>
            {user && (
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2 text-muted-foreground shrink-0">
                <LogOut className="h-4 w-4" />
                خروج
              </Button>
            )}
          </div>

          {isAdmin && (
            <div className="mt-5 pt-5 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">لوحة التحكم</p>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/admin">
                  <Button variant="outline" className="w-full gap-2 justify-start text-sm h-10">
                    <LayoutDashboard className="h-4 w-4 text-accent" />
                    الطلبات
                  </Button>
                </Link>
                <Link to="/admin/products">
                  <Button variant="outline" className="w-full gap-2 justify-start text-sm h-10">
                    <Package className="h-4 w-4 text-accent" />
                    المنتجات
                  </Button>
                </Link>
                <Link to="/admin/users" className="col-span-2">
                  <Button className="w-full gradient-gold text-primary-foreground gap-2 h-10 font-bold">
                    <ShieldCheck className="h-4 w-4" />
                    إدارة الأدمنية والصلاحيات
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {!user && (
            <div className="mt-5 pt-5 border-t text-center space-y-3">
              <p className="text-sm text-muted-foreground">سجل دخول لتتابع طلباتك</p>
              <Link to="/login">
                <Button className="gradient-gold text-primary-foreground font-bold gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  تسجيل الدخول
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* ── Order tracker by order number ── */}
        <div className="rounded-2xl border bg-card shadow-elegant p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="h-5 w-5 text-accent" />
            <h2 className="font-cairo font-bold text-lg">تتبع طلبي</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            أدخل رقم الطلبية اللي وصلك بعد إتمام الشراء
          </p>

          <div className="flex gap-2 mb-5">
            <div className="relative flex-1">
              <Hash className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={orderNumInput}
                onChange={e => setOrderNumInput(e.target.value.toUpperCase())}
                placeholder="مثال: AYRABC123XY"
                dir="ltr"
                className="pr-9 font-mono tracking-widest text-center"
                onKeyDown={e => e.key === "Enter" && doSearch()}
              />
            </div>
            <Button
              onClick={doSearch}
              disabled={!orderNumInput.trim()}
              className="gradient-gold text-primary-foreground gap-1.5 shrink-0"
            >
              <Search className="h-4 w-4" />
              بحث
            </Button>
          </div>

          {ordersLoading && (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          )}

          {!ordersLoading && searchOrderNum && orders && orders.length === 0 && (
            <div className="text-center py-8">
              <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">رقم الطلبية غير موجود، تأكد من الرقم</p>
            </div>
          )}

          {orders && orders.length > 0 && (
            <div className="space-y-4">
              {orders.map(order => {
                const Icon = StatusIcon[order.status] ?? Clock;
                return (
                  <div key={order.id} className="border rounded-xl p-4 space-y-3 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        {/* Order number badge */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                          <code className="font-mono text-xs font-bold tracking-wider text-accent">
                            {(order as any).order_number ?? order.id.slice(0, 8).toUpperCase()}
                          </code>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground" dir="ltr">{order.customer_phone}</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <span className="text-sm text-muted-foreground">{order.customer_address}</span>
                        </div>
                        {order.notes && (
                          <div className="flex items-start gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <span className="text-sm text-muted-foreground">{order.notes}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-left shrink-0">
                        <p className="text-lg font-cairo font-black text-accent">{order.total.toFixed(2)} ج.م</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString("ar-EG") : ""}
                        </p>
                      </div>
                    </div>

                    {order.status !== "cancelled" && (
                      <div className="flex items-center gap-1">
                        {["pending", "processing", "shipped", "delivered"].map((s, i, arr) => {
                          const currentIdx = arr.indexOf(order.status);
                          const active = i <= currentIdx;
                          return (
                            <div key={s} className="flex items-center flex-1">
                              <div className={`w-2.5 h-2.5 rounded-full shrink-0 transition-colors ${active ? "bg-accent" : "bg-muted"}`} />
                              {i < arr.length - 1 && (
                                <div className={`h-0.5 flex-1 transition-colors ${active && i < currentIdx ? "bg-accent" : "bg-muted"}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {order.order_items && order.order_items.length > 0 && (
                      <div className="border-t pt-2.5 space-y-1">
                        {order.order_items.map((item: any) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.product_name} <span className="text-muted-foreground">× {item.quantity}</span></span>
                            <span className="font-medium">{(item.price * item.quantity).toFixed(2)} ج.م</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <Badge className={`text-xs border gap-1.5 ${statusColors[order.status]}`}>
                        <Icon className="h-3 w-3" />
                        {statusLabels[order.status]}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Profile;
