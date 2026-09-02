# BitWise – installerbar PWA på GitHub Pages

## Filer
```
index.html                  appen (én fil)
bitwise-kalkulator.html     lages automatisk av workflowen (kopi av index.html)
manifest.json               PWA-manifest (navn, farger, ikoner)
sw.js                       service worker – offline + automatisk oppdatering
icons/                      ikonsett (any + maskable, Apple, favicon)
.github/workflows/deploy.yml  publiserer til GitHub Pages ved hver push
.nojekyll                   hindrer at GitHub Pages hopper over filer/mapper
```

## Førstegangsoppsett (én gang)
1. Opprett et repo (f.eks. `bitwise`) og legg alle filene inn – **inkludert mappen `.github/workflows/`**.
2. Gå til **Settings → Pages → Build and deployment → Source** og velg **GitHub Actions**.
3. Push til `main`. Etter ca. ett minutt ligger appen på
   `https://<brukernavn>.github.io/bitwise/`.
4. Åpne adressen i Chrome eller Samsung Internet på telefonen og trykk
   installasjonsknappen i toppraden (eller ⋮ → *Installer app*).

## Slik fungerer automatisk oppdatering
- Ved hver push erstatter workflowen `__BUILD__` i `sw.js` og `index.html` med
  commit-hashen. Du trenger aldri å endre versjonsnummer manuelt.
- En ny `sw.js` = ny cache. Neste gang appen åpnes (eller kommer i forgrunnen)
  oppdages den nye versjonen, og en linje nederst sier
  *«A new version of BitWise is ready – Update»*. Ett trykk laster inn den nye.
- Gamle cacher slettes automatisk. Appen fungerer fortsatt helt offline.
- Build-id-en vises nederst i guiden (?), så du kan se hvilken versjon som kjører.

## Vanlige feil
- **Ingen installasjonsknapp:** Pages må serveres over `https` (GitHub gjør det
  automatisk), og manifest/ikoner må ligge i samme mappe som `index.html`.
- **Ser ikke endringer:** vent til workflowen er grønn under *Actions*, lukk appen
  helt og åpne igjen – oppdateringslinjen kommer da.
- **Endret repo-navn:** manifestet bruker relative stier (`./`), så det virker
  uansett navn; ingenting må endres.
