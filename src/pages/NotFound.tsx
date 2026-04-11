import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import PageSEO from "@/components/PageSEO";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404: page not found");
  }, [location.pathname]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted">
      <PageSEO
        title="Página não encontrada - SIMULAPOOL"
        description="A página que você procura não existe ou foi movida."
        path={location.pathname}
        noIndex
      />
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Página não encontrada</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Voltar para o início
        </a>
      </div>
    </main>
  );
};

export default NotFound;
