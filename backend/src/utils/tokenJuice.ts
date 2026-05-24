/**
 * TokenJuice - Token Compression Layer (inspired by OpenHuman)
 * Reduces LLM context consumption by removing fluff, stripping HTML tags,
 * shortening URLs, and stripping whitespace.
 */

export function juiceText(text: string): string {
  if (!text) return '';

  let compressed = text;

  // 1. Strip HTML tags (simple heuristic)
  compressed = compressed.replace(/<[^>]*>?/gm, '');

  // 2. Compress repetitive whitespace and newlines
  compressed = compressed.replace(/[ \t]+/g, ' ');
  compressed = compressed.replace(/\n\s*\n+/g, '\n');

  // 3. Optional: shorten very long URLs, replace base64 images with placeholders
  compressed = compressed.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, '[BASE64_IMAGE]');
  
  // 4. Trim leading/trailing spaces
  compressed = compressed.trim();

  return compressed;
}

export function juiceJson(data: any): any {
  if (typeof data === 'string') {
    return juiceText(data);
  } else if (Array.isArray(data)) {
    return data.map(item => juiceJson(item));
  } else if (typeof data === 'object' && data !== null) {
    const newObj: any = {};
    for (const key of Object.keys(data)) {
      newObj[key] = juiceJson(data[key]);
    }
    return newObj;
  }
  return data;
}
