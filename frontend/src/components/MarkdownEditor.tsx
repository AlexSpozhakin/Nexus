import { useState, useRef } from 'react';
import { useTranslation } from '../i18n/translations';
import MarkdownPreview from './MarkdownPreview';

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function MarkdownEditor({ value, onChange, placeholder, minHeight = '120px' }: Props) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insert = (before: string, after = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = value.slice(start, end) || 'text';
    const newVal = value.slice(0, start) + before + sel + after + value.slice(end);
    onChange(newVal);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + sel.length);
    }, 0);
  };

  const insertCodeBlock = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = value.slice(start, end) || 'code here';
    const newVal = value.slice(0, start) + '```\n' + sel + '\n```' + value.slice(end);
    onChange(newVal);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + 4, start + 4 + sel.length);
    }, 0);
  };

  const toolbarButtons = [
    {
      label: <span className="font-bold text-gray-200">B</span>,
      title: 'Bold (**text**)',
      action: () => insert('**', '**'),
    },
    {
      label: <span className="italic text-gray-200">I</span>,
      title: 'Italic (*text*)',
      action: () => insert('*', '*'),
    },
    {
      label: <span className="font-mono text-amber-400 text-[11px]">`</span>,
      title: 'Inline code (`code`)',
      action: () => insert('`', '`'),
    },
    {
      label: <span className="font-mono text-amber-400 text-[10px] leading-none">{'</>'}</span>,
      title: 'Code block (```)',
      action: insertCodeBlock,
    },
    {
      label: <span className="text-indigo-400 text-sm leading-none">"</span>,
      title: 'Quote (> text)',
      action: () => insert('> '),
    },
    {
      label: <span className="text-gray-400 text-[11px] leading-none">H1</span>,
      title: 'Heading 1 (# text)',
      action: () => insert('# '),
    },
    {
      label: <span className="text-gray-400 text-[11px] leading-none">H2</span>,
      title: 'Heading 2 (## text)',
      action: () => insert('## '),
    },
    {
      label: <span className="text-gray-400 text-lg leading-none">—</span>,
      title: 'Horizontal rule',
      action: () => insert('\n---\n'),
    },
  ];

  return (
    <div className="rounded-xl border border-gray-600/50 overflow-hidden bg-gray-700/30 focus-within:border-indigo-500/60 transition-colors">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-600/40 bg-gray-800/60">
        <div className="flex items-center gap-0.5 flex-1 flex-wrap">
          {toolbarButtons.map((btn, idx) => (
            <button
              key={idx}
              type="button"
              title={btn.title}
              onClick={btn.action}
              disabled={preview}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-600/60 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {btn.label}
            </button>
          ))}
        </div>
        {/* Preview toggle */}
        <div className="flex items-center bg-gray-700/60 rounded-lg p-0.5 gap-0.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => setPreview(false)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${!preview ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
          >
            {t('mdEdit')}
          </button>
          <button
            type="button"
            onClick={() => setPreview(true)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${preview ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
          >
            {t('mdPreview')}
          </button>
        </div>
      </div>

      {/* Content */}
      {preview ? (
        <div className="px-3 py-2.5" style={{ minHeight }}>
          {value ? (
            <MarkdownPreview content={value} />
          ) : (
            <p className="text-gray-500 text-sm italic">{t('mdNothingToPreview')}</p>
          )}
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || t('mdNothingToPreview')}
          className="w-full bg-transparent text-gray-200 placeholder-gray-500 text-sm px-3 py-2.5 outline-none resize-y font-mono leading-relaxed"
          style={{ minHeight }}
        />
      )}
    </div>
  );
}
