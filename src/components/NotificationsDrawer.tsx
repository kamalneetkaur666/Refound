import React from 'react';
import {
  X,
  Bell,
  Sparkles,
  ShieldCheck,
  CheckCircle,
  ExternalLink,
  Trash2,
  CheckCheck,
} from 'lucide-react';
import { UserNotification } from '../types';
import { dataService } from '../services/dataService';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: UserNotification[];
  onOpenMatchModalById: (matchId: string) => void;
  onSelectItemById: (itemId: string) => void;
  onNavigateToMyReports: () => void;
  onNotificationsChanged: () => void;
  userId: string;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onOpenMatchModalById,
  onSelectItemById,
  onNavigateToMyReports,
  onNotificationsChanged,
  userId,
}) => {
  if (!isOpen) return null;

  const handleMarkAllRead = async () => {
    await dataService.markAllNotificationsAsRead(userId);
    onNotificationsChanged();
  };

  const handleNotificationClick = async (n: UserNotification) => {
    await dataService.markNotificationAsRead(n.id);
    onNotificationsChanged();

    if (n.relatedMatchId) {
      onOpenMatchModalById(n.relatedMatchId);
      onClose();
    } else if (n.relatedClaimId) {
      onNavigateToMyReports();
      onClose();
    } else if (n.relatedItemId) {
      onSelectItemById(n.relatedItemId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Top Bar */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Campus Alerts</h2>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-indigo-100 text-indigo-700">
                {notifications.filter((n) => !n.isRead).length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="mark-all-notifications-read-btn"
                onClick={handleMarkAllRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold p-1"
                title="Mark all as read"
              >
                Mark all read
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  id={`notif-item-${n.id}`}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    n.isRead
                      ? 'bg-white border-slate-100 hover:bg-slate-50'
                      : 'bg-indigo-50/60 border-indigo-200/80 hover:bg-indigo-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {n.type === 'match_found' ? (
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      ) : n.type === 'claim_received' ? (
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{n.title}</h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {n.createdAt.split('T')[0]}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {n.message}
                      </p>
                      <span className="text-[11px] font-semibold text-indigo-600 mt-1.5 inline-block">
                        View detail &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 text-sm">
                No notifications yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
