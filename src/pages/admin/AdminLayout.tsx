import { Navigate, Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Package, ShoppingCart, LogOut, Home, Users, ShieldCheck, Tag, Megaphone, Share2, Layers } from "lucide-react";

const AdminLayout = () => {
  const { user, isAdmin, hasPermission, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full gradient-gold animate-pulse" />
    </div>
  );

  if (!user) return <Navigate to="/login" />;

  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <ShieldCheck className="h-12 w-12 text-muted-foreground" />
      <p className="text-muted-foreground text-lg">ليس لديك صلاحية الوصول</p>
      <Link to="/"><Button variant="outline" className="gap-2"><Home className="h-4 w-4" />العودة للمتجر</Button></Link>
    </div>
  );

  const links = [
    ...(hasPermission("orders")   ? [{ to: "/admin",                icon: ShoppingCart, label: "الطلبات"    }] : []),
    ...(hasPermission("products") ? [{ to: "/admin/products",       icon: Package,      label: "المنتجات"   }] : []),
    ...(hasPermission("products") ? [{ to: "/admin/categories",     icon: Layers,       label: "الأقسام"    }] : []),
    ...(hasPermission("products") ? [{ to: "/admin/discounts",      icon: Tag,          label: "أكواد الخصم"}] : []),
    ...(hasPermission("products") ? [{ to: "/admin/announcements",  icon: Megaphone,    label: "الإعلانات"  }] : []),
    ...(hasPermission("products") ? [{ to: "/admin/social",         icon: Share2,       label: "السوشيال"   }] : []),
    ...(hasPermission("users")    ? [{ to: "/admin/users",          icon: Users,        label: "الأدمنية"   }] : []),
  ];

  const isActive = (to: string) =>
    to === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xl font-cairo font-bold text-gradient-gold">Ayora Admin</Link>
            <nav className="hidden md:flex items-center gap-1">
              {links.map(link => (
                <Link key={link.to} to={link.to}>
                  <Button variant={isActive(link.to) ? "secondary" : "ghost"} size="sm" className="gap-2 text-sm">
                    <link.icon className="h-4 w-4" />{link.label}
                  </Button>
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/"><Button variant="ghost" size="icon"><Home className="h-4 w-4" /></Button></Link>
            <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
        {links.length > 0 && (
          <div className="md:hidden border-t flex overflow-x-auto">
            {links.map(link => (
              <Link key={link.to} to={link.to} className="flex-1 min-w-fit">
                <Button variant={isActive(link.to) ? "secondary" : "ghost"} className="w-full rounded-none gap-1 text-xs px-2">
                  <link.icon className="h-3.5 w-3.5" />{link.label}
                </Button>
              </Link>
            ))}
          </div>
        )}
      </header>
      <main className="container mx-auto px-4 py-6"><Outlet /></main>
    </div>
  );
};

export default AdminLayout;
