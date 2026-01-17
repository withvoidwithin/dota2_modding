// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	site: 'https://withvoidwithin.github.io',
	base: 'dota2_modding',

	integrations: [
		starlight({
			title: 'D2_MODDING',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/withvoidwithin/dota2_modding' }],

			sidebar: [
				{
					label: 'Documentation',
					autogenerate: { directory: 'documentation' },
				},
			],

			defaultLocale: 'root',
			locales: {
				root: { label: 'Русский', lang: 'ru' },
				en: { label: 'English', lang: 'en' },
				'zh-cn': { label: '简体中文', lang: 'zh-CN' },
			},

			components: {
				PageTitle: './src/components/overrides/PageTitle.astro', // Подменяем PageTitle на наш кастомный
			},

		}), react()],

	vite: {
		plugins: [tailwindcss()],
	},
});