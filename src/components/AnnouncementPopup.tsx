import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, Megaphone } from "lucide-react";

const AnnouncementPopup = () => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [current, setCurrent] = useState<any>(null);

  const { data } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!data) return;
    const now = new Date();
    const live = data.find(a => {
      if (new Date(a.starts_at) > now) return false;
      if (a.ends_at && new Date(a.ends_at) < now) return false;
      return true;
    });
    if (live) { setCurrent(live); setDismissed(false); }
    else setCurrent(null);
  }, [data]);

  if (!current || dismissed) return null;

  const handleClick = () => {
    if (!current.link_type || !current.link_value) return;
    setDismissed(true);
    if (current.link_type === "category") navigate(`/products/${current.link_value}`);
    else if (current.link_type === "product") navigate(`/product/${current.link_value}`);
  };

  const isClickable = !!current.link_type && !!current.link_value;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className={`relative bg-background border rounded-2xl shadow-2xl max-w-md w-full p-6 ${isClickable ? "cursor-pointer hover:border-accent transition-colors" : ""}`}
        onClick={isClickable ? handleClick : undefined}
      >
        <button
          onClick={e => { e.stopPropagation(); setDismissed(true); }}
          className="absolute top-3 left-3 text-muted-foreground hover:text-foreground transition-colors rounded-full p-1 hover:bg-secondary"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full gradient-gold flex items-center justify-center shadow-md">
            <Megaphone className="h-6 w-6 text-primary-foreground" />
          </div>
          <h3 className="font-cairo font-bold text-xl">{current.title}</h3>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{current.body}</p>
          {isClickable && (
            <span className="text-accent text-sm font-medium mt-1 underline underline-offset-2">
              {current.link_type === "category" ? "تسوق الآن ←" : "اعرف أكثر ←"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementPopup;
