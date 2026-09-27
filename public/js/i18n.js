/* BitWise strings — Norwegian Bokmål (nb) and English (en).
   Language: saved preference → device language (nb/nn/no → nb) → English. */

const nb = {
  "a.install": "Installer BitWise",
  "a.settings": "Innstillinger",
  "a.help": "Veiledning",
  "a.close": "Lukk",
  "a.base": "Tallsystem",
  "a.wordSize": "Ordstørrelse",
  "a.inspector": "Bit-inspektør",
  "a.expand": "Vis inspektør",
  "a.collapse": "Skjul inspektør",
  "a.bit": "Bit {i}, verdi {v}",
  "a.swap": "Bytt operander",

  "k.AC": "Nullstill alt", "k.BS": "Slett siste", "k.DIV": "Del", "k.MUL": "Gange",
  "k.SUB": "Minus", "k.ADD": "Pluss", "k.EQ": "Er lik", "k.NEG": "Negér",

  "word": "{bits}-bit · {sign}",
  "unsigned": "usignert",
  "signed": "Signert",
  "signed.lc": "signert",
  "view.bits": "Bits",
  "view.bytes": "Bytes",
  "view.float": "Flyttall",
  "field": "Felt",
  "copy": "Kopier",

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

  "err.div0": "Kan ikke dele på 0",

  "toast.copied": "Kopiert {v}",
  "toast.restored": "Gjenopprettet",
  "toast.nothing": "Ingenting å gjenopprette",
  "toast.offline": "Klar til bruk uten nett",
  "toast.installing": "Installerer BitWise …",
  "toast.installed": "BitWise er installert",
  "update.text": "En ny versjon av BitWise er klar",
  "update.action": "Oppdater",

  "ins.chmod": "chmod {v}",
  "ins.color": "{v}",
  "ins.ipv4": "IPv4 {v}",
  "ins.ascii": "ASCII «{v}»",
  "ins.unix": "Unix-tid {v}",
  "ins.max": "maks {v}",
  "ins.pow2": "2^{v}",
  "ins.lowmask": "2^{v} − 1",

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

  "help.title": "Slik bruker du BitWise",
  "help.sections": [
    ["Tallsystemer", [
      "HEX, DEC, OCT og BIN er fire skrivemåter for samme tall. Trykk på en fane, sveip på displayet eller trykk på en rad under tallet for å bytte.",
      "Tastaturet viser bare sifrene som finnes i valgt tallsystem.",
      "Trykk på det store tallet for å kopiere det med prefiks (0xFF, 0o377, 0b1111). Hold inne en rad for å kopiere i det tallsystemet.",
    ]],
    ["Ordstørrelse og fortegn", [
      "Velg 8–128 bit. Verdier som ikke får plass, blir kuttet til ordstørrelsen.",
      "Signert bruker toerkomplement: den høyeste biten er fortegnet.",
    ]],
    ["Inspektør", [
      "Åpne inspektøren (⌃) for å se og endre enkeltbits, bytes (BE/LE) og IEEE 754-flyttall.",
      "Trykk på en rute for å snu biten, dra over flere for å male dem, hold inne for å se vekten.",
      "Felt: trykk på to bits for å lese verdien mellom dem, som et maskinvareregister.",
    ]],
    ["Tips", [
      "Hold inne en funksjonstast (AND, ROL, MOD …) for en forklaring med eksempel.",
      "Trykk på linjen over tallet (for eksempel «8 −») for å bytte om operandene.",
      "Hold inne AC for å angre en nullstilling. Trykk = igjen for å gjenta siste operasjon.",
      "Tastatur: sifre, A–F, + − * / %, & | ~, Enter og Backspace.",
    ]],
  ],

  hints: {
    AND: ["AND", "1 der begge tallene har 1. Klassisk maske: behold noen bits, nullstill resten.", "F3 AND 0F = 3"],
    OR: ["OR", "1 der minst ett av tallene har 1. Brukes for å sette flagg.", "F0 OR 0F = FF"],
    XOR: ["XOR", "1 der bitene er ulike. XOR med en maske snur akkurat de bitene.", "FF XOR 0F = F0"],
    NOT: ["NOT", "Snur alle bitene i ordet."],
    SHL: ["<< Skift venstre", "Flytter alle bits n plasser til venstre; hvert steg dobler tallet.", "1 << 4 = 10"],
    SHR: [">> Skift høyre", "Flytter bits til høyre; hvert steg halverer. Signert beholder fortegnsbiten.", "F0 >> 4 = F"],
    ROL: ["ROL — roter venstre", "Alle bits ett steg til venstre; øverste bit kommer inn nederst."],
    ROR: ["ROR — roter høyre", "Alle bits ett steg til høyre; nederste bit går til toppen."],
    MOD: ["MOD", "Rest etter divisjon. X MOD 2 sjekker partall/oddetall.", "A MOD 3 = 1"],
    NEG: ["± Negér", "Toerkomplement-negasjon. Usignert: verdien «wrapper»."],
    CE: ["CE — slett oppføring", "Sletter bare tallet du skriver; operasjonen beholdes."],
    SWP: ["⇄ Bytt", "Bytter de to operandene midt i en utregning.", "3 − 8 ⇄ = 5"],
    "00": ["00", "Skriver to nuller med ett trykk."],
  },
  hintTry: "Prøv",
};

const en = {
  "a.install": "Install BitWise",
  "a.settings": "Settings",
  "a.help": "Guide",
  "a.close": "Close",
  "a.base": "Number base",
  "a.wordSize": "Word size",
  "a.inspector": "Bit inspector",
  "a.expand": "Show inspector",
  "a.collapse": "Hide inspector",
  "a.bit": "Bit {i}, value {v}",
  "a.swap": "Swap operands",

  "k.AC": "All clear", "k.BS": "Backspace", "k.DIV": "Divide", "k.MUL": "Multiply",
  "k.SUB": "Minus", "k.ADD": "Plus", "k.EQ": "Equals", "k.NEG": "Negate",

  "word": "{bits}-bit · {sign}",
  "unsigned": "unsigned",
  "signed": "Signed",
  "signed.lc": "signed",
  "view.bits": "Bits",
  "view.bytes": "Bytes",
  "view.float": "Float",
  "field": "Field",
  "copy": "Copy",

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

  "err.div0": "Cannot divide by 0",

  "toast.copied": "Copied {v}",
  "toast.restored": "Restored",
  "toast.nothing": "Nothing to restore",
  "toast.offline": "Ready to use offline",
  "toast.installing": "Installing BitWise …",
  "toast.installed": "BitWise installed",
  "update.text": "A new version of BitWise is ready",
  "update.action": "Update",

  "ins.chmod": "chmod {v}",
  "ins.color": "{v}",
  "ins.ipv4": "IPv4 {v}",
  "ins.ascii": "ASCII '{v}'",
  "ins.unix": "Unix time {v}",
  "ins.max": "max {v}",
  "ins.pow2": "2^{v}",
  "ins.lowmask": "2^{v} − 1",

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

  "help.title": "How to use BitWise",
  "help.sections": [
    ["Number bases", [
      "HEX, DEC, OCT and BIN are four ways to write the same number. Tap a tab, swipe the display or tap a row under the number to switch.",
      "The keypad only shows digits that exist in the current base.",
      "Tap the big number to copy it with a prefix (0xFF, 0o377, 0b1111). Long-press a row to copy it in that base.",
    ]],
    ["Word size and sign", [
      "Pick 8–128 bits. Values that don't fit are truncated to the word size.",
      "Signed uses two's complement: the top bit is the sign.",
    ]],
    ["Inspector", [
      "Open the inspector (⌃) to view and flip single bits, bytes (BE/LE) and IEEE 754 floats.",
      "Tap a square to flip a bit, drag across several to paint them, long-press to see its weight.",
      "Field: tap two bits to read the value between them, like a hardware register.",
    ]],
    ["Tips", [
      "Long-press a function key (AND, ROL, MOD …) for an explanation with an example.",
      "Tap the line above the number (e.g. “8 −”) to swap the operands.",
      "Long-press AC to undo a clear. Press = again to repeat the last operation.",
      "Keyboard: digits, A–F, + − * / %, & | ~, Enter and Backspace.",
    ]],
  ],

  hints: {
    AND: ["AND", "1 where both numbers have 1. The classic mask: keep some bits, zero the rest.", "F3 AND 0F = 3"],
    OR: ["OR", "1 where either number has 1. Used to set flags.", "F0 OR 0F = FF"],
    XOR: ["XOR", "1 where the bits differ. XOR with a mask flips exactly those bits.", "FF XOR 0F = F0"],
    NOT: ["NOT", "Inverts every bit in the word."],
    SHL: ["<< Shift left", "Moves all bits n places left; each step doubles the number.", "1 << 4 = 10"],
    SHR: [">> Shift right", "Moves bits right; each step halves. Signed keeps the sign bit.", "F0 >> 4 = F"],
    ROL: ["ROL — rotate left", "All bits one step left; the top bit re-enters at the bottom."],
    ROR: ["ROR — rotate right", "All bits one step right; the lowest bit wraps to the top."],
    MOD: ["MOD", "Remainder after division. X MOD 2 tests odd/even.", "A MOD 3 = 1"],
    NEG: ["± Negate", "Two's-complement negate. Unsigned: the value wraps."],
    CE: ["CE — clear entry", "Clears only the number you are typing; the operation survives."],
    SWP: ["⇄ Swap", "Swaps the two operands mid-calculation.", "3 − 8 ⇄ = 5"],
    "00": ["00", "Types two zeros with one tap."],
  },
  hintTry: "Try",
};

export const DICT = { nb, en };

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

let current = "en";
export const setLang = (l) => { current = DICT[l] ? l : "en"; };
export const lang = () => current;

export function t(key, vars) {
  let s = DICT[current][key];
  if (s === undefined) s = DICT.en[key];
  if (s === undefined) return key;
  if (vars && typeof s === "string") s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
  return s;
}
export const hint = (k) => DICT[current].hints[k] || null;
