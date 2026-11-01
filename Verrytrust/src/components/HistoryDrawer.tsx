import React, { useState } from 'react';
import { 
  History, 
  X, 
  Globe, 
  FileText, 
  Image as ImageIcon, 
  FileCode, 
  Lock, 
  Trash2, 
  Search,
  Sparkles
} from 'lucide-react';
import { ScanReport, TargetType } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedReport } from '../utils/reportLocalizer';
import { getScoreTheme } from '../utils/scoreTheme';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  scans: ScanReport[];
  onSelectScan: (scan: ScanReport) => void;
  onClearHistory: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  scans,
  onSelectScan,
  onClearHistory,
}) => {
  const { t, currentLanguage } = useLanguage();
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const filteredScans = scans.filter((scan) => {
    if (filterType !== 'all' && scan.targetType !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = scan.targetTitle.toLowerCase().includes(q);
      const matchValue = scan.targetValue.toLowerCase().includes(q);
      const matchSummary = scan.summary.toLowerCase().includes(q);
      if (!matchTitle && !matchValue && !matchSummary) return false;
    }
    return true;
  });

  const getTypeIcon = (type: TargetType) => {
    switch (type) {
      case 'url': return <Globe className="w-3.5 h-3.5 text-blue-400" />;
      case 'document': return <FileText className="w-3.5 h-3.5 text-emerald-400" />;
      case 'text': return <FileCode className="w-3.5 h-3.5 text-amber-400" />;
      case 'image': return <ImageIcon className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">{t('histTitle', 'Lịch sử Thẩm định & Xác nhận')}</h3>
              <p className="text-[11px] text-slate-400">
                {scans.length} {t('histSubtitle', 'lượt quét gần đây được lưu trữ an toàn')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search */}
        <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-950/30">
          <div className="relative">
            <input
              type="text"
              placeholder={t('histSearchPlaceholder', 'Tìm kiếm theo tên hoặc URL...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex gap-1.5 overflow-x-auto text-[11px]">
            {['all', 'url', 'document', 'text', 'image'].map((tType) => (
              <button
                key={tType}
                onClick={() => setFilterType(tType)}
                className={`px-2.5 py-1 rounded-lg font-medium transition uppercase shrink-0 cursor-pointer ${
                  filterType === tType
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tType === 'all' ? t('filterAll', 'Tất cả') : tType}
              </button>
            ))}
          </div>
        </div>

        {/* Scan List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredScans.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs space-y-1">
              <History className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p>{t('histEmpty', 'Chưa có lượt quét nào')}</p>
              <p className="text-[11px] text-slate-600">{t('histEmptySub', 'Nhập URL trên trang chính để bắt đầu lưu trữ lịch sử kiểm toán của bạn.')}</p>
            </div>
          ) : (
            filteredScans.map((scan) => (
              <div
                key={scan.id}
                onClick={() => {
                  onSelectScan(scan);
                  onClose();
                }}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 hover:bg-slate-800/60 hover:border-slate-700 cursor-pointer transition space-y-2 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {getTypeIcon(scan.targetType)}
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition">
                      {scan.targetTitle}
                    </h4>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {scan.modelReliability && (
                      <span 
                        title={`Model Reliability: ${scan.modelReliability.score}%`}
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-purple-400" />
                        <span>{scan.modelReliability.score}%</span>
                      </span>
                    )}
                    {(() => {
                      const theme = getScoreTheme(scan.trustScore);
                      return (
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded ${theme.bgColor} ${theme.textColor}`}>
                          {scan.trustScore}/100
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 line-clamp-2">
                  {getLocalizedReport(scan, t, currentLanguage)?.summary || scan.summary}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                  <span>{new Date(scan.createdAt).toLocaleDateString(currentLanguage.code)}</span>
                  <div className="flex items-center gap-2">
                    {scan.isSensitive && (
                      <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                        <Lock className="w-3 h-3" /> {t('sensitiveCheckbox', 'Nhạy cảm')}
                      </span>
                    )}
                    {scan.orgName && (
                      <span className="text-indigo-400">{scan.orgName}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {scans.length > 0 && (
          <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
            <span className="text-slate-500">{scans.length} {t('keyFindings', 'bản ghi')}</span>
            <button
              onClick={onClearHistory}
              className="text-red-400 hover:text-red-300 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t('histClear', 'Xoá lịch sử')}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
