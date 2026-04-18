import { BookOpen, Clock, ChefHat } from "@/icons/lucide";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ModalBase } from "@/components/ui/ModalBase";
import type { Recipe } from "@/lib/sommelier-ai";

interface RecipeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dishName: string;
  recipe?: Recipe | null;
  wineName?: string;
  time?: string | null;
  difficulty?: string | null;
}

export function RecipeModal({
  open,
  onOpenChange,
  dishName,
  recipe,
  wineName,
  time,
  difficulty,
}: RecipeModalProps) {
  const hasRecipe = !!recipe && (
    (recipe.description && recipe.description.trim().length > 0) ||
    (recipe.ingredients?.length ?? 0) > 0 ||
    (recipe.steps?.length ?? 0) > 0 ||
    (recipe.wine_reason && recipe.wine_reason.trim().length > 0)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ModalBase
        title={dishName}
        icon={<BookOpen className="h-5 w-5" />}
        onClose={() => onOpenChange(false)}
        className="sm:max-w-md"
      >
        {hasRecipe ? (
          <>
            {recipe?.description ? (
              <p className="text-sm text-black/70 leading-relaxed">
                {recipe.description}
              </p>
            ) : null}

            {(time || difficulty) ? (
              <div className="flex flex-wrap gap-2">
                {time ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1 text-sm font-medium tracking-tight text-[#5F5F5F]">
                    <Clock className="h-3.5 w-3.5" />
                    {time}
                  </span>
                ) : null}
                {difficulty ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1 text-sm font-medium tracking-tight text-[#5F5F5F]">
                    <ChefHat className="h-3.5 w-3.5" />
                    {difficulty}
                  </span>
                ) : null}
              </div>
            ) : null}

            {recipe?.ingredients?.length ? (
              <section className="space-y-2">
                <p className="text-xs uppercase tracking-[0.12em] text-black/50">Ingredientes</p>
                <ul className="space-y-2">
                  {recipe.ingredients.map((ingredient, index) => (
                    <li key={`${ingredient}-${index}`} className="flex items-start gap-2 text-sm text-black/70 leading-relaxed">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7B1E2B]/35" />
                      <span>{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {recipe?.steps?.length ? (
              <section className="space-y-2">
                <p className="text-xs uppercase tracking-[0.12em] text-black/50">Modo de preparo</p>
                <ol className="space-y-2">
                  {recipe.steps.map((step, index) => (
                    <li key={`${index}-${step}`} className="flex items-start gap-2 text-sm text-black/70 leading-relaxed">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/5 text-[10px] font-semibold text-[#5F5F5F]">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {recipe?.wine_reason ? (
              <section className="space-y-2 rounded-2xl border border-black/5 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-black/50">Por que harmoniza</p>
                <p className="text-sm text-black/70 leading-relaxed">{recipe.wine_reason}</p>
              </section>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-black/70 leading-relaxed">
            Receita detalhada em breve.
          </p>
        )}
      </ModalBase>
    </Dialog>
  );
}
