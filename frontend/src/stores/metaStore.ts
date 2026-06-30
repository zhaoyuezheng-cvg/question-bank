import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiGet, apiPost, apiDelete } from '@/utils/api';

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

export interface CategoryNode {
  id: string;
  name: string;
  subject: string;
  children: CategoryNode[];
}

export const useMetaStore = defineStore('meta', () => {
  const tags = ref<Tag[]>([]);
  const categories = ref<CategoryNode[]>([]);

  async function fetchTags() {
    const json = await apiGet('/tags');
    if (json.success) tags.value = json.data;
  }

  async function createTag(name: string, color?: string) {
    const json = await apiPost('/tags', { name, color });
    if (json.success) await fetchTags();
    return json;
  }

  async function deleteTag(id: string) {
    const json = await apiDelete(`/tags/${id}`);
    if (json.success) await fetchTags();
    return json;
  }

  async function fetchCategories(subject?: string) {
    const params = subject ? `?subject=${subject}` : '';
    const json = await apiGet(`/categories${params}`);
    if (json.success) categories.value = json.data;
  }

  async function createCategory(subject: string, name: string, parentId?: string) {
    const json = await apiPost('/categories', { subject, name, parentId });
    if (json.success) await fetchCategories(subject);
    return json;
  }

  return {
    tags, categories,
    fetchTags, createTag, deleteTag,
    fetchCategories, createCategory,
  };
});
