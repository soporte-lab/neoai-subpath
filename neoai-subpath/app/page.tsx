'use client';

import { getSession, getLimits, type SessionResp, type LimitsResp } from "../lib/wpFetch";
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';

/* =================== Ajustes WP =================== */
const WP_BASE = 'https://neorejuvenai.com';
const SESSION_URL = `${WP_BASE}/wp-json/neoai/v1/session`;
const LOGIN_URL = `${WP_BASE}/wp-login.php`;
const MEMBERSHIP_URL = `${WP_BASE}/membership-account/membership-levels/`; // <-- ajusta si usas otra URL

/* ============ i18n mínimo (autodetección) ============ */
function getBrowserLang(): string {
  if (typeof navigator === 'undefined') return 'es';
  const code = navigator.language || 'es';
  return code.split('-')[0].toLowerCase();
}
const I18N = {
  es: {
    greeting: 'Hola, ¿en qué puedo ayudarte hoy?',
    placeholder: 'Escribe un mensaje...',
    rec: 'Grabando… toca para parar',
    micTip: 'Grabar por voz',
    checkingAccess: 'Comprobando acceso…',
    needMembership: 'Necesitas una membresía activa para usar esta función.',
    viewPlans: 'Ver planes de membresía',
    retry: 'Reintentar',
  },
  en: {
    greeting: 'Hi, how can I help you today?',
    placeholder: 'Type a message...',
    rec: 'Recording… tap to stop',
    micTip: 'Voice input',
    checkingAccess: 'Checking access…',
    needMembership: 'You need an active membership to use this feature.',
    viewPlans: 'View membership plans',
    retry: 'Retry',
  },
  fr: {
    greeting: "Bonjour, comment puis-je vous aider aujourd'hui ?",
    placeholder: 'Écrivez un message...',
    rec: 'Enregistrement… touchez pour arrêter',
    micTip: 'Saisie vocale',
    checkingAccess: "Vérification de l'accès…",
    needMembership: 'Vous avez besoin d’un abonnement actif pour utiliser cette fonctionnalité.',
    viewPlans: "Voir les abonnements",
    retry: 'Réessayer',
  },
  it: {
    greeting: 'Ciao, come posso aiutarti oggi?',
    placeholder: 'Scrivi un messaggio...',
    rec: 'Registrazione… tocca per fermare',
    micTip: 'Dettatura vocale',
    checkingAccess: 'Verifica dell’accesso…',
    needMembership: 'Hai bisogno di un abbonamento attivo per usare questa funzione.',
    viewPlans: 'Vedi piani',
    retry: 'Riprova',
  },
  de: {
    greeting: 'Hallo, wie kann ich dir heute helfen?',
    placeholder: 'Schreibe eine Nachricht...',
    rec: 'Aufnahme… tippen zum Stoppen',
    micTip: 'Spracheingabe',
    checkingAccess: 'Zugriff wird geprüft…',
    needMembership: 'Für diese Funktion brauchst du eine aktive Mitgliedschaft.',
    viewPlans: 'Mitgliedschaften ansehen',
    retry: 'Erneut versuchen',
  },
  pt: {
    greeting: 'Olá, como posso ajudar você hoje?',
    placeholder: 'Escreva uma mensagem...',
    rec: 'Gravando… toque para parar',
    micTip: 'Entrada por voz',
    checkingAccess: 'Verificando acesso…',
    needMembership: 'Você precisa de uma assinatura ativa para usar este recurso.',
    viewPlans: 'Ver planos',
    retry: 'Tentar novamente',
  },
} as const;

function useLocale() {
  const forced = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const p = new URLSearchParams(window.location.search);
    return (p.get('lang') || '').toLowerCase();
  }, []);
  const lang = (forced || getBrowserLang()) as keyof typeof I18N;
  const t = I18N[lang] ?? I18N.es;
  return { lang: (I18N[lang] ? lang : 'es') as string, ...t };
}

/* =================== Iconos =================== */
function IconPlus(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconMic(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 1 1-6 0V6a3 3 0 0 1 3-3Z" stroke="currentColor" strokeWidth="2"/>
      <path d="M19 11a7 7 0 1 1-14 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 18v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
function IconSend(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M4 20l16-8L4 4v5l10 3-10 3v5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  );
}

/* =================== Gating (login + membresía) =================== */
function Gate({ children }: { children: React.ReactNode }) {
  const { checkingAccess, needMembership, viewPlans, retry } = useLocale();
  const [state, setState] = useState<'checking'|'allow'|'upgrade'|'error'>('checking');

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch(SESSION_URL, { credentials: 'include' });
      const data = await res.json();

      if (!data?.authenticated) {
        const back = encodeURIComponent(window.location.href);
        window.location.href = `${LOGIN_URL}?redirect_to=${back}`;
        return;
      }
      if (data?.rcp_active === false) {
        setState('upgrade');
      } else {
        setState('allow');
      }
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => { void checkSession(); }, [checkSession]);

  if (state === 'checking') {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-neutral-950 text-neutral-300">
        <span>{checkingAccess}</span>
      </div>
    );
  }
  if (state === 'upgrade') {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-neutral-950 text-neutral-100">
        <div className="max-w-md text-center px-6">
          <h2 className="text-xl mb-3">{needMembership}</h2>
          <a
            className="inline-block mt-2 px-4 py-2 rounded-lg border border-neutral-700 hover:bg-neutral-900"
            href={MEMBERSHIP_URL}
          >
            {viewPlans}
          </a>
        </div>
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-neutral-950 text-neutral-100">
        <div className="text-center">
          <p className="mb-3">No se pudo verificar el acceso.</p>
          <button
            onClick={() => { setState('checking'); void checkSession(); }}
            className="px-4 py-2 rounded-lg border border-neutral-700 hover:bg-neutral-900"
          >
            {retry}
          </button>
        </div>
      </div>
    );
  }

  // state === 'allow'
  return <>{children}</>;
}

/* =================== Tipos para un ÚNICO chat =================== */
type ChatRole = 'user' | 'assistant';
type ChatMessage = {
  role: ChatRole;
  content: string;
  attachments?: {
    images?: string[]; // dataURLs comprimidos
    docs?: Array<{ id: string; name: string }>; // file_id + nombre original
  };
};

/* =================== UI principal del chat =================== */
function ChatUI() {
  const { greeting, placeholder, rec, micTip } = useLocale();

  // Un único hilo (NO persiste conversaciones)
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Estado UI
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  // Mic
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recDuration, setRecDuration] = useState(0); // seg
  const recTimerRef = useRef<number | null>(null);

  // AudioContext/stream buffers
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);

  // Archivos seleccionados antes de enviar
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [docIds, setDocIds] = useState<string[]>([]);
  const [pendingDocs, setPendingDocs] = useState<Array<{id:string; name:string}>>([]);
  const [docBusy, setDocBusy] = useState(false);

  // ✅ Textos inline de .txt/.md/.csv (para que SIEMPRE se lean)
  const [inlineTexts, setInlineTexts] = useState<string[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll al fondo cuando cambie la conversación
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' });
  }, [messages]);

  /* =================== Utilidades archivos =================== */
  function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = () => rej('read error');
      fr.onload = () => res(String(fr.result));
      fr.readAsDataURL(file);
    });
  }

  function readFileAsText(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = () => rej('read error');
      fr.onload = () => res(String(fr.result || ''));
      fr.readAsText(file);
    });
  }

  async function compressImageToDataURL(file: File, maxDim = 1024, quality = 0.82): Promise<string> {
    const raw = await readFileAsDataURL(file);
    const img = document.createElement('img');
    await new Promise<void>((ok, err) => {
      img.onload = () => ok();
      img.onerror = err;
      img.src = raw;
    });
    const { width, height } = img;
    const scale = Math.min(1, maxDim / Math.max(width, height));
    if (scale >= 1) return raw;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  }

  // Único input para imágenes + documentos
  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || []);
    if (!picked.length) return;

    const imgs: File[] = [];
    const docs: File[] = [];
    const isDocByExt = (name: string) => {
      const dot = name.lastIndexOf('.');
      const ext = dot >= 0 ? name.slice(dot).toLowerCase() : '';
      return ['.pdf', '.doc', '.docx', '.txt', '.csv', '.md', '.rtf'].includes(ext);
    };

    for (const f of picked) {
      if (f.type?.startsWith('image/')) imgs.push(f);
      else if (!f.type || isDocByExt(f.name)) docs.push(f);
      else docs.push(f);
    }

    // Imágenes → preview local
    if (imgs.length) {
      setImages(prev => [...prev, ...imgs]);
      const newPreviews = await Promise.all(imgs.map(f => readFileAsDataURL(f)));
      setPreviews(prev => [...prev, ...newPreviews]);
    }

    // Docs → (1) capturar texto inline si es .txt/.md/.csv  (2) subir a /api/files para tener file_id
    if (docs.length) {
      setDocBusy(true);
      try {
        for (const f of docs) {
          if (f.size > 20 * 1024 * 1024) continue; // 20MB

          // (1) capturar texto inline para formatos de texto plano
          const name = (f.name || '').toLowerCase();
          const isTextDoc =
            /\.txt$/.test(name) || /\.md$/.test(name) || /\.csv$/.test(name) || f.type === 'text/plain';
          if (isTextDoc) {
            try {
              const txt = await readFileAsText(f);
              if (txt && txt.trim()) setInlineTexts(prev => [...prev, txt]);
            } catch { /* ignorar lectura local fallida */ }
          }

          // (2) subida normal a tu API (que a su vez sube a OpenAI Files)
          const form = new FormData();
          form.append('file', f, f.name);
          const r = await fetch('/api/files', { method: 'POST', body: form });
          const j = await r.json().catch(() => ({}));
          if (r.ok && j?.ok && j.file_id) {
            setDocIds(prev => [...prev, j.file_id]);
            setPendingDocs(prev => [...prev, { id: j.file_id, name: f.name }]);
          }
        }
      } finally {
        setDocBusy(false);
      }
    }

    // Limpia el input para poder volver a seleccionar el mismo archivo
    if (e.target) e.target.value = '';
  }

  // ====== AUDIO: WAV recorder usando ScriptProcessor (compatibilidad amplia)
  function startRecording() {
    if (recording) return;
    setRecDuration(0);
    chunksRef.current = [];

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;

        const bufferSize = 4096; // 2048/4096 estable
        const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e: AudioProcessingEvent) => {
          const inputBuf = e.inputBuffer.getChannelData(0);
          chunksRef.current.push(new Float32Array(inputBuf)); // copia frame
        };

        source.connect(processor);
        processor.connect(ctx.destination); // necesario en Safari

        // Timer de duración
        if (recTimerRef.current) window.clearInterval(recTimerRef.current);
        recTimerRef.current = window.setInterval(() => setRecDuration((s) => s + 1), 1000);

        setRecording(true);
      } catch (err: any) {
        alert('No se pudo acceder al micrófono: ' + (err?.message || String(err)));
      }
    })();
  }

  function stopRecording() {
    if (!recording) return;
    setRecording(false);

    // Parar timer
    if (recTimerRef.current) {
      window.clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }

    // Detener audio graph
    try { processorRef.current?.disconnect(); } catch {}
    try { sourceRef.current?.disconnect(); } catch {}
    try { audioCtxRef.current?.close(); } catch {}

    // Parar tracks
    try { mediaStreamRef.current?.getTracks().forEach(t => t.stop()); } catch {}

    // Construir WAV y transcribir
    const wavBlob = encodeWavFromChunks(chunksRef.current, audioCtxRef.current?.sampleRate || 44100);
    chunksRef.current = [];
    void transcribe(wavBlob);
  }

  async function transcribe(wavBlob: Blob) {
    setTranscribing(true);
    try {
      const form = new FormData();
      form.append('audio', wavBlob, 'recording.wav');

      const r = await fetch('/api/transcribe', { method: 'POST', body: form });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j?.ok) {
        setInput(prev => (prev ? (prev.trim() + ' ' + (j.text || '').trim()) : (j.text || '').trim()));
      } else {
        alert(`Error transcribiendo: ${j?.error || r.status}`);
      }
    } catch (e: any) {
      alert('Error transcribiendo: ' + (e?.message || String(e)));
    } finally {
      setTranscribing(false);
    }
  }

  // PCM Float32 -> WAV (16-bit PCM mono)
  function encodeWavFromChunks(chunks: Float32Array[], sampleRate: number) {
    const totalLen = chunks.reduce((a, c) => a + c.length, 0);
    const data = new Float32Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
      data.set(c, offset);
      offset += c.length;
    }

    const pcm16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) {
      let s = Math.max(-1, Math.min(1, data[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    const bytesPerSample = 2;
    const blockAlign = 1 * bytesPerSample;
    const byteRate = sampleRate * blockAlign;

    const buffer = new ArrayBuffer(44 + pcm16.byteLength);
    const view = new DataView(buffer);

    function writeString(v: DataView, offset: number, str: string) {
      for (let i = 0; i < str.length; i++) v.setUint8(offset + i, str.charCodeAt(i));
    }

    let p = 0;
    writeString(view, p, 'RIFF'); p += 4;
    view.setUint32(p, 36 + pcm16.byteLength, true); p += 4;
    writeString(view, p, 'WAVE'); p += 4;
    writeString(view, p, 'fmt '); p += 4;
    view.setUint32(p, 16, true); p += 4;           // PCM chunk size
    view.setUint16(p, 1, true); p += 2;            // audio format = 1 (PCM)
    view.setUint16(p, 1, true); p += 2;            // channels = 1 (mono)
    view.setUint32(p, sampleRate, true); p += 4;   // sample rate
    view.setUint32(p, byteRate, true); p += 4;     // byte rate
    view.setUint16(p, blockAlign, true); p += 2;   // block align
    view.setUint16(p, 16, true); p += 2;           // bits per sample
    writeString(view, p, 'data'); p += 4;
    view.setUint32(p, pcm16.byteLength, true); p += 4;

    new Uint8Array(buffer, 44).set(new Uint8Array(pcm16.buffer));
    return new Blob([buffer], { type: 'audio/wav' });
  }

  // Reemplaza el contenido del último mensaje del asistente (stream)
  function replaceLastAssistantMessage(content: string) {
    setMessages(prev => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === 'assistant') {
          next[i] = { ...next[i], content };
          break;
        }
      }
      return next;
    });
  }

  // Enviar
  async function send() {
    const nothingToSend = !input.trim() && images.length === 0 && docIds.length === 0 && inlineTexts.length === 0;
    if (nothingToSend || busy) return;
    setBusy(true);

    // Preparar imágenes para API y para guardar en el mensaje
    let imageDataUrls: string[] = [];
    if (images.length) {
      imageDataUrls = await Promise.all(images.map(f => compressImageToDataURL(f)));
    }

    // 1) Añadimos mensaje de usuario al hilo (incluye adjuntos)
    const userMsg: ChatMessage = {
      role: 'user',
      content: input || (images.length ? '(imagen adjunta)' : (docIds.length || inlineTexts.length ? '(documento adjunto)' : '')),
      attachments: {
        images: imageDataUrls.length ? imageDataUrls : undefined,
        docs: pendingDocs.length ? pendingDocs : undefined,
      },
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // 2) Construir "historial" para el backend (solo mensajes previos + este)
    const history = [...messages, userMsg];

    // 3) Llamada al backend
    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: history,
        images: imageDataUrls,
        file_ids: docIds,         // PDFs se mandan como input_file
        inline_texts: inlineTexts // TXT/MD/CSV se incrustan como input_text
      }),
    });

    // Limpia selección local (los adjuntos ya quedaron “pegados” en el userMsg)
    setImages([]); setPreviews([]);
    setDocIds([]); setPendingDocs([]);
    setInlineTexts([]); // 👈 importante

    if (!resp.ok || !resp.body) {
      const text = await resp.text().catch(() => `HTTP ${resp.status}`);
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Error: ${text}` }]);
      setBusy(false);
      return;
    }

    // 4) Streaming SSE → vamos acumulando en el último mensaje assistant
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let pending = '';
    let assistantContent = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });

      const lines = pending.split('\n');
      pending = lines.pop() ?? '';
      for (const line of lines) {
        const m = line.match(/^data:\s*(.*)$/);
        if (!m) continue;
        const payload = m[1];
        if (payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload);
          if (json.type === 'response.output_text.delta' && typeof json.delta === 'string') {
            assistantContent += json.delta;
            replaceLastAssistantMessage(assistantContent);
          }
          if (!json.type && typeof json.output_text === 'string') {
            assistantContent += json.output_text;
            replaceLastAssistantMessage(assistantContent);
          }
        } catch {
          /* ignora líneas no parseables */
        }
      }
    }

    setBusy(false);
    scrollRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' });
  }

  const micDisabled = busy || docBusy || transcribing;

  return (
    <div className="h-[100dvh] flex bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* ====== Chat (pantalla completa, sin sidebar) ====== */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-neutral-800 shrink-0">
          <div className="h-16 md:h-20 flex items-center justify-center relative">
            <h1 className="leading-none text-3xl sm:text-4xl font-normal text-white" style={{ fontFamily: 'var(--font-oswald)' }}>
              NeoRejuven<span className="ml-1 bg-[linear-gradient(to_right,#0066c1,#00d1fa)] bg-clip-text text-transparent">AI</span>
            </h1>
          </div>
        </header>

        {/* Área de mensajes */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
          style={{ paddingBottom: '6.5rem' }}
        >
          {messages.length === 0 && (
            <div className="opacity-70 text-sm text-center">
              {greeting}
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'text-right' : ''}>
              <div className={`inline-block max-w-[80%] rounded-2xl px-4 py-2 whitespace-pre-wrap ${
                m.role === 'user' ? 'bg-blue-600' : 'bg-neutral-800'
              }`}>
                {m.content}

                {/* Adjuntos persistentes por mensaje */}
                {!!m.attachments?.images?.length && (
                  <div className="flex gap-2 flex-wrap pt-2">
                    {m.attachments.images.map((src, idx) => (
                      <img
                        key={idx}
                        src={src}
                        alt={`img-${idx}`}
                        className="h-20 w-20 object-cover rounded-lg border border-neutral-800"
                      />
                    ))}
                  </div>
                )}

                {!!m.attachments?.docs?.length && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {m.attachments.docs.map((d) => (
                      <span
                        key={d.id}
                        className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-md bg-black/30 border border-neutral-700"
                        title={d.name}
                      >
                        📄 <span className="truncate max-w-[12rem]">{d.name}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Previews de imágenes aún no enviadas */}
          {previews.length > 0 && (
            <div className="flex gap-2 flex-wrap pt-2">
              {previews.map((src, idx) => (
                <img key={idx} src={src} alt={`preview-${idx}`} className="h-20 w-20 object-cover rounded-lg border border-neutral-800"/>
              ))}
            </div>
          )}

          {/* Chips de docs aún no enviados */}
          {pendingDocs.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {pendingDocs.map(d => (
                <span key={d.id} className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-md bg-neutral-800/60 border border-neutral-700">
                  📄 {d.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div
          className="border-t border-neutral-800 bg-neutral-950/95 backdrop-blur sticky bottom-0 left-0 right-0"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.5rem)' }}
        >
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-3">
            <div className="relative flex items-center">
              {/* ÚNICO botón: imágenes y documentos */}
              <label
                aria-label="Adjuntar archivos"
                className="absolute left-2 inline-flex items-center justify-center w-8 h-8 rounded-lg text-neutral-300 hover:text-white bg-transparent hover:bg-white/10 cursor-pointer select-none transition"
                title="Adjuntar archivos"
              >
                <IconPlus className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,text/markdown,application/rtf"
                  multiple
                  hidden
                  onChange={onPickFiles}
                  disabled={busy || docBusy}
                />
              </label>

              {/* Texto */}
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => setTimeout(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: 'smooth' }), 50)}
                placeholder={placeholder}
                className="w-full bg-neutral-900 rounded-xl py-3 outline-none text-neutral-100 placeholder:text-neutral-400"
                style={{ paddingLeft: '3rem', paddingRight: '6.5rem' }}
                disabled={busy}
              />

              {/* Botón Mic (grabar/parar) */}
              <button
                type="button"
                aria-label="Mic"
                title={micTip}
                disabled={busy || docBusy || transcribing}
                onClick={() => (recording ? stopRecording() : startRecording())}
                className={`absolute right-12 inline-flex items-center justify-center w-8 h-8 rounded-lg
                  ${recording ? 'text-white bg-red-600 hover:bg-red-500' : 'text-neutral-300 hover:text-white bg-transparent hover:bg-white/10'}
                  disabled:opacity-50 transition`}
              >
                <IconMic className="w-5 h-5" />
              </button>

              {/* Botón Enviar */}
              <button
                type="submit"
                aria-label="Enviar"
                title={transcribing ? 'Transcribiendo…' : 'Enviar'}
                disabled={busy}
                className="absolute right-2 inline-flex items-center justify-center w-8 h-8 rounded-lg text-neutral-300 hover:text-white bg-transparent hover:bg-white/10 disabled:opacity-50 transition"
              >
                <IconSend className="w-5 h-5" />
              </button>
            </div>

            {/* Indicadores grabación / transcripción */}
            <div className="mt-2 text-xs text-neutral-300 flex items-center gap-3">
              {recording && <span>🔴 {rec} ({recDuration}s)</span>}
              {transcribing && <span>⏳ Transcribiendo…</span>}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

/* =================== Página =================== */
export default function Page() {
  return (
    <Gate>
      <ChatUI />
    </Gate>
  );
}
