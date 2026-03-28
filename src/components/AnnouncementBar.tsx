import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { X, ChevronLeft } from "lucide-react";

const AnnouncementBar = () => {
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

  const isClickable = !!current.link_type && !!current.link_value;

  const handleClick = () => {
    if (!isClickable) return;
    if (current.link_type === "category") navigate(`/products/${current.link_value}`);
    else if (current.link_type === "product") navigate(`/product/${current.link_value}`);
  };

  return (
    <div className="w-full gradient-gold text-primary-foreground py-2 px-4 flex items-center justify-between gap-2 text-sm z-[9999] relative">
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity p-0.5 rounded"
        aria-label="إغلاق"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex-1 text-center flex items-center justify-center gap-2 font-medium">
        <span>{current.title}</span>
        {current.body && (
          <span className="opacity-80 text-xs hidden sm:inline">— {current.body}</span>
        )}
      </div>

      {isClickable ? (
        <button
          onClick={handleClick}
          className="shrink-0 flex items-center gap-1 font-bold underline underline-offset-2 opacity-90 hover:opacity-100 transition-opacity text-xs whitespace-nowrap"
        >
          اعرف أكثر
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      ) : (
        <span className="w-6 shrink-0" />
      )}
    </div>
  );
};

export default AnnouncementBar;
