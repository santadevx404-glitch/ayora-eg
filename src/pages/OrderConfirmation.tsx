import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, ShoppingBag, Home, Copy, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const OrderConfirmation = () => {
  const location = useLocation();
  const orderNumber: string | undefined = (location.state as any)?.orderNumber;
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!orderNumber) return;
    navigator.clipboard.writeText(orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16">
        <div className="mb-6">
          <div className="w-24 h-24 rounded-full gradient-gold flex items-center justify-center shadow-elegant mx-auto">
            <CheckCircle2 className="h-12 w-12 text-primary-foreground" />
          </div>
        </div>

        <h1 className="text-3xl font-cairo font-black mb-3">تم تقديم طلبك بنجاح! 🎉</h1>
        <p className="text-muted-foreground text-lg mb-2 max-w-sm leading-relaxed">
          شكراً لك على طلبك، سنتواصل معك قريباً لتأكيد الطلب وترتيب التوصيل.
        </p>

        {/* Order number box */}
        {orderNumber && (
          <div className="my-6 border-2 border-accent/30 rounded-2xl p-5 bg-accent/5 max-w-xs w-full">
            <p className="text-sm text-muted-foreground mb-2">رقم طلبيتك — احتفظ بيه لتتبع الطلب</p>
            <div className="flex items-center justify-center gap-2">
              <code className="font-mono font-black text-xl tracking-widest text-accent">{orderNumber}</code>
              <button onClick={copy} className="text-muted-foreground hover:text-accent transition-colors">
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        <p className="text-muted-foreground text-sm mb-8">تابع هاتفك — هيتواصلوا معاك في أقرب وقت ✨</p>

        <div className="flex flex-col sm:flex-row gap-3">
          {orderNumber && (
            <Link to="/track" state={{ prefill: orderNumber }}>
              <Button variant="outline" className="gap-2 h-12 px-6">
                <Search className="h-4 w-4" />تتبع طلبي
              </Button>
            </Link>
          )}
          <Link to="/products/mugs">
            <Button className="gradient-gold text-primary-foreground font-bold gap-2 shadow-elegant h-12 px-6">
              <ShoppingBag className="h-4 w-4" />تصفح المزيد
            </Button>
          </Link>
          <Link to="/">
            <Button variant="outline" className="gap-2 h-12 px-6"><Home className="h-4 w-4" />الرئيسية</Button>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default OrderConfirmation;
