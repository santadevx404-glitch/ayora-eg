import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Home, ShieldCheck } from "lucide-react";

const Login = () => {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error("بيانات غير صحيحة، حاول مرة أخرى");
    } else {
      toast.success("مرحباً بك!");
      navigate("/admin");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <Link to="/"><Button variant="ghost" size="sm" className="gap-2 text-muted-foreground"><Home className="h-4 w-4" />العودة للمتجر</Button></Link>
        </div>

        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full gradient-gold flex items-center justify-center mx-auto mb-4 shadow-elegant">
            <ShieldCheck className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-cairo font-black text-gradient-gold mb-2">Ayora</h1>
          <p className="text-muted-foreground text-sm font-medium">تسجيل الدخول خاص بإدارة الموقع فقط</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
            <Input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com" dir="ltr" className="text-left" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">كلمة المرور</label>
            <Input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" dir="ltr" className="text-left" />
          </div>
          <Button type="submit" disabled={loading} className="w-full gradient-gold text-primary-foreground h-12 font-bold shadow-elegant">
            {loading ? "جاري الدخول..." : "تسجيل الدخول"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
