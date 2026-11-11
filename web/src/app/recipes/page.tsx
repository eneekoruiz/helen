'use client';

import React, { useState } from 'react';
import recipesData from '../../../data/recipes.json';
import type { RecipeItem } from '@/types/assistant';
import { Utensils, Flame, Search, ChevronDown, ChevronUp, ShoppingCart, Tag } from 'lucide-react';
import toast from '@/lib/toast';

export default function RecipesPage() {
  const [recipes] = useState<RecipeItem[]>(recipesData as RecipeItem[]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = ['Todas', ...Array.from(new Set(recipes.map((r) => r.category)))];

  const filtered = recipes.filter((r) => {
    const matchesCat = selectedCategory === 'Todas' || r.category === selectedCategory;
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleCopyIngredients = (recipe: RecipeItem) => {
    const text = recipe.ingredients.map((i) => `• ${i.amount} ${i.unit} de ${i.name}`).join('\n');
    navigator.clipboard.writeText(`Lista de ingredientes para ${recipe.name}:\n${text}`);
    toast.success('Ingredientes copiados al portapapeles para tu lista de la compra');
  };

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 space-y-4">
      {/* Header */}
      <div className="p-4 rounded-3xl bg-white/75 dark:bg-slate-900/75 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <Utensils className="w-5 h-5 text-amber-500" />
          <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Recetas & Alimentación
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Catálogo saludable protegido con ingredientes, macros e instrucciones.
        </p>

        {/* Search & Categories */}
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar recetas o ingredientes..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-white font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recipe List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
        {filtered.map((recipe) => {
          const isExpanded = expandedId === recipe.id;
          return (
            <div
              key={recipe.id}
              className="p-4 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800 shadow-xs transition hover:border-amber-400/50"
            >
              <div
                className="flex items-start justify-between gap-3 cursor-pointer select-none"
                onClick={() => setExpandedId(isExpanded ? null : recipe.id)}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">
                      {recipe.category}
                    </span>
                    {recipe.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {t}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {recipe.name}
                  </h3>

                  {/* Macros badges */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                      <Flame className="w-3 h-3 text-rose-500" />
                      {recipe.total_kcal} kcal
                    </span>
                    <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400">
                      Prot: {recipe.total_protein}g
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Carbs: {recipe.total_carbs}g
                    </span>
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      Grasas: {recipe.total_fats}g
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 shrink-0"
                >
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Ingredientes
                    </h4>
                    <ul className="space-y-1.5">
                      {recipe.ingredients.map((ing, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 py-0.5 border-b border-slate-50 dark:border-slate-800/40"
                        >
                          <span>{ing.name}</span>
                          <span className="font-semibold text-slate-500 dark:text-slate-400">
                            {ing.amount} {ing.unit} ({ing.kcal} kcal)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Instrucciones
                    </h4>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line">
                      {recipe.instructions}
                    </p>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleCopyIngredients(recipe)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition shadow-xs"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Copiar a Lista de la Compra
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
