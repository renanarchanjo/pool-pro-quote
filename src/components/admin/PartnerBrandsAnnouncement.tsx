import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const STORAGE_KEY = "partner_brands_announcement_v1_seen";

interface Props {
  enabled: boolean;
}

const PartnerBrandsAnnouncement = ({ enabled }: Props) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {}
    const t = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(t);
  }, [enabled]);

  const dismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setOpen(false);
  };

  const goToPartners = () => {
    dismiss();
    navigate("/admin/parceiros");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) dismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-lg">Novidade: Marcas Parceiras</DialogTitle>
          </div>
          <DialogDescription className="text-sm leading-relaxed pt-2">
            Conforme novas marcas parceiras forem disponibilizadas, verifique em{" "}
            <strong className="text-foreground">Marcas Parceiras</strong> se a marca que você representa já está disponível em nosso catálogo de importação.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={dismiss}>Entendi</Button>
          <Button onClick={goToPartners}>Ver Marcas Parceiras</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PartnerBrandsAnnouncement;
