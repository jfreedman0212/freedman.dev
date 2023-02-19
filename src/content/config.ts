import { defineCollection, z } from 'astro:content';

export const collections = {
    posts: defineCollection({
        schema: z.object({
            title: z.string(),
            tagline: z.string(),
            datePosted: z.date(),
            dateLastUpdated: z.date().optional(),
            tags: z.array(z.string()),
            draft: z.boolean().optional()
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
