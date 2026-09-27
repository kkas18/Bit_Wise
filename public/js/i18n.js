/* BitWise strings — Norwegian Bokmål (nb) and English (en).
   Language: saved preference → device language (nb/nn/no → nb) → English. */

const nb = {
  "app.std": "Standard",
  "app.prg": "Programmerer",
  "app.switch": "Kalkulator",

  "a.install": "Installer BitWise",
  "a.settings": "Innstillinger",
  "a.help": "Veiledning",
  "a.close": "Lukk",
  "a.clearHist": "Tøm historikk",
  "a.base": "Tallsystem",
  "a.wordSize": "Ordstørrelse",
  "a.inspector": "Bit-inspektør",
  "a.expand": "Vis inspektør",
  "a.collapse": "Skjul inspektør",
  "a.sciOpen": "Vis vitenskapelige funksjoner",
  "a.sciClose": "Skjul vitenskapelige funksjoner",
  "a.result": "Resultat",
  "a.expression": "Uttrykk",
  "a.bit": "Bit {i}, verdi {v}",
  "a.history": "Historikk",
  "a.swap": "Bytt operander",

  "k.AC": "Nullstill alt", "k.C": "Slett", "k.BS": "Slett siste", "k.DIV": "Del", "k.MUL": "Gange",
  "k.SUB": "Minus", "k.ADD": "Pluss", "k.EQ": "Er lik", "k.NEG": "Bytt fortegn", "k.DOT": "Desimaltegn",
  "k.PCT": "Prosent", "k.PAREN": "Parentes",

  "unsigned": "Usignert",
  "signed": "Signert",
  "view.bits": "Bits",
  "view.bytes": "Bytes",
  "view.float": "Flyttall",
  "field": "Felt",
  "copy": "Kopier",
  "sci": "Vitenskapelig",

  "stat.set": "Satt",
  "stat.msb": "Høyeste",
  "stat.lz": "Ledende 0",
  "field.pickFirst": "Trykk på første bit i feltet …",
  "field.pickEnd": "trykk på siste bit …",
  "float.needs32": "Flyttallsvisning krever minst 32 bit — velg 32, 64 eller 128.",
  "float.sign": "Fortegn",
  "float.exp": "Eksponent",
  "float.mant": "Mantisse",
  "bytes.byte": "Byte",
  "bytes.bin": "Binært",

  "hist.empty": "Utregningene dine vises her",
  "hist.emptySub": "Trykk på en linje for å bruke svaret igjen",
  "hist.clearConfirm": "Trykk igjen for å tømme",
  "hist.cleared": "Historikken er tømt",
  "hist.removed": "Linjen er fjernet",

  "err.div0": "Kan ikke dele på 0",
  "err.domain": "Ugyldig inndata",
  "err.overflow": "Tallet er for stort",
  "err.syntax": "Uttrykket er ufullstendig",

  "toast.copied": "Kopiert {v}",
  "toast.restored": "Gjenopprettet",
  "toast.nothing": "Ingenting å gjenopprette",
  "toast.offline": "Klar til bruk uten nett",
  "toast.installing": "Installerer BitWise …",
  "toast.installed": "BitWise er installert",
  "toast.memClear": "Minnet er tømt",
  "update.text": "En ny versjon av BitWise er klar",
  "update.action": "Oppdater",

  "ins.chmod": "chmod → {v}",
  "ins.color": "{v} som farge",
  "ins.ipv4": "IPv4 → {v}",
  "ins.ascii": "ASCII «{v}»",
  "ins.unix": "Unix-tid → {v}",
  "ins.max": "maks {v}",
  "ins.pow2": "2^{v} · kun bit {v} satt",
  "ins.lowmask": "2^{v}−1 · laveste {v} bit satt",

  "settings.title": "Innstillinger",
  "settings.theme": "Tema",
  "settings.theme.auto": "System",
  "settings.theme.light": "Lyst",
  "settings.theme.dark": "Mørkt",
  "settings.lang": "Språk",
  "settings.lang.auto": "System",
  "settings.haptics": "Vibrasjon ved tastetrykk",
  "settings.guide": "Åpne veiledningen",
  "settings.about": "BitWise {ver} · bygg {build} · ingen sporing, ingen nettverk — tallene dine blir på telefonen.",

  "install.title": "Installer BitWise",
  "install.local": "Installasjon krever at appen åpnes fra en nettside (https), ikke direkte fra en fil.",
  "install.ios": "Trykk på Del-knappen i Safari og velg «Legg til på Hjem-skjerm».",
  "install.other": "Åpne nettlesermenyen (⋮) og velg «Installer app». Mangler valget, er BitWise trolig allerede installert.",

  "pow.title": "Potens",

  "help.title": "Slik bruker du BitWise",
  "help.sections": [
    ["Standard", [
      "Skriv hele regnestykket — BitWise følger vanlig regnerekkefølge, så 2 + 3 × 4 blir 14.",
      "Det foreløpige svaret vises dempet under uttrykket mens du skriver. Trykk = for å fullføre.",
      "Prosent er smart: 200 + 10 % gir 220 (10 % av 200 legges til).",
      "Trykk ⌃ over tastaturet for vitenskapelige funksjoner: sin, cos, tan, ln, log, √, xʸ, x!, π, e, parenteser og minne. 2nd gir inverse funksjoner; DEG/RAD styrer vinkelenheten.",
      "Historikken husker de siste 40 utregningene. Trykk på en linje for å bruke svaret, hold inne for å slette den.",
    ]],
    ["Programmerer", [
      "HEX, DEC, OCT og BIN er fire skrivemåter for samme tall. Sveip på displayet eller trykk på en rad for å bytte.",
      "Tastaturet viser bare sifrene som finnes i valgt tallsystem.",
      "Velg ordstørrelse (8–128 bit) og Signert for toerkomplement.",
      "Åpne inspektøren (⌃) for å se og endre enkeltbits, bytes (BE/LE) og IEEE 754-flyttall. Dra over rutene for å male flere bits.",
      "Felt lar deg trykke på to bits og lese ut verdien mellom dem, som et maskinvareregister.",
      "Smarte tips gjenkjenner farger, IPv4-adresser, chmod-rettigheter, ASCII og Unix-tid.",
    ]],
    ["Tips", [
      "Hold inne en funksjonstast for å se hva den gjør — med eksempel.",
      "Trykk på det store tallet for å kopiere det (i HEX/OCT/BIN med prefiks som 0xFF).",
      "Hold inne AC for å angre en nullstilling.",
      "Tastatur støttes: sifre, + − * / ^ ( ) %, Enter og Backspace.",
    ]],
    ["Installasjon og oppdatering", [
      "BitWise fungerer uten nett etter første åpning.",
      "Nye versjoner lastes ned automatisk — trykk Oppdater når linjen vises nederst.",
    ]],
  ],

  hints: {
    AND: ["AND", "1 der begge tallene har 1. Klassisk maske: behold noen bits, nullstill resten.", "F3 AND 0F = 3"],
    OR: ["OR", "1 der minst ett av tallene har 1. Brukes for å sette flagg.", "F0 OR 0F = FF"],
    XOR: ["XOR", "1 der bitene er ulike. XOR med en maske snur akkurat de bitene.", "FF XOR 0F = F0"],
    NOT: ["NOT", "Snur alle bitene i ordet."],
    SHL: ["<< Skift venstre", "Flytter alle bits n plasser til venstre; hvert steg dobler tallet.", "1 << 4 = 16"],
    SHR: [">> Skift høyre", "Flytter bits til høyre; hvert steg halverer. Signert beholder fortegnsbiten.", "F0 >> 4 = F"],
    ROL: ["ROL — roter venstre", "Alle bits ett steg til venstre; øverste bit kommer inn nederst."],
    ROR: ["ROR — roter høyre", "Alle bits ett steg til høyre; nederste bit går til toppen."],
    MOD: ["MOD", "Rest etter divisjon. X MOD 2 sjekker partall/oddetall.", "A MOD 3 = 1"],
    NEG: ["± Negér", "Toerkomplement-negasjon. Usignert: verdien «wrapper»."],
    CE: ["CE — slett oppføring", "Sletter bare tallet du skriver; operasjonen beholdes."],
    SWP: ["⇄ Bytt", "Bytter de to operandene midt i en utregning.", "3 − 8 ⇄ = 5"],
    "00": ["00", "Skriver to nuller med ett trykk."],
    PCT: ["% Prosent", "Etter + eller − betyr det prosent av tallet foran. Ellers deler det på 100.", "200 + 10 % = 220"],
    PAREN: ["( ) Parentes", "Åpner en parentes, eller lukker den når det gir mening.", "(2 + 3) × 4 = 20"],
    INV: ["1/x", "Den inverse verdien — 1 delt på tallet.", "4 → 0,25"],
    SQ: ["x²", "Kvadrerer tallet foran. Med 2nd: x³.", "3² = 9"],
    POW: ["xʸ", "Opphøyd i. Skriv eksponenten etterpå.", "2 ^ 10 = 1024"],
    SQRT: ["√", "Kvadratrot. Med 2nd: kubikkrot.", "√(16) = 4"],
    SIN: ["sin", "Sinus. DEG/RAD bestemmer vinkelenheten. 2nd gir sin⁻¹."],
    COS: ["cos", "Cosinus. 2nd gir cos⁻¹."],
    TAN: ["tan", "Tangens. 2nd gir tan⁻¹."],
    LN: ["ln", "Naturlig logaritme. 2nd gir eˣ."],
    LOG: ["log", "Tierlogaritme. 2nd gir 10ˣ.", "log(1000) = 3"],
    FACT: ["x!", "Fakultet: 1 × 2 × … × x. Heltall 0–170.", "5! = 120"],
    PI: ["π", "Setter inn π = 3,14159…"],
    EULER: ["e", "Setter inn Eulers tall e = 2,71828…"],
    EE: ["EE", "Vitenskapelig notasjon: 3 EE 5 = 3 × 10⁵.", "1,5 EE 3 = 1 500"],
    SECOND: ["2nd", "Bytter til inverse funksjoner: sin⁻¹, cos⁻¹, tan⁻¹, eˣ, 10ˣ, ∛, x³ og MC."],
    DEG: ["DEG / RAD", "Grader eller radianer for trigonometriske funksjoner."],
    MC: ["MC", "Tømmer minnet."],
    MR: ["MR", "Henter tallet i minnet. Med 2nd: MC."],
    MPLUS: ["M+", "Legger svaret til i minnet."],
    MMINUS: ["M−", "Trekker svaret fra minnet."],
  },
  hintTry: "Prøv",
};

const en = {
  "app.std": "Standard",
  "app.prg": "Programmer",
  "app.switch": "Calculator",

  "a.install": "Install BitWise",
  "a.settings": "Settings",
  "a.help": "Guide",
  "a.close": "Close",
  "a.clearHist": "Clear history",
  "a.base": "Number base",
  "a.wordSize": "Word size",
  "a.inspector": "Bit inspector",
  "a.expand": "Show inspector",
  "a.collapse": "Hide inspector",
  "a.sciOpen": "Show scientific functions",
  "a.sciClose": "Hide scientific functions",
  "a.result": "Result",
  "a.expression": "Expression",
  "a.bit": "Bit {i}, value {v}",
  "a.history": "History",
  "a.swap": "Swap operands",

  "k.AC": "All clear", "k.C": "Clear", "k.BS": "Backspace", "k.DIV": "Divide", "k.MUL": "Multiply",
  "k.SUB": "Minus", "k.ADD": "Plus", "k.EQ": "Equals", "k.NEG": "Change sign", "k.DOT": "Decimal point",
  "k.PCT": "Percent", "k.PAREN": "Parenthesis",

  "unsigned": "Unsigned",
  "signed": "Signed",
  "view.bits": "Bits",
  "view.bytes": "Bytes",
  "view.float": "Float",
  "field": "Field",
  "copy": "Copy",
  "sci": "Scientific",

  "stat.set": "Set",
  "stat.msb": "MSB",
  "stat.lz": "Leading 0",
  "field.pickFirst": "Tap the first bit of the field …",
  "field.pickEnd": "tap the end bit …",
  "float.needs32": "Float view needs a 32-bit word or wider — pick 32, 64 or 128.",
  "float.sign": "Sign",
  "float.exp": "Exponent",
  "float.mant": "Mantissa",
  "bytes.byte": "Byte",
  "bytes.bin": "Binary",

  "hist.empty": "Your calculations appear here",
  "hist.emptySub": "Tap a line to reuse its answer",
  "hist.clearConfirm": "Tap again to clear",
  "hist.cleared": "History cleared",
  "hist.removed": "Entry removed",

  "err.div0": "Cannot divide by 0",
  "err.domain": "Invalid input",
  "err.overflow": "Number too large",
  "err.syntax": "Incomplete expression",

  "toast.copied": "Copied {v}",
  "toast.restored": "Restored",
  "toast.nothing": "Nothing to restore",
  "toast.offline": "Ready to use offline",
  "toast.installing": "Installing BitWise …",
  "toast.installed": "BitWise installed",
  "toast.memClear": "Memory cleared",
  "update.text": "A new version of BitWise is ready",
  "update.action": "Update",

  "ins.chmod": "chmod → {v}",
  "ins.color": "{v} as colour",
  "ins.ipv4": "IPv4 → {v}",
  "ins.ascii": "ASCII '{v}'",
  "ins.unix": "Unix time → {v}",
  "ins.max": "max {v}",
  "ins.pow2": "2^{v} · only bit {v} set",
  "ins.lowmask": "2^{v}−1 · low {v} bits set",

  "settings.title": "Settings",
  "settings.theme": "Theme",
  "settings.theme.auto": "System",
  "settings.theme.light": "Light",
  "settings.theme.dark": "Dark",
  "settings.lang": "Language",
  "settings.lang.auto": "System",
  "settings.haptics": "Vibrate on key press",
  "settings.guide": "Open the guide",
  "settings.about": "BitWise {ver} · build {build} · no tracking, no network — your numbers stay on your phone.",

  "install.title": "Install BitWise",
  "install.local": "Installing needs the app served from a website (https), not opened straight from a file.",
  "install.ios": "In Safari, tap Share and choose “Add to Home Screen”.",
  "install.other": "Open the browser menu (⋮) and choose “Install app”. If it is missing, BitWise is probably installed already.",

  "pow.title": "Power",

  "help.title": "How to use BitWise",
  "help.sections": [
    ["Standard", [
      "Type the whole calculation — BitWise follows the usual order of operations, so 2 + 3 × 4 is 14.",
      "A live preview of the answer appears under the expression. Press = to finish.",
      "Percent is smart: 200 + 10% gives 220 (10% of 200 is added).",
      "Tap ⌃ above the keypad for scientific functions: sin, cos, tan, ln, log, √, xʸ, x!, π, e, parentheses and memory. 2nd switches to inverse functions; DEG/RAD sets the angle unit.",
      "History keeps your last 40 calculations. Tap a line to reuse the answer, long-press to delete it.",
    ]],
    ["Programmer", [
      "HEX, DEC, OCT and BIN are four ways to write the same number. Swipe the display or tap a row to switch.",
      "The keypad only shows digits that exist in the current base.",
      "Pick a word size (8–128 bits) and Signed for two's complement.",
      "Open the inspector (⌃) to view and flip single bits, bytes (BE/LE) and IEEE 754 floats. Drag across the squares to paint several bits.",
      "Field lets you tap two bits and read the value between them, like a hardware register.",
      "Smart hints recognise colours, IPv4 addresses, chmod permissions, ASCII and Unix time.",
    ]],
    ["Tips", [
      "Long-press a function key to see what it does — with an example.",
      "Tap the big number to copy it (in HEX/OCT/BIN with a prefix such as 0xFF).",
      "Long-press AC to undo a clear.",
      "Keyboard works too: digits, + − * / ^ ( ) %, Enter and Backspace.",
    ]],
    ["Install and updates", [
      "BitWise works offline after the first visit.",
      "New versions download automatically — tap Update when the bar appears at the bottom.",
    ]],
  ],

  hints: {
    AND: ["AND", "1 where both numbers have 1. The classic mask: keep some bits, zero the rest.", "F3 AND 0F = 3"],
    OR: ["OR", "1 where either number has 1. Used to set flags.", "F0 OR 0F = FF"],
    XOR: ["XOR", "1 where the bits differ. XOR with a mask flips exactly those bits.", "FF XOR 0F = F0"],
    NOT: ["NOT", "Inverts every bit in the word."],
    SHL: ["<< Shift left", "Moves all bits n places left; each step doubles the number.", "1 << 4 = 16"],
    SHR: [">> Shift right", "Moves bits right; each step halves. Signed keeps the sign bit.", "F0 >> 4 = F"],
    ROL: ["ROL — rotate left", "All bits one step left; the top bit re-enters at the bottom."],
    ROR: ["ROR — rotate right", "All bits one step right; the lowest bit wraps to the top."],
    MOD: ["MOD", "Remainder after division. X MOD 2 tests odd/even.", "A MOD 3 = 1"],
    NEG: ["± Negate", "Two's-complement negate. Unsigned: the value wraps."],
    CE: ["CE — clear entry", "Clears only the number you are typing; the operation survives."],
    SWP: ["⇄ Swap", "Swaps the two operands mid-calculation.", "3 − 8 ⇄ = 5"],
    "00": ["00", "Types two zeros with one tap."],
    PCT: ["% Percent", "After + or − it means percent of the number before. Otherwise it divides by 100.", "200 + 10% = 220"],
    PAREN: ["( ) Parenthesis", "Opens a parenthesis, or closes one when that makes sense.", "(2 + 3) × 4 = 20"],
    INV: ["1/x", "The reciprocal — 1 divided by the number.", "4 → 0.25"],
    SQ: ["x²", "Squares the number before it. With 2nd: x³.", "3² = 9"],
    POW: ["xʸ", "Raise to a power. Type the exponent next.", "2 ^ 10 = 1024"],
    SQRT: ["√", "Square root. With 2nd: cube root.", "√(16) = 4"],
    SIN: ["sin", "Sine. DEG/RAD sets the angle unit. 2nd gives sin⁻¹."],
    COS: ["cos", "Cosine. 2nd gives cos⁻¹."],
    TAN: ["tan", "Tangent. 2nd gives tan⁻¹."],
    LN: ["ln", "Natural logarithm. 2nd gives eˣ."],
    LOG: ["log", "Base-10 logarithm. 2nd gives 10ˣ.", "log(1000) = 3"],
    FACT: ["x!", "Factorial: 1 × 2 × … × x. Whole numbers 0–170.", "5! = 120"],
    PI: ["π", "Inserts π = 3.14159…"],
    EULER: ["e", "Inserts Euler's number e = 2.71828…"],
    EE: ["EE", "Scientific notation: 3 EE 5 = 3 × 10⁵.", "1.5 EE 3 = 1,500"],
    SECOND: ["2nd", "Switches to inverse functions: sin⁻¹, cos⁻¹, tan⁻¹, eˣ, 10ˣ, ∛, x³ and MC."],
    DEG: ["DEG / RAD", "Degrees or radians for trigonometric functions."],
    MC: ["MC", "Clears the memory."],
    MR: ["MR", "Recalls the number in memory. With 2nd: MC."],
    MPLUS: ["M+", "Adds the answer to memory."],
    MMINUS: ["M−", "Subtracts the answer from memory."],
  },
  hintTry: "Try",
};

export const DICT = { nb, en };
export const LANGS = ["nb", "en"];

export function detectLang(pref) {
  if (pref === "nb" || pref === "en") return pref;
  const list = (typeof navigator !== "undefined" && (navigator.languages || [navigator.language])) || [];
  for (const l of list) {
    const p = String(l || "").toLowerCase().split("-")[0];
    if (p === "nb" || p === "nn" || p === "no") return "nb";
    if (p === "en") return "en";
  }
  return "en";
}

export const LOCALE = {
  nb: { decimal: ",", groupSep: " " },
  en: { decimal: ".", groupSep: "," },
};

let current = "en";
export const setLang = (l) => { current = DICT[l] ? l : "en"; };
export const lang = () => current;
export const loc = () => LOCALE[current];

export function t(key, vars) {
  let s = DICT[current][key];
  if (s === undefined) s = DICT.en[key];
  if (s === undefined) return key;
  if (vars && typeof s === "string") s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
  return s;
}
export const hint = (k) => DICT[current].hints[k] || null;
