import { defineConfig } from 'astro/config';
import { rehypeHeadingIds } from '@astrojs/markdown-remark';
import autolinkHeadings from 'rehype-autolink-headings';

export default defineConfig({
    server: {
        host: true
    },
    site: 'https://freedman.dev',
    markdown: {
        rehypePlugins: [
            rehypeHeadingIds,
            [
                autolinkHeadings,
                { behavior: 'wrap' }
            ]
        ]
    }
});
