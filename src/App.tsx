import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { auth, db, loginWithGoogle, logoutUser, handleFirestoreError, OperationType } from './firebase';
import { ScanReport, 
  Organization, 
  OrgMember, 
  OrgRole, 
  AuditLog, 
  Persona, 
  TargetType 
} from './types';
import { Navbar, NavTab } from './components/Navbar';
import { ScannerInput } from './components/ScannerInput';
import { TrustReportCard } from './components/TrustReportCard';
import { ExtensionModal } from './components/ExtensionModal';
import { OrgManagerModal } from './components/OrgManagerModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { IntroductionView } from './components/IntroductionView';
import { DetailedExplanationView } from './components/DetailedExplanationView';
import { CyberBackgroundCanvas } from './components/CyberBackgroundCanvas';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { LanguageSelectorModal } from './components/LanguageSelectorModal';
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertCircle, 
  CheckCircle2, 
  Lock, 
  Sparkles, 
  Cpu, 
  Globe2, 
  FileCheck,
  Scale,
  ArrowDown,
  Activity,
  Zap
} from 'lucide-react';

function AppContent() {
  const { t, currentLanguage } = useLanguage();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userEmail, setUserEmail] = useState<string>('chuyengia.anninh@techtrust.vn');
  const [userId, setUserId] = useState<string>('user_demo_primary');
  
  // Persona & Navigation states
  const [currentNavTab, setCurrentNavTab] = useState<NavTab>('main');
  const [currentPersona, setCurrentPersona] = useState<Persona>('consumer');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [currentReport, setCurrentReport] = useState<ScanReport | null>(null);
  
  // Organization and RBAC states
  const [organizations, setOrganizations] = useState<Organization[]>([
    {
      id: 'org_techtrust_01',
      name: 'Tập đoàn Thẩm định TechTrust An Ninh Mạng',
      ownerId: 'user_demo_primary',
      description: 'Đơn vị chuyên thẩm định an toàn số, đối tác B2B và tuân thủ Nghị định 13/2023/NĐ-CP',
      createdAt: new Date().toISOString(),
    },
  ]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([
    {
      id: 'mem_1',
      orgId: 'org_techtrust_01',
      userId: 'user_demo_primary',
      email: 'chuyengia.anninh@techtrust.vn',
      role: 'owner',
      joinedAt: new Date().toISOString(),
    },
    {
      id: 'mem_2',
      orgId: 'org_techtrust_01',
      userId: 'user_analyst_2',
      email: 'phapche.doanhnghiep@techtrust.vn',
      role: 'admin',
      joinedAt: new Date().toISOString(),
    },
    {
      id: 'mem_3',
      orgId: 'org_techtrust_01',
      userId: 'user_dev_3',
      email: 'developer.sec@techtrust.vn',
      role: 'member',
      joinedAt: new Date().toISOString(),
    },
    {
      id: 'mem_4',
      orgId: 'org_techtrust_01',
      userId: 'user_audit_4',
      email: 'kiemtoan.b2b@techtrust.vn',
      role: 'viewer',
      joinedAt: new Date().toISOString(),
    },
  ]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: 'log_init',
      orgId: 'org_techtrust_01',
      userId: 'user_demo_primary',
      userEmail: 'chuyengia.anninh@techtrust.vn',
      action: 'Khởi tạo Tổ chức & Thiết lập Phân quyền RBAC',
      details: 'Đã kích hoạt chính sách Zero-Trust và phân loại Báo cáo Nhạy cảm.',
      timestamp: new Date().toISOString(),
    },
  ]);

  // Scan History with localStorage persistence
  const [scans, setScans] = useState<ScanReport[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('veritrust_scans_history');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn('LocalStorage scan parse error:', e);
      }
    }
    return [];
  });

  // Save scans to localStorage whenever updated
  useEffect(() => {
    if (typeof window !== 'undefined' && scans.length > 0) {
      try {
        localStorage.setItem('veritrust_scans_history', JSON.stringify(scans.slice(0, 50)));
      } catch (e) {
        console.warn('LocalStorage scan save error:', e);
      }
    }
  }, [scans]);

  // Modals
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);

  // Determine current user's role in currentOrg
  const currentMember = members.find((m) => m.email.toLowerCase() === userEmail.toLowerCase());
  const currentUserRole: OrgRole = currentMember?.role || 'owner';

  // Initialize Auth & Default Org & Firestore Synchronization
  useEffect(() => {
    setCurrentOrg(organizations[0]);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setUserEmail(firebaseUser.email || 'haihuyenak@gmail.com');
        setUserId(firebaseUser.uid);

        // Sync user profile to Firestore
        try {
          await setDoc(
            doc(db, 'users', firebaseUser.uid),
            {
              id: firebaseUser.uid,
              email: firebaseUser.email || 'haihuyenak@gmail.com',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              photoURL: firebaseUser.photoURL || '',
              createdAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (uErr) {
          console.warn('Firestore user doc sync note:', uErr);
        }

        // Fetch user's persistent scans from Firestore
        try {
          const q = query(
            collection(db, 'scans'),
            where('userId', '==', firebaseUser.uid),
            orderBy('createdAt', 'desc')
          );
          const snap = await getDocs(q);
          const firestoreScans: ScanReport[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.detailsJson) {
              try {
                firestoreScans.push(JSON.parse(data.detailsJson));
              } catch {
                firestoreScans.push(data as any);
              }
            } else {
              firestoreScans.push(data as any);
            }
          });

          if (firestoreScans.length > 0) {
            setScans((prev) => {
              const map = new Map<string, ScanReport>();
              firestoreScans.forEach((s) => map.set(s.id, s));
              prev.forEach((s) => {
                if (!map.has(s.id)) map.set(s.id, s);
              });
              return Array.from(map.values()).sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
            });
          }
        } catch (scansErr) {
          console.warn('Firestore scans query note:', scansErr);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Check URL query parameters for Extension redirect: ?url=...&autoScan=true
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const queryUrl = params.get('url') || params.get('targetValue');
    const autoScan = params.get('autoScan');

    if (queryUrl && autoScan === 'true') {
      handleScan({
        targetType: (params.get('targetType') as TargetType) || 'url',
        targetValue: queryUrl,
        targetTitle: queryUrl,
        isOrgShared: true,
        isSensitive: false,
        engineMode: 'deep',
      });
    }
  }, []);

  // Primary Scan Handler
  const handleScan = async (params: {
    targetType: TargetType;
    targetValue: string;
    targetTitle?: string;
    fileData?: string;
    mimeType?: string;
    isOrgShared: boolean;
    isSensitive: boolean;
    engineMode?: 'simplified' | 'deep';
  }) => {
    setCurrentNavTab('main');
    setIsScanning(true);
    setScanError(null);

    // Smoothly slide down to the URL scan section
    setTimeout(() => {
      document.getElementById('url-scan-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);

    try {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: params.targetType,
          targetValue: params.targetValue,
          targetTitle: params.targetTitle,
          fileData: params.fileData,
          mimeType: params.mimeType,
          persona: currentPersona,
          engineMode: params.engineMode || 'deep',
          lang: currentLanguage.englishName || currentLanguage.name,
        }),
      });

      if (!response.ok) {
        throw new Error(t('btnScanning', 'Máy chủ không phản hồi kịp thời. Vui lòng thử lại.'));
      }

      const reportData = await response.json();
      const newReport: ScanReport = {
        ...reportData,
        id: 'scan_' + Date.now(),
        userId: userId,
        userEmail: userEmail,
        orgId: params.isOrgShared && currentOrg ? currentOrg.id : undefined,
        orgName: params.isOrgShared && currentOrg ? currentOrg.name : undefined,
        isOrgShared: params.isOrgShared,
        isSensitive: params.isSensitive,
        targetType: params.targetType,
        targetTitle: params.targetTitle || reportData.targetTitle || params.targetValue,
        targetValue: params.targetValue,
        createdAt: new Date().toISOString(),
      };

      setCurrentReport(newReport);
      setScans((prev) => [newReport, ...prev]);

      // Persist scan to Firestore if authenticated
      if (userId && auth.currentUser) {
        try {
          await setDoc(doc(db, 'scans', newReport.id), {
            id: newReport.id,
            userId: userId,
            targetType: newReport.targetType,
            trustScore: newReport.trustScore,
            status: newReport.status,
            createdAt: newReport.createdAt,
            targetTitle: (newReport.targetTitle || '').slice(0, 500),
            targetValue: (newReport.targetValue || '').slice(0, 4000),
            summary: (newReport.summary || '').slice(0, 4000),
            detailsJson: JSON.stringify(newReport).slice(0, 95000),
            ...(newReport.orgId ? { orgId: newReport.orgId } : {}),
            isOrgShared: Boolean(newReport.isOrgShared),
            isSensitive: Boolean(newReport.isSensitive),
          });
        } catch (fsErr) {
          console.warn('Firestore scan save notice:', fsErr);
        }
      }

      // Add to audit log if shared with organization
      if (params.isOrgShared && currentOrg) {
        const auditItem: AuditLog = {
          id: 'log_' + Date.now(),
          orgId: currentOrg.id,
          userId: userId,
          userEmail: userEmail,
          action: params.isSensitive ? t('auditActionSensitive', 'Thẩm định Báo cáo Nhạy cảm') : t('auditActionPublic', 'Thẩm định Thực thể Số'),
          resourceType: params.targetType,
          resourceId: newReport.id,
          details: `${t('btnScan', 'Quét')}: ${newReport.targetTitle} (${t('trustScoreLabel', 'Điểm tin cậy')}: ${newReport.trustScore}/100)`,
          timestamp: new Date().toISOString(),
        };
        setAuditLogs((prev) => [auditItem, ...prev]);
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      setScanError(err.message || t('errScanDefault', 'Có lỗi xảy ra khi thẩm định.'));
    } finally {
      setIsScanning(false);
    }
  };

  // Note: Post-scan report localization is handled reactively & synchronously in 0ms (<16ms)
  // by getLocalizedReport in TrustReportCard via parameterized dictionary keys. Zero slow LLM re-translations!

  // Auto-scroll down with smooth animation when report is ready
  useEffect(() => {
    if (currentReport) {
      const timer = setTimeout(() => {
        document.getElementById('scan-result-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [currentReport]);

  // Feedback loop
  const handleSendFeedback = async (type: string, comment: string) => {
    if (!currentReport) return;
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scanId: currentReport.id,
          feedbackType: type,
          comment,
          userEmail,
        }),
      });
    } catch (err) {
      console.error('Feedback error:', err);
    }
  };

  // Organization operations
  const handleCreateOrg = async (name: string, description: string) => {
    const newOrg: Organization = {
      id: 'org_' + Date.now(),
      name,
      ownerId: userId,
      description,
      createdAt: new Date().toISOString(),
    };
    setOrganizations((prev) => [newOrg, ...prev]);
    setCurrentOrg(newOrg);

    const ownerMember: OrgMember = {
      id: 'mem_' + Date.now(),
      orgId: newOrg.id,
      userId: userId,
      email: userEmail,
      role: 'owner',
      joinedAt: new Date().toISOString(),
    };
    setMembers((prev) => [ownerMember, ...prev]);

    setAuditLogs((prev) => [
      {
        id: 'log_' + Date.now(),
        orgId: newOrg.id,
        userId: userId,
        userEmail: userEmail,
        action: 'Tạo Tổ chức mới',
        details: `Đã thành lập tổ chức "${name}"`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const handleInviteMember = async (email: string, role: OrgRole) => {
    if (!currentOrg) return;
    const newMember: OrgMember = {
      id: 'mem_' + Date.now(),
      orgId: currentOrg.id,
      userId: 'user_' + Date.now(),
      email,
      role,
      invitedBy: userEmail,
      joinedAt: new Date().toISOString(),
    };
    setMembers((prev) => [...prev, newMember]);

    setAuditLogs((prev) => [
      {
        id: 'log_' + Date.now(),
        orgId: currentOrg.id,
        userId: userId,
        userEmail: userEmail,
        action: 'Thêm Thành viên',
        details: `Đã mời ${email} với vai trò ${role.toUpperCase()}`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const handleChangeMemberRole = async (memberId: string, newRole: OrgRole) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    );
    if (currentOrg) {
      setAuditLogs((prev) => [
        {
          id: 'log_' + Date.now(),
          orgId: currentOrg.id,
          userId: userId,
          userEmail: userEmail,
          action: 'Thay đổi Phân quyền (RBAC)',
          details: `Đã cập nhật vai trò thành viên thành ${newRole.toUpperCase()}`,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const target = members.find((m) => m.id === memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    if (currentOrg && target) {
      setAuditLogs((prev) => [
        {
          id: 'log_' + Date.now(),
          orgId: currentOrg.id,
          userId: userId,
          userEmail: userEmail,
          action: 'Xóa Thành viên',
          details: `Đã xóa ${target.email} khỏi tổ chức`,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
  };

  const handleLogin = async () => {
    try {
      const loggedUser = await loginWithGoogle();
      if (loggedUser) {
        setUser(loggedUser);
        setUserEmail(loggedUser.email || 'haihuyenak@gmail.com');
        setUserId(loggedUser.uid);
      }
    } catch (err) {
      console.error('Google login failed:', err);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white relative overflow-hidden">
      
      {/* Dynamic Interactive Cyber Particle Network & Ambient Aurora */}
      <CyberBackgroundCanvas />

      {/* Top Navigation: Condensed Bar (Introduction, Main Website, Detailed Explanation) */}
      <Navbar
        currentTab={currentNavTab}
        onChangeTab={setCurrentNavTab}
      />

      {/* Main Body */}
      <main className="flex-1 w-full px-4 sm:px-8 lg:px-12 py-6 sm:py-10 space-y-10 relative z-10">
        
        {/* VIEW 1: INTRODUCTION */}
        {currentNavTab === 'intro' && (
          <div key="intro-view" className="w-full animate-page-enter">
            <IntroductionView
              onGoToMain={() => setCurrentNavTab('main')}
              onGoToExplanation={() => setCurrentNavTab('explanation')}
            />
          </div>
        )}

        {/* VIEW 3: DETAILED EXPLANATION */}
        {currentNavTab === 'explanation' && (
          <div key="explanation-view" className="w-full animate-page-enter">
            <DetailedExplanationView
              onGoToMain={() => setCurrentNavTab('main')}
              onOpenExtensionModal={() => setIsExtensionModalOpen(true)}
              onOpenOrgModal={() => setIsOrgModalOpen(true)}
              onOpenHistory={() => setIsHistoryDrawerOpen(true)}
            />
          </div>
        )}

        {/* VIEW 2: MAIN WEBSITE (SERVES ONLY TO CONFIRM TRANSPARENCY) */}
        {currentNavTab === 'main' && (
          <div key="main-website-view" className="w-full space-y-10 animate-page-enter">
            {/* Hero Section: Confirmation of Transparency with Stunning Floating Badges & Animations */}
            <div className="relative text-center max-w-4xl mx-auto space-y-5 pt-2">

              {/* Floating Holographic Chip - Left (Desktop) */}
              <div className="hidden xl:flex absolute -left-20 top-4 items-center gap-3 p-3.5 rounded-2xl bg-slate-900/85 border border-cyan-500/30 backdrop-blur-md shadow-2xl shadow-cyan-500/10 animate-float-slow z-20 pointer-events-none select-none">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="text-left text-xs">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    {t('zeroKnowledge', 'Zero-Knowledge Enclave')}
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  </div>
                  <div className="text-[11px] text-slate-400">{t('zeroKnowledgeSub', 'Mã hóa đa tầng & Bảo mật số')}</div>
                </div>
              </div>

              {/* Floating Holographic Chip - Right (Desktop) */}
              <div className="hidden xl:flex absolute -right-20 top-4 items-center gap-3 p-3.5 rounded-2xl bg-slate-900/85 border border-blue-500/30 backdrop-blur-md shadow-2xl shadow-blue-500/10 animate-float-reverse z-20 pointer-events-none select-none">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="text-left text-xs">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    {t('xaiEngine', 'Neural Engine')}
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="text-[11px] text-slate-400">{t('xaiEngineSub', 'Minh bạch không hộp đen')}</div>
                </div>
              </div>

              {/* Live Status Beacon Pill */}
              <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-lg shadow-emerald-500/10 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="tracking-wide">{t('systemOnline', 'Hệ thống Trực tuyến • Xác nhận Tính Minh bạch Thời gian Thực')}</span>
              </div>

              {/* Main Headline with Sleek Modern Typography */}
              <h1 className="text-2xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-white leading-[1.2] font-display">
                {t('heroTitle', 'Xác nhận Tính Minh bạch')} <br className="hidden sm:inline" />
                <span className="animate-gradient-text bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent drop-shadow-sm">
                  {t('heroTitleHighlight', 'Chuẩn Mực với Verity')}
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xl mx-auto">
                {t('heroDescription', 'Trang web chính phục vụ duy nhất mục đích xác nhận và chứng thực tính minh bạch, độ an toàn và mức độ tuân thủ pháp lý cho bất kỳ trang web, tên miền, liên kết hoặc thực thể số nào.')}
              </p>

              {/* Dynamic Live Telemetry Counters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto pt-1">
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-md text-center hover:border-cyan-500/40 transition">
                  <div className="text-lg font-black text-cyan-400 tracking-tight">99.8%</div>
                  <div className="text-[11px] text-slate-400 font-medium">{t('statAccuracy', 'Độ chính xác đối chiếu')}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-md text-center hover:border-emerald-500/40 transition">
                  <div className="text-lg font-black text-emerald-400 tracking-tight">100%</div>
                  <div className="text-[11px] text-slate-400 font-medium">{t('statExplainable', 'Không hộp đen')}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-md text-center hover:border-indigo-500/40 transition">
                  <div className="text-lg font-black text-indigo-400 tracking-tight">NĐ 13/2023</div>
                  <div className="text-[11px] text-slate-400 font-medium">{t('statCompliance', 'Tuân thủ pháp lý số')}</div>
                </div>
              </div>

              {/* Informational Callout linking to the other two sections */}
              <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 flex flex-wrap items-center justify-center gap-2 sm:gap-4 backdrop-blur-sm">
                <span>{t('needMoreInfo', 'Cần tìm hiểu thêm?')}</span>
                <button
                  onClick={() => setCurrentNavTab('intro')}
                  className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4 cursor-pointer transition"
                >
                  {t('navIntro', 'Giới thiệu Tổng quan (Introduction)')}
                </button>
                <span>•</span>
                <button
                  onClick={() => setCurrentNavTab('explanation')}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-4 cursor-pointer transition"
                >
                  {t('navExplanation', 'Giải thích Chi tiết Pháp lý, Vận hành & Mã nguồn (Detailed Explanation)')}
                </button>
              </div>

              {/* Quick Jump CTA with slide down animation */}
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('url-scan-section');
                    if (el) {
                      const yOffset = -70;
                      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
                      window.scrollTo({ top: y, behavior: 'smooth' });
                    }
                  }}
                  className="inline-flex items-center gap-2.5 px-7 py-3 rounded-full bg-gradient-to-r from-blue-600/30 via-cyan-500/25 to-blue-600/30 hover:from-blue-600/45 hover:to-cyan-500/40 border border-cyan-500/40 hover:border-cyan-400 text-cyan-200 hover:text-white text-xs font-bold transition-all shadow-xl shadow-cyan-500/15 cursor-pointer group active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span>{t('jumpToScanner', 'Trượt xuống ô Quét URL')}</span>
                  <ArrowDown className="w-4 h-4 text-cyan-400 group-hover:translate-y-1 transition-transform animate-bounce" />
                </button>
              </div>
            </div>

            {/* Input Scanner Container */}
            <ScannerInput
              onScan={handleScan}
              isLoading={isScanning}
              currentPersona={currentPersona}
              onChangePersona={setCurrentPersona}
              currentOrg={currentOrg}
            />

            {/* Scan Error Alert */}
            {scanError && (
              <div className="w-full p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-3 backdrop-blur-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div>
                  <span className="font-bold">{t('errScanPrefix', 'Lỗi thẩm định:')} </span>
                  {scanError}
                </div>
              </div>
            )}

            {/* The Output Trust Report */}
            {currentReport && (
              <div id="scan-result-section" className="w-full scroll-mt-24">
                <TrustReportCard
                  report={currentReport}
                  onSendFeedback={handleSendFeedback}
                />
              </div>
            )}

            {/* Features: The 3-Step Transparency Confirmation Process */}
            {!currentReport && (
              <div className="w-full space-y-5 pt-4">
                <div className="text-center space-y-1.5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                    {t('processTitle', 'Quy trình Xác nhận Tính Minh bạch')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t('processSubtitle', 'Mọi website được xác nhận tự động qua 3 giai đoạn minh bạch, không hộp đen')}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Step 1 */}
                  <div className="group p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/90 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1.5 transition-all duration-300 space-y-3.5 backdrop-blur-md">
                    <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                      <Globe2 className="w-5 h-5" />
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400">{t('step1Tag', 'Bước 1')}</div>
                    <h4 className="font-bold text-white text-base group-hover:text-blue-300 transition-colors">
                      {t('step1Title', 'Thu thập & Đối chiếu')}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {t('step1Desc', 'Quét tên miền, bản ghi DNS, chứng chỉ SSL/TLS, nguồn gốc đăng ký và cơ sở dữ liệu các trang web lừa đảo toàn cầu.')}
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="group p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/90 hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1.5 transition-all duration-300 space-y-3.5 backdrop-blur-md">
                    <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">{t('step2Tag', 'Bước 2')}</div>
                    <h4 className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">
                      {t('step2Title', 'Đánh giá Minh bạch')}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {t('step2Desc', 'Phân tích nội dung, rà soát điều khoản hợp đồng ToS tìm cờ đỏ (red flags), kiểm tra bẫy giá giả mạo và trích xuất bằng chứng đối chiếu.')}
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="group p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/90 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1.5 transition-all duration-300 space-y-3.5 backdrop-blur-md">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">{t('step3Tag', 'Bước 3')}</div>
                    <h4 className="font-bold text-white text-base group-hover:text-emerald-300 transition-colors">
                      {t('step3Title', 'Xác nhận & Cấp Báo cáo')}
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {t('step3Desc', 'Cung cấp Điểm số Tin cậy (Trust Score 0-100), phân loại Rủi ro / An toàn và chuỗi suy luận giải thích được để người dùng quyết định an tâm.')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Footer & Educational Disclaimer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8 text-xs text-slate-500">
        <div className="w-full px-4 sm:px-8 lg:px-12 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              <span className="font-bold text-slate-300">{t('appName', 'Verity')}</span>
              <span>— {t('footerDesc', 'Nền tảng Thẩm định An toàn, Minh bạch & Tuân thủ Pháp lý')}</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span>{t('footerOpenWeb', 'Tra cứu Web Mở (Public Web Inspector)')}</span>
              <span>•</span>
              <span>{t('footerCompliance', 'Nghị định 13/2023/NĐ-CP & GDPR')}</span>
              <span>•</span>
              <span>{t('footerZeroTrust', 'Kiến trúc Zero-Trust & Giải thích Minh bạch')}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-900 pt-4">
            <strong>{t('trustGuarantee', 'Cam kết Minh bạch')}:</strong> {t('heroDescription', 'Verity cung cấp báo cáo đánh giá và phân tích giải thích được mang tính chất tham khảo kỹ thuật, không phải là sự đảm bảo tuyệt đối hoặc lời khuyên pháp lý ràng buộc.')}
          </p>
        </div>
      </footer>

      {/* Browser Extension Modal */}
      <ExtensionModal
        isOpen={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
        onTriggerScanFromExtension={(url) => {
          handleScan({
            targetType: 'url',
            targetValue: url,
            targetTitle: url,
            isOrgShared: true,
            isSensitive: false,
          });
        }}
      />

      {/* Organization Manager Modal */}
      <OrgManagerModal
        isOpen={isOrgModalOpen}
        onClose={() => setIsOrgModalOpen(false)}
        currentOrg={currentOrg}
        organizations={organizations}
        members={members}
        currentUserEmail={userEmail}
        currentUserId={userId}
        currentUserRole={currentUserRole}
        auditLogs={auditLogs}
        onCreateOrg={handleCreateOrg}
        onSelectOrg={(org) => setCurrentOrg(org)}
        onInviteMember={handleInviteMember}
        onChangeMemberRole={handleChangeMemberRole}
        onRemoveMember={handleRemoveMember}
      />

      {/* Scan History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        scans={scans}
        onSelectScan={(scan) => setCurrentReport(scan)}
        onClearHistory={() => {
          setScans([]);
          if (typeof window !== 'undefined') {
            try {
              localStorage.removeItem('veritrust_scans_history');
            } catch (e) {
              console.warn(e);
            }
          }
        }}
      />

      {/* 259 Languages Selector Modal */}
      <LanguageSelectorModal />

    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
