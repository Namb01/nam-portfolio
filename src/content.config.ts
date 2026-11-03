import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    artist: z.string(),           // stack, shown like a song artist
    bpm: z.number(),              // days taken, commits, etc.
    difficulty: z.number().min(1).max(10),
    status: z.enum(["cleared", "in-progress", "coming-soon"]),
    tags: z.array(z.string()),
    links: z.object({ live: z.string().optional(), repo: z.string().optional() }),
  }),
});

export const collections = { projects };