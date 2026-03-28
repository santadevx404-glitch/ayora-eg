import { X, Plus, Minus, Trash2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CartDrawer = () => {
  const { items, isOpen, setIsOpen, removeItem, updateQuantity, totalPrice, clearCart } = useCart();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      <div className="absolute top-0 right-0 h-full w-full max-w-md bg-background shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-cairo font-bold">سلة المشتريات</h2>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:text-accent transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">السلة فاضية</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.map(item => (
                <div key={item.cartKey} className="flex gap-3 items-start bg-secondary/50 rounded-xl p-3">
                  {item.image_url && (
                    <img src={item.image_url} alt={item.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{item.name}</h4>
                    {/* Addons summary */}
                    {item.addons.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {item.addons.map((a, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            {a.group_name}: {a.item.name}
                            {a.item.price > 0 && ` (+${a.item.price.toFixed(2)} ج.م)`}
                          </p>
                        ))}
                      </div>
                    )}
                    <p className="text-accent text-sm font-bold mt-1">
                      {(item.price + item.addonsPrice).toFixed(2)} ج.م
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <button onClick={() => updateQuantity(item.cartKey, item.quantity - 1)} className="p-1 rounded-md hover:bg-muted">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.cartKey, item.quantity + 1)} className="p-1 rounded-md hover:bg-muted">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <button onClick={() => removeItem(item.cartKey)} className="p-1 text-destructive hover:text-destructive/80 shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 border-t space-y-3">
              <div className="flex justify-between font-cairo font-bold text-lg">
                <span>الإجمالي</span>
                <span className="text-accent">{totalPrice.toFixed(2)} ج.م</span>
              </div>
              <Link to="/checkout" onClick={() => setIsOpen(false)}>
                <Button className="w-full gradient-gold text-primary-foreground font-bold text-sm h-12">
                  إتمام الطلب
                </Button>
              </Link>
              <Button variant="ghost" onClick={clearCart} className="w-full text-sm text-muted-foreground">
                تفريغ السلة
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
