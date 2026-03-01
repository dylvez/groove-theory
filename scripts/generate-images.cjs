/**
 * Groove Theory — AI Image Asset Generator
 *
 * Uses Google Gemini 2.5 Flash (image generation) to create all UI image assets.
 * Run: node scripts/generate-images.cjs
 * Regen specific: node scripts/generate-images.cjs --only=favicon,logo
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = 'REDACTED_KEY';
const MODEL = 'gemini-2.5-flash-image';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const ASSETS_DIR = path.join(__dirname, '..', 'public', 'images');

// ============================================================
// Groove Theory Color Palette
// ============================================================
// Orange (primary):   #f97316
// Purple (secondary): #a855f7
// Cyan:               #06b6d4
// Green:              #22c55e
// Pink:               #ec4899
// Blue:               #3b82f6
// Dark BG:            #0f0f13
// Cell BG:            #2a2a3d

const STYLE_ICON = `Create a minimal flat vector icon on a solid dark background (#0f0f13). Simple geometric shapes, no text, no shadows, clean modern music app style. Use a vibrant palette of orange (#f97316) and purple (#a855f7) as primary colors, with accents of cyan (#06b6d4) and green (#22c55e). The icon should be centered with padding around it.`;

const STYLE_ILLUSTRATION = `Create a modern, minimal flat illustration on a solid dark background (#0f0f13). Rounded geometric shapes, modern music app style. No text, no words, no letters. Use a vibrant palette featuring orange (#f97316), purple (#a855f7), cyan (#06b6d4), and green (#22c55e) on the dark background.`;

// ============================================================
// Image Definitions
// ============================================================

const IMAGES = [
  // ── Favicon / App Icon ────────────────────────────────────
  {
    filename: 'favicon.png',
    prompt: `${STYLE_ICON} A stylized 4x4 grid of rounded squares representing a beat sequencer / drum machine. Some cells are "lit up" glowing in orange (#f97316), a few in purple (#a855f7), and the rest are dim dark gray (#2a2a3d). The lit cells form a rhythmic pattern (not all on, not all off — roughly 6 of 16 lit). The grid has slight spacing between cells. Looks great at small sizes (32px). The overall shape is a rounded square.`,
  },

  // ── Logo (Header Bar — wide/horizontal) ──────────────────
  {
    filename: 'logo.png',
    prompt: `Generate an image that is exactly 850 pixels wide and 450 pixels tall. The background must be solid #1a1a24 with NO gradients, NO glow, NO vignette — just flat #1a1a24 everywhere. The design is a stylized audio equalizer / frequency bars — about 8-10 vertical rounded bars of varying heights arranged horizontally across the center, forming a pleasing wave shape. The bars use a color gradient from orange (#f97316) on the left through purple (#a855f7) in the middle to cyan (#06b6d4) on the right. The bars have rounded tops and slight gaps between them. Clean, minimal, modern flat vector style. No text, no words, no letters. No shadows. Simple and bold. The bars should be centered in the 850x450 canvas.`,
  },

  // ── Empty State: No Saved Grooves ─────────────────────────
  {
    filename: 'empty-grooves.png',
    prompt: `${STYLE_ILLUSTRATION} A gentle, inviting empty state illustration for a "no saved grooves" message. Show a stylized floppy disk or cassette tape in the center with musical notes and sparkles floating around it. The disk/tape is rendered in muted purple (#a855f7) with orange (#f97316) musical note accents. A few small stars or sparkles in cyan (#06b6d4). The mood is warm and encouraging — "save your first groove!" Simple, not cluttered. No text.`,
  },

  // ── OG / Social Share Image ───────────────────────────────
  {
    filename: 'og-image.png',
    prompt: `Create a wide panoramic banner image for a music beat-making app called "Groove Theory" on a dark background (#0f0f13). The composition shows an abstract, stylized drum machine / step sequencer grid stretching across the image. Rows of glowing rounded squares — some lit in orange (#f97316), purple (#a855f7), cyan (#06b6d4), and green (#22c55e) — form rhythmic patterns. Subtle audio waveforms and musical notes float above. The overall feel is futuristic, creative, and musical. Modern flat design, no photorealism. No text, no words, no letters.`,
  },
];

// ============================================================
// API Helpers
// ============================================================

function makeRequest(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    });

    const url = new URL(`${ENDPOINT}?key=${API_KEY}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    req.write(body);
    req.end();
  });
}

function extractImageData(response) {
  if (response.error) throw new Error(`API error: ${response.error.message}`);
  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error('No parts in response');
  for (const part of parts) {
    if (part.inlineData) return Buffer.from(part.inlineData.data, 'base64');
  }
  throw new Error('No image data in response');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// Main
// ============================================================

async function main() {
  // Ensure output directory exists
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }

  // Check for --only flag to regenerate specific images
  const onlyArg = process.argv.find(a => a.startsWith('--only='));
  const onlyFiles = onlyArg ? onlyArg.split('=')[1].split(',') : null;

  const toGenerate = onlyFiles
    ? IMAGES.filter(img => onlyFiles.some(f => img.filename.includes(f)))
    : IMAGES.filter(img => !fs.existsSync(path.join(ASSETS_DIR, img.filename)));

  if (toGenerate.length === 0) {
    console.log('All images already exist. Use --only=filename to regenerate specific images.');
    console.log(`Total images: ${IMAGES.length}`);
    return;
  }

  console.log(`Generating ${toGenerate.length} of ${IMAGES.length} images...`);
  console.log(`Output: ${ASSETS_DIR}\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < toGenerate.length; i++) {
    const img = toGenerate[i];
    const outPath = path.join(ASSETS_DIR, img.filename);

    process.stdout.write(`[${i + 1}/${toGenerate.length}] ${img.filename}... `);

    try {
      const response = await makeRequest(img.prompt);
      const imageBuffer = extractImageData(response);
      fs.writeFileSync(outPath, imageBuffer);
      console.log(`OK (${(imageBuffer.length / 1024).toFixed(1)} KB)`);
      success++;
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      failed++;
    }

    // Rate limiting — 2.5s between requests
    if (i < toGenerate.length - 1) await sleep(2500);
  }

  console.log(`\nDone! ${success} succeeded, ${failed} failed out of ${toGenerate.length}.`);
  if (failed > 0) {
    console.log('Re-run the script to retry failed images (only missing files are generated).');
  }
}

main().catch(console.error);
