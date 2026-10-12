// Rezepte-Übersicht: neues Rezept = Eintrag hier + Seite unter /dashboard/rezepte/<slug>
export interface RecipeEntry {
  slug: string
  title: string
  category: string
  description: string
}

export const RECIPES: RecipeEntry[] = [
  {
    slug: 'propolis-zirbensalbe',
    title: 'Propolis-Zirbensalbe',
    category: 'Salben',
    description: 'Feste, gut streichbare Salbe auf Shea-Basis mit Bienenwachs, Propolis und Zirbenharz – mit Mengenrechner.',
  },
]
