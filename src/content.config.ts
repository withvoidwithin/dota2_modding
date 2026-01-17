import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),

		schema: docsSchema({
			extend: z.object({
				// Добавляем наш объект meta как опциональный
				meta: z.object({
					author: z.string().optional(),
					game_version: z.string().optional(),
					date: z.date().or(z.string()).optional(),
				}).optional(),
			}),
		}),
	}),
};
