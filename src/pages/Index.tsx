import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/useCategories";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import ProductCard from "@/components/ProductCard";
import heroBg from "@/assets/hero-bg.jpg";

const Index = () => {
  const { data: categories } = useCategories();

  const { data: products } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").limit(8);
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <CartDrawer />

      {/* Hero */}
      <section className="relative h-[70vh] min-h-[500px] flex items-center overflow-hidden">
        <img src={heroBg} alt="Ayora" className="absolute inset-0 w-full h-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-l from-foreground/70 via-foreground/40 to-transparent" />
        <div className="relative container mx-auto px-4">
          <div className="max-w-lg">
            <h1 className="text-5xl md:text-6xl font-cairo font-black mb-4 text-primary-foreground leading-tight">
              اكتشف <span className="text-gradient-gold">أناقتك</span>
            </h1>
            <p className="text-primary-foreground/80 text-lg mb-8 leading-relaxed">
              مجات مميزة وإكسسوارات أنيقة تعكس شخصيتك
            </p>
            <div className="flex gap-3 flex-wrap">
              {categories?.map(cat => (
                <Link key={cat.slug} to={`/products/${cat.slug}`}
                  className="inline-block gradient-gold px-8 py-3 rounded-lg font-cairo font-bold text-primary-foreground shadow-elegant hover:opacity-90 transition-opacity">
                  {cat.emoji ? `${cat.emoji} ` : ""}{cat.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Categories */}
      {categories && categories.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-3xl font-cairo font-bold text-center mb-12">تسوق حسب القسم</h2>
          <div className={`grid gap-6 max-w-4xl mx-auto ${
            categories.length === 1 ? "grid-cols-1 max-w-sm" :
            categories.length === 2 ? "grid-cols-1 md:grid-cols-2" :
            categories.length === 3 ? "grid-cols-1 md:grid-cols-3" :
            "grid-cols-2 md:grid-cols-4"
          }`}>
            {categories.map(cat => (
              <Link key={cat.slug} to={`/products/${cat.slug}`}
                className="group relative h-56 rounded-2xl overflow-hidden bg-secondary shadow-elegant">
                <div className="absolute inset-0 gradient-gold opacity-80 group-hover:opacity-90 transition-opacity" />
                <div className="relative h-full flex flex-col items-center justify-center text-primary-foreground">
                  {cat.emoji && <span className="text-5xl mb-3">{cat.emoji}</span>}
                  <h3 className="text-2xl font-cairo font-bold">{cat.label}</h3>
                  {cat.discount_percent && (!cat.discount_ends_at || new Date(cat.discount_ends_at) > new Date()) && (
                    <span className="mt-2 bg-white/20 backdrop-blur-sm text-xs font-bold px-3 py-1 rounded-full">
                      خصم {cat.discount_percent}%
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      {products && products.length > 0 && (
        <section className="container mx-auto px-4 pb-16">
          <h2 className="text-3xl font-cairo font-bold text-center mb-12">منتجات مميزة</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {products.map(product => <ProductCard key={product.id} {...product} />)}
          </div>
        </section>
      )}

      <div className="flex-1" />
      <Footer />
    </div>
  );
};

export default Index;
