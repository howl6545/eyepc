/**
 * Motore di estrazione delle specifiche tecniche.
 *
 * I negozi italiani espongono le schede prodotto in modo molto disomogeneo:
 * a volte c'e' una tabella `<dl>` pulita, molto piu' spesso le informazioni
 * utili stanno tutte stipate nel titolo ("Notebook Lenovo LOQ 15IRX9, Intel
 * Core i7-13650HX, 16GB DDR5, 512GB SSD, RTX 4060 8GB, 15.6 FHD 144Hz").
 *
 * Questo modulo prende un blocco di testo libero (titolo + descrizione +
 * eventuali coppie chiave/valore gia' strutturate) e ne ricava un oggetto
 * `specs` normalizzato, che e' cio' su cui la webapp costruisce i filtri.
 */

const DASH = /[‐-―−]/g;
const QUOTES = /[‘’“”″′]/g;

/** Porta il testo in una forma prevedibile per le regex. */
export function normalizeText(input) {
  if (!input) return '';
  return String(input)
    .replace(DASH, '-')
    .replace(QUOTES, '"')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "15,6" -> 15.6 ; "1.299,00" -> 1299 */
function toNumber(raw) {
  if (raw == null) return null;
  const cleaned = String(raw).trim().replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match;
  }
  return null;
}

/* ------------------------------------------------------------------ CPU -- */

const INTEL_CORE = /\b(?:intel\s+)?core\s*(?:\(tm\)\s*)?(i[3579])[\s-]*(\d{4,5}[A-Z]{0,3})?\b/i;
const INTEL_ULTRA = /\b(?:intel\s+)?core\s+ultra\s+([3579])\s*(\d{3}[A-Z]{0,2})?\b/i;
const INTEL_ENTRY = /\b(celeron|pentium(?:\s+(?:gold|silver))?|atom)\s*([A-Z]?\d{3,5}[A-Z]?)?\b/i;
const INTEL_N = /\bintel\s+(?:processor\s+)?(N\d{2,3})\b/i;
const AMD_RYZEN = /\b(?:amd\s+)?ryzen\s+(?:(ai)\s+)?([3579])\s*(\d{3,4}[A-Z0-9]{0,4})?\b/i;
const AMD_ENTRY = /\b(?:amd\s+)?(athlon|a-?series)\s*([A-Z0-9-]{2,8})?\b/i;
const APPLE_SILICON = /\bapple\s+(M[1-9])(?:\s+(pro|max|ultra))?\b/i;
const SNAPDRAGON = /\bsnapdragon\s+(X\s+(?:elite|plus))\b/i;

const CORE_COUNT = /\b(\d{1,2})\s*(?:-|\s)?core\b|\b(\d{1,2})\s*core\b|\b(\d{1,2})\s*nuclei\b/i;
const THREAD_COUNT = /\b(\d{1,2})\s*(?:thread|threads|processi)\b/i;
const CLOCK = /\b(?:fino\s+a\s+|up\s+to\s+|turbo\s+|boost\s+)?(\d(?:[.,]\d{1,2})?)\s*ghz\b/gi;

export function extractCpu(text) {
  let cpu = null;

  const ultra = text.match(INTEL_ULTRA);
  const core = text.match(INTEL_CORE);
  const ryzen = text.match(AMD_RYZEN);
  const apple = text.match(APPLE_SILICON);
  const snap = text.match(SNAPDRAGON);
  const intelEntry = text.match(INTEL_ENTRY);
  const intelN = text.match(INTEL_N);
  const amdEntry = text.match(AMD_ENTRY);

  if (ultra) {
    cpu = {
      brand: 'Intel',
      family: `Core Ultra ${ultra[1]}`,
      model: ultra[2] ? ultra[2].toUpperCase() : null,
      tier: `Ultra ${ultra[1]}`,
    };
  } else if (core) {
    cpu = {
      brand: 'Intel',
      family: `Core ${core[1].toLowerCase()}`,
      model: core[2] ? core[2].toUpperCase() : null,
      tier: core[1].toLowerCase(),
    };
  } else if (ryzen) {
    const ai = ryzen[1] ? 'Ryzen AI' : 'Ryzen';
    cpu = {
      brand: 'AMD',
      family: `${ai} ${ryzen[2]}`,
      model: ryzen[3] ? ryzen[3].toUpperCase() : null,
      tier: `ryzen ${ryzen[2]}`,
    };
  } else if (apple) {
    const variant = apple[2] ? ` ${apple[2][0].toUpperCase()}${apple[2].slice(1).toLowerCase()}` : '';
    cpu = {
      brand: 'Apple',
      family: `Apple ${apple[1].toUpperCase()}${variant}`,
      model: null,
      tier: `apple ${apple[1].toLowerCase()}`,
    };
  } else if (snap) {
    cpu = { brand: 'Qualcomm', family: `Snapdragon ${snap[1]}`, model: null, tier: 'snapdragon' };
  } else if (intelN) {
    cpu = { brand: 'Intel', family: `Intel ${intelN[1].toUpperCase()}`, model: null, tier: 'entry' };
  } else if (intelEntry) {
    const family = intelEntry[1].replace(/\s+/g, ' ');
    cpu = {
      brand: 'Intel',
      family: family.replace(/\b\w/g, (c) => c.toUpperCase()),
      model: intelEntry[2] ? intelEntry[2].toUpperCase() : null,
      tier: 'entry',
    };
  } else if (amdEntry) {
    cpu = {
      brand: 'AMD',
      family: amdEntry[1].replace(/\b\w/g, (c) => c.toUpperCase()),
      model: amdEntry[2] ? amdEntry[2].toUpperCase() : null,
      tier: 'entry',
    };
  }

  if (!cpu) return null;

  const coreMatch = text.match(CORE_COUNT);
  if (coreMatch) {
    const value = Number(coreMatch[1] || coreMatch[2] || coreMatch[3]);
    if (value >= 2 && value <= 96) cpu.cores = value;
  }

  const threadMatch = text.match(THREAD_COUNT);
  if (threadMatch) {
    const value = Number(threadMatch[1]);
    if (value >= 2 && value <= 192) cpu.threads = value;
  }

  // Di tutti i "x.y GHz" citati teniamo il piu' alto: e' quasi sempre il boost.
  const clocks = [...text.matchAll(CLOCK)].map((m) => toNumber(m[1])).filter((n) => n && n > 0.8 && n < 7);
  if (clocks.length) cpu.boostClock = Math.max(...clocks);

  cpu.label = [cpu.family, cpu.model].filter(Boolean).join('-');
  return cpu;
}

/* ------------------------------------------------------------------ GPU -- */

const NVIDIA_RTX = /\b(?:nvidia\s+)?(?:geforce\s+)?(rtx|gtx)\s*(\d{3,4})\s*(ti\s*super|super|ti)?\b/i;
const NVIDIA_PRO = /\b(?:nvidia\s+)?(?:rtx\s+)?(a\d{3,4}|quadro\s+\w+)\b/i;
const AMD_RADEON = /\b(?:amd\s+)?radeon\s+(rx)\s*(\d{3,4})\s*(xtx|xt|gre|m)?\b/i;
const INTEL_ARC = /\b(?:intel\s+)?arc\s+([AB]\d{3})\b/i;
const IGPU = /\b(iris\s+xe(?:\s+graphics)?|uhd\s+graphics(?:\s+\d{3})?|hd\s+graphics(?:\s+\d{3})?|radeon\s+(?:\d{3}m|graphics|vega\s*\d*)|intel\s+(?:arc\s+)?graphics|apple\s+gpu|grafica\s+integrata|scheda\s+grafica\s+integrata)\b/i;
const VRAM = /\b(\d{1,2})\s*gb\s*(?:di\s*)?(?:gddr\d[x]?|vram|memoria\s+video|dedicata)\b/i;

export function extractGpu(text) {
  const nvidia = text.match(NVIDIA_RTX);
  const radeon = text.match(AMD_RADEON);
  const arc = text.match(INTEL_ARC);
  const pro = text.match(NVIDIA_PRO);

  let gpu = null;
  if (nvidia) {
    const suffix = nvidia[3] ? ` ${nvidia[3].replace(/\s+/g, ' ').toUpperCase()}` : '';
    gpu = {
      brand: 'NVIDIA',
      series: `GeForce ${nvidia[1].toUpperCase()}`,
      model: `GeForce ${nvidia[1].toUpperCase()} ${nvidia[2]}${suffix}`.trim(),
      type: 'dedicata',
      generation: nvidiaGeneration(nvidia[1], nvidia[2]),
    };
  } else if (radeon) {
    const suffix = radeon[3] ? ` ${radeon[3].toUpperCase()}` : '';
    gpu = {
      brand: 'AMD',
      series: 'Radeon RX',
      model: `Radeon RX ${radeon[2]}${suffix}`.trim(),
      type: 'dedicata',
    };
  } else if (arc) {
    gpu = { brand: 'Intel', series: 'Arc', model: `Intel Arc ${arc[1].toUpperCase()}`, type: 'dedicata' };
  } else if (pro) {
    gpu = { brand: 'NVIDIA', series: 'Professional', model: `NVIDIA RTX ${pro[1].toUpperCase()}`, type: 'dedicata' };
  } else {
    const integrated = text.match(IGPU);
    if (integrated) {
      const raw = integrated[1].replace(/\s+/g, ' ').trim();
      gpu = {
        brand: guessIgpuBrand(raw),
        series: 'Integrata',
        model: titleCase(raw),
        type: 'integrata',
      };
    }
  }

  if (!gpu) return null;

  const vram = text.match(VRAM);
  if (vram && gpu.type === 'dedicata') gpu.vram = Number(vram[1]);

  return gpu;
}

const GPU_CORES = /\b(?:gpu\s*(?:a\s*)?(\d{1,2})\s*core|(\d{1,2})[\s-]*core\s*gpu)\b/i;

/**
 * Su Apple silicon e Snapdragon la GPU non compare quasi mai nei titoli:
 * fa parte del SoC. La ricaviamo dal processore, altrimenti l'app
 * mostrerebbe "GPU non disponibile" su ogni Mac.
 */
function gpuFromSoc(cpu, text) {
  if (!cpu) return null;

  if (cpu.brand === 'Apple') {
    const gpu = { brand: 'Apple', series: 'Integrata', model: `GPU ${cpu.family}`, type: 'integrata' };
    const cores = text.match(GPU_CORES);
    if (cores) gpu.cores = Number(cores[1] ?? cores[2]);
    return gpu;
  }

  if (cpu.brand === 'Qualcomm') {
    return { brand: 'Qualcomm', series: 'Integrata', model: 'Qualcomm Adreno', type: 'integrata' };
  }

  return null;
}

function nvidiaGeneration(prefix, number) {
  if (prefix.toLowerCase() !== 'rtx') return null;
  const lead = Number(String(number)[0]);
  if (number.length === 4 && lead >= 2 && lead <= 6) return `RTX ${lead}000`;
  return null;
}

function guessIgpuBrand(raw) {
  const lower = raw.toLowerCase();
  if (lower.includes('radeon') || lower.includes('vega')) return 'AMD';
  if (lower.includes('apple')) return 'Apple';
  if (lower.includes('iris') || lower.includes('uhd') || lower.includes('intel')) return 'Intel';
  return null;
}

function titleCase(raw) {
  return raw.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ RAM -- */

const RAM_PATTERNS = [
  /\b(\d{1,3})\s*gb\s*(?:di\s*)?(?:ram|memoria)\s*(?:ddr(\d)|lpddr(\d)x?)?\b/i,
  /\b(?:ram|memoria)\s*(?:di\s*)?(\d{1,3})\s*gb\s*(?:ddr(\d)|lpddr(\d)x?)?\b/i,
  /\b(\d{1,3})\s*gb\s+(?:ddr(\d)|lpddr(\d)x?)\b/i,
];
const RAM_SPEED = /\b(\d{4,5})\s*(?:mhz|mt\/s)\b/i;
const RAM_SLOTS = /\b(\d)\s*(?:x\s*\d{1,3}\s*gb|slot(?:\s+ram)?|banchi)\b/i;
const RAM_SOLDERED = /\b(saldata|onboard|non\s+espandibile|soldered)\b/i;

export function extractRam(text) {
  const match = firstMatch(text, RAM_PATTERNS);
  if (!match) return null;

  const size = Number(match[1]);
  if (!(size >= 2 && size <= 512)) return null;

  const ram = { size };
  if (match[2]) ram.type = `DDR${match[2]}`;
  else if (match[3]) ram.type = `LPDDR${match[3]}`;

  const speed = text.match(RAM_SPEED);
  if (speed) {
    const value = Number(speed[1]);
    if (value >= 1600 && value <= 9000) ram.speed = value;
  }

  const slots = text.match(RAM_SLOTS);
  if (slots) ram.slots = Number(slots[1]);
  if (RAM_SOLDERED.test(text)) ram.upgradable = false;

  return ram;
}

/* -------------------------------------------------------------- STORAGE -- */

const STORAGE_KIND = 'ssd|hdd|nvme|emmc|m\\.?2|hard\\s+disk';
const STORAGE_RE = new RegExp(
  // "SSD da 512GB"                                 oppure  "512GB SSD NVMe"
  `\\b(?:(${STORAGE_KIND})\\s*(?:da\\s*)?(\\d{1,4})\\s*(gb|tb)`
  + `|(\\d{1,4})\\s*(gb|tb)\\s*(?:di\\s*)?(${STORAGE_KIND})?)\\b`,
  'gi',
);
const NVME_HINT = /\b(nvme|pcie\s*(?:gen\s*)?[345](?:\.0)?|m\.?2)\b/i;

export function extractStorage(text) {
  const drives = [];
  const seen = new Set();

  for (const match of text.matchAll(STORAGE_RE)) {
    const amount = Number(match[2] ?? match[4]);
    const unit = (match[3] ?? match[5] ?? '').toLowerCase();
    const kindRaw = (match[1] ?? match[6] ?? '').toLowerCase().replace(/\s+/g, '');
    if (!amount || !unit) continue;

    // Senza una parola chiave di archiviazione, un valore in GB e' quasi
    // sempre la RAM ("32GB DDR5"): lo scartiamo. I TB, invece, su un PC
    // consumer non possono che essere un disco.
    if (!kindRaw && unit !== 'tb') continue;

    const sizeGb = unit === 'tb' ? amount * 1024 : amount;
    if (sizeGb < 32 || sizeGb > 65_536) continue;

    let type;
    if (kindRaw === 'hdd' || kindRaw === 'harddisk') type = 'HDD';
    else if (kindRaw === 'emmc') type = 'eMMC';
    else if (kindRaw === 'nvme' || kindRaw === 'm.2' || kindRaw === 'm2') type = 'SSD NVMe';
    else type = NVME_HINT.test(text) ? 'SSD NVMe' : 'SSD';

    const key = `${type}:${sizeGb}`;
    if (seen.has(key)) continue;
    seen.add(key);
    drives.push({ type, sizeGb });
  }

  if (!drives.length) return null;
  return drives.sort((a, b) => b.sizeGb - a.sizeGb);
}

/* -------------------------------------------------------------- DISPLAY -- */

const RESOLUTION_LABELS = [
  { re: /\b3840\s*x\s*2160\b|\b4k\s*uhd\b|\buhd\s*4k\b/i, w: 3840, h: 2160, label: '4K UHD' },
  { re: /\b3456\s*x\s*2234\b/i, w: 3456, h: 2234, label: 'Liquid Retina XDR' },
  { re: /\b3024\s*x\s*1964\b/i, w: 3024, h: 1964, label: 'Liquid Retina XDR' },
  { re: /\b2880\s*x\s*1800\b|\b3k\b/i, w: 2880, h: 1800, label: '3K' },
  { re: /\b2560\s*x\s*1600\b|\bwqxga\b/i, w: 2560, h: 1600, label: 'WQXGA' },
  { re: /\b2560\s*x\s*1440\b|\bqhd\b|\b2k\b|\bwqhd\b/i, w: 2560, h: 1440, label: 'QHD' },
  { re: /\b2240\s*x\s*1400\b/i, w: 2240, h: 1400, label: '2.2K' },
  { re: /\b1920\s*x\s*1200\b|\bwuxga\b|\bfull\s*hd\+\b|\bfhd\+\b/i, w: 1920, h: 1200, label: 'Full HD+' },
  { re: /\b1920\s*x\s*1080\b|\bfull\s*hd\b|\bfhd\b|\b1080p\b/i, w: 1920, h: 1080, label: 'Full HD' },
  { re: /\b1600\s*x\s*900\b|\bhd\+\b/i, w: 1600, h: 900, label: 'HD+' },
  { re: /\b1366\s*x\s*768\b|\bhd\s*ready\b/i, w: 1366, h: 768, label: 'HD' },
];

const SIZE_RE = /\b(1[0-9](?:[.,]\d)?|2[0-9](?:[.,]\d)?|3[0-9](?:[.,]\d)?)\s*(?:"|pollici|inch|''|in\b)/i;
const REFRESH_RE = /\b(\d{2,3})\s*hz\b/i;
const PANEL_RE = /\b(oled|ips|va\b|tn\b|mini[\s-]?led|amoled|liquid\s+retina|retina)\b/i;
const TOUCH_RE = /\b(touch(?:screen)?|touch\s+screen|tattile)\b/i;
const NITS_RE = /\b(\d{3,4})\s*nit[s]?\b/i;

export function extractDisplay(text, category) {
  const display = {};

  const size = text.match(SIZE_RE);
  if (size) {
    const value = toNumber(size[1]);
    if (value && value >= 10 && value <= 34) display.sizeInch = value;
  }

  for (const entry of RESOLUTION_LABELS) {
    if (entry.re.test(text)) {
      display.width = entry.w;
      display.height = entry.h;
      display.resolution = `${entry.w}x${entry.h}`;
      display.resolutionLabel = entry.label;
      break;
    }
  }

  const refresh = text.match(REFRESH_RE);
  if (refresh) {
    const value = Number(refresh[1]);
    if (value >= 48 && value <= 540) display.refreshHz = value;
  }

  const panel = text.match(PANEL_RE);
  if (panel) display.panel = panel[1].toUpperCase().replace(/\s+/g, ' ').replace('MINI-LED', 'Mini LED');

  if (TOUCH_RE.test(text)) display.touch = true;

  const nits = text.match(NITS_RE);
  if (nits) display.brightnessNits = Number(nits[1]);

  if (!Object.keys(display).length) return null;

  // Su un fisso lo schermo e' quasi sempre accessorio: lo teniamo solo se e'
  // un all-in-one o se il monitor e' esplicitamente incluso.
  if (category === 'desktop' && !/\ball[\s-]?in[\s-]?one|aio\b|monitor\s+incluso/i.test(text)) {
    return display.resolution ? { resolution: display.resolution, resolutionLabel: display.resolutionLabel } : null;
  }

  return display;
}

/* ---------------------------------------------------------- MOTHERBOARD -- */

const CHIPSET_RE = /\b([XBHZAW])(\d{2,3}[A-Z]?)\b(?=\s|$|[,;.)])/;
const KNOWN_CHIPSETS = /\b(X870E|X870|X670E|X670|B850|B840|B650E|B650|A620|X570|B550|A520|Z890|Z790|Z690|B860|B760|B660|H810|H770|H610|W680)\b/i;
const SOCKET_RE = /\b(AM5|AM4|LGA\s*1851|LGA\s*1700|LGA\s*1200|sTR5)\b/i;
const MB_FORM_RE = /\b(mini[\s-]?itx|micro[\s-]?atx|m[\s-]?atx|e[\s-]?atx|atx)\b/i;

export function extractMotherboard(text) {
  const mb = {};

  const known = text.match(KNOWN_CHIPSETS);
  if (known) {
    mb.chipset = known[1].toUpperCase();
  } else {
    const generic = text.match(CHIPSET_RE);
    if (generic && /scheda\s+madre|motherboard|chipset|mainboard/i.test(text)) {
      mb.chipset = `${generic[1].toUpperCase()}${generic[2].toUpperCase()}`;
    }
  }

  const socket = text.match(SOCKET_RE);
  if (socket) mb.socket = socket[1].toUpperCase().replace(/\s+/g, '');

  const form = text.match(MB_FORM_RE);
  if (form) mb.formFactor = normalizeMbFormFactor(form[1]);

  return Object.keys(mb).length ? mb : null;
}

function normalizeMbFormFactor(raw) {
  const key = raw.toLowerCase().replace(/[\s-]/g, '');
  if (key === 'miniitx') return 'Mini-ITX';
  if (key === 'microatx' || key === 'matx') return 'Micro-ATX';
  if (key === 'eatx') return 'E-ATX';
  return 'ATX';
}

/* ------------------------------------------------------- ALIMENTATORE/CASE */

const PSU_RE = /\b(\d{3,4})\s*w(?:att)?\b/i;
const PSU_CERT_RE = /\b80\s*\+?\s*(plus\s+)?(titanium|platinum|gold|silver|bronze|white)\b/i;
const CHASSIS_RE = /\b(mid[\s-]?tower|full[\s-]?tower|mini[\s-]?tower|micro[\s-]?tower|small\s+form\s+factor|sff|mini\s?pc|all[\s-]?in[\s-]?one|aio|barebone|tower)\b/i;
const COOLING_RE = /\b(dissipatore\s+a\s+liquido|aio\s+\d{3}\s*mm|raffreddamento\s+a\s+liquido|liquid\s+cooling|dissipatore\s+ad\s+aria|air\s+cooler)\b/i;

export function extractPowerSupply(text) {
  if (!/alimentatore|psu|power\s+supply/i.test(text)) return null;
  const psu = {};
  const watt = text.match(PSU_RE);
  if (watt) {
    const value = Number(watt[1]);
    if (value >= 200 && value <= 2000) psu.watt = value;
  }
  const cert = text.match(PSU_CERT_RE);
  if (cert) psu.certification = `80+ ${titleCase(cert[2])}`;
  return Object.keys(psu).length ? psu : null;
}

export function extractChassis(text) {
  const chassis = {};
  const form = text.match(CHASSIS_RE);
  if (form) chassis.formFactor = normalizeChassis(form[1]);
  const cooling = text.match(COOLING_RE);
  if (cooling) chassis.cooling = /liquid|liquido/i.test(cooling[1]) ? 'Liquido' : 'Aria';
  return Object.keys(chassis).length ? chassis : null;
}

function normalizeChassis(raw) {
  const key = raw.toLowerCase().replace(/[\s-]/g, '');
  const map = {
    midtower: 'Mid Tower',
    fulltower: 'Full Tower',
    minitower: 'Mini Tower',
    microtower: 'Mini Tower',
    smallformfactor: 'Mini PC',
    sff: 'Mini PC',
    minipc: 'Mini PC',
    allinone: 'All-in-One',
    aio: 'All-in-One',
    barebone: 'Barebone',
    tower: 'Tower',
  };
  return map[key] ?? 'Tower';
}

/* ----------------------------------------------------------- PORTATILE --- */

const BATTERY_RE = /\b(\d{2,3}(?:[.,]\d)?)\s*wh\b/i;
const AUTONOMY_RE = /\b(?:fino\s+a\s+)?(\d{1,2})\s*ore\s+(?:di\s+)?(?:autonomia|batteria|utilizzo)\b/i;
const WEIGHT_RE = /\b(\d(?:[.,]\d{1,2})?)\s*(?:kg|chilogrammi)\b/i;
const KEYBOARD_RE = /\b(tastiera\s+retroilluminata(?:\s+rgb)?|retroilluminazione\s+rgb|tastiera\s+rgb|backlit\s+keyboard)\b/i;
const WEBCAM_RE = /\b(?:webcam|fotocamera)\s*(?:hd\s*)?(\d{3,4}p|hd|full\s*hd)\b/i;
const FINGERPRINT_RE = /\b(lettore\s+d[i']\s*impronte|impronte\s+digitali|fingerprint)\b/i;

/* --------------------------------------------------------- CONNETTIVITA -- */

const WIFI_RE = /\bwi[\s-]?fi\s*(7|6e|6|5|802\.11[a-z]+)\b/i;
const BT_RE = /\bbluetooth\s*(\d(?:\.\d)?)\b/i;
const ETH_RE = /\b(2[.,]5\s*gb|2\.5g|gigabit|10\s*gb)\s*(?:ethernet|lan)\b/i;
const THUNDERBOLT_RE = /\bthunderbolt\s*([345])\b/i;
const USBC_RE = /\b(\d)\s*x?\s*usb[\s-]?c\b/i;
const HDMI_RE = /\bhdmi\s*(2\.1|2\.0|1\.4)?\b/i;

/* ------------------------------------------------------------------- OS -- */

const OS_PATTERNS = [
  { re: /\bwindows\s*11\s*(home|pro|professional)?\b/i, format: (m) => `Windows 11${m[1] ? ` ${titleCase(m[1].replace(/professional/i, 'Pro'))}` : ''}` },
  { re: /\bwindows\s*10\s*(home|pro|professional)?\b/i, format: (m) => `Windows 10${m[1] ? ` ${titleCase(m[1].replace(/professional/i, 'Pro'))}` : ''}` },
  { re: /\bmac\s*os\s*[a-z]*\b|\bmacos\b/i, format: () => 'macOS' },
  { re: /\bchrome\s*os\b/i, format: () => 'ChromeOS' },
  { re: /\b(ubuntu|linux|free\s*dos|freedos|senza\s+sistema\s+operativo|no\s+os)\b/i, format: (m) => (/ubuntu/i.test(m[1]) ? 'Ubuntu' : /linux/i.test(m[1]) ? 'Linux' : 'Senza sistema operativo') },
];

export function extractOs(text) {
  for (const entry of OS_PATTERNS) {
    const match = text.match(entry.re);
    if (match) return entry.format(match);
  }
  return null;
}

/* ------------------------------------------------------------- CATEGORIA -- */

const LAPTOP_HINTS = /\b(notebook|laptop|portatile|ultrabook|macbook|chromebook|2[\s-]?in[\s-]?1|convertibile|gaming\s+laptop)\b/i;
const DESKTOP_HINTS = /\b(desktop|pc\s+fisso|fisso|tower|all[\s-]?in[\s-]?one|aio|mini\s?pc|barebone|workstation)\b/i;

/**
 * Determina se si tratta di un portatile o di un fisso. Il display con
 * dimensione "da portatile" e la batteria sono i segnali piu' affidabili
 * quando il titolo non lo dice esplicitamente.
 */
export function detectCategory(text) {
  const laptop = LAPTOP_HINTS.test(text);
  const desktop = DESKTOP_HINTS.test(text);

  if (laptop && !desktop) return 'laptop';
  if (desktop && !laptop) return 'desktop';
  if (laptop && desktop) {
    // "All-in-one" e "mini pc" vincono su un generico "portatile" nel testo.
    return /\ball[\s-]?in[\s-]?one|aio\b|mini\s?pc|pc\s+fisso/i.test(text) ? 'desktop' : 'laptop';
  }

  if (BATTERY_RE.test(text) || WEIGHT_RE.test(text)) return 'laptop';
  if (/alimentatore|scheda\s+madre|case\b/i.test(text)) return 'desktop';
  return null;
}

/* ------------------------------------------------------------- MARCHIO --- */

const BRANDS = [
  'Apple', 'ASUS', 'Acer', 'Alienware', 'Dell', 'HP', 'Lenovo', 'MSI', 'Samsung',
  'LG', 'Huawei', 'Microsoft', 'Razer', 'Gigabyte', 'Medion', 'Chillblast',
  'Corsair', 'NZXT', 'HYTE', 'Zotac', 'Beelink', 'Minisforum', 'AORUS',
  'Predator', 'Nitro', 'Victus', 'Omen', 'Legion', 'ThinkPad', 'IdeaPad', 'Vivobook',
  'Zenbook', 'ROG', 'TUF', 'Swift', 'Aspire', 'Pavilion', 'Inspiron', 'XPS', 'Latitude',
  'Surface', 'Katana', 'Cyborg', 'Raider', 'Stealth',
];

const BRAND_ALIASES = {
  Predator: 'Acer', Nitro: 'Acer', Swift: 'Acer', Aspire: 'Acer',
  Victus: 'HP', Omen: 'HP', Pavilion: 'HP',
  Legion: 'Lenovo', ThinkPad: 'Lenovo', IdeaPad: 'Lenovo',
  Vivobook: 'ASUS', Zenbook: 'ASUS', ROG: 'ASUS', TUF: 'ASUS',
  Inspiron: 'Dell', XPS: 'Dell', Latitude: 'Dell', Alienware: 'Dell',
  Surface: 'Microsoft',
  Katana: 'MSI', Cyborg: 'MSI', Raider: 'MSI', Stealth: 'MSI', AORUS: 'Gigabyte',
};

/**
 * I nomi dei componenti contengono marchi che NON sono la marca del PC:
 * "PC Assemblato, AMD Ryzen 7, scheda madre MSI B650" non e' un MSI.
 * Prima di cercare la marca si tolgono i segmenti che descrivono componenti.
 */
const COMPONENT_SEGMENTS = new RegExp(
  '(?:'
  + 'scheda\\s+(?:madre|video|grafica)|mainboard|motherboard|chipset'
  + '|(?:intel\\s+)?core\\s+(?:ultra\\s+)?i?\\d'
  + '|amd\\s+ryzen|ryzen'
  + '|nvidia|geforce|radeon|intel\\s+arc|iris\\s+xe|uhd\\s+graphics'
  + '|alimentatore|dissipatore|raffreddamento'
  + ')[^,;]*',
  'gi',
);

const ASSEMBLED = /\b(assemblat[oi]|pc\s+(?:fisso|desktop|gaming)|desktop\s+gaming|workstation)\b/i;

export function extractBrand(text) {
  const withoutComponents = text.replace(COMPONENT_SEGMENTS, ' ');

  for (const brand of BRANDS) {
    const re = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(withoutComponents)) return BRAND_ALIASES[brand] ?? brand;
  }

  // Nessun marchio: se il titolo descrive una configurazione su misura, e'
  // piu' onesto dire "Assemblato" che lasciare il campo vuoto.
  return ASSEMBLED.test(text) ? 'Assemblato' : null;
}

/* ------------------------------------------------------------ AGGREGATO -- */

/**
 * Estrae l'intero blocco `specs` da un testo libero.
 *
 * @param {string} rawText  titolo + descrizione + bullet della scheda prodotto
 * @param {object} [options]
 * @param {'laptop'|'desktop'} [options.category] categoria gia' nota
 * @param {object} [options.structured] coppie chiave/valore gia' estratte dal DOM
 */
export function extractSpecs(rawText, options = {}) {
  const text = normalizeText(rawText);
  const category = options.category ?? detectCategory(text) ?? 'laptop';

  const cpu = extractCpu(text);
  const specs = {
    cpu,
    gpu: extractGpu(text) ?? gpuFromSoc(cpu, text),
    ram: extractRam(text),
    storage: extractStorage(text),
    display: extractDisplay(text, category),
    os: extractOs(text),
  };

  if (category === 'desktop') {
    specs.motherboard = extractMotherboard(text);
    specs.powerSupply = extractPowerSupply(text);
    specs.chassis = extractChassis(text);
  } else {
    const battery = text.match(BATTERY_RE);
    const autonomy = text.match(AUTONOMY_RE);
    if (battery || autonomy) {
      specs.battery = {};
      if (battery) specs.battery.capacityWh = toNumber(battery[1]);
      if (autonomy) specs.battery.autonomyHours = Number(autonomy[1]);
    }
    const weight = text.match(WEIGHT_RE);
    if (weight) specs.weightKg = toNumber(weight[1]);
    if (KEYBOARD_RE.test(text)) specs.keyboard = /rgb/i.test(text) ? 'Retroilluminata RGB' : 'Retroilluminata';
    const webcam = text.match(WEBCAM_RE);
    if (webcam) specs.webcam = webcam[1].toUpperCase().replace('FULL HD', '1080p');
    if (FINGERPRINT_RE.test(text)) specs.fingerprint = true;
  }

  const connectivity = {};
  const wifi = text.match(WIFI_RE);
  if (wifi) connectivity.wifi = `Wi-Fi ${wifi[1].toUpperCase()}`;
  const bt = text.match(BT_RE);
  if (bt) connectivity.bluetooth = bt[1];
  const eth = text.match(ETH_RE);
  if (eth) connectivity.ethernet = eth[1].replace(',', '.').replace(/gb$/i, 'Gb').replace(/^gigabit$/i, '1 Gb');
  if (Object.keys(connectivity).length) specs.connectivity = connectivity;

  const ports = [];
  const tb = text.match(THUNDERBOLT_RE);
  if (tb) ports.push(`Thunderbolt ${tb[1]}`);
  const usbc = text.match(USBC_RE);
  if (usbc) ports.push(`${usbc[1]}x USB-C`);
  const hdmi = text.match(HDMI_RE);
  if (hdmi) ports.push(hdmi[1] ? `HDMI ${hdmi[1]}` : 'HDMI');
  if (ports.length) specs.ports = ports;

  // Rimuove le chiavi nulle: la UI distingue "non disponibile" da "assente".
  for (const key of Object.keys(specs)) {
    if (specs[key] == null) delete specs[key];
  }

  return { category, specs };
}

/**
 * Percentuale di completezza della scheda: la webapp la mostra come indicatore
 * di affidabilita' del dato e la usa per ordinare a parita' di sconto.
 */
export function specsCompleteness(category, specs) {
  const required = category === 'laptop'
    ? ['cpu', 'gpu', 'ram', 'storage', 'display', 'os', 'battery', 'weightKg', 'connectivity']
    : ['cpu', 'gpu', 'ram', 'storage', 'os', 'motherboard', 'powerSupply', 'chassis', 'connectivity'];

  const present = required.filter((key) => specs[key] != null).length;
  return Math.round((present / required.length) * 100);
}
