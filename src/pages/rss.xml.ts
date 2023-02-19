import rss from '@astrojs/rss';
import sanitizeHtml from 'sanitize-html';
import MarkdownIt from 'markdown-it';
import { getPosts } from '../utils/getPosts';

const mdParser = new MarkdownIt();

export async function get(context: { site?: string }) {
    if (!context.site) {
        throw new Error('A `site` property in `astro.config` must be configured!');
    }
    const posts = await getPosts();
    return rss({
        title: "Josh Freedman's Blog",
        description: "Usually ramblings about whatever I feel like rambling, mostly software",
        site: context.site,
        xmlns: {
            atom: 'http://www.w3.org/2005/Atom'
        },
        stylesheet: '/rss/stylesheet.xsl',
        items: posts.map((post) => ({
            title: post.data.title,
            pubDate: post.data.datePosted,
            description: post.data.tagline,
            link: `/posts/${post.slug}`,
            content: sanitizeHtml(mdParser.render(post.body))
        })),
        customData: `<language>en-us</language><atom:link href="${context.site}rss.xml" rel="self" type="application/rss+xml" />`
    });
}