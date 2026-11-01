import { TargetType } from '../types';

export interface ScannerPreset {
  labelKey: string;
  defaultLabel: string;
  type: TargetType;
  value: string;
  titleKey: string;
  defaultTitle: string;
  descKey: string;
  defaultDesc: string;
}

export const SCANNER_PRESETS: ScannerPreset[] = [
  {
    labelKey: 'presetPhishingLabel',
    defaultLabel: 'Ngân hàng giả mạo (Phishing)',
    type: 'url',
    value: 'https://vietcombank-xac-thuc-otp-khan-cap.top/login-secure',
    titleKey: 'presetPhishingTitle',
    defaultTitle: 'Trang web mạo danh Ngân hàng Vietcombank',
    descKey: 'presetPhishingDesc',
    defaultDesc: 'Giả mạo giao diện ngân hàng để chiếm đoạt tài khoản'
  },
  {
    labelKey: 'presetEcommerceLabel',
    defaultLabel: 'Cửa hàng Online lừa đảo',
    type: 'url',
    value: 'https://shopee-sale-dong-gia-10k.shop-khuyen-mai-vip.xyz/flash-sale',
    titleKey: 'presetEcommerceTitle',
    defaultTitle: 'Web thương mại điện tử mạo danh Shopee',
    descKey: 'presetEcommerceDesc',
    defaultDesc: 'Chiêu trò giảm giá 90% để thu thập thông tin thẻ'
  },
  {
    labelKey: 'presetToSLabel',
    defaultLabel: 'Điều khoản Dịch vụ ToS bất lợi',
    type: 'document',
    value: `ĐIỀU KHOẢN DỊCH VỤ VÀ CHÍNH SÁCH BẢO MẬT (TRÍCH ĐOẠN ĐÁNG NGỜ):
1. Thu thập dữ liệu: Bằng cách sử dụng ứng dụng, người dùng đồng ý vô điều kiện cho phép chúng tôi truy cập danh bạ, vị trí GPS liên tục, micro và camera ngay cả khi ứng dụng đang đóng.
2. Chuyển giao dữ liệu bên thứ 3: Chúng tôi có quyền bán, thương mại hóa và chuyển nhượng toàn bộ dữ liệu cá nhân của bạn cho bất kỳ đối tác quảng cáo nào mà không cần thông báo trước.
3. Miễn trừ trách nhiệm tuyệt đối: Chúng tôi hoàn toàn không chịu trách nhiệm đối với bất kỳ thiệt hại tài chính, lộ lọt dữ liệu hoặc sự cố mạng nào xảy ra với người dùng.
4. Trọng tài bắt buộc: Người dùng từ bỏ quyền khiếu nại tập thể và quyền đưa tranh chấp ra Tòa án nhân dân có thẩm quyền theo pháp luật Việt Nam.`,
    titleKey: 'presetToSTitle',
    defaultTitle: 'Điều khoản ToS phần mềm tiện ích di động',
    descKey: 'presetToSDesc',
    defaultDesc: 'Hợp đồng điện tử vi phạm Nghị định 13 & quyền riêng tư'
  },
  {
    labelKey: 'presetMisinfoLabel',
    defaultLabel: 'Tin tức giả mạo / Thiên kiến (Deepfake claim)',
    type: 'text',
    value: `CẢNH BÁO KHẨN CẤP: Bộ Y tế vừa ban hành chỉ thị bắt buộc toàn bộ công dân cài đặt ứng dụng theo dõi sinh trắc học mới trong 24 giờ tới, nếu không sẽ bị khóa toàn bộ tài khoản ngân hàng và căn cước công dân. Hãy chia sẻ gấp cho bạn bè người thân trước khi bị chặn!`,
    titleKey: 'presetMisinfoTitle',
    defaultTitle: 'Tin tức giả mạo trên mạng xã hội',
    descKey: 'presetMisinfoDesc',
    defaultDesc: 'Phát tán thông tin bịa đặt gây hoang mang dư luận'
  },
  {
    labelKey: 'presetSafeLabel',
    defaultLabel: 'Doanh nghiệp Hợp chuẩn (Mẫu chuẩn mực)',
    type: 'url',
    value: 'https://fpt.com/vi/ve-fpt/chinh-sach-bao-ve-du-lieu-ca-nhan',
    titleKey: 'presetSafeTitle',
    defaultTitle: 'Chính sách bảo vệ dữ liệu Tập đoàn FPT',
    descKey: 'presetSafeDesc',
    defaultDesc: 'Tuân thủ đầy đủ Nghị định 13 và tiêu chuẩn ISO 27001'
  }
];

export const POPULAR_DOMAINS = [
  'shopee.vn',
  'vietcombank.com.vn',
  'chinhphu.vn',
  'zalo.me',
  'fpt.com',
  'vnexpress.net',
  'tiktok.com',
];

