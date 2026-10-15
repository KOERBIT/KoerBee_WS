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
    description: 'Feste, gut streichbare Salbe auf Shea-Basis mit Bienenwachs, Propolis, Zirbenharz und Ringelblumenöl – mit Mengenrechner.',
  },
  {
    slug: 'propolis-tinktur',
    title: 'Propolis-Tinktur (Alkoholauszug)',
    category: 'Tinkturen',
    description: 'Klassischer Alkoholauszug mit einstellbarem Propolis-Anteil, Verdünnungsrechner für 96 %igen Alkohol auf Trinkstärke.',
  },
  {
    slug: 'propolis-oelauszug',
    title: 'Propolis-Ölauszug für Shampoo & Duschgel',
    category: 'Kosmetik',
    description: 'Warmmazeration in Trägeröl als Basis für Propolis-Shampoo oder -Duschgel – mit Mengenrechner für das Endprodukt.',
  },
]
