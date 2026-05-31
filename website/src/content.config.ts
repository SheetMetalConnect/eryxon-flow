import { defineCollection, z } from "astro:content";
import { docsLoader, i18nLoader } from "@astrojs/starlight/loaders";
import { docsSchema, i18nSchema } from "@astrojs/starlight/schema";
import { glob } from "astro/loaders";


/**
 * Editorial CTA intent (ERY-72, Slice 3). Drives which conversion block an editorial
 * surface renders near the end of the article, instead of defaulting to a generic push.
 * Per the ERY-54 messaging brief, the CTA must match article intent.
 */
const ctaIntent = z
  .enum(["docs", "trial", "rollout"])
  .describe("Which conversion block to render. docs|trial|rollout per ERY-54 CTA precedence.");

/** A labelled link used in release-note proof lists. */
const labelledLink = z.object({
  label: z.string(),
  href: z.string().optional(),
  note: z.string().optional(),
});

/**
 * Blog posts (ERY-72, Slice 3) — search/distribution-friendly educational surfaces on the
 * redesign foundation, NOT docs variants. See ERY-54 "Blog post template" brief: teach first,
 * connect to metalworking job-shop operations, one intent-matched CTA near the end.
 */
const blog = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "src/content/blog",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default("Eryxon"),
    /** Author role line shown under the name (design-kit article meta). */
    authorRole: z.string().optional(),
    /** Single category drives the index tabs + article eyebrow (design-kit blog IA). */
    category: z.string().default("Notes"),
    tags: z.array(z.string()).default([]),
    /** One post per index can be flagged as the featured hero card. */
    featured: z.boolean().default(false),
    /** Primary conversion intent for this article's end CTA. */
    ctaIntent: ctaIntent.default("docs"),
    heroImage: z.string().optional(),
    /** Related docs/product-proof links shown beneath the article. */
    relatedLinks: z.array(labelledLink).default([]),
    draft: z.boolean().default(false),
  }),
});

/**
 * Release notes (ERY-72, Slice 3) — explicit owned redesign template, not an implied docs
 * variant. Per ERY-54 "Release-note template": version + date, shipped changes separated from
 * Beta status and roadmap context, links to setup/feature/deployment docs, GitHub as the
 * secondary deeper-detail CTA. Roadmap claims stay factual and dated.
 */
const releaseNotes = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "src/content/release-notes",
  }),
  schema: z.object({
    title: z.string(),
    /** Marketing/product version label, e.g. "v0.6". */
    version: z.string(),
    date: z.coerce.date(),
    /** Release channel badge. Maps to the design-kit stable/preview styling; beta is ours. */
    status: z.enum(["stable", "preview", "beta"]).default("beta"),
    summary: z.string(),
    /**
     * Keep-a-Changelog-style change items (design-kit `release-items`). Each carries a
     * change `type` tag (Added/Fixed/Changed/Removed) — these are the SHIPPED changes for the
     * release, kept distinct from the release-level channel badge and the roadmap block below.
     */
    items: z
      .array(
        z.object({
          type: z.enum(["added", "fixed", "changed", "removed"]),
          title: z.string(),
          body: z.string(),
        })
      )
      .default([]),
    /** Factual, dated roadmap context only — rendered as a clearly separated block. No promises. */
    roadmap: z.array(labelledLink).default([]),
    /** Proof links into setup/feature/deployment docs. */
    docsLinks: z.array(labelledLink).default([]),
    /** Secondary CTA: GitHub release notes / repo changelog for deeper technical detail. */
    githubUrl: z.string().optional(),
    ctaIntent: ctaIntent.default("docs"),
    heroImage: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const ctaSection = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "src/content/sections",
  }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    enable: z.boolean().optional(),
    fill_button: z.object({
      label: z.string().optional(),
      link: z.string().optional(),
      enable: z.boolean().optional(),
    }),
    outline_button: z.object({
      label: z.string().optional(),
      link: z.string().optional(),
      enable: z.boolean().optional(),
    }),
  }),
});

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema(),
  }),
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
  ctaSection,
  blog,
  releaseNotes,
};
