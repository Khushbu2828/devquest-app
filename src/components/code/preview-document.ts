/** Wraps rendered component HTML in a page with simple, readable default styles. */
export function previewDocument(body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<style>
  body { font: 16px/1.5 -apple-system, system-ui, sans-serif; color: #11131a; background: #fff; margin: 0; padding: 16px; }
  ul { padding-left: 20px; } li { margin: 4px 0; }
  .done { text-decoration: line-through; color: #8a90a0; }
  button { font: inherit; padding: 6px 12px; border-radius: 8px; border: 1px solid #dde1eb; background: #f7f8fc; }
</style></head><body>${body}</body></html>`;
}
