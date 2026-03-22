import { useState, useRef, useEffect, useCallback } from 'react';
import { attachmentsAPI } from '../services/api';
import { useTranslation } from '../i18n/translations';

interface Attachment {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  uploader_name: string;
  uploaded_by: string;
}

interface Props {
  taskId?: string;
  teamId?: string;
  currentUserId: string;
}

const isImage    = (m: string) => m.startsWith('image/');
const isPdf      = (m: string) => m === 'application/pdf';
const isText     = (m: string) => m === 'text/plain' || m === 'text/csv';
// Форматы которые браузер умеет показывать inline
const canPreviewInBrowser = (m: string) => isImage(m) || isPdf(m) || isText(m);

const FILE_GRADIENT: Record<string, string> = {
  'application/pdf': 'from-red-500 to-rose-600',
  'application/msword': 'from-blue-500 to-blue-700',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'from-blue-500 to-blue-700',
  'application/vnd.ms-excel': 'from-green-500 to-emerald-600',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'from-green-500 to-emerald-600',
  'application/vnd.ms-powerpoint': 'from-orange-500 to-orange-600',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'from-orange-500 to-orange-600',
  'text/plain': 'from-gray-400 to-gray-500',
  'text/csv': 'from-teal-500 to-teal-600',
  'application/zip': 'from-yellow-500 to-amber-600',
  'application/x-zip-compressed': 'from-yellow-500 to-amber-600',
  'application/x-rar-compressed': 'from-yellow-500 to-amber-600',
  'application/x-7z-compressed': 'from-yellow-500 to-amber-600',
  'application/gzip': 'from-yellow-500 to-amber-600',
  'application/x-tar': 'from-yellow-500 to-amber-600',
};

const fileGradient = (mime: string) =>
  isImage(mime) ? 'from-purple-500 to-violet-600' : (FILE_GRADIENT[mime] || 'from-indigo-500 to-indigo-600');

const fileExt = (name: string) => name.split('.').pop()?.toUpperCase().slice(0, 4) || 'FILE';

const fmtBytes = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

const fmtDate = (iso: string, lang: string) =>
  new Date(iso).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-GB', { day: 'numeric', month: 'short' });

// ─── Открыть файл в новой вкладке ─────────────────────────────────────────────
async function openInNewTab(id: string, mime: string): Promise<boolean> {
  try {
    const r = await attachmentsAPI.preview(id);
    const blob = new Blob([r.data], { type: mime });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return true;
  } catch { return false; }
}

// ─── Скачать файл с правильным именем ────────────────────────────────────────
async function downloadFile(id: string, mime: string, fileName: string) {
  try {
    const r = await attachmentsAPI.download(id);
    const blob = new Blob([r.data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch { /* silent */ }
}

// ─── Основной компонент ───────────────────────────────────────────────────────
export default function AttachmentSection({ taskId, teamId, currentUserId }: Props) {
  const { t, lang } = useTranslation();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading]     = useState(false);
  const [error, setError]             = useState('');
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [openingId, setOpeningId]     = useState<string | null>(null);
  const [dragOver, setDragOver]       = useState(false);
  const [toast, setToast]             = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const load = useCallback(async () => {
    try {
      const r = taskId ? await attachmentsAPI.getByTask(taskId) : await attachmentsAPI.getByTeam(teamId!);
      setAttachments(r.data ?? []);
    } catch { /* silent */ }
  }, [taskId, teamId]);

  useEffect(() => { load(); }, [load]);

  const upload = async (file: File) => {
    setError('');
    if (file.size > 20 * 1024 * 1024) { setError(t('attachmentSizeError')); return; }
    setUploading(true);
    try {
      if (taskId) await attachmentsAPI.uploadToTask(taskId, file);
      else        await attachmentsAPI.uploadToTeam(teamId!, file);
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.error || '';
      setError(msg.includes('too large') ? t('attachmentSizeError') : msg.includes('not allowed') ? t('attachmentTypeError') : t('attachmentUploadError'));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try { await attachmentsAPI.delete(id); setAttachments(p => p.filter(a => a.id !== id)); }
    catch { setError(t('attachmentDeleteError')); }
    finally { setDeletingId(null); }
  };

  const handleDownload = async (a: Attachment, e: React.MouseEvent) => {
    e.stopPropagation();
    await downloadFile(a.id, a.mime_type, a.file_name);
  };

  const handleRowClick = async (a: Attachment) => {
    if (canPreviewInBrowser(a.mime_type)) {
      setOpeningId(a.id);
      await openInNewTab(a.id, a.mime_type);
      setOpeningId(null);
    } else {
      // Word, Excel, PPT — браузер не умеет открыть, скачиваем
      showToast(lang === 'ru' ? '⬇ Файл скачивается...' : '⬇ Downloading file...');
      await downloadFile(a.id, a.mime_type, a.file_name);
    }
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
      onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) upload(f); }}
    >
      {/* Header */}
      <div className="mb-4 animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-white font-semibold text-base">📎 {t('attachments')}</span>
          {attachments.length > 0 && (
            <span className="bg-indigo-500/20 text-indigo-400 text-xs font-bold px-2 py-0.5 rounded-full">
              {attachments.length}
            </span>
          )}
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium px-4 py-2.5 rounded-xl transition-all btn-modern hover-lift shadow-lg hover:shadow-xl whitespace-nowrap"
        >
          {uploading
            ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> {t('uploading')}</>
            : <><span className="text-lg leading-none font-light">+</span> {t('addAttachment')}</>
          }
        </button>
        <input ref={inputRef} type="file" className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.zip,.rar,.7z,.gz,.tar"
          onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }} />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 text-red-400 text-sm px-4 py-2.5 rounded-xl mb-4">
          ⚠️ {error}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-sm px-4 py-2.5 rounded-xl mb-4">
          {toast}
        </div>
      )}

      {/* Empty state */}
      {attachments.length === 0 && (
        <div className={`flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed transition-all stagger-item ${dragOver ? 'border-indigo-500 bg-indigo-500/5' : 'border-gray-700/60'}`}>
          <div className="text-4xl mb-3 opacity-25">📎</div>
          <p className="text-gray-500 text-sm font-medium">{t('noAttachments')}</p>
          <p className="text-gray-600 text-xs mt-1">
            {lang === 'ru' ? 'Перетащите файл или нажмите «Прикрепить файл»' : 'Drag & drop or click "Attach File"'}
          </p>
        </div>
      )}

      {/* Список всех файлов (включая картинки) */}
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map(a => (
            <div
              key={a.id}
              onClick={() => handleRowClick(a)}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-xl task-bg-gray border card-hover transition-all cursor-pointer stagger-item"
            >
              {/* Иконка типа файла */}
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${fileGradient(a.mime_type)} flex items-center justify-center flex-shrink-0 shadow-sm relative`}>
                {openingId === a.id
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : isImage(a.mime_type)
                    ? <span className="text-white text-lg">🖼️</span>
                    : <span className="text-white text-[10px] font-extrabold leading-none">{fileExt(a.file_name)}</span>
                }
              </div>

              {/* Инфо */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">{a.file_name}</p>
                <p className="text-xs text-gray-500">
                  {fileExt(a.file_name)} · {fmtBytes(a.file_size)} · {a.uploader_name} · {fmtDate(a.created_at, lang)}
                </p>
                {!canPreviewInBrowser(a.mime_type) && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    {lang === 'ru' ? 'Нажмите чтобы скачать' : 'Click to download'}
                  </p>
                )}
              </div>

              {/* Кнопки действий */}
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                {/* Скачать (только для форматов с браузерным превью — у остальных клик уже скачивает) */}
                {canPreviewInBrowser(a.mime_type) && (
                  <button
                    onClick={(e) => handleDownload(a, e)}
                    className="p-1.5 bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-400 rounded-lg transition-all hover-lift btn-modern"
                    title={t('downloadFile')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                )}

                {/* Удалить — только свои файлы, стиль как в My Teams */}
                {a.uploaded_by === currentUserId && (
                  <button
                    onClick={(e) => remove(a.id, e)}
                    disabled={deletingId === a.id}
                    className="p-1.5 bg-red-600 hover:bg-red-700 rounded-lg transition disabled:opacity-50 hover-lift btn-modern"
                    title={t('deleteAttachment')}
                  >
                    {deletingId === a.id
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                      : (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )
                    }
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drag overlay */}
      {dragOver && attachments.length > 0 && (
        <div className="mt-3 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-indigo-500 bg-indigo-500/8 text-indigo-400 text-sm font-medium">
          📎 {lang === 'ru' ? 'Отпустите для загрузки' : 'Drop to upload'}
        </div>
      )}
    </div>
  );
}
