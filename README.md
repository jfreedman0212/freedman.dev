# Personal Website

This is the repository for my personal website. It's built with
[Astro](https://astro.build) and some home-made CSS.

## Running Locally

You need to have Node and NPM installed locally, ideally Node 19 and NPM 8/9.
Once you have those installed, run this command from the root directory: `npm install`.
This will install all the dependencies needed to run it locally.
  
Then, to run it locally while you develop, run: `npm run dev`.

Once you're ready to build, run `npm run build` and the static HTML and CSS
will be generated to the `dist` folder. Package that up and put it in the proper
folder on your web server to deploy.

## Content Collections

There are two content collections right now:

- `posts`: contains blog posts, will automatically be added in and sorted
- `pages`: contains assorted pages for the website, needs to be added manually when a new one is created

