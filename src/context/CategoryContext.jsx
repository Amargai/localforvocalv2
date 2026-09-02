import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { CATEGORIES as DEFAULT_CATEGORIES, SUB_CATEGORIES as DEFAULT_SUB_CATEGORIES, SUGGESTED_TAGS as DEFAULT_SUGGESTED_TAGS } from '../utils/constants';

const CategoryContext = createContext(null);

export function CategoryProvider({ children }) {
  const [categoriesList, setCategoriesList] = useState(DEFAULT_CATEGORIES.slice(1));
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await api('/categories');
      if (data && Array.isArray(data.categories) && data.categories.length > 0) {
        setCategoriesList(data.categories);
      }
    } catch (err) {
      console.warn('Using default fallback categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Full category list including the "All Categories" pill for explore/filters
  const categories = [
    { id: 'all', name: 'All Categories', icon: '✨' },
    ...categoriesList
  ];

  // Dynamic map of category ID -> Subcategories array
  const subCategoriesMap = categoriesList.reduce((acc, cat) => {
    acc[cat.id] = (cat.subCategories && cat.subCategories.length > 0)
      ? cat.subCategories
      : (DEFAULT_SUB_CATEGORIES[cat.id] || ['General Service']);
    return acc;
  }, { ...DEFAULT_SUB_CATEGORIES });

  // Dynamic map of category ID -> Suggested tags array
  const suggestedTagsMap = categoriesList.reduce((acc, cat) => {
    acc[cat.id] = (cat.suggestedTags && cat.suggestedTags.length > 0)
      ? cat.suggestedTags
      : (DEFAULT_SUGGESTED_TAGS[cat.id] || ['Quick Service', 'Reliable']);
    return acc;
  }, { ...DEFAULT_SUGGESTED_TAGS });

  // Admin action: Create Category
  async function addCategory(categoryData) {
    const res = await api('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData)
    });
    await fetchCategories();
    return res;
  }

  // Admin action: Update Category
  async function updateCategory(id, categoryData) {
    const res = await api(`/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData)
    });
    await fetchCategories();
    return res;
  }

  // Admin action: Delete Category
  async function deleteCategory(id) {
    const res = await api(`/admin/categories/${id}`, {
      method: 'DELETE'
    });
    await fetchCategories();
    return res;
  }

  return (
    <CategoryContext.Provider value={{
      categories,
      rawCategories: categoriesList,
      subCategoriesMap,
      suggestedTagsMap,
      loading,
      refreshCategories: fetchCategories,
      addCategory,
      updateCategory,
      deleteCategory
    }}>
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoryContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      categories: DEFAULT_CATEGORIES,
      rawCategories: DEFAULT_CATEGORIES.slice(1),
      subCategoriesMap: DEFAULT_SUB_CATEGORIES,
      suggestedTagsMap: DEFAULT_SUGGESTED_TAGS,
      loading: false,
      refreshCategories: () => {},
      addCategory: async () => {},
      updateCategory: async () => {},
      deleteCategory: async () => {}
    };
  }
  return context;
}
