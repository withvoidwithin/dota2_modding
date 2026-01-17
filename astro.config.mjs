// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	site: 'https://withvoidwithin.github.io',
	base: '/dota2_modding',

	integrations: [starlight({
		title: 'D2_MODDING',
		social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/withvoidwithin/dota2_modding' }],

		sidebar: [
			{
				label: 'Guides',
				autogenerate: { directory: 'guides' },
			},
			{
				label: 'Reference',
				autogenerate: { directory: 'reference' },
			},
		],

		defaultLocale: 'ru',
		locales: {
			ru: { label: 'Русский', lang: 'ru' }, // Документация на русском в `src/content/docs/ru/`
			en: { label: 'English', lang: 'en' }, // Документация на английском в `src/content/docs/en/`
			'zh-cn': { label: '简体中文', lang: 'zh-CN' }, // Документация на китайском в `src/content/docs/zh-cn/`
		},

	}), react()],

	vite: {
		plugins: [tailwindcss()],
	},
});