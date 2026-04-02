export type CriterionType = 'scale' | 'number' | 'boolean' | 'text'

export interface Criterion {
  key: string
  label: string
  type: CriterionType
  description?: string
}

export const INSPECTION_CRITERIA: Criterion[] = [
  { key: 'population',   label: 'Volksstärke',        type: 'scale',   description: '1 = schwach, 5 = sehr stark' },
  { key: 'temperament',  label: 'Sanftmut',            type: 'scale',   description: '1 = aggressiv, 5 = sehr sanftmütig' },
  { key: 'vitality',     label: 'Vitalität',           type: 'scale',   description: '1 = niedrig, 5 = sehr hoch' },
  { key: 'brood_pattern',label: 'Brutnest',            type: 'scale',   description: '1 = lückenhaft, 5 = geschlossen' },
  { key: 'comb_building',label: 'Wabenbau',            type: 'scale',   description: '1 = schlecht, 5 = sehr gut' },
  { key: 'food_stores',  label: 'Futtervorrat',        type: 'scale',   description: '1 = leer, 5 = gut gefüllt' },
  { key: 'swarm_drive',  label: 'Schwarmtrieb',        type: 'scale',   description: '1 = kein, 5 = sehr hoch' },
  { key: 'varroa',       label: 'Varroa-Befallsrate',  type: 'number',  description: 'Milben pro 100 Bienen (%)' },
  { key: 'honey_supers', label: 'Honigräume',          type: 'number',  description: 'Anzahl aufgesetzter Honigräume' },
  { key: 'queen_seen',   label: 'Königin gesehen',     type: 'boolean' },
  { key: 'queen_cells',  label: 'Königinnenzellen',    type: 'boolean' },
  { key: 'disease_signs',label: 'Krankheitsanzeichen', type: 'boolean' },
  { key: 'notes_field',  label: 'Anmerkungen',         type: 'text' },
]
