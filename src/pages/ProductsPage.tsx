import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useCategories";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import { Badge } from "@/components/ui/badge";
import { Percent } from "lucide-react";

const ProductsPage = () => {
  const { category } = useParams<{ category: string }>();
  const { data: categories } = useCategories();

  const catInfo = categories?.find(c => c.slug === category);

  // Is the category discount currently active?
  const catDiscountActive =
    !!catInfo?.discount_percent &&
    (!catInfo.discount_ends_at || new Date(catInfo.discount_ends_at) > new Date());

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", category],
    queryFn: async () => {
      let query = supabase.from("products").select("*").order("created_at", { ascending: false });
      if (category && category !== "all") query = query.eq("category", category);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const pageLabel = catInfo
    ? `${catInfo.emoji ? catInfo.emoji + " " : ""}${catInfo.label}`
    : (category ? category : "جميع المنتجات");

  return (
    <div className="min-h-screen flex flex-col">
      <Header /><CartDrawer />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8 flex-wrap">
          <h1 className="text-3xl font-cairo font-bold">{pageLabel}</h1>
          {catDiscountActive && (
            <Badge className="bg-red-500 text-white border-0 font-bold text-sm gap-1 px-3 py-1">
              <Percent className="h-3.5 w-3.5" />
              خصم {catInfo!.discount_percent}% على القسم
            </Badge>
          )}
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => <div key={i} className="aspect-square bg-secondary rounded-lg animate-pulse" />)}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {products.map(product => {
              // Apply category discount if product has no own discount
              const hasOwnDiscount = !!(product as any).discount_percent;
              const effectiveDiscount = hasOwnDiscount
                ? (product as any).discount_percent
                : (catDiscountActive ? catInfo!.discount_percent : null);
              const effectiveEndsAt = hasOwnDiscount
                ? (product as any).discount_ends_at
                : (catDiscountActive ? catInfo!.discount_ends_at : null);

              return (
                <ProductCard
                  key={product.id}
                  {...product}
                  discount_percent={effectiveDiscount}
                  discount_ends_at={effectiveEndsAt}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">لا توجد منتجات حالياً في هذا القسم</p>
          </div>
        )}
      </div>
      <div className="flex-1" /><Footer />
    </div>
  );
};

export default ProductsPage;
