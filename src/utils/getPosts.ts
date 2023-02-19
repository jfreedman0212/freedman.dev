import { getCollection } from "astro:content";

export async function getPosts() {
    let entries = await getCollection("posts");
    return entries
        .filter((entry) => !entry.data.draft)
        .sort((a, b) => b.data.datePosted.getTime() - a.data.datePosted.getTime());
}