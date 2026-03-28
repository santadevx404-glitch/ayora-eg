import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Clock, Tag } from "lucide-react";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string;
  discount_percent?: number | null;
  discount_ends_at?: string | null;
}

const isDiscountActive = (discount_percent?: number | null, discount_ends_at?: string | null) => {
  if (!discount_percent) return false;
  if (!discount_ends_at) return true;
  return new Date(discount_ends_at) > new Date();
};

const ProductCard = ({ id, name, price, image_url, discount_percent, discount_ends_at }: ProductCardProps) => {
  const imageUrl = image_url
    ? (image_url.startsWith("http") ? image_url : supabase.storage.from("product-images").getPublicUrl(image_url).data.publicUrl)
    : "/placeholder.svg";

  const active = isDiscountActive(discount_percent, discount_ends_at);
  const discountedPrice = active && discount_percent
    ? Math.round(price * (1 - discount_percent / 100) * 100) / 100
    : null;
  const isLimited = active && !!discount_ends_at;

  return (
    <Link to={`/product/${id}`} className="group block">
      <div className="relative overflow-hidden rounded-xl bg-secondary aspect-square mb-3">
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors duration-300" />

        {active && discount_percent && (
          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
            <Badge className="bg-red-500 text-white border-0 font-bold text-xs gap-1 shadow-sm">
              <Tag className="h-2.5 w-2.5" />
              -{discount_percent}%
            </Badge>
            {isLimited && (
              <Badge className="bg-orange-500 text-white border-0 text-[10px] gap-1 shadow-sm">
                <Clock className="h-2.5 w-2.5" />
                لفترة محدودة
              </Badge>
            )}
          </div>
        )}
      </div>

      <h3 className="font-cairo font-semibold text-foreground text-sm mb-1 line-clamp-1">{name}</h3>

      {discountedPrice !== null ? (
        <div className="flex items-center gap-2">
          <p className="text-accent font-black text-sm">{discountedPrice.toFixed(2)} ج.م</p>
          <p className="text-muted-foreground text-xs line-through">{price.toFixed(2)} ج.م</p>
        </div>
      ) : (
        <p className="text-accent font-bold text-sm">{price.toFixed(2)} ج.م</p>
      )}
    </Link>
  );
};

export default ProductCard;
