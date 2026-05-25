# Refactor: Add CSP Headers

**Date:** 2026-05-25
**Status:** Complete

## Motivation
`index.html` loaded resources from 7+ external domains (OSRM, Photon, Open-Meteo, EmailJS, Supabase, Leaflet tiles, map CDN) with no Content-Security-Policy. Broad XSS surface — any compromised CDN or dep could exfiltrate auth tokens.

## Scope
- `frontend/index.html` — add CSP `<meta>` tag

## Before
No CSP policy. Browser allowed any script, style, image, or connection origin.

## After
CSP meta tag restricting to:
- `default-src 'self'`
- `script-src 'self' 'unsafe-inline' 'unsafe-eval'` (Vite HMR + Tailwind JIT requirements)
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
- `font-src 'self' https://fonts.gstatic.com data:`
- `img-src 'self' data: https://*.tile.openstreetmap.org`
- `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://router.project-osrm.org https://photon.komoot.io https://api.open-meteo.com https://api.emailjs.com`
- `frame-src 'none'; object-src 'none'`

## Migration Plan
1. Audit all external domains loaded by the app
2. Add CSP `<meta>` tag to `<head>` in `index.html`
3. Test navigation, map tiles, geocoding, routes, weather, auth

## Regression Risks
- Overly restrictive CSP breaks map tile loading, auth redirects, or geocoding → all origins explicitly allowed
- Vite dev mode needs `unsafe-eval` and `unsafe-inline` → acceptable for dev; production build should minimize need

## Verification
- Map tiles render correctly (OpenStreetMap)
- Geocoding works (Photon)
- Routing works (OSRM)
- Auth flow works (Supabase)
- Weather works (Open-Meteo)
- All 36 frontend tests pass
