import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

export const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const labels = {
    en: {
      notifications: 'Notifications',
      markAllRead: 'Mark all as read',
      noNotifications: 'No notifications yet',
      viewAll: 'View All'
    },
    fr: {
      notifications: 'Notifications',
      markAllRead: 'Tout marquer comme lu',
      noNotifications: 'Aucune notification',
      viewAll: 'Voir tout'
    }
  };

  const t = labels[language as 'en' | 'fr'] ?? labels.en;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const handleNotificationClick = async (notification: any) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
    setOpen(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return '🛒';
      case 'review':
        return '⭐';
      case 'content_approved':
        return '✅';
      case 'content_rejected':
        return '❌';
      case 'report':
        return '🚩';
      case 'support':
        return '💬';
      default:
        return '📢';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-red-500 text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-background border rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-semibold">{t.notifications}</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsRead()}
                className="text-xs gap-1"
              >
                <CheckCheck className="h-3 w-3" />
                {t.markAllRead}
              </Button>
            )}
          </div>

          <ScrollArea className="max-h-80">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {t.noNotifications}
              </div>
            ) : (
              <div className="divide-y">
                {notifications.slice(0, 10).map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full p-3 text-left hover:bg-muted/50 transition-colors ${
                      !notification.is_read ? 'bg-muted/30' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <span className="text-lg">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.is_read ? 'font-medium' : ''}`}>
                          {notification.title}
                        </p>
                        {notification.message && (
                          <p className="text-xs text-muted-foreground truncate">
                            {notification.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-1" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
