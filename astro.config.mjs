// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	site: 'https://withvoidwithin.github.io',
	base: 'dota2_modding',

	integrations: [starlight({
		title: 'D2_MODDING',
		social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/withvoidwithin/dota2_modding' }],
		sidebar: [
			{
				label: 'Guides',
				items: [
					// Each item here is one entry in the navigation menu.
					{ label: 'Example Guide', slug: 'guides/example' },
				],
			},
			{
				label: 'Reference',
				autogenerate: { directory: 'reference' },
			},
		],
	}), react()],

	vite: {
		plugins: [tailwindcss()],
	},
});