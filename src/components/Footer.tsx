import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SocialEntry {
  id: string;
  logo_url: string;
  link: string;
  label: string;
}

const useSiteSettings = () =>
  useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value");
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: any) => { if (r.value) map[r.key] = r.value; });
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });

const Footer = () => {
  const { data: settings } = useSiteSettings();

  const logoUrl    = settings?.["logo_url"];
  const footerText = settings?.["footer_text"];

  let socials: SocialEntry[] = [];
  try {
    const raw = settings?.["social_links"];
    if (raw) socials = JSON.parse(raw).filter((s: SocialEntry) => s.logo_url && s.link);
  } catch {}

  return (
    <footer className="border-t bg-secondary/30 mt-16">
      <div className="container mx-auto px-4 py-8 flex flex-col items-center gap-4">

        {logoUrl ? (
          <a href="/" aria-label="الرئيسية">
            <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
          </a>
        ) : (
          <h3 className="text-xl font-cairo font-bold text-gradient-gold">Ayora</h3>
        )}

        {socials.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {socials.map(s => (
              <a
                key={s.id}
                href={s.link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label || s.link}
                title={s.label}
                className="w-9 h-9 rounded-full bg-secondary hover:bg-accent/20 border flex items-center justify-center overflow-hidden transition-colors hover:border-accent"
              >
                <img
                  src={s.logo_url}
                  alt={s.label}
                  className="w-5 h-5 object-contain"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </a>
            ))}
          </div>
        )}

        <p className="text-muted-foreground text-sm text-center">
          {footerText || `© ${new Date().getFullYear()} Ayora. جميع الحقوق محفوظة`}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
