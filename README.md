# Ava Thorington — Marketing Portfolio

Static site (HTML/CSS/JS, no build step). Coastal theme: white and blue, with animated ocean waves on the home page.

## Structure

```
index.html                 Home: ocean hero, about, highlights, project grid, contact
work/*.html                Six case study pages
assets/css/styles.css      All styles (colors and fonts are variables at the top)
assets/js/main.js          Nav, scroll reveals, tagline rotator, wave glints, bubbles
assets/img/                Images pulled from the original Wix site (resized)
public/assets/ava-thorington-resume.pdf
```

## Run locally

```
npm install      # first time only
npm run dev      # dev server with live reload, opens in your browser
```

## Build & deploy

```
npm run build    # outputs the finished site to dist/
npm run preview  # preview the built site
```

Deploy the `dist/` folder: drag it into Netlify Drop (app.netlify.com/drop), or import the repo into Vercel or Netlify with build command `npm run build` and output directory `dist`. To keep the custom domain, point avathorington.com's DNS at the new host.

The résumé PDF lives in `public/assets/` so it is copied into the build unchanged.
