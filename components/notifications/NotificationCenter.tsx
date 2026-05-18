"use client";

import React, { useState } from "react";
import NotificationBell from "./NotificationBell";
import SendNotificationModal from "./SendNotificationModal";
import HistoryModal from "./HistoryModal";
import { useNotifications } from "@/lib/useNotifications";

export default function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    readIds,
    send,
    markRead,
    markAllRead,
    toggleTaskDone,
    deleteNotif,
  } = useNotifications();

  const [sendOpen, setSendOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const handleSendNew = () => {
    setHistoryOpen(false);
    setSendOpen(true);
  };

  return (
    <>
      <NotificationBell
        notifications={notifications}
        unreadCount={unreadCount}
        readIds={readIds}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        onOpenSend={() => setSendOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      <SendNotificationModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        onSend={send}
      />

      <HistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        notifications={notifications}
        readIds={readIds}
        onDelete={deleteNotif}
        onToggleTask={toggleTaskDone}
        onSendNew={handleSendNew}
        onMarkRead={markRead}
      />
    </>
  );
}
