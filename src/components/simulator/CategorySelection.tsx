import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Category {
  id: string;
  name: string;
  description: string;
}

interface CategorySelectionProps {
  categories: Category[];
  onSelect: (categoryId: string) => void;
}

const CategorySelection = ({ categories, onSelect }: CategorySelectionProps) => {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-2">Escolha a Categoria</h2>
      <p className="text-muted-foreground mb-6">Selecione o tipo de piscina ideal para você</p>
      
      <div className="grid gap-4">
        {categories.map((category) => (
          <Card
            key={category.id}
            className="p-6 hover:shadow-elegant transition-all cursor-pointer border-2 hover:border-primary"
            onClick={() => onSelect(category.id)}
          >
            <h3 className="text-xl font-semibold mb-2">{category.name}</h3>
            {category.description && (
              <p className="text-muted-foreground">{category.description}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CategorySelection;
