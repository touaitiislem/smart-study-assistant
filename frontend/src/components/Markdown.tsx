import { ReactNode, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Check, Copy } from 'lucide-react';

export function copyText(t: string) {
  return navigator.clipboard?.writeText(t);
}

function Pre({ children }: { children?: ReactNode }) {
  const [done, setDone] = useState(false);
  const text = String((children as any)?.props?.children ?? '').replace(/\n$/, '');
  return (
    <div className="group relative">
      <button
        onClick={() => { copyText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
        className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-xs text-slate-200 opacity-0 transition hover:bg-white/20 focus:opacity-100 group-hover:opacity-100"
      >
        {done ? <Check size={12} /> : <Copy size={12} />} {done ? 'Copié' : 'Copier'}
      </button>
      <pre className="overflow-x-auto rounded-xl bg-navy-950 p-4 font-mono text-[13px] leading-relaxed text-slate-100 ring-1 ring-white/10">
        <code>{text}</code>
      </pre>
    </div>
  );
}

export default function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h2 className="mt-4 text-lg font-bold">{children}</h2>,
          h2: ({ children }) => <h3 className="mt-5 text-base font-bold text-violet-700 dark:text-violet-300">{children}</h3>,
          h3: ({ children }) => <h4 className="mt-3 font-semibold">{children}</h4>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
          pre: ({ children }) => <Pre>{children}</Pre>,
          code: ({ children }) => <code className="rounded bg-violet-500/10 px-1 py-0.5 font-mono text-[0.85em]">{children}</code>,
          a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="text-violet-600 underline dark:text-violet-300">{children}</a>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
