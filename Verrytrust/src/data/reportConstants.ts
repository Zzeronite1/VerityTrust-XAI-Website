import { MaterialAccessScope } from '../types';

export const DEFAULT_LEGAL_BASIS: string[] = [
  'Luật Trẻ em 2016 (Số 102/2016/QH13)',
  'Điều 29 Luật An ninh mạng 2018',
  'Nghị định 147/2024/NĐ-CP',
  'Bộ luật Dân sự 2015 (Điều 21)'
];

export const DEFAULT_MATERIALS_SCOPE: MaterialAccessScope[] = [
  {
    category: 'articles_news',
    title: 'Bài viết & Tin tức thời sự',
    allowedAgeMin: 0,
    safetyStatus: 'safe_all',
    description: 'Bài viết thông tin được biên tập và rà soát an toàn.',
    guidelines: 'Được phép tiếp cận theo Luật Báo chí.'
  },
  {
    category: 'hyperlinks_redirects',
    title: 'Liên kết chuyển tiếp & Siêu liên kết ngoài',
    allowedAgeMin: 0,
    safetyStatus: 'safe_all',
    description: 'Đường dẫn liên kết được kiểm toán an toàn giao vận.',
    guidelines: 'Không phát hiện liên kết chuyển hướng độc hại.'
  },
  {
    category: 'downloadable_materials',
    title: 'Tài liệu số & Tệp tin tải về (PDF)',
    allowedAgeMin: 0,
    safetyStatus: 'safe_all',
    description: 'Văn bản số và tài liệu công khai có chữ ký số.',
    guidelines: 'An toàn, không chứa mã độc gián điệp.'
  },
  {
    category: 'financial_transactions',
    title: 'Dịch vụ trực tuyến & Hợp đồng số',
    allowedAgeMin: 15,
    safetyStatus: 'requires_supervision',
    description: 'Giao dịch theo quy định của Bộ luật Dân sự.',
    guidelines: 'Người chưa thành niên cần người giám hộ đồng hành.'
  }
];

