import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BrandCategoryManager from "./BrandCategoryManager";
import { usePersistedState } from "@/hooks/usePersistedState";

const BrandsAndCategoriesPage = () => {
  const [tab, setTab] = usePersistedState<"brands" | "categories">("admin:brands:tab", "brands");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-[20px] md:text-[24px] font-bold text-foreground leading-tight">
          Marcas e Categorias
        </h1>
        <p className="text-[12px] md:text-[13px] text-muted-foreground mt-0.5">
          Gerencie marcas e suas categorias em uma única tela.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "brands" | "categories")}>
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="brands">Marcas</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
        </TabsList>
        <TabsContent value="brands" className="mt-4">
          <BrandCategoryManager mode="brands" />
        </TabsContent>
        <TabsContent value="categories" className="mt-4">
          <BrandCategoryManager mode="categories" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BrandsAndCategoriesPage;
