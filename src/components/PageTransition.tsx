interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * Render direto, sem fade duplo (evitava ~80-180ms de delay percebido entre rotas).
 * O Suspense fallback já cobre a transição enquanto o chunk carrega.
 */
const PageTransition = ({ children }: PageTransitionProps) => {
  return <div className="h-full">{children}</div>;
};

export default PageTransition;

