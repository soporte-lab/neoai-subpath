// app/components/useConversations.ts
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export type ChatRole = 'user' | 'assistant' | 'system';

// ✅ NUEVO: estructura de adjuntos opcional por mensaje
export type ChatAttachments = {
  images?: string[]; // dataURLs (comprimidos) o thumbs si prefieres
  docs?: Array<{ id: string; name: string }>; // file_id + nombre
};

export type ChatMessage = {
  role: ChatRole;
  content: string;
  attachments?: ChatAttachments; // ← NUEVO
};

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
};

const STORAGE_KEY = 'neo.conversations.v1';
const MAX_CONV = 10;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function load(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function save(convs: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
  } catch {}
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    setConversations(load());
  }, []);

  const activeId = useMemo(() => {
    try {
      return localStorage.getItem(STORAGE_KEY + '.active') || '';
    } catch { return ''; }
  }, []);
  const [active, setActive] = useState<Conversation | undefined>(undefined);
  const [activeIdState, setActiveIdState] = useState<string>(activeId);

  useEffect(() => {
    const a = conversations.find(c => c.id === activeIdState);
    setActive(a);
  }, [conversations, activeIdState]);

  const setActiveId = useCallback((id: string) => {
    setActiveIdState(id);
    try { localStorage.setItem(STORAGE_KEY + '.active', id); } catch {}
  }, []);

  const createConversation = useCallback((title: string) => {
    const now = Date.now();
    const conv: Conversation = {
      id: uid(),
      title: title || 'New chat',
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    setConversations(prev => {
      const next = [conv, ...prev].slice(0, MAX_CONV);
      save(next);
      return next;
    });
    return conv.id;
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id);
      save(next);
      try {
        const cur = localStorage.getItem(STORAGE_KEY + '.active');
        if (cur === id) {
          localStorage.setItem(STORAGE_KEY + '.active', next[0]?.id || '');
        }
      } catch {}
      return next;
    });
  }, []);

  const renameConversation = useCallback((id: string, title: string) => {
    setConversations(prev => {
      const next = prev.map(c => c.id === id ? { ...c, title, updatedAt: Date.now() } : c);
      save(next);
      return next;
    });
  }, []);

  // ✅ Acepta attachments opcionales
  const appendMessage = useCallback((id: string, msg: ChatMessage) => {
    setConversations(prev => {
      const next = prev.map(c => {
        if (c.id !== id) return c;
        return {
          ...c,
          messages: [...c.messages, msg],
          updatedAt: Date.now(),
        };
      });
      save(next);
      return next;
    });
  }, []);

  const replaceLastAssistantMessage = useCallback((id: string, content: string) => {
    setConversations(prev => {
      const next = prev.map(c => {
        if (c.id !== id) return c;
        const messages = [...c.messages];
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === 'assistant') {
            messages[i] = { ...messages[i], role: 'assistant', content };
            break;
          }
        }
        return { ...c, messages, updatedAt: Date.now() };
      });
      save(next);
      return next;
    });
  }, []);

  return {
    conversations,
    active,
    activeId: activeIdState,
    setActiveId,
    createConversation,
    deleteConversation,
    renameConversation,
    appendMessage,
    replaceLastAssistantMessage,
    MAX_CONV,
  };
}
