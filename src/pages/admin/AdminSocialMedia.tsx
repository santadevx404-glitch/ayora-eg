import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Save, Plus, Trash2, Image as ImageIcon, GripVertical, Globe } from "lucide-react";

interface SocialEntry {
  id: string;
  logo_url: string;
  link: string;
  label: string;
}

interface BrandSettings {
  logo_url: string;
  footer_text: string;
}

const genId = () => Math.random().toString(36).slice(2, 9);

const AdminSocialMedia = () => {
  const qc = useQueryClient();
  const [brand, setBrand] = useState<BrandSettings>({ logo_url: "", footer_text: "" });
  const [socials, setSocials] = useState<SocialEntry[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("key, value");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: any) => { map[r.key] = r.value ?? ""; });
      return map;
    },
  });

  useEffect(() => {
    if (!data) return;
    setBrand({
      logo_url: data["logo_url"] ?? "",
      footer_text: data["footer_text"] ?? "",
    });
    try {
      const parsed = data["social_links"] ? JSON.parse(data["social_links"]) : [];
      setSocials(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSocials([]);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const entries: { key: string; value: string | null }[] = [
        { key: "logo_url",     value: brand.logo_url    || null },
        { key: "footer_text",  value: brand.footer_text || null },
        { key: "social_links", value: JSON.stringify(socials) },
      ];
      for (const entry of entries) {
        const { error } = await supabase
          .from("site_settings")
          .upsert({ key: entry.key, value: entry.value }, { onConflict: "key" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("تم حفظ الإعدادات");
    },
    onError: (e: any) => toast.error("خطأ: " + e?.message),
  });

  const addEntry = () =>
    setSocials(s => [...s, { id: genId(), logo_url: "", link: "", label: "" }]);

  const updateEntry = (id: string, field: keyof SocialEntry, value: string) =>
    setSocials(s => s.map(e => e.id === id ? { ...e, [field]: value } : e));

  const removeEntry = (id: string) =>
    setSocials(s => s.filter(e => e.id !== id));

  if (isLoading) return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
    </div>
  );

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-cairo font-bold">السوشيال ميديا والهوية</h2>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gradient-gold text-primary-foreground gap-2"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "جاري الحفظ..." : "حفظ"}
        </Button>
      </div>

      {/* Brand */}
      <section className="border rounded-2xl p-5 mb-5 space-y-4">
        <h3 className="font-cairo font-bold text-base flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-accent" /> الشعار والهوية
        </h3>

        <div>
          <label className="block text-sm font-medium mb-1">رابط اللوجو</label>
          <Input
            value={brand.logo_url}
            onChange={e => setBrand(b => ({ ...b, logo_url: e.target.value }))}
            placeholder="https://example.com/logo.png"
            dir="ltr"
          />
          {brand.logo_url && (
            <div className="mt-2 flex items-center gap-2">
              <img
                src={brand.logo_url}
                alt="logo preview"
                className="h-10 w-auto object-contain rounded border bg-secondary/50 p-1"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <span className="text-xs text-muted-foreground">معاينة</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">نص حقوق الموقع</label>
          <Input
            value={brand.footer_text}
            onChange={e => setBrand(b => ({ ...b, footer_text: e.target.value }))}
            placeholder={`© ${new Date().getFullYear()} اسم الموقع. جميع الحقوق محفوظة`}
          />
          <p className="text-xs text-muted-foreground mt-1">اتركه فارغ للنص الافتراضي</p>
        </div>
      </section>

      {/* Social entries */}
      <section className="border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-cairo font-bold text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-accent" /> روابط السوشيال ميديا
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={addEntry} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> إضافة
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          كل إدخال: صورة اللوجو (أيقونة المنصة) + الرابط. هيظهر في الفوتر تلقائياً.
        </p>

        {socials.length === 0 && (
          <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-xl">
            اضغط "إضافة" لإضافة أول حساب سوشيال
          </div>
        )}

        <div className="space-y-3">
          {socials.map((entry, idx) => (
            <div key={entry.id} className="border rounded-xl p-3 space-y-2 bg-secondary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                  <span className="text-xs font-medium">حساب {idx + 1}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => removeEntry(entry.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">اسم المنصة (اختياري)</label>
                  <Input
                    value={entry.label}
                    onChange={e => updateEntry(entry.id, "label", e.target.value)}
                    placeholder="مثال: انستغرام"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">رابط صورة الأيقونة / اللوجو</label>
                  <div className="flex gap-2 items-center">
                    <Input
                      value={entry.logo_url}
                      onChange={e => updateEntry(entry.id, "logo_url", e.target.value)}
                      placeholder="https://example.com/instagram-icon.png"
                      dir="ltr"
                      className="h-8 text-sm"
                    />
                    {entry.logo_url && (
                      <img
                        src={entry.logo_url}
                        alt=""
                        className="h-8 w-8 object-contain rounded border bg-secondary shrink-0"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">رابط الصفحة / الحساب</label>
                  <Input
                    value={entry.link}
                    onChange={e => updateEntry(entry.id, "link", e.target.value)}
                    placeholder="https://instagram.com/yourhandle"
                    dir="ltr"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-5">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="w-full gradient-gold text-primary-foreground h-12 font-bold text-base gap-2"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "جاري الحفظ..." : "حفظ جميع التغييرات"}
        </Button>
      </div>
    </div>
  );
};

export default AdminSocialMedia;
