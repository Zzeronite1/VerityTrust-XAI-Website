import React, { useState } from 'react';
import { MessageSquareWarning } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (type: 'false_positive' | 'false_negative' | 'general', comment: string) => Promise<void>;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { t } = useLanguage();
  const [feedbackType, setFeedbackType] = useState<'false_positive' | 'false_negative' | 'general'>('false_positive');
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingFeedback(true);
    try {
      await onSubmit(feedbackType, feedbackComment);
      setFeedbackSuccess(true);
      setTimeout(() => {
        onClose();
        setFeedbackSuccess(false);
        setFeedbackComment('');
      }, 2000);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
        <h4 className="text-base font-bold text-white flex items-center gap-2">
          <MessageSquareWarning className="w-5 h-5 text-amber-400" />
          {t('feedbackModalTitle', 'Gửi Phản hồi Thẩm định')}
        </h4>
        <p className="text-xs text-slate-400">
          {t('feedbackModalSubtitle', 'Phản hồi của bạn giúp huấn luyện và tinh chỉnh các mô hình học máy.')}
        </p>

        {feedbackSuccess ? (
          <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-xs text-emerald-300 text-center font-medium">
            {t('feedbackSuccess', 'Đã ghi nhận phản hồi! Cảm ơn bạn đã đóng góp.')}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-semibold">{t('feedbackReport', 'Loại phản hồi')}:</label>
              <select
                value={feedbackType}
                onChange={(e) => setFeedbackType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="false_positive">{t('feedbackFalsePositive', 'Dương tính giả (Báo động nhầm trang an toàn)')}</option>
                <option value="false_negative">{t('feedbackFalseNegative', 'Âm tính giả (Bỏ sót trang có rủi ro)')}</option>
                <option value="general">{t('feedbackGeneral', 'Góp ý hoặc báo cáo thông tin bổ sung')}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-300 font-semibold">{t('whyHeadline', 'Chi tiết bổ sung')}:</label>
              <textarea
                rows={3}
                placeholder={t('feedbackCommentPlaceholder', 'Mô tả chi tiết bằng chứng hoặc lý do bạn cho rằng kết quả cần hiệu chỉnh...')}
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                {t('btnCancel', 'Hủy bỏ')}
              </button>
              <button
                type="submit"
                disabled={isSubmittingFeedback}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                {isSubmittingFeedback ? '...' : t('btnSubmitFeedback', 'Gửi Phản hồi')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

