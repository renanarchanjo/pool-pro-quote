import { Loader2 } from "lucide-react";

const SuspenseFallback = () => (
  <div className="h-dvh flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      <span className="text-sm text-muted-foreground">Carregando...</span>
    </div>
  </div>
);

export default SuspenseFallback;
