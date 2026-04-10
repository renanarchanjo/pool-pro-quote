import { MapPinOff } from "lucide-react";

const NoStoresInRegion = () => (
  <div className="text-center py-12 px-6">
    <MapPinOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
    <h2 className="text-xl font-display font-semibold text-foreground mb-2">
      Ainda não temos lojas ativas na sua região
    </h2>
    <p className="text-muted-foreground text-sm max-w-md mx-auto">
      Em breve você poderá fazer novos orçamentos por aqui.
    </p>
    <p className="text-xs text-muted-foreground/60 mt-4">
      Tente novamente mais tarde
    </p>
  </div>
);

export default NoStoresInRegion;
