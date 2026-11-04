import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Trash2, 
  X, 
  Check, 
  Lock, 
  History, 
  KeyRound
} from 'lucide-react';
import { Organization, OrgMember, OrgRole, AuditLog } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface OrgManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOrg: Organization | null;
  organizations: Organization[];
  members: OrgMember[];
  currentUserEmail: string;
  currentUserId: string;
  currentUserRole: OrgRole;
  auditLogs: AuditLog[];
  onCreateOrg: (name: string, description: string) => Promise<void>;
  onSelectOrg: (org: Organization) => void;
  onInviteMember: (email: string, role: OrgRole) => Promise<void>;
  onChangeMemberRole: (memberId: string, newRole: OrgRole) => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
}

export const OrgManagerModal: React.FC<OrgManagerModalProps> = ({
  isOpen,
  onClose,
  currentOrg,
  organizations,
  members,
  currentUserEmail,
  currentUserRole,
  auditLogs,
  onCreateOrg,
  onSelectOrg,
  onInviteMember,
  onChangeMemberRole,
  onRemoveMember,
}) => {
  const { t, currentLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<'members' | 'create' | 'audit' | 'switch'>('members');
  
  // New Org Form
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDesc, setNewOrgDesc] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  // Invite Member Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const isOwnerOrAdmin = currentUserRole === 'owner' || currentUserRole === 'admin';

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setIsCreatingOrg(true);
    try {
      await onCreateOrg(newOrgName.trim(), newOrgDesc.trim());
      setNewOrgName('');
      setNewOrgDesc('');
      setActionSuccess(t('orgCreatedSuccess', 'Đã tạo tổ chức mới thành công!'));
      setTimeout(() => setActionSuccess(null), 3000);
      setActiveTab('members');
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    try {
      await onInviteMember(inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setActionSuccess(`${t('memberAddedSuccess', 'Đã thêm thành viên!')} ${inviteEmail}`);
      setTimeout(() => setActionSuccess(null), 3000);
    } finally {
      setIsInviting(false);
    }
  };

  const getRoleBadge = (role: OrgRole) => {
    switch (role) {
      case 'owner':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">{t('roleOwner', 'Chủ sở hữu (Owner)')}</span>;
      case 'admin':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">{t('roleAdmin', 'Quản trị viên (Admin)')}</span>;
      case 'member':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">{t('roleMember', 'Thành viên (Member)')}</span>;
      case 'viewer':
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-500/20 text-slate-300 border border-slate-500/40">{t('roleViewer', 'Người xem (Viewer)')}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {t('orgTitle', 'Cổng Quản trị & Tuân thủ Tổ chức')}
                {currentOrg && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                    {currentOrg.name}
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {t('orgSubtitle', 'Quản lý thành viên, hạn ngạch kiểm toán và chính sách tuân thủ cho doanh nghiệp')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action success alert */}
        {actionSuccess && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-2.5 text-xs text-emerald-300 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400" />
            {actionSuccess}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-6 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('members')}
            className={`py-3 px-4 font-medium text-sm flex items-center gap-2 border-b-2 transition shrink-0 cursor-pointer ${
              activeTab === 'members'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            {t('orgTabMembers', 'Thành viên & Phân quyền')} ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('switch')}
            className={`py-3 px-4 font-medium text-sm flex items-center gap-2 border-b-2 transition shrink-0 cursor-pointer ${
              activeTab === 'switch'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            {t('orgTabSwitch', 'Chuyển Tổ chức')} ({organizations.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`py-3 px-4 font-medium text-sm flex items-center gap-2 border-b-2 transition shrink-0 cursor-pointer ${
              activeTab === 'create'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            {t('orgTabCreate', 'Tạo Tổ chức Mới')}
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 px-4 font-medium text-sm flex items-center gap-2 border-b-2 transition shrink-0 cursor-pointer ${
              activeTab === 'audit'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            {t('orgTabAudit', 'Nhật ký Kiểm toán')}
          </button>
        </div>

        {/* Tab Content: Members & RBAC */}
        {activeTab === 'members' && (
          <div className="p-6 overflow-y-auto space-y-6">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex items-start gap-3">
              <Lock className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 space-y-1">
                <div className="font-semibold text-slate-200 flex items-center gap-2">
                  {t('zeroKnowledge', 'Kiểm soát Truy cập Dựa trên Vai trò (RBAC)')}:
                </div>
                <p className="text-slate-400 leading-relaxed">
                  • <strong>Owner & Admin</strong>: Quản lý thành viên, xem toàn bộ báo cáo nội bộ.<br />
                  • <strong>Member</strong>: Thực hiện quét mới và chia sẻ báo cáo trong nhóm.<br />
                  • <strong>Viewer</strong>: Chỉ có quyền đọc các báo cáo được chia sẻ.
                </p>
              </div>
            </div>

            {isOwnerOrAdmin ? (
              <form onSubmit={handleInvite} className="bg-slate-800/40 border border-slate-700/80 rounded-xl p-4 space-y-3">
                <div className="text-xs font-semibold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-400" />
                  {t('orgTabCreate', 'Thêm thành viên mới')}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <input
                    type="email"
                    required
                    placeholder="Email (vd: security@partner.vn)"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="md:col-span-6 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                    className="md:col-span-3 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="md:col-span-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-4 py-2 text-xs font-semibold transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    {isInviting ? '...' : t('btnInvite', 'Mời tham gia')}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3 bg-slate-800/30 border border-slate-800 rounded-lg text-xs text-slate-400 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-slate-500" />
                <span>{t('roleViewNoticePrefix', 'Bạn đang xem danh sách với quyền')} <strong>{currentUserRole}</strong>.</span>
              </div>
            )}

            {/* Members Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
              <div className="px-4 py-3 bg-slate-900/60 border-b border-slate-800 text-xs font-semibold text-slate-300">
                {t('orgTabMembers', 'Danh sách Thành viên')} ({members.length})
              </div>
              <div className="divide-y divide-slate-800/60">
                {members.map((member) => (
                  <div key={member.id} className="p-4 flex items-center justify-between hover:bg-slate-900/30 transition">
                    <div className="space-y-1">
                      <div className="text-xs font-medium text-white flex items-center gap-2">
                        {member.email}
                        {member.email === currentUserEmail && (
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">You</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(member.joinedAt).toLocaleDateString(currentLanguage.code)}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {isOwnerOrAdmin && member.role !== 'owner' ? (
                        <select
                          value={member.role}
                          onChange={(e) => onChangeMemberRole(member.id, e.target.value as OrgRole)}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        getRoleBadge(member.role)
                      )}

                      {isOwnerOrAdmin && member.role !== 'owner' && (
                        <button
                          onClick={() => onRemoveMember(member.id)}
                          title="Remove"
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Switch Organization */}
        {activeTab === 'switch' && (
          <div className="p-6 overflow-y-auto space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 mb-2">
              {t('orgTabSwitch', 'Chọn tổ chức hoặc doanh nghiệp bạn muốn làm việc')}:
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  onClick={() => {
                    onSelectOrg(org);
                    setActionSuccess(`${t('orgSwitchedSuccess', 'Đã chuyển sang tổ chức:')} ${org.name}`);
                    setTimeout(() => setActionSuccess(null), 3000);
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    currentOrg?.id === org.id
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-400" />
                      {org.name}
                      {currentOrg?.id === org.id && (
                        <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-full font-semibold">
                          {t('langCurrent', 'Đang hoạt động')}
                        </span>
                      )}
                    </div>
                    {org.description && (
                      <p className="text-xs text-slate-400">{org.description}</p>
                    )}
                  </div>
                  <button className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-indigo-600 hover:text-white transition cursor-pointer">
                    {t('histViewAgain', 'Chọn')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content: Create New Organization */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateOrg} className="p-6 overflow-y-auto space-y-4">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300">
              {t('orgSubtitle', 'Tạo tổ chức cho phép bạn mời đội ngũ chuyên viên an ninh mạng, pháp chế, hoặc đối tác doanh nghiệp để thẩm định rủi ro và chia sẻ báo cáo bảo mật.')}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">{t('orgNameLabel', 'Tên Doanh nghiệp / Tổ chức *')}</label>
              <input
                type="text"
                required
                placeholder="TechTrust CyberSec Corp..."
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">{t('orgDescLabel', 'Mô tả')}</label>
              <textarea
                rows={3}
                placeholder={t('orgDescPlaceholder', 'Mô tả phạm vi thẩm định an toàn...')}
                value={newOrgDesc}
                onChange={(e) => setNewOrgDesc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={isCreatingOrg}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              {isCreatingOrg ? '...' : t('orgTabCreate', 'Xác nhận Tạo Tổ chức Mới')}
            </button>
          </form>
        )}

        {/* Tab Content: Audit Log */}
        {activeTab === 'audit' && (
          <div className="p-6 overflow-y-auto space-y-3">
            <div className="text-xs text-slate-400 mb-2">
              {t('tabJsonAudit', 'Nhật ký kiểm toán tuân thủ (Audit Trail)')}:
            </div>
            {auditLogs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800">
                {t('histEmpty', 'Chưa có sự kiện kiểm toán nào được ghi nhận.')}
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl bg-slate-950/50">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 text-xs flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-200">
                        {log.action}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {log.userEmail || log.userId} • {log.details}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleString(currentLanguage.code)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            {t('footerZeroTrust', 'Hệ thống tuân thủ kiểm soát phân quyền ABAC Zero-Trust')}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition cursor-pointer"
          >
            {t('btnCancel', 'Đóng')}
          </button>
        </div>
      </div>
    </div>
  );
};
