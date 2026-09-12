import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { dataService } from './services/dataService';
import { runGeminiMatching } from './services/aiService';
import { ItemReport, PotentialMatch, Claim, UserNotification, ItemType } from './types';
import { Navbar } from './components/Navbar';
import { LandingHero } from './components/LandingHero';
import { BrowseView } from './components/BrowseView';
import { MyReportsView } from './components/MyReportsView';
import { ReportItemWizard } from './components/ReportItemWizard';
import { ItemDetailModal } from './components/ItemDetailModal';
import { ClaimModal } from './components/ClaimModal';
import { MatchComparisonModal } from './components/MatchComparisonModal';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { ProfileModal } from './components/ProfileModal';
import { AuthModal } from './components/AuthModal';
import { FlagModal } from './components/FlagModal';
import { FirebaseConfigModal } from './components/FirebaseConfigModal';
import { isUsingCustomFirebaseConfig } from './firebase/config';
import {
  Compass,
  ShieldCheck,
  Heart,
  ExternalLink,
  Sparkles,
  MapPin,
  Database,
} from 'lucide-react';

function AppContent() {
  const { user } = useAuth();

  // Navigation view state
  const [currentView, setCurrentView] = useState<'home' | 'browse' | 'my-reports'>('home');
  const [browseTypeFilter, setBrowseTypeFilter] = useState<'all' | 'lost' | 'found'>('all');

  // Application Data states
  const [items, setItems] = useState<ItemReport[]>(() => dataService.getItems());
  const [potentialMatches, setPotentialMatches] = useState<PotentialMatch[]>(() => dataService.getMatches());
  const [claims, setClaims] = useState<Claim[]>(() => dataService.getClaims());
  const [notifications, setNotifications] = useState<UserNotification[]>(() =>
    user ? dataService.getNotificationsForUser(user.uid) : []
  );

  // Modals & Drawers
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportDefaultType, setReportDefaultType] = useState<ItemType>('lost');
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<ItemReport | null>(null);
  const [claimModalItem, setClaimModalItem] = useState<ItemReport | null>(null);
  const [activeMatchForModal, setActiveMatchForModal] = useState<PotentialMatch | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const [flagModalItemId, setFlagModalItemId] = useState<string | null>(null);

  // Sync state from dataService
  const refreshData = useCallback(() => {
    setItems(dataService.getItems());
    setPotentialMatches(dataService.getMatches());
    setClaims(dataService.getClaims());
    if (user) {
      setNotifications(dataService.getNotificationsForUser(user.uid));
    }
  }, [user]);

  useEffect(() => {
    const unsub = dataService.subscribe(refreshData);
    refreshData();
    return unsub;
  }, [refreshData]);

  // Open Report Modal with default type
  const handleOpenReportModal = (type: ItemType = 'lost') => {
    setReportDefaultType(type);
    setIsReportModalOpen(true);
  };

  // On Report submission, also run AI matching in the background
  const handleReportSubmitted = async (newItem: ItemReport) => {
    refreshData();
    // Prompt Gemini match evaluation against existing items
    try {
      const allCurrent = dataService.getItems();
      const generated = await runGeminiMatching(newItem, allCurrent);
      if (generated && generated.length > 0) {
        // Switch to the first generated match to delight the user!
        setActiveMatchForModal(generated[0]);
      }
    } catch (e) {
      console.log('Post-submission AI match scan:', e);
    }
  };

  // Open Match Comparison modal
  const handleOpenMatchModal = (match: PotentialMatch) => {
    setActiveMatchForModal(match);
  };

  const handleOpenMatchModalById = (matchId: string) => {
    const found = potentialMatches.find((m) => m.id === matchId);
    if (found) {
      setActiveMatchForModal(found);
    }
  };

  const handleSelectItemById = (itemId: string) => {
    const found = items.find((i) => i.id === itemId);
    if (found) {
      setSelectedItemForDetail(found);
    }
  };

  const handleNavigateBrowse = (typeFilter: 'all' | 'lost' | 'found' = 'all') => {
    setBrowseTypeFilter(typeFilter);
    setCurrentView('browse');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const unreadCount = user ? dataService.getUnreadCount(user.uid) : 0;

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col text-slate-900 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenReportModal={handleOpenReportModal}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenProfileModal={() => setIsProfileModalOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        unreadCount={unreadCount}
      />

      {/* Main Content Areas */}
      <main className="flex-1">
        {currentView === 'home' && (
          <LandingHero
            onNavigateBrowse={handleNavigateBrowse}
            onOpenReportModal={handleOpenReportModal}
            onSelectItem={(item) => setSelectedItemForDetail(item)}
            onOpenMatchModal={handleOpenMatchModal}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            recentItems={items}
            potentialMatches={potentialMatches}
          />
        )}

        {currentView === 'browse' && (
          <BrowseView
            items={items}
            potentialMatches={potentialMatches}
            onSelectItem={(item) => setSelectedItemForDetail(item)}
            onClaimItem={(item) => setClaimModalItem(item)}
            onOpenMatchModal={handleOpenMatchModal}
            onOpenReportModal={handleOpenReportModal}
            initialTypeFilter={browseTypeFilter}
          />
        )}

        {currentView === 'my-reports' && (
          <MyReportsView
            items={items}
            potentialMatches={potentialMatches}
            claims={claims}
            onSelectItem={(item) => setSelectedItemForDetail(item)}
            onOpenMatchModal={handleOpenMatchModal}
            onOpenReportModal={handleOpenReportModal}
            onDataChanged={refreshData}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
          />
        )}
      </main>

      {/* Campus Footer */}
      <footer className="bg-white border-t border-slate-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <Compass className="w-4 h-4" />
                </div>
                <span className="font-bold text-lg text-slate-900">
                  Re<span className="text-indigo-600">Found</span>
                </span>
              </div>
              <p className="text-sm text-slate-500 max-w-md leading-relaxed">
                ReFound is an intelligent, campus-wide lost and found platform that connects students,
                faculty, and staff to recover lost items safely with Gemini AI matching.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                Security &amp; Privacy
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Contact information is never revealed publicly. Ownership must be proven through
                private verification details before any item handover is coordinated.
              </p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
            <p>&copy; 2026 ReFound Campus Network. Designed for university communities.</p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setIsFirebaseModalOpen(true)}
                className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                title="Configure Firebase Project"
              >
                <Database className="w-3.5 h-3.5 text-amber-500" />
                <span>{isUsingCustomFirebaseConfig() ? 'Custom Firebase' : 'Firebase Ready'}</span>
              </button>
              <span className="flex items-center gap-1 text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Verified Campus Safe
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Gemini AI Powered
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {/* 1. Report Item Wizard */}
      <ReportItemWizard
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        defaultType={reportDefaultType}
        onSubmit={async (itemData, privateDetails) => {
          return await dataService.createItem(itemData, privateDetails);
        }}
        onReportSubmitted={handleReportSubmitted}
      />

      {/* 2. Item Detail Modal */}
      <ItemDetailModal
        item={selectedItemForDetail}
        onClose={() => setSelectedItemForDetail(null)}
        onClaim={(item) => {
          setSelectedItemForDetail(null);
          setClaimModalItem(item);
        }}
        onOpenMatchModal={handleOpenMatchModal}
        onItemUpdated={() => {
          refreshData();
          if (selectedItemForDetail) {
            const fresh = dataService.getItemById(selectedItemForDetail.id);
            setSelectedItemForDetail(fresh || null);
          }
        }}
        onOpenFlagModal={(id) => setFlagModalItemId(id)}
        allItems={items}
        potentialMatches={potentialMatches}
      />

      {/* 3. Claim Modal */}
      <ClaimModal
        item={claimModalItem}
        isOpen={Boolean(claimModalItem)}
        onClose={() => setClaimModalItem(null)}
        onClaimSubmitted={() => {
          refreshData();
          setCurrentView('my-reports');
        }}
      />

      {/* 4. Match Comparison Modal */}
      {activeMatchForModal && (
        <MatchComparisonModal
          match={activeMatchForModal}
          lostItem={items.find((i) => i.id === activeMatchForModal.lostItemId) || null}
          foundItem={items.find((i) => i.id === activeMatchForModal.foundItemId) || null}
          isOpen={Boolean(activeMatchForModal)}
          onClose={() => setActiveMatchForModal(null)}
          onClaimFoundItem={(foundItem) => {
            setActiveMatchForModal(null);
            setClaimModalItem(foundItem);
          }}
          onDismissMatch={async (matchId) => {
            await dataService.dismissMatch(matchId);
            refreshData();
          }}
        />
      )}

      {/* 5. Notifications Drawer */}
      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onOpenMatchModalById={handleOpenMatchModalById}
        onSelectItemById={handleSelectItemById}
        onNavigateToMyReports={() => setCurrentView('my-reports')}
        onNotificationsChanged={refreshData}
        userId={user?.uid || ''}
      />

      {/* 6. Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onOpenAuthModal={() => {
          setIsProfileModalOpen(false);
          setIsAuthModalOpen(true);
        }}
        onOpenFirebaseConfig={() => {
          setIsProfileModalOpen(false);
          setIsFirebaseModalOpen(true);
        }}
      />

      {/* 7. Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onOpenFirebaseConfig={() => {
          setIsAuthModalOpen(false);
          setIsFirebaseModalOpen(true);
        }}
      />

      {/* 8. Flag Modal */}
      <FlagModal
        itemId={flagModalItemId}
        isOpen={Boolean(flagModalItemId)}
        onClose={() => setFlagModalItemId(null)}
      />

      {/* 9. Firebase Project Config Modal */}
      <FirebaseConfigModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
