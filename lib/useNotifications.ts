"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import type { Notification, Sektor } from "@/types/notifications";

const TENANT = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";
export const NOTIFICATIONS_QK = ["notifications", TENANT] as const;

interface ApiNotification {
  id: number;
  sender_id: number;
  sender_name: string;
  audience: string[];
  title: string;
  content: string;
  is_read: boolean;
  urgent: boolean;
  is_task: boolean;
  task_done: boolean;
  created_at: string;
}

function toLocal(n: ApiNotification): Notification {
  return {
    id: String(n.id),
    title: n.title,
    message: n.content,
    audience: n.audience as Sektor[],
    urgent: n.urgent,
    isTask: n.is_task,
    taskDone: n.task_done,
    createdAt: n.created_at,
    sentBy: n.sender_name,
  };
}

export function useNotifications() {
  const qc = useQueryClient();

  const { data: apiData = [] } = useQuery<ApiNotification[]>({
    queryKey: NOTIFICATIONS_QK,
    queryFn: ({ signal }) =>
      api.get(`/api/${TENANT}/notifications`, { signal }).then((r) => r.data),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const notifications = apiData.map(toLocal);
  const readIds = apiData.filter((n) => n.is_read).map((n) => String(n.id));
  const unreadCount = apiData.filter((n) => !n.is_read).length;

  const markAllReadMut = useMutation({
    mutationFn: () =>
      api.patch(`/api/${TENANT}/notifications/read-all`).then((r) => r.data),
    onMutate: () => {
      qc.setQueryData<ApiNotification[]>(NOTIFICATIONS_QK, (old) =>
        (old ?? []).map((n) => ({ ...n, is_read: true }))
      );
    },
  });

  const markAllRead = () => markAllReadMut.mutate();

  return { notifications, readIds, unreadCount, markAllRead };
}
