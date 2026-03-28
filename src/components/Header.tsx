import { Link } from "react-router-dom";
import { ShoppingBag, Menu, X, User, Search } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCategories } from "@/hooks/useCategories";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const Header = () => {
  const { totalItems, setIsOpen } = useCart();
  const { user, isAdmin } = useAuth();
  const { data: categories } = useCategories();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? null;

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-cairo font-bold tracking-wide text-foreground">
          <span className="text-gradient-gold">Ayora</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-medium text-foreground hover:text-accent transition-colors">الرئيسية</Link>
          {categories?.map(cat => (
            <Link key={cat.slug} to={`/products/${cat.slug}`}
              className="text-sm font-medium text-foreground hover:text-accent transition-colors">
              {cat.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" className="text-sm font-medium text-accent hover:text-accent/80 transition-colors">لوحة التحكم</Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {/* Track Order button */}
          <Link to="/track">
            <Button variant="outline" size="sm" className="hidden md:flex gap-1.5 text-xs h-8 px-3">
              <Search className="h-3.5 w-3.5" />
              تتبع طلبي
            </Button>
          </Link>

          {/* Profile avatar / login button */}
          {user ? (
            <Link to="/profile">
              <div className="w-8 h-8 rounded-full gradient-gold flex items-center justify-center shadow-elegant hover:opacity-90 transition-opacity cursor-pointer">
                <span className="text-xs font-cairo font-black text-primary-foreground">{initials}</span>
              </div>
            </Link>
          ) : (
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-sm gap-1.5">
                <User className="h-4 w-4" />
                دخول
              </Button>
            </Link>
          )}

          {/* Cart */}
          <button onClick={() => setIsOpen(true)} className="relative p-2 text-foreground hover:text-accent transition-colors">
            <ShoppingBag className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -left-1 bg-accent text-accent-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {totalItems}
              </span>
            )}
          </button>

          {/* Mobile menu toggle */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-foreground">
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t bg-background px-4 py-4 space-y-3">
          <Link to="/" onClick={() => setMenuOpen(false)} className="block text-sm font-medium py-2">الرئيسية</Link>
          {categories?.map(cat => (
            <Link key={cat.slug} to={`/products/${cat.slug}`} onClick={() => setMenuOpen(false)}
              className="block text-sm font-medium py-2">{cat.emoji} {cat.label}</Link>
          ))}
          <Link to="/track" onClick={() => setMenuOpen(false)} className="block text-sm font-medium py-2 text-accent">
            🔍 تتبع طلبي
          </Link>
          {user ? (
            <Link to="/profile" onClick={() => setMenuOpen(false)} className="block text-sm font-medium py-2">حسابي</Link>
          ) : (
            <Link to="/login" onClick={() => setMenuOpen(false)} className="block text-sm font-medium py-2">دخول الإدارة</Link>
          )}
          {isAdmin && (
            <Link to="/admin" onClick={() => setMenuOpen(false)} className="block text-sm font-medium text-accent py-2">لوحة التحكم</Link>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
