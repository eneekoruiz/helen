export type AvatarState = 'happy' | 'thirsty' | 'tired' | 'critical' | 'neutral';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export interface RecordatoriosTask {
  id: string;
  title: string;
  list?: string;
  completed: boolean;
  priority?: 'high' | 'normal' | 'low';
  due?: string | null;
  periodicity?: 'day' | 'week' | 'month' | 'year' | null;
}

export interface HelenPromptItem {
  name: string;
  file: string;
  phase: string;
  path: string;
}

export interface RecipeItem {
  id: string;
  name: string;
  category: string;
  total_kcal: number;
  total_protein: number;
  total_carbs: number;
  total_fats: number;
  ingredients: Array<{
    name: string;
    amount: number;
    unit: string;
    kcal: number;
    protein: number;
    carbs: number;
    fats: number;
  }>;
  instructions: string;
  tags: string[];
}
