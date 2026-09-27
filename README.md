# BitWise — programmererkalkulator (PWA + Android-app)

Kalkulator for utviklere: HEX/DEC/OCT/BIN, bitoperasjoner, ordstørrelser
8–128 bit, bit-inspektør, bytes og IEEE 754-flyttall. Kjører som installerbar
nettapp (PWA) på GitHub Pages og som ekte Android-app (APK/AAB) via
Trusted Web Activity (TWA). Norsk og engelsk, lyst og mørkt tema, fungerer uten nett.

## Struktur

```
public/                     alt som publiseres
  index.html                markup (landemerker, dialoger, i18n-attributter)
  style.css                 monokromt designsystem: én aksentfarge, kun på «=»
  js/core.js                ren regnelogikk og tastetilstand (BigInt, uten DOM)
  js/i18n.js                tekster (nb/en) og tallformat per språk
  js/app.js                 brukergrensesnitt og hendelser
  sw.js                     service worker (offline + oppdateringer)
  manifest.json, icons/, fonts/ (IBM Plex, SIL OFL)
test/core.test.js           enhetstester for regnelogikken
test/e2e/app.e2e.js         Playwright-tester i Chromium + axe (WCAG AA)
twa/twa-manifest.json       Android-appens konfigurasjon (pakkenavn, farger, URL)
tools/twa/generate.mjs      lager Android-prosjektet med @bubblewrap/core
tools/twa/sign.sh           signerer APK/AAB og lager assetlinks.json
.github/workflows/          ci.yml · deploy.yml (Pages) · android.yml (APK)
```

## Utvikling

```bash
npm ci
npm run serve        # http://localhost:8080
npm run lint         # ESLint
npm test             # enhetstester
npm run test:e2e     # nettlesertester + tilgjengelighet
```

## Nettappen (GitHub Pages)

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
   ⚠️ Står kilden på «Deploy from a branch», publiserer GitHub også README-en
   over appen ved hver push. Workflowens `guard`-jobb oppdager det og legger
   appen tilbake automatisk (og advarer i kjøringen), men riktig innstilling
   fjerner problemet helt.
2. Push til `main`. Testene kjøres først, deretter publiseres `public/` til
   `https://kkas18.github.io/Bit_Wise/`.
3. Byggnummeret (commit-hash) stemples inn i `sw.js`, `index.html` og alle
   modul-URL-er (`?v=…`), så hver publisering gir en ny cache og en
   «Oppdater»-linje i appen — og en side kan aldri blande to versjoner.
4. Service workeren installerer en ny versjon bare når hele appen lastet ned
   og startsiden faktisk er BitWise. Ved en feilpublisering fortsetter
   installerte apper å kjøre siste fungerende versjon.

## Android-appen (TWA)

Workflowen **Android app (TWA)** bygger appen ved hver push til `main` og i pull
requests. APK-en ligger under *Actions → kjøringen → Artifacts*, og på `main`
publiseres den også som en **GitHub Release** (lett å laste ned fra telefonen).

### Engangsoppsett — signeringsnøkkel

Android krever at alle oppdateringer signeres med samme nøkkel. Lag den én gang
og ta godt vare på den (mister du den, kan appen ikke oppdateres):

```bash
keytool -genkeypair -keystore bitwise-release.jks -storetype PKCS12 \
  -alias bitwise -keyalg RSA -keysize 4096 -validity 10000 \
  -dname "CN=BitWise"
base64 -w0 bitwise-release.jks > bitwise-release.jks.b64
```

Legg inn fire hemmeligheter under **Settings → Secrets and variables → Actions**:

| Navn | Verdi |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | innholdet i `bitwise-release.jks.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | passordet du valgte |
| `ANDROID_KEY_ALIAS` | `bitwise` |
| `ANDROID_KEY_PASSWORD` | samme passord (PKCS12 bruker ett passord) |

Uten hemmelighetene signeres APK-en med en midlertidig nøkkel (filnavnet får
`-unofficial`): den kan installeres for testing, men ikke oppdateres senere.

### Engangsoppsett — Digital Asset Links (fjerner adressefeltet)

En TWA viser appen i fullskjerm bare når nettsiden bekrefter appens nøkkel.
Filen må ligge i **roten av domenet**:
`https://kkas18.github.io/.well-known/assetlinks.json`.

Siden appen ligger under `/Bit_Wise/`, må filen ligge i et eget repo som heter
**`kkas18.github.io`**:

1. Opprett repoet `kkas18.github.io` (offentlig) og slå på Pages for det.
2. Last ned `assetlinks.json` fra artefakten til Android-bygget og legg den i
   `.well-known/assetlinks.json` i det repoet.
3. Legg til en tom fil `.nojekyll` i roten (ellers hopper Jekyll over `.well-known`).
4. Publiserer du på Google Play med «Play App Signing», legger du også til
   fingeravtrykket fra Play Console (*Test and release → App integrity*) i samme fil.

Før dette er gjort, åpnes appen med en tynn adresselinje øverst. Alt annet fungerer.

### Installere APK-en på telefonen

1. Åpne siste Release (eller artefakten) på telefonen og last ned `BitWise-*.apk`.
2. Tillat «Installer ukjente apper» for nettleseren når Android spør.
3. Åpne filen og trykk **Installer**.

### Google Play

Last opp `BitWise-*.aab` fra samme Release i Play Console. `versionCode` øker
automatisk med byggnummeret.

## Tilgjengelighet og kvalitet

- Kontrast i begge temaer er minst 4,5 : 1 (WCAG AA), og axe kjøres i CI.
- Zoom er tillatt, og alle kontroller har etiketter på norsk og engelsk.
- Android-tilbakeknappen lukker ark og inspektør før den forlater appen.
- `prefers-reduced-motion` respekteres.
