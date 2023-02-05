import { defineCollection, z } from 'astro:content';

export const collections = {
    posts: defineCollection({
        schema: z.object({
            title: z.string(),
            tagline: z.string(),
            datePosted: z.date(),
            tags: z.array(z.string())
        })
    })
}