export type NivelActividade = 'sedentario' | 'ligeiro' | 'moderado' | 'intenso' | 'muito_intenso';
export type ObjectivoNutricional = 'perda' | 'manutencao' | 'ganho';
export type Sexo = 'masculino' | 'feminino';

export interface MacroGoalsInput {
  peso_kg:               number;
  altura_cm:             number;
  idade:                 number;
  sexo:                  Sexo;
  nivel_actividade:      NivelActividade;
  objectivo_nutricional: ObjectivoNutricional;
}

export interface MacroTargets {
  meta_calorias:  number;
  meta_proteinas: number;
  meta_hidratos:  number;
  meta_gorduras:  number;
}

export interface MacroDailyTotal {
  id:         string;
  user_id:    string;
  data:       string;
  calorias:   number;
  proteinas:  number;
  hidratos:   number;
  gorduras:   number;
  parcial:    boolean;
  updated_at: string;
}
