import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AddonGroup, SelectedAddon } from "@/integrations/supabase/types";
import { useCategories } from "@/hooks/useCategories";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingBag, Tag, Clock, CheckCircle2, Circle } from "lucide-react";

const isDiscountActive = (d?: number | null, e?: string | null) => {
  if (!d) return false;
  if (!e) return true;
  return new Date(e) > new Date();
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { addItem } = useCart();
  const { data: categories } = useCategories();
  const [selectedAddons, setSelectedAddons] = useState<Record<string, string[]>>({}); // group_id → [item_id,...]

  // ── Fetch product ──
  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    refetchInterval: 60_000,
  });

  // ── Fetch addon groups ──
  const { data: addonGroups } = useQuery({
    queryKey: ["product-addons", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_addon_groups")
        .select("*, product_addon_items(*)")
        .eq("product_id", id!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).map((g: any) => ({
        ...g,
        items: (g.product_addon_items ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      })) as AddonGroup[];
    },
    enabled: !!id,
  });

  // ── Toggle addon selection ──
  const toggleAddon = (group: AddonGroup, itemId: string) => {
    setSelectedAddons(prev => {
      const current = prev[group.id] ?? [];
      if (current.includes(itemId)) {
        return { ...prev, [group.id]: current.filter(x => x !== itemId) };
      }
      if (current.length >= group.max_select) {
        // Replace oldest if max reached (for max=1 this acts like radio)
        const next = group.max_select === 1 ? [itemId] : [...current.slice(1), itemId];
        return { ...prev, [group.id]: next };
      }
      return { ...prev, [group.id]: [...current, itemId] };
    });
  };

  // ── Compute addons price ──
  const { builtAddons, addonsPrice, missingRequired } = useMemo(() => {
    if (!addonGroups) return { builtAddons: [], addonsPrice: 0, missingRequired: [] };
    const built: SelectedAddon[] = [];
    let total = 0;
    const missing: string[] = [];
    for (const group of addonGroups) {
      const chosen = selectedAddons[group.id] ?? [];
      if (group.required && chosen.length === 0) missing.push(group.name);
      for (const itemId of chosen) {
        const item = group.items?.find(i => i.id === itemId);
        if (item) {
          built.push({ group_id: group.id, group_name: group.name, item });
          total += item.price;
        }
      }
    }
    return { builtAddons: built, addonsPrice: total, missingRequired: missing };
  }, [addonGroups, selectedAddons]);

  if (isLoading) return (
    <div className="min-h-screen"><Header />
      <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">جاري التحميل...</div>
    </div>
  );
  if (!product) return (
    <div className="min-h-screen"><Header />
      <div className="container mx-auto px-4 py-16 text-center text-muted-foreground">المنتج غير موجود</div>
    </div>
  );

  const imageUrl = product.image_url
    ? (product.image_url.startsWith("http") ? product.image_url
      : supabase.storage.from("product-images").getPublicUrl(product.image_url).data.publicUrl)
    : "/placeholder.svg";

  // ── Discount logic ──
  // 1. Product's own discount
  const productDiscountActive = isDiscountActive(product.discount_percent, product.discount_ends_at);

  // 2. Category-level discount (only used if product has no own discount)
  const catInfo = categories?.find(c => c.slug === product.category);
  const catDiscountActive = !productDiscountActive && isDiscountActive(catInfo?.discount_percent, catInfo?.discount_ends_at);

  // Effective discount values
  const effectiveDiscountPct    = productDiscountActive
    ? product.discount_percent
    : catDiscountActive ? catInfo!.discount_percent : null;
  const effectiveDiscountEndsAt = productDiscountActive
    ? product.discount_ends_at
    : catDiscountActive ? catInfo!.discount_ends_at : null;
  const discountSource = productDiscountActive ? "product" : catDiscountActive ? "category" : null;

  const active = !!effectiveDiscountPct;
  const discountedPrice = active && effectiveDiscountPct
    ? Math.round(product.price * (1 - effectiveDiscountPct / 100) * 100) / 100
    : null;
  const basePrice  = discountedPrice ?? product.price;
  const finalPrice = basePrice + addonsPrice;

  const handleAddToCart = () => {
    if (missingRequired.length > 0) {
      toast(`اختر: ${missingRequired.join("، ")}`);
      return;
    }
    addItem({
      id: product.id,
      name: product.name,
      price: basePrice,
      image_url: imageUrl,
      addons: builtAddons,
      addonsPrice,
      category: product.category ?? "",
    });
  };

  const toast = (msg: string) => {
    const el = document.createElement("div");
    el.className = "fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-foreground text-background px-4 py-2 rounded-xl text-sm font-medium shadow-lg";
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header /><CartDrawer />

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">

          {/* ── Image ── */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-secondary">
            <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
            {active && effectiveDiscountPct && (
              <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                <Badge className="bg-red-500 text-white border-0 font-bold gap-1.5 text-sm shadow-md">
                  <Tag className="h-3.5 w-3.5" />خصم {effectiveDiscountPct}%
                  {discountSource === "category" && (
                    <span className="font-normal opacity-80 text-xs"> · على القسم</span>
                  )}
                </Badge>
                {!!effectiveDiscountEndsAt && (
                  <Badge className="bg-orange-500 text-white border-0 gap-1.5 text-xs shadow-md">
                    <Clock className="h-3 w-3" />لفترة محدودة
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* ── Info + Addons ── */}
          <div className="flex flex-col">
            <span className="text-accent text-sm font-medium mb-2">
              {catInfo ? `${catInfo.emoji ? catInfo.emoji + " " : ""}${catInfo.label}` : product.category}
            </span>
            <h1 className="text-3xl font-cairo font-bold mb-3">{product.name}</h1>
            {product.description && (
              <p className="text-muted-foreground leading-relaxed mb-4">{product.description}</p>
            )}

            {/* Price */}
            <div className="mb-4">
              {discountedPrice !== null ? (
                <div className="flex items-baseline gap-3">
                  <p className="text-3xl font-cairo font-black text-accent">{discountedPrice.toFixed(2)} ج.م</p>
                  <p className="text-lg text-muted-foreground line-through">{product.price.toFixed(2)} ج.م</p>
                </div>
              ) : (
                <p className="text-3xl font-cairo font-black text-accent">{product.price.toFixed(2)} ج.م</p>
              )}
            </div>

            {active && effectiveDiscountEndsAt && (
              <div className="flex items-center gap-2 mb-4 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
                <Clock className="h-4 w-4 text-orange-500 shrink-0" />
                <p className="text-sm text-orange-700 font-medium">
                  ينتهي الخصم {new Date(effectiveDiscountEndsAt).toLocaleDateString("ar-EG", {
                    day: "numeric", month: "long", hour: "2-digit", minute: "2-digit"
                  })}
                </p>
              </div>
            )}

            {/* ── Addon Groups ── */}
            {addonGroups && addonGroups.length > 0 && (
              <div className="space-y-4 mb-5">
                {addonGroups.map(group => {
                  const chosen = selectedAddons[group.id] ?? [];
                  return (
                    <div key={group.id} className="border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-semibold text-sm">{group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {group.required ? "إلزامي · " : "اختياري · "}
                            اختر حتى {group.max_select}
                          </p>
                        </div>
                        {group.required && chosen.length === 0 && (
                          <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">مطلوب</Badge>
                        )}
                        {chosen.length > 0 && (
                          <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                            {chosen.length} محدد
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {group.items?.map(item => {
                          const sel = chosen.includes(item.id);
                          return (
                            <button
                              key={item.id} type="button"
                              onClick={() => toggleAddon(group, item.id)}
                              className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-all text-right ${
                                sel
                                  ? "border-accent bg-accent/10 text-accent font-medium"
                                  : "border-border hover:border-accent/50 hover:bg-secondary/50"
                              }`}
                            >
                              {sel
                                ? <CheckCircle2 className="h-4 w-4 text-accent shrink-0" />
                                : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className="truncate">{item.name}</p>
                                {item.price > 0 && (
                                  <p className="text-xs text-muted-foreground">+{item.price.toFixed(2)} ج.م</p>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Final price + Add to cart */}
            {addonsPrice > 0 && (
              <div className="flex items-center justify-between mb-3 bg-secondary/50 rounded-xl px-4 py-2.5">
                <span className="text-sm text-muted-foreground">السعر الإجمالي</span>
                <span className="font-cairo font-black text-accent text-lg">{finalPrice.toFixed(2)} ج.م</span>
              </div>
            )}

            <Button
              onClick={handleAddToCart}
              className="gradient-gold text-primary-foreground h-14 text-lg font-bold gap-2 shadow-elegant mt-auto"
            >
              <ShoppingBag className="h-5 w-5" />
              أضف للسلة
              {addonsPrice > 0 && <span className="text-sm opacity-80">({finalPrice.toFixed(2)} ج.م)</span>}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1" /><Footer />
    </div>
  );
};

export default ProductDetail;
