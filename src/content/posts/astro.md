---
title: "Why I Chose Astro"
tagline: "I guess I'm rewriting my personal site (again) in Astro."
datePosted: 2023-02-05T04:43:54.525Z
tags: ["astro"]
---
When I decided to rewrite my personal website, I had a couple requirements for how I'd do so:

1. Load no JavaScript unless absolutely required for the page
2. Have full control over styling and layout
3. Serve only static files, no server-side rendering.

I'd only used static site generators like Jekyll or Hugo in the past, and I didn't think they'd
give me the flexibility I needed without diving deep into the docs [^1]. So, my first thought was to just hand-write the HTML and CSS I'd need. This sounded nice in theory and would reduce complexity; no need to meddle with configuring some tool if it doesn't exist!

However, this fell apart as soon as I sat down to build the features I wanted, namely:

- RSS
- Tags
- Reusing fragments of markup

These would be cumbersome to do with raw HTML. I wanted to auto-generate these, so I had to use a static site generator. Which one would I use?

# Enter: Astro

I'd heard a lot of buzz around [Astro](https://astro.build) and thought I'd give it a try. How hard could it be?

Answer: not hard at all!

Astro has nailed static site generation. It was super easy to get started and you're given all the tools to build your site how you want without them getting in your way. Most of the things you'll need, such as rendering Markdown to HTML, don't require any configuration to use (even less so with content collections). The docs are easy to understand and walk you through everything you need to know.

There are a ton of other features that Astro has that I didn't need, like:

- JS Framework integration (React, Svelte, Vue, etc.)
- [Islands](https://docs.astro.build/en/concepts/islands/)
- Server-side rendering

They're nifty features that I know are useful, I just don't need them yet. That may change, and it's nice to know that my choice in tooling won't hold me back.

The only bad thing I have to say is that hot module reloading (HMR) wasn't always great. I'm used to Vite's HMR at work, and Astro is built on top of Vite, so I expected the same experience. However, the webpage would freeze and become non-interactive for a brief moment as I made changes. This was frustrating because I wanted to see changes immediately, or test that my focus/hover CSS applied the way I wanted it to. This wasn't always the case, and the time it takes to do a full build is ~1 second, so it's not a deal-breaker.

[^1]: Yes, it would have been easier to read the docs for Hugo and make my own theme instead of all the extra work I gave myself. No, I wouldn't do it differently if given the chance to redo it.