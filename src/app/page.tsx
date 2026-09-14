'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import LoginScreen from '@/components/LoginModal';

// Views
import ExecutiveDashboardView from '@/components/views/ExecutiveDashboardView';
import PartnerPortalView from '@/components/views/PartnerPortalView';
import PartnersView from '@/components/views/PartnersView';
import PortfoliosView from '@/components/views/PortfoliosView';
import TransactionsView from '@/components/views/TransactionsView';
import DepositsWithdrawalsView from '@/components/views/DepositsWithdrawalsView';
import WithdrawalRequestsView from '@/components/views/WithdrawalRequestsView';
import ManagementFeesView from '@/components/views/ManagementFeesView';
import StatementOfAccountView from '@/components/views/StatementOfAccountView';
import ReportsView from '@/components/views/ReportsView';
import AuditLogView from '@/components/views/AuditLogView';
import SettingsView from '@/components/views/SettingsView';

// Modals
import AddPartnerModal from '@/components/AddPartnerModal';
import ValuationModal from '@/components/ValuationModal';
import ManagementFeeCalculatorModal from '@/components/ManagementFeeCalculatorModal';
import WithdrawalRequestModal from '@/components/WithdrawalRequestModal';
import ReviewWithdrawalModal from '@/components/ReviewWithdrawalModal';
import ReverseTxnModal from '@/components/ReverseTxnModal';

import { Partner, Portfolio, Transaction, WithdrawalRequest, ManagementFee } from '@/lib/types';
import { RefreshCw } from 'lucide-react';

export default function Home() {
  const { user, isLoadingUser, currentView, refreshKey } = useApp();

  const [mobileOpen, setMobileOpen] = useState(false);

  // Modal States
  const [isAddPartnerOpen, setIsAddPartnerOpen] = useState(false);
  const [isValuationOpen, setIsValuationOpen] = useState(false);
  const [valuationPartnerId, setValuationPartnerId] = useState<string | null>(null);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [isWithdrawalReqOpen, setIsWithdrawalReqOpen] = useState(false);
  const [reviewRequest, setReviewRequest] = useState<WithdrawalRequest | null>(null);
  const [reverseTxn, setReverseTxn] = useState<Transaction | null>(null);

  // Loaded partners and fees for modals
  const [partners, setPartners] = useState<(Partner & { portfolio?: Portfolio })[]>([]);
  const [existingFees, setExistingFees] = useState<ManagementFee[]>([]);
  const [partnerPortfolio, setPartnerPortfolio] = useState<Portfolio | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetch('/api/partners')
        .then((r) => r.json())
        .then((d) => setPartners(d.partners || []));

      fetch('/api/management-fees')
        .then((r) => r.json())
        .then((d) => setExistingFees(d.management_fees || []));
    } else if (user?.role === 'partner' && user.partner_id) {
      fetch(`/api/partners/${user.partner_id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.partner) setPartnerPortfolio(d.partner.portfolio || null);
        });
    }
  }, [user, refreshKey]);

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="text-sm font-bold">جاري تحميل النظام المالي...</span>
        </div>
      </div>
    );
  }

  // If unauthenticated, show Login Screen
  if (!user) {
    return <LoginScreen />;
  }

  const isAdmin = user.role === 'admin';

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 flex">
      {/* Sidebar Navigation */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:mr-72 transition-all">
        {/* Top Navbar */}
        <Navbar
          setMobileOpen={setMobileOpen}
          openAddPartnerModal={() => setIsAddPartnerOpen(true)}
        />

        {/* Page Views Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Dashboard View */}
          {currentView === 'dashboard' && (
            isAdmin ? (
              <ExecutiveDashboardView
                openAddPartnerModal={() => setIsAddPartnerOpen(true)}
                openValuationModal={() => {
                  setValuationPartnerId(null);
                  setIsValuationOpen(true);
                }}
                openFeeModal={() => setIsFeeModalOpen(true)}
              />
            ) : (
              <PartnerPortalView
                openWithdrawalReqModal={() => setIsWithdrawalReqOpen(true)}
              />
            )
          )}

          {/* Admin Specific Views */}
          {currentView === 'partners' && (
            <PartnersView
              openAddPartnerModal={() => setIsAddPartnerOpen(true)}
              openValuationModal={(id) => {
                setValuationPartnerId(id || null);
                setIsValuationOpen(true);
              }}
            />
          )}

          {currentView === 'portfolios' && (
            <PortfoliosView
              openValuationModal={(id) => {
                setValuationPartnerId(id || null);
                setIsValuationOpen(true);
              }}
            />
          )}

          {currentView === 'transactions' && (
            <TransactionsView
              openReverseModal={(txn) => setReverseTxn(txn)}
            />
          )}

          {currentView === 'deposits_withdrawals' && (
            <DepositsWithdrawalsView />
          )}

          {currentView === 'withdrawal_requests' && (
            <WithdrawalRequestsView
              openReviewModal={(req) => setReviewRequest(req)}
              openWithdrawalReqModal={() => setIsWithdrawalReqOpen(true)}
            />
          )}

          {currentView === 'management_fees' && (
            <ManagementFeesView
              openFeeModal={() => setIsFeeModalOpen(true)}
            />
          )}

          {currentView === 'statement' && (
            <StatementOfAccountView />
          )}

          {currentView === 'reports' && (
            <ReportsView />
          )}

          {currentView === 'audit' && (
            <AuditLogView />
          )}

          {currentView === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <AddPartnerModal
        isOpen={isAddPartnerOpen}
        onClose={() => setIsAddPartnerOpen(false)}
      />

      <ValuationModal
        isOpen={isValuationOpen}
        onClose={() => {
          setIsValuationOpen(false);
          setValuationPartnerId(null);
        }}
        partners={partners}
        initialPartnerId={valuationPartnerId}
      />

      <ManagementFeeCalculatorModal
        isOpen={isFeeModalOpen}
        onClose={() => setIsFeeModalOpen(false)}
        partners={partners}
        existingFees={existingFees}
      />

      <WithdrawalRequestModal
        isOpen={isWithdrawalReqOpen}
        onClose={() => setIsWithdrawalReqOpen(false)}
        portfolio={partnerPortfolio}
      />

      <ReviewWithdrawalModal
        isOpen={!!reviewRequest}
        onClose={() => setReviewRequest(null)}
        request={reviewRequest}
      />

      <ReverseTxnModal
        isOpen={!!reverseTxn}
        onClose={() => setReverseTxn(null)}
        transaction={reverseTxn}
      />
    </div>
  );
}
