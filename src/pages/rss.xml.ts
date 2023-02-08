import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function get(context: { site?: string }) {
    if (!context.site) {
        throw new Error('A `site` property in `astro.config` must be configured!');
    }
    const posts = (await getCollection('posts'))
        .sort((a, b) => b.data.datePosted.getTime() - a.data.datePosted.getTime());
    return rss({
        title: "Josh Freedman's Blog",
        description: "All my blog posts, usually ramblings about whatever I feel like rambling, mostly software",
        site: context.site,
        items: posts.map((post) => ({
            title: post.data.title,
            pubDate: post.data.datePosted,
            description: post.data.tagline,
            link: `/posts/${post.slug}`
        })),
        customData: '<language>en-us</language>'
    });
}