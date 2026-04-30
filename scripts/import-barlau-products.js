const fs = require("fs/promises");
const path = require("path");

const BASE = "https://barlau.kz";
const OUT_DIR = path.resolve("assets/barlau");
const OUT_DATA = path.resolve("barlau-products.js");

const categories = [
  "/catalog/ip_videonablyudenie_hiwatch/",
  "/catalog/tvi_videonablyudenie_hiwatch/",
  "/catalog/videonablyudenie_hikvision/",
];

const formatter = new Intl.NumberFormat("ru-KZ", {
  style: "currency",
  currency: "KZT",
  maximumFractionDigits: 0,
});

function decodeHtml(value = "") {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#40;/g, "(")
    .replace(/&#41;/g, ")")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function absoluteUrl(url) {
  return new URL(url, BASE).toString();
}

function cleanFilename(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function brandFromName(name) {
  const lower = name.toLowerCase();
  if (lower.includes("hikvision")) return "hikvision";
  if (lower.includes("hiwatch")) return "hiwatch";
  if (lower.includes("hilook")) return "hilook";
  if (lower.includes("ezviz")) return "ezviz";
  return "other";
}

function typeFromName(name) {
  const lower = name.toLowerCase();
  if (lower.includes("регистратор") || lower.includes("nvr") || lower.includes("dvr")) return "recorder";
  if (lower.includes("диск") || lower.includes("hdd") || lower.includes("ssd")) return "storage";
  return "camera";
}

function parseProducts(html, categoryUrl) {
  const starts = [...html.matchAll(/<div[^>]+data-role="item"[^>]+data-products="main"[\s\S]*?data-data="([^"]+)"/g)];
  return starts
    .map((match, index) => {
      const block = html.slice(match.index, starts[index + 1]?.index ?? html.length);
      const dataText = decodeHtml(match[1]);
      let data;

      try {
        data = JSON.parse(dataText);
      } catch {
        return null;
      }

      const href = block.match(/<a[^>]+href="([^"]+)"[^>]*data-role="offer\.link"/)?.[1];
      const image = block.match(/data-original="([^"]+)"/)?.[1] || block.match(/<img[^>]+src="([^"]+)"/)?.[1];
      const title =
        decodeHtml(
          block
            .match(/catalog-section-item-name-wrapper[^>]*>([\s\S]*?)<\/a>/)?.[1]
            ?.replace(/<[^>]+>/g, "")
            .trim() || data.name,
        ) || data.name;

      const price = Number(data.prices?.[0]?.base?.value || data.prices?.[0]?.discount?.value || 0);
      if (!title || !href || !image || !price) return null;

      return {
        id: data.id,
        title,
        brand: brandFromName(title),
        type: typeFromName(title),
        categoryUrl: absoluteUrl(categoryUrl),
        sourceUrl: absoluteUrl(href),
        sourceImage: absoluteUrl(image),
        price,
        priceText: formatter.format(price),
        stock: data.quantity?.value ?? null,
      };
    })
    .filter(Boolean);
}

async function downloadImage(product) {
  const ext = path.extname(new URL(product.sourceImage).pathname) || ".jpg";
  const filename = `${product.id}-${cleanFilename(product.title)}${ext}`;
  const relative = `assets/barlau/${filename}`;
  const target = path.resolve(relative);

  try {
    await fs.access(target);
    return relative;
  } catch {
    const response = await fetch(product.sourceImage);
    if (!response.ok) throw new Error(`Image ${response.status}: ${product.sourceImage}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(target, buffer);
    return relative;
  }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const products = [];
  for (const category of categories) {
    const response = await fetch(absoluteUrl(category));
    if (!response.ok) throw new Error(`Category ${response.status}: ${category}`);
    const html = await response.text();
    products.push(...parseProducts(html, category));
  }

  const unique = [...new Map(products.map((product) => [product.id, product])).values()].slice(0, 36);

  for (const product of unique) {
    product.image = await downloadImage(product);
  }

  const output = `window.barlauProducts = ${JSON.stringify(unique, null, 2)};\n`;
  await fs.writeFile(OUT_DATA, output);
  console.log(`Imported ${unique.length} products into ${OUT_DATA}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
