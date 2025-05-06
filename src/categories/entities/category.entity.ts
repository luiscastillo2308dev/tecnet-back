import { Category } from '@prisma/client';

export type CategoryEntity = Omit<Category, 'createdAt' | 'updatedAt'>;
