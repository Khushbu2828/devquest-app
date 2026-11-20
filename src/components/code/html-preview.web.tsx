import { previewDocument } from '@/components/code/preview-document';

/** Web version: an iframe with an empty `sandbox` attribute, so nothing in it can run scripts. */
export function HtmlPreview({ html, height = 220 }: { html: string; height?: number }) {
  return (
    <iframe
      title="Preview of your component"
      sandbox=""
      srcDoc={previewDocument(html)}
      style={{ width: '100%', height, border: '1px solid #DDE1EB', borderRadius: 12, background: '#fff' }}
    />
  );
}
