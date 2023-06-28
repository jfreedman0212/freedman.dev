---
title: "Thoughts on Web Components"
tagline: "My initial impression of Web Components having played around with them a bit."
datePosted: 2023-02-22T02:58:04.215Z
tags: ["javascript", "web-components"]
draft: true
---
**DISCLAIMER:** I'm not an expert in Web Components by any means. This post is solely my first
impression of the technology

I've been thinking about what the "ideal" way to build a web application would be, specifically
for the kinds of apps I build at work: line-of-business applications that companies use internally to 
track some sort of data that can change frequently. They're interactive in the sense that users
can submit forms, click buttons, and whatnot, but not "hyperinteractive" like a game or a design tool
(e.g. Figma) are. The data that users interact with has the capacity to change frequently, and they
need to have the most up to date information.

The characteristics I'd want out of the tools I use to build these apps are (in no particular order):

1. Renders HTML on the server such that the page displays usable data without JS loading
2. Ships just enough JS to implement the features required for the page and nothing more
3. Doesn't tie the back-end to a specific language or templating library; I want this approach
  to be viable from any ecosystem
4. (Optional) Can be built without setting up modern build tools like bundlers and transpilers, but can still be pulled in if desirable/necessary.

#1 and #2 are important for loading the page quickly and making it interactive shortly after.
These are possible to achieve with a lot of existing tools: Next.js, Remix, Sveltekit, etc. However,
most of these tools violate #3 and tie you to a specific backend technology stack[^1]. I wasn't aware
of any approach to get all three until today.

# Web Components

Web Components, or Custom Elements, are a JavaScript feature that let you create custom HTML elements
and isolate interactive logic to them. If used alongside the [template and slot tags](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_templates_and_slots) and the
[Declarative Shadow DOM](https://developer.chrome.com/articles/declarative-shadow-dom/), all of my
required characteristics can be met. Well, at least in theory.

For example, you can use your favorite HTML templating engine in whatever back-end ecosystem you'd like:
ASP.NET, Thymeleaf, Handlebars, you name it. The choice doesn't matter as long as your output is HTML and
that it looks something like:

```html
<x-counter>
    <!-- In the future, you may need to use `shadowrootmode` instead -->
    <template shadowroot="open">
        <!-- The content _here_ will be rendered to the page w/o JavaScript -->
        <h1>Count: 0</h1>
        <button type="button">Increment</button>
    </template>
</x-counter>
```

The inner content will be what the user sees before any JS has been loaded. Then, load in a JS file
that creates the custom element, registers it, and sets up any interactive logic (i.e. event handlers)
you'd need:

```js
class Counter extends HTMLElement {
  constructor() {
    super(); // you must call this first
    // get the initial state from the attributes passed to x-counter
    let start = this.getAttribute("start");
    this.count = start ? Number.parseInt(start) : 0;
    if (this.shadowRoot) {
        // if we have a shadow root already, just attach the event handlers
        let button = this.shadowRoot.querySelector("button");
        button.addEventListener("click", () => this.increment());
    } else {
        // otherwise, we need to create a shadow root and insert the DOM nodes ourselves
        this.attachShadow({ mode: "open" });
        let templateId = this.getAttribute("templateid");
        let template = document.getElementById(templateId).content;
        let rootEl = template.cloneNode(true);
        let button = rootEl.querySelector("button");
        button.addEventListener("click", () => this.increment());
        this.shadowRoot.appendChild(rootEl);
    }
    // in the server-side rendering case, this shouldn't result in a
    // visible change. however, if this is client-side rendered, this
    // will update the visible state to reflect the internal state
    this.render();
  }

  increment() {
    let delta = this.getAttribute("delta");
    this.count += delta ? +delta : 1;
    this.render();
  }

  render() {
    this.shadowRoot.querySelector("h1").textContent = `Count: ${this.count}`;
  }
}
customElements.define("x-counter", Counter);
```

If you have JS enabled, you'll see the counter and be able to interact with it. If you don't, you'll
still see the elements but without the event handlers attached. This approach meets all of the requirements I laid out and even the optional one too!

The code above is _super_ bare bones and only meant to serve as an example of how you can
use Web Components in server-side rendering. I did, however, build a more complicated example
that is closer to the kinds of things you might see in a real app. It's nothing too fancy, just an
Express server that renders HTML and serves static JS files.

TODO: FINISH THE EXAMPLE AND LINK THE CODE SANDBOX!

# The Gotchas

I did say "in theory" earlier.

The Declarative Shadow DOM feature is still experimental and only available in
the latest versions of Chrome. It's starting to get there in [other browsers](https://webkit.org/blog/13851/declarative-shadow-dom/), but it's still very much bleeding edge. There are ways you can
progressively enhance it by falling back to rendering with JS if the Declarative Shadow DOM feature
isn't available. The `templateid` property is how I got around that so I could use a unique `<template>`
tag for each instance.

Additionally, there's quite a bit of boilerplate and up-front knowledge required to use them effectively.
I'd imagine that it would be difficult to get a team of people to learn and use them. There are tools
built on top of WC, but I didn't get the chance to try them out and see if they meet the needs I outlined
before. Doing a little bit of reading on [Lit](https://lit.dev/) seems to solve some of the usability
issues with WC, but the server-rendering story is still outstanding.

# Conclusion (for now)

I love using built-in tools instead of third-party tools whenever I can, especially when they're usable
from any back-end ecosystem. I think the APIs can be nicer for composability and re-use than if you
weren't using them. I'll write a couple 

[^1]: Unless you want to add another service into your stack that is written in your preferred backend language, which I don't in this case.
