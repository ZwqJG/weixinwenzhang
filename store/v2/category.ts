import { db } from './db';

export interface Category {
  id?: number;
  name: string;
  color: string;
  order: number;
  createdAt: number;
}

export const DEFAULT_CATEGORY_COLORS = [
  { name: '蓝色', value: '#3B82F6' },
  { name: '绿色', value: '#22C55E' },
  { name: '紫色', value: '#A855F7' },
  { name: '橙色', value: '#F97316' },
  { name: '粉色', value: '#EC4899' },
  { name: '青色', value: '#06B6D4' },
  { name: '红色', value: '#EF4444' },
  { name: '灰色', value: '#6B7280' },
];

/**
 * 获取所有分类，按 order 排序
 */
export async function getAllCategories(): Promise<Category[]> {
  return db.category.orderBy('order').toArray();
}

/**
 * 根据 ID 获取分类
 */
export async function getCategory(id: number): Promise<Category | undefined> {
  return db.category.get(id);
}

/**
 * 创建分类
 */
export async function createCategory(name: string, color: string): Promise<number> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('分类名称不能为空');
  }
  const maxOrder = await db.category.orderBy('order').last();
  const newId = await db.category.add({
    name: trimmed,
    color,
    order: (maxOrder?.order ?? 0) + 1,
    createdAt: Math.round(Date.now() / 1000),
  });
  return newId;
}

/**
 * 更新分类
 */
export async function updateCategory(id: number, data: Partial<Pick<Category, 'name' | 'color' | 'order'>>): Promise<void> {
  if (data.name !== undefined && !data.name.trim()) {
    throw new Error('分类名称不能为空');
  }
  if (data.name) {
    data.name = data.name.trim();
  }
  await db.category.update(id, data);
}

/**
 * 删除分类
 * 注意：不会自动清理公众号上的 categoryId 引用，调用方需处理
 */
export async function deleteCategory(id: number): Promise<void> {
  await db.category.delete(id);
}

/**
 * 获取分类数量
 */
export async function getCategoryCount(): Promise<number> {
  return db.category.count();
}
