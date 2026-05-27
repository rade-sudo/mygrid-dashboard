"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import NotificationBell from "./NotificationBell";
import SendNotificationModal from "./SendNotificationModal";
import { useNotifications, NOTIFICATIONS_QK } from "@/lib/useNotifications";
import { getRole } from "@/lib/auth";
import api from "@/lib/axios";
import type { Sektor } from "@/types/notifications";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

export default function NotificationCenter() {
  const { notifications, readIds, unreadCount, markAllRead } = useNotifications();
  const [sendOpen, setSendOpen] = useState(false);
  const qc = useQueryClient();
  const isVlasnik = getRole() === "vlasnik";

  const sendMut = useMutation({
    mutationFn: (p: {
      title: string;
      content: string;
      audience: string[];
      urgent: boolean;
      is_task: boolean;
    }) => api.post(`/api/${TENANT}/notifications`, p).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: NOTIFICATIONS_QK }),
  });

  const handleSend = (
    title: string,
    message: string,
    audience: Sektor[],
    urgent: boolean,
    isTask: boolean
  ) => {
    sendMut.mutate({ title, content: message, audience, urgent, is_task: isTask });
  };

  return (
    <>
      <NotificationBell
        notifications={notifications}
        readIds={readIds}
        unreadCount={unreadCount}
        onMarkAllRead={markAllRead}
        onOpenSend={() => setSendOpen(true)}
      />
      <SendNotificationModal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        isVlasnik={isVlasnik}
        onSend={handleSend}
      />
    </>
  );
}
