
import { X, Info, AlertTriangle, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications, Notification } from "@/hooks/useNotifications";

const NotificationIcon = ({ type }: { type: Notification["type"] }) => {
  switch (type) {
    case "warning":
      return <AlertTriangle className="w-5 h-5" />;
    case "success":
      return <CheckCircle className="w-5 h-5" />;
    case "error":
      return <XCircle className="w-5 h-5" />;
    default:
      return <Info className="w-5 h-5" />;
  }
};

const getNotificationStyles = (type: Notification["type"]) => {
  switch (type) {
    case "warning":
      return "bg-yellow-500/90 text-yellow-950 border-yellow-600";
    case "success":
      return "bg-green-500/90 text-green-950 border-green-600";
    case "error":
      return "bg-red-500/90 text-red-950 border-red-600";
    default:
      return "bg-blue-500/90 text-blue-950 border-blue-600";
  }
};

interface NotificationBannerProps {
  isAuthenticated?: boolean;
}

export const NotificationBanner = ({ isAuthenticated = false }: NotificationBannerProps) => {
  const { notifications, dismissNotification } = useNotifications({ isAuthenticated });

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 space-y-2 p-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-center justify-between gap-4 px-4 py-3 rounded-lg border shadow-lg ${getNotificationStyles(
            notification.type
          )}`}
        >
          <div className="flex items-center gap-3 flex-1">
            <NotificationIcon type={notification.type} />
            <div className="flex-1">
              <p className="font-semibold">{notification.title}</p>
              <p className="text-sm opacity-90">{notification.message}</p>
            </div>
            {notification.link_url && (
              <a
                href={notification.link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/20 hover:bg-white/30 font-medium text-sm transition-colors shrink-0"
              >
                {notification.link_text || "En savoir plus"}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 hover:bg-white/20"
            onClick={() => dismissNotification(notification.id)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};

