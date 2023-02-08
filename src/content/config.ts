import { defineCollection, z } from 'astro:content';

export const collections = {
    posts: defineCollection({
        schema: z.object({
            title: z.string(),
            tagline: z.string(),
            datePosted: z.date(),
            tags: z.array(z.string())
        })
    }),
    pages: defineCollection({
        schema: z.object({
            title: z.string(),
            description: z.string(),
            lastUpdated: z.date()
        })
    })
}