# AnimeVerse

A free, responsive anime discovery website inspired by modern legal streaming platforms.

## Features

- Live anime discovery through AniList's public GraphQL API
- Trending, seasonal, and current-series sections
- Search, genre, format, and year filters
- Regional catalog notice
- Official Crunchyroll, Netflix, Hulu, and Disney+/Prime search links
- Persistent watchlist with `localStorage`
- Anime detail views with synopsis, episodes, trailer, cast, and voice actors
- Dark and light themes
- Fully responsive desktop and mobile layouts

## Why this is not piracy

This project does **not** host, embed, proxy, or distribute copyrighted streams or episodes. It sends users to official provider search pages so they can verify exact availability in their region.

## API

No API key is required for the AniList integration. Live data is requested from:

- `https://graphql.anilist.co`

Browsers query AniList directly. If AniList rate limits public traffic, add a backend or caching layer.

## Run locally

```bash
python3 -m http.server 8080
```

Visit `http://localhost:8080`.

## GitHub Pages

Repository settings → Pages → Deploy from branch → `main` → `/ (root)`.
