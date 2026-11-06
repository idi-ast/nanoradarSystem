import { useRef, useState } from 'react';
import { IconCheck, IconCopy } from '@tabler/icons-react';

export function ZoneJsonField({ json, error, zoneCount = 1 }: { json: string; error?: string; zoneCount?: number }) {
  const field = useRef<HTMLTextAreaElement>(null);
  const [copiedText, setCopiedText] = useState('');
  const [copyError, setCopyError] = useState('');
  const copy = async () => {
    if (!json) return;
    setCopyError('');
    setCopiedText('');
    try {
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(json);
      } catch {
        field.current?.focus(); field.current?.select();
        if (!document.execCommand('copy')) throw new Error('Copy failed');
      }
      setCopiedText(json);
    } catch {
      setCopyError('El navegador no permitió copiar automáticamente. El texto está seleccionado: usa Ctrl+C o Cmd+C.');
    }
  };
  const copied = Boolean(json && copiedText === json);
  return <section aria-label="Exportación JSON de zonas" className="min-w-0 w-full max-w-full rounded-xl border border-border bg-bg-100 p-4 sm:p-5">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">JSON de zonas seleccionadas ({zoneCount})</h2><p className="mt-1 text-xs text-text-200">Formato result.alert. Cada plantilla se conserva intacta: solo cambian vértices, ID y nombre.</p></div><button type="button" disabled={!json} onClick={() => {void copy();}} aria-label="Copiar JSON de zonas seleccionadas" className="flex shrink-0 items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40">{copied ? <IconCheck size={16} /> : <IconCopy size={16} />}{copied ? 'Copiado' : zoneCount > 1 ? `Copiar ${zoneCount} zonas` : 'Copiar'}</button></div>
    {error && <p role="alert" className="mb-3 text-sm text-amber-500">{error}</p>}
    <textarea ref={field} wrap="soft" readOnly spellCheck={false} value={json} rows={18} aria-label="JSON de exportación de zonas" placeholder="Marca una o más zonas guardadas para ver su JSON." className="block min-w-0 w-full max-w-full resize-y whitespace-pre-wrap [overflow-wrap:anywhere] rounded-lg border border-border bg-bg-200 p-4 font-mono text-xs leading-relaxed text-text-100 outline-none focus:border-sky-500" />
    <p role="status" className="mt-2 text-xs text-text-200">{copyError || (copied ? 'JSON copiado al portapapeles.' : 'Los demás campos de la plantilla se conservan sin cambios.')}</p>
  </section>;
}
