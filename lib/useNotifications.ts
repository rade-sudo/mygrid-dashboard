"use client";

import { useState, useCallback, useEffect } from "react";
import type { Notification, Sektor } from "@/types/notifications";

const STORAGE_KEY = "mg_notifications";
const READ_KEY = "mg_notif_read";

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, val: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(val));
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    load<Notification[]>(STORAGE_KEY, [])
  );
  const [readIds, setReadIds] = useState<string[]>(() =>
    load<string[]>(READ_KEY, [])
  );

  // Sync to localStorage whenever state changes
  useEffect(() => {
    save(STORAGE_KEY, notifications);
  }, [notifications]);

  useEffect(() => {
    save(READ_KEY, readIds);
  }, [readIds]);

  const send = useCallback(
    (
      title: string,
      message: string,
      audience: Sektor[],
      urgent: boolean,
      isTask: boolean
    ) => {
      const newNotif: Notification = {
        id: Date.now().toString(),
        title,
        message,
        audience,
        urgent,
        isTask,
        taskDone: false,
        createdAt: new Date().toISOString(),
        sentBy: "Milan Jovanović",
      };
      setNotifications((prev) => {
        const updated = [newNotif, ...prev].slice(0, 200);
        return updated;
      });
    },
    []
  );

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const allIds = load<Notification[]>(STORAGE_KEY, []).map((n) => n.id);
      const merged = Array.from(new Set([...prev, ...allIds]));
      return merged;
    });
  }, []);

  const toggleTaskDone = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, taskDone: !n.taskDone } : n))
    );
  }, []);

  const deleteNotif = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  const urgentUnread = notifications.filter(
    (n) => n.urgent && !readIds.includes(n.id)
  );

  return {
    notifications,
    unreadCount,
    urgentUnread,
    readIds,
    send,
    markRead,
    markAllRead,
    toggleTaskDone,
    deleteNotif,
  };
}
