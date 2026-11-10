/**
 * Bộ sinh dữ liệu huấn luyện cho mô hình nội dung trang (scripts/train-content-model.ts).
 *
 * Dữ liệu được "chưng cất" từ hiểu biết về các chiến dịch lừa đảo phổ biến (đặc biệt tại Việt Nam) và các loại
 * trang hợp pháp thường gặp. Mỗi kịch bản là một ngữ pháp sinh câu với thành phần ngẫu nhiên, kèm phân phối
 * đặc trưng cấu trúc (form, ô mật khẩu, liên kết...) CHỒNG LẤN giữa hai lớp, buộc mô hình phải dựa vào nội dung:
 * - trang đăng nhập hợp pháp cũng có ô mật khẩu; trang phishing dựng bằng JS có thể gần như rỗng
 * - "mẫu khó": báo chí viết VỀ lừa đảo/cờ bạc, khuyến mãi thật, tin tức crypto, tuyển dụng thật
 *
 * Đây là văn bản mô tả (không phải mã HTML/biểu mẫu hoạt động được) và chỉ dùng để huấn luyện bộ phát hiện.
 */

export interface StructFeatures {
  hasPasswordField: boolean;
  sensitiveFields: string[];
  externalFormAction: boolean;
  telegramExfiltration: boolean;
  formCount: number;
  textLength: number;
  linkCount: number;
  nullLinkRatio: number;
  externalLinkRatio: number;
  iframeCount: number;
  obfuscationSignals: number;
  moitBadge: boolean;
  taxId: boolean;
  contactInfo: boolean;
  policyLinks: boolean;
  botChallenge: boolean;
}

export interface CorpusSample extends StructFeatures {
  title: string;
  description: string;
  text: string;
  label: 0 | 1;
  theme: string;
  lang: 'vi' | 'en';
}

// ---------------------------------------------------------------------------- tiện ích ngẫu nhiên có seed
let state = 20261107;
export function seedCorpus(seed: number) {
  state = seed >>> 0 || 1;
}
const rnd = () => {
  state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
  return (state >>> 0) / 4294967296;
};
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const maybe = (p: number) => rnd() < p;
const between = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const some = <T>(arr: readonly T[], min: number, max: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  const n = Math.min(copy.length, between(min, max));
  for (let i = 0; i < n; i++) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  return out;
};
const money = () => pick(['5.000', '9.000', '12.000', '15.000', '19.000', '25.000', '30.000', '49.000', '99.000']);
const bigMoney = () => pick(['500.000', '1.000.000', '2.000.000', '5.000.000', '10.000.000', '50.000.000', '100.000.000']);
const hours = () => pick(['2', '6', '12', '24', '48']);
const phone = () => `0${pick(['3', '7', '8', '9'])}${between(10000000, 99999999)}`;
const code = () => `${pick(['VN', 'SPX', 'GHN', 'JT', 'EV', 'RR', 'LX'])}${between(10000000, 99999999)}${maybe(0.5) ? 'VN' : ''}`;
const year = () => pick(['2024', '2025', '2026']);
const fill = (s: string) => s
  .replace(/\{money\}/g, money).replace(/\{big\}/g, bigMoney).replace(/\{hours\}/g, hours)
  .replace(/\{phone\}/g, phone).replace(/\{code\}/g, code).replace(/\{year\}/g, year)
  .replace(/\{n\}/g, () => String(between(2, 99)));

// ---------------------------------------------------------------------------- danh mục thực thể
const VN_BANKS = [
  ['Vietcombank', 'VCB Digibank'], ['Techcombank', 'Techcombank Mobile'], ['BIDV', 'BIDV SmartBanking'],
  ['VietinBank', 'VietinBank iPay'], ['Agribank', 'Agribank E-Mobile Banking'], ['MB Bank', 'MBBank App'],
  ['ACB', 'ACB ONE'], ['VPBank', 'VPBank NEO'], ['TPBank', 'TPBank eBank'], ['Sacombank', 'Sacombank Pay'],
  ['HDBank', 'HDBank App'], ['VIB', 'MyVIB'],
] as const;
const INTL_BANKS = ['Chase', 'Wells Fargo', 'Bank of America', 'HSBC', 'Santander', 'Barclays', 'Banco Galicia', 'Itaú', 'Bradesco', 'Commonwealth Bank', 'ING'];
const VN_WALLETS = ['MoMo', 'ZaloPay', 'Viettel Money', 'VNPay', 'ShopeePay'];
const ECOM = ['Shopee', 'Lazada', 'Tiki', 'TikTok Shop', 'Amazon'];
const VN_COURIERS = ['VNPost', 'Viettel Post', 'Giao Hàng Nhanh', 'Giao Hàng Tiết Kiệm', 'J&T Express', 'SPX Express'];
const INTL_COURIERS = ['USPS', 'DHL', 'FedEx', 'Royal Mail', 'Canada Post', 'La Poste', 'Australia Post'];
const GLOBAL_ACCOUNTS = [
  ['Microsoft', 'Outlook'], ['Microsoft 365', 'OneDrive'], ['Apple', 'Apple ID'], ['Apple', 'iCloud'], ['PayPal', 'PayPal'],
  ['Netflix', 'Netflix'], ['Amazon', 'Amazon'], ['Google', 'Gmail'], ['Adobe', 'Adobe Document Cloud'], ['DocuSign', 'DocuSign'],
  ['Steam', 'Steam'], ['Roblox', 'Roblox'], ['Spotify', 'Spotify'], ['Coinbase', 'Coinbase'],
] as const;
const WALLETS = ['MetaMask', 'Trust Wallet', 'Atomic Wallet', 'Exodus', 'Phantom', 'Ledger Live', 'Trezor Suite', 'TokenPocket', 'SafePal', 'OKX Wallet'];
const VN_GOV = ['VNeID', 'Cổng Dịch vụ công Quốc gia', 'Tổng cục Thuế', 'Bảo hiểm Xã hội Việt Nam', 'Bộ Công an', 'Cục Cảnh sát giao thông', 'EVN - Tổng công ty Điện lực'];
const INTL_GOV = ['IRS', 'HMRC', 'Australian Taxation Office', 'Canada Revenue Agency', 'DMV', 'E-ZPass', 'Social Security Administration'];
const VN_BRANDS_LEGIT = [
  'Thế Giới Di Động', 'Điện Máy Xanh', 'FPT Shop', 'CellphoneS', 'Bách Hóa Xanh', 'Hasaki', 'Con Cưng', 'PNJ',
  'Highlands Coffee', 'Vinamilk', 'Biti\'s', 'Canifa', 'Fahasa', 'Nguyễn Kim', 'Phong Vũ', 'YODY', 'Coolmate',
  'Routine', 'Nhà thuốc Long Châu', 'Pharmacity', 'MediaMart', 'Hoàng Hà Mobile', 'An Phước', 'IVY moda'
];

// ---------------------------------------------------------------------------- khung trang chung (xuất hiện ở cả 2 lớp)
const VN_NAV = ['Trang chủ', 'Giới thiệu', 'Sản phẩm', 'Dịch vụ', 'Tin tức', 'Liên hệ', 'Hỗ trợ', 'Câu hỏi thường gặp', 'Tuyển dụng', 'Khuyến mãi'];
const EN_NAV = ['Home', 'About', 'Products', 'Services', 'News', 'Contact', 'Support', 'Help', 'Careers', 'Pricing', 'Blog'];
const nav = (lang: 'vi' | 'en') => some(lang === 'vi' ? VN_NAV : EN_NAV, 3, 7).join(' ');
const legitFooter = (lang: 'vi' | 'en', company: string) => lang === 'vi'
  ? some([
    `© ${year()} ${company}. Bảo lưu mọi quyền.`,
    `Giấy chứng nhận đăng ký doanh nghiệp số 0${between(100000000, 399999999)} do Sở Kế hoạch và Đầu tư TP. ${pick(['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng'])} cấp`,
    `Địa chỉ: ${between(1, 300)} ${pick(['Nguyễn Huệ', 'Lê Lợi', 'Trần Hưng Đạo', 'Cầu Giấy', 'Láng Hạ', 'Điện Biên Phủ'])}, ${pick(['Quận 1', 'Quận 3', 'Ba Đình', 'Đống Đa', 'Hải Châu'])}`,
    `Hotline: 1900 ${between(1000, 9999)}`, 'Chính sách bảo mật', 'Điều khoản sử dụng', 'Chính sách đổi trả', 'Phương thức thanh toán',
    'Đã thông báo Bộ Công Thương', `Email: cskh@${company.toLowerCase().replace(/[^a-z]/g, '') || 'congty'}.vn`,
  ], 3, 7).join(' ')
  : some([
    `© ${year()} ${company} Inc. All rights reserved.`, 'Privacy Policy', 'Terms of Service', 'Cookie Settings', 'Accessibility',
    `${between(10, 999)} ${pick(['Market St', 'Main Street', 'Broadway', 'King St'])}, ${pick(['San Francisco, CA', 'New York, NY', 'London', 'Sydney'])}`,
    'Contact us', 'Careers', 'Press', 'Investor Relations', 'Sitemap',
  ], 3, 7).join(' ');

function baseStruct(): StructFeatures {
  return {
    hasPasswordField: false, sensitiveFields: [], externalFormAction: false, telegramExfiltration: false, formCount: 0,
    textLength: 0, linkCount: 0, nullLinkRatio: 0, externalLinkRatio: 0, iframeCount: 0, obfuscationSignals: 0,
    moitBadge: false, taxId: false, contactInfo: false, policyLinks: false, botChallenge: false,
  };
}

/** Cấu trúc trang lừa đảo điển hình: ít liên kết thật, nhiều "#", có thể gửi dữ liệu ra ngoài/Telegram, đôi khi làm rối mã */
function phishStruct(opts: { password?: boolean; sensitive?: string[]; forms?: boolean }): StructFeatures {
  // Bộ kit sao chép nguyên trang thật: giữ cả trăm liên kết, chân trang, chính sách -> cấu trúc trông như trang hợp pháp
  if (maybe(0.3)) {
    const s = legitStruct({ login: !!opts.password, sparse: maybe(0.3) });
    s.sensitiveFields = (opts.sensitive || []).filter(() => maybe(0.7));
    s.externalFormAction = s.formCount > 0 && maybe(0.3);
    s.telegramExfiltration = s.formCount > 0 && maybe(0.15);
    return s;
  }
  const s = baseStruct();
  const jsRendered = maybe(0.15); // trang dựng bằng JS: HTML thô gần như không có form/liên kết
  s.formCount = jsRendered ? 0 : (opts.forms === false ? (maybe(0.3) ? 1 : 0) : between(1, 2));
  s.hasPasswordField = !jsRendered && !!opts.password && maybe(0.9);
  s.sensitiveFields = jsRendered ? [] : (opts.sensitive || []).filter(() => maybe(0.85));
  s.externalFormAction = s.formCount > 0 && maybe(0.35);
  s.telegramExfiltration = s.formCount > 0 && maybe(0.2);
  s.linkCount = jsRendered ? between(0, 3) : between(1, 25);
  s.nullLinkRatio = s.linkCount ? Math.min(1, 0.3 + rnd() * 0.7) : 0;
  s.externalLinkRatio = rnd() * 0.6;
  s.iframeCount = maybe(0.1) ? 1 : 0;
  s.obfuscationSignals = maybe(0.25) ? between(1, 3) : 0;
  s.contactInfo = maybe(0.25);
  s.policyLinks = maybe(0.25); // bộ kit sao chép chân trang của thương hiệu thật
  s.taxId = maybe(0.03);
  s.moitBadge = maybe(0.02);
  s.botChallenge = maybe(0.03);
  return s;
}

/** Cấu trúc trang hợp pháp: nhiều liên kết thật, minh bạch thông tin; đôi khi có form đăng nhập/tìm kiếm */
function legitStruct(opts: { login?: boolean; vnCommerce?: boolean; sparse?: boolean }): StructFeatures {
  const s = baseStruct();
  s.formCount = opts.login ? between(1, 2) : (maybe(0.6) ? between(1, 3) : 0); // ô tìm kiếm, đăng ký nhận tin
  s.hasPasswordField = !!opts.login && maybe(0.9);
  s.sensitiveFields = opts.login && maybe(0.08) ? ['OTP'] : [];
  s.externalFormAction = s.formCount > 0 && maybe(0.08); // form gửi tới dịch vụ email marketing, SSO...
  s.linkCount = opts.sparse ? between(2, 15) : between(15, 250);
  // Ứng dụng web dựng bằng framework thường có nhiều liên kết "#"/javascript:
  s.nullLinkRatio = maybe(0.15) ? 0.2 + rnd() * 0.5 : rnd() * (opts.sparse ? 0.4 : 0.15);
  s.externalLinkRatio = rnd() * 0.5;
  s.iframeCount = maybe(0.35) ? between(1, 3) : 0;
  s.obfuscationSignals = maybe(0.12) ? 1 : 0; // mã quảng cáo/analytics được nén
  s.contactInfo = maybe(opts.sparse ? 0.5 : 0.85);
  s.policyLinks = maybe(opts.sparse ? 0.5 : 0.9);
  s.taxId = !!opts.vnCommerce && maybe(0.6);
  s.moitBadge = !!opts.vnCommerce && maybe(0.55);
  s.botChallenge = maybe(0.02);
  return s;
}

// Từ ngữ thông dụng chèn ngẫu nhiên vào CẢ HAI lớp như nhau: dạy mô hình rằng chúng không mang thông tin,
// và làm văn bản tổng hợp bớt "sạch" so với trang thật (vốn đầy chữ của menu, quảng cáo, tiêu đề phụ...)
const FILLER_VI = ('và của có cho với các những được trong này đã sẽ không một người năm ngày tháng mới nhất xem thêm tất cả danh mục ' +
  'tìm kiếm thông tin chi tiết hình ảnh video bài viết sản phẩm dịch vụ khách hàng hỗ trợ giới thiệu liên hệ tin tức cập nhật hôm nay ' +
  'Việt Nam Hà Nội TP.HCM Đà Nẵng miền Bắc miền Nam giá tốt chất lượng uy tín nhanh chóng tiện lợi an toàn đầy đủ phổ biến nổi bật ' +
  'xem tiếp đọc thêm trang tiếp theo quay lại đầu trang chia sẻ bình luận theo dõi đăng ký nhận tin mạng xã hội ứng dụng điện thoại').split(' ');
const FILLER_EN = ('the and of to in for with on at by from about more all new latest view see read next previous home menu search ' +
  'information details photos videos articles products services customers help about contact news updates today world business ' +
  'technology health travel culture sports style quality fast easy secure popular featured share comment follow subscribe newsletter ' +
  'app mobile desktop language english settings account language region cookies accept learn more').split(' ');

function finalize(partial: Omit<CorpusSample, keyof StructFeatures> & { struct: StructFeatures }): CorpusSample {
  const { struct, ...rest } = partial;
  let text = fill(rest.text).replace(/\s+/g, ' ').trim();

  // Tiền xử lý dạng Markdown mô phỏng đầu ra của htmlToMarkdown trên trang web thật:
  const mdParts: string[] = [];

  // 1. Tiêu đề dạng heading (# Tiêu đề)
  if (maybe(0.7) && rest.title) {
    mdParts.push(`# ${fill(rest.title)}`);
  }

  // 2. Ô nhập liệu (input placeholders) dựa trên struct
  if (struct.hasPasswordField) {
    const pw = rest.lang === 'vi'
      ? pick(['Mật khẩu', 'Mật khẩu đăng nhập', 'Password', 'Nhập mật khẩu'])
      : pick(['Password', 'Enter password', 'Account password']);
    mdParts.push(`[input: password ${pw}]`);
  }
  for (const s of struct.sensitiveFields) {
    if (s === 'OTP') {
      const otp = rest.lang === 'vi' ? pick(['Mã OTP', 'Mã xác thực SMS', 'Nhập OTP']) : pick(['OTP code', 'SMS verification code']);
      mdParts.push(`[input: ${otp}]`);
    } else if (s === 'Thẻ thanh toán') {
      const cc = rest.lang === 'vi' ? pick(['Số thẻ ngân hàng', 'Mã CVV', 'Ngày hết hạn']) : pick(['Card number', 'CVV/CVC', 'Expiration date']);
      mdParts.push(`[input: ${cc}]`);
    } else if (s === 'Cụm từ khôi phục ví') {
      mdParts.push(`[input: ${pick(['12-word seed phrase', 'Secret recovery phrase', 'Private key'])}]`);
    } else if (s === 'Giấy tờ tùy thân') {
      const id = rest.lang === 'vi' ? pick(['Số CCCD/CMND', 'Số định danh']) : pick(['National ID', 'SSN', 'Passport number']);
      mdParts.push(`[input: ${id}]`);
    } else if (s === 'Mã PIN') {
      mdParts.push(`[input: ${rest.lang === 'vi' ? 'Mã PIN ATM giao dịch' : 'ATM PIN code'}]`);
    }
  }
  // Ô nhập tìm kiếm / liên hệ thông thường trên trang hợp pháp
  if (rest.label === 0 && maybe(0.5)) {
    const norm = rest.lang === 'vi'
      ? pick(['Tìm kiếm sản phẩm hoặc tin tức', 'Nhập email nhận bản tin', 'Họ và tên', 'Số điện thoại'])
      : pick(['Search products or articles', 'Enter email address', 'Your name', 'Phone number']);
    mdParts.push(`[input: ${norm}]`);
  }

  // 3. Nút bấm (buttons)
  if (struct.formCount > 0) {
    if (rest.label === 1) {
      const btn = rest.lang === 'vi'
        ? pick(['Đăng nhập tài khoản', 'Xác nhận ngay', 'Nhận thưởng 88K', 'Rút tiền ngay', 'Tải app APK', 'Tham gia cược'])
        : pick(['Sign In', 'Confirm Now', 'Claim Bonus', 'Withdraw Funds', 'Download App', 'Join Game']);
      mdParts.push(`[button: ${btn}]`);
    } else {
      const btn = rest.lang === 'vi'
        ? pick(['Tìm kiếm', 'Đăng nhập', 'Đăng ký', 'Mua ngay', 'Thêm vào giỏ', 'Xem chi tiết', 'Gửi yêu cầu'])
        : pick(['Search', 'Sign In', 'Register', 'Buy Now', 'Add to Cart', 'View Details', 'Submit']);
      mdParts.push(`[button: ${btn}]`);
    }
  }

  // 4. Kênh liên hệ / CSKH
  if (struct.telegramExfiltration || (rest.label === 1 && maybe(0.35))) {
    mdParts.push(`[CSKH Telegram](t.me/${pick(['cskh247', 'hotro_bot', 'nhacai_vip', 'admin_support'])})`);
  }
  if (rest.label === 0 && maybe(0.35)) {
    if (rest.lang === 'vi') {
      mdParts.push(pick(['[Chính sách bảo mật](/privacy)', '[Điều khoản dịch vụ](/terms)', '[Trung tâm trợ giúp](/help)', `[Zalo hỗ trợ](zalo.me/09${between(10000000, 99999999)})`]));
    } else {
      mdParts.push(pick(['[Privacy Policy](/privacy)', '[Terms of Service](/terms)', '[Help Center](/help)', '[Contact Support](/contact)']));
    }
  }

  // 5. Hình ảnh có alt text
  if (maybe(0.3)) {
    mdParts.push(`![Logo ${rest.lang === 'vi' ? pick(['Thương hiệu', 'Doanh nghiệp', 'Cửa hàng', 'Dịch vụ']) : pick(['Brand', 'Company', 'Official', 'Store'])}]`);
  }

  if (mdParts.length) {
    text = `${mdParts.join(' ')} ${text}`;
  }

  if (maybe(0.7)) {
    const words = text.split(' ');
    const filler = rest.lang === 'vi' ? FILLER_VI : FILLER_EN;
    for (let i = between(5, 40); i > 0; i--) words.splice(between(0, words.length), 0, pick(filler));
    text = words.join(' ');
  }
  return {
    ...struct,
    ...rest,
    title: fill(rest.title),
    description: fill(rest.description),
    text,
    textLength: struct.textLength || text.length,
  };
}

type Gen = () => CorpusSample;

// ============================================================================ LỚP 1: LỪA ĐẢO / NGUY HIỂM
const phishing: Record<string, Gen> = {
  bank_login: () => {
    const vi = maybe(0.7);
    if (vi) {
      const [bank, app] = pick(VN_BANKS);
      return finalize({
        label: 1, theme: 'bank_login', lang: 'vi',
        title: pick([`${app} - Đăng nhập`, `${bank} | Ngân hàng điện tử`, `Đăng nhập ${app}`, `${bank} - Xác thực tài khoản`, `Internet Banking ${bank}`]),
        description: maybe(0.5) ? `${bank} - Ngân hàng số dành cho khách hàng cá nhân` : '',
        text: [
          maybe(0.4) ? nav('vi') : '',
          pick([`Đăng nhập ${app}`, `Chào mừng quý khách đến với ${app}`, `${bank} Digital Banking`]),
          'Tên đăng nhập', 'Mật khẩu', maybe(0.6) ? 'Quên mật khẩu?' : '', maybe(0.5) ? 'Ghi nhớ đăng nhập' : '',
          some([
            `Vì lý do bảo mật, quý khách vui lòng xác thực lại thông tin tài khoản để tiếp tục sử dụng dịch vụ.`,
            `Mã OTP đã được gửi đến số điện thoại đăng ký của quý khách. Vui lòng nhập mã OTP để hoàn tất xác thực.`,
            `Hệ thống phát hiện đăng nhập bất thường. Tài khoản sẽ bị tạm khóa sau {hours} giờ nếu không xác minh.`,
            `Cập nhật sinh trắc học theo quy định của Ngân hàng Nhà nước để tránh gián đoạn giao dịch.`,
            `Nhập mã OTP gồm 6 chữ số`, `Nhập số thẻ ATM và mã PIN để xác minh chủ tài khoản`,
            `Quý khách được cộng điểm thưởng tri ân {big} điểm, vui lòng đăng nhập để nhận ngay.`,
            `Nâng cấp hạn mức thẻ tín dụng miễn phí, đăng nhập để xác nhận.`,
          ], 1, 3).join(' '),
          maybe(0.4) ? `© ${year()} ${bank}` : '', maybe(0.3) ? `Hotline 1900 ${between(1000, 9999)}` : '',
        ].join(' '),
        struct: phishStruct({ password: true, sensitive: some(['OTP', 'Thẻ thanh toán', 'Mã PIN', 'Giấy tờ tùy thân'], 0, 2) }),
      });
    }
    const bank = pick(INTL_BANKS);
    return finalize({
      label: 1, theme: 'bank_login', lang: 'en',
      title: pick([`${bank} Online Banking - Sign In`, `${bank} | Log On`, `Verify your ${bank} account`, `${bank} Secure Login`]),
      description: '',
      text: [
        pick([`Sign in to ${bank} Online Banking`, `Welcome to ${bank}`, `Log on to Online Banking`]), 'User ID', 'Password',
        maybe(0.5) ? 'Remember me' : '', maybe(0.5) ? 'Forgot username or password?' : '',
        some([
          'For your security, please verify your identity to continue.', 'We noticed unusual sign-in activity on your account.',
          'Your online access has been temporarily limited. Confirm your details to restore access.',
          'Enter the one-time passcode we sent to your mobile number.', 'Enter your card number, expiry date and CVV to verify ownership.',
          'Please update your billing information within {hours} hours to avoid suspension.',
        ], 1, 3).join(' '),
        maybe(0.4) ? `© ${year()} ${bank}. Member FDIC.` : '',
      ].join(' '),
      struct: phishStruct({ password: true, sensitive: some(['OTP', 'Thẻ thanh toán', 'Giấy tờ tùy thân'], 0, 2) }),
    });
  },

  account_verify: () => {
    const vi = maybe(0.5);
    const [brand, product] = pick(GLOBAL_ACCOUNTS);
    if (vi) {
      const target = pick([...VN_WALLETS, ...ECOM, 'Zalo', 'Facebook']);
      return finalize({
        label: 1, theme: 'account_verify', lang: 'vi',
        title: pick([`${target} - Xác minh tài khoản`, `Thông báo bảo mật ${target}`, `${target} | Tài khoản bị tạm khóa`]),
        description: '',
        text: [
          some([
            `Tài khoản ${target} của bạn đã bị tạm khóa do phát hiện hoạt động đáng ngờ.`,
            `Để tiếp tục sử dụng, vui lòng xác minh danh tính trong vòng {hours} giờ.`,
            `Nếu không xác minh, tài khoản sẽ bị khóa vĩnh viễn và số dư sẽ bị phong tỏa.`,
            `Nhập số điện thoại, mật khẩu và mã OTP để mở khóa tài khoản.`,
            `Bạn có 1 giao dịch đang chờ xử lý. Xác nhận ngay để không bị hủy.`,
            `Cập nhật thông tin chủ tài khoản theo quy định mới.`,
          ], 2, 4).join(' '), 'Số điện thoại', 'Mật khẩu', 'Xác minh ngay',
        ].join(' '),
        struct: phishStruct({ password: true, sensitive: some(['OTP', 'Giấy tờ tùy thân'], 0, 2) }),
      });
    }
    return finalize({
      label: 1, theme: 'account_verify', lang: 'en',
      title: pick([`${product} - Sign in`, `Sign in to your ${product} account`, `${brand} account verification`, `${product}: Action required`, `Your ${product} account has been locked`]),
      description: '',
      text: [
        pick([`Sign in to continue to ${product}`, `${brand}`, `Verify it's you`]),
        some([
          'Your account has been temporarily suspended due to unusual activity.', 'Your mailbox storage is full. Sign in to upgrade your storage for free.',
          'A document has been shared with you. Sign in to view the shared file.', 'Your password expires today. Keep your current password.',
          'We were unable to process your last payment. Update your payment method to avoid service interruption.',
          'Confirm your identity within {hours} hours or your account will be permanently closed.', 'Unusual sign-in activity detected from a new device.',
          'Email or phone', 'Enter password', 'Keep me signed in', 'Next', 'Verify now',
        ], 2, 5).join(' '),
      ].join(' '),
      struct: phishStruct({ password: true, sensitive: some(['OTP', 'Thẻ thanh toán'], 0, 1) }),
    });
  },

  delivery_fee: () => {
    const vi = maybe(0.55);
    const courier = vi ? pick(VN_COURIERS) : pick(INTL_COURIERS);
    return finalize({
      label: 1, theme: 'delivery_fee', lang: vi ? 'vi' : 'en',
      title: vi ? pick([`${courier} - Theo dõi đơn hàng`, `${courier} | Giao hàng thất bại`, `Cập nhật địa chỉ giao hàng - ${courier}`])
        : pick([`${courier} - Track your parcel`, `${courier}: Delivery failed`, `${courier} | Redelivery fee`, `Package on hold - ${courier}`]),
      description: '',
      text: vi
        ? some([
          `Bưu kiện {code} của bạn không thể giao do địa chỉ không đầy đủ.`, `Vui lòng cập nhật địa chỉ và thanh toán phí giao lại {money}đ.`,
          `Đơn hàng sẽ được hoàn về kho sau {hours} giờ nếu không xác nhận.`, `Nhập thông tin thẻ để thanh toán phí lưu kho.`,
          `Họ và tên`, `Số điện thoại`, `Địa chỉ nhận hàng`, `Số thẻ`, `Ngày hết hạn`, `Mã CVV`, `Thanh toán`,
        ], 4, 9).join(' ')
        : some([
          `Your package {code} could not be delivered due to an incomplete address.`, `A redelivery fee of $1.99 is required.`,
          `Your parcel is on hold at our warehouse. Please confirm your details within {hours} hours.`, `Customs duty payment required.`,
          'Full name', 'Address', 'ZIP code', 'Card number', 'Expiration date', 'CVV', 'Pay now', 'Schedule redelivery',
        ], 4, 9).join(' '),
      struct: phishStruct({ password: false, sensitive: ['Thẻ thanh toán'] }),
    });
  },

  prize: () => {
    const vi = maybe(0.65);
    const brand = vi ? pick([...ECOM, ...VN_WALLETS, ...VN_BRANDS_LEGIT, 'Viettel', 'VinFast', 'POPZI', 'LuckyWheel', 'Vòng Quay 88']) : pick(['Amazon', 'Walmart', 'Costco', 'Apple', 'Samsung', 'Coca-Cola']);
    const prizeMoney = pick(['250.000đ', '450.000đ', '500.000đ', '1.000.000đ', '2.000.000đ']);
    const isSpa = maybe(0.3);
    const descVi = pick([
      `Vừa rồi mình quay miễn phí trên ${brand} và trúng ${prizeMoney} luôn! Bạn chỉ cần đăng ký là được quay miễn phí 1 lần, nhấn đăng ký ngay để thử vận may nhé!`,
      `Tham gia vòng quay may mắn ${brand} nhận ngay ${prizeMoney} vào tài khoản ngân hàng. Rút tiền siêu tốc trong 3 phút, miễn phí 100%!`,
      `Chúc mừng bạn nhận được 1 lượt quay may mắn từ ${brand}. Đăng ký ngay để nhận quà tri ân tiền mặt ${prizeMoney}!`,
      `Vòng quay tri ân khách hàng: 100% trúng quà, rút tiền mặt về ATM, hoàn toàn miễn phí.`,
    ]);
    const descEn = pick([
      `I just spun the wheel on ${brand} and won $500! Sign up now to get your free spin and claim your cash reward!`,
      `Congratulations! You have 1 free spin remaining to claim your cash reward.`,
    ]);
    return finalize({
      label: 1, theme: 'prize', lang: vi ? 'vi' : 'en',
      title: vi ? pick([`${brand} Official Store`, `Chúc mừng! Bạn đã trúng thưởng - ${brand}`, `${brand} tri ân khách hàng`, `Vòng quay may mắn ${brand}`, `Quay thưởng nhận quà ${brand}`])
        : pick([`${brand} Official Rewards`, `Congratulations! You've won - ${brand}`, `${brand} Customer Rewards`, `Claim your free gift`]),
      description: vi ? descVi : descEn,
      text: isSpa
        ? `${brand} Official Store`
        : (vi
          ? some([
            `Chúc mừng bạn là khách hàng may mắn được chọn nhận ${pick(['iPhone 16 Pro Max', 'xe máy SH', 'phiếu quà tặng {big}đ', `tiền mặt ${prizeMoney}`])}.`,
            `Chỉ còn {n} phần quà, chương trình kết thúc trong 10 phút!`, `Bạn chỉ cần đăng ký là được quay miễn phí 1 lần.`,
            `Vừa rồi mình quay trúng ${prizeMoney} luôn, nhấn đăng ký ngay để thử vận may.`, `Rút tiền về tài khoản ngân hàng trong 3 phút.`,
            `Quay ngay để nhận thưởng`, `Đã có {n}.{n} người nhận quà hôm nay`, `Nhập số điện thoại và thông tin để nhận quà.`,
            `Bình luận: "Mình nhận được quà rồi, cảm ơn ${brand}!"`, `Nhận quà ngay`,
          ], 3, 7).join(' ')
          : some([
            `Congratulations! You have been selected to receive ${pick(['an iPhone 16 Pro', 'a $1000 gift card', 'a Dyson vacuum', 'a PlayStation 5'])}.`,
            'Only {n} rewards left. This offer expires in 5 minutes!', 'Spin the wheel to claim your prize',
            'Answer 3 quick questions to claim your reward.', 'Claim your prize now', '"I got mine yesterday!" - Sarah',
          ], 3, 6).join(' ')),
      struct: isSpa ? phishStruct({ forms: false }) : phishStruct({ password: false, sensitive: maybe(0.5) ? ['Thẻ thanh toán'] : [], forms: maybe(0.6) }),
    });
  },

  lucky_draw_ponzi: () => {
    const vi = maybe(0.75);
    const platform = pick(['POPZI', 'SpinWin', 'LuckyClub', 'VongQuayTaiLoc', 'MiniReward', 'TikBonus', 'ShopeeGift', 'MegaSpin', 'VayNhanhGift', 'LuckyMall']);
    const prize = pick(['250.000đ', '450.000đ', '500.000đ', '1.000.000đ', '2.000.000đ']);
    const isSpa = maybe(0.5);
    return finalize({
      label: 1, theme: 'lucky_draw_ponzi', lang: vi ? 'vi' : 'en',
      title: vi ? pick([`${platform} Official Store`, `Chào mừng đến với ${platform}!`, `Vòng Quay May Mắn - ${platform}`, `${platform} - Rút tiền thưởng siêu tốc`])
        : pick([`${platform} Official Store`, `Welcome to ${platform}!`, `Lucky Draw Online - ${platform}`]),
      description: vi ? pick([
        `Vừa rồi mình quay miễn phí trên ${platform} và trúng ${prize} luôn! Bạn chỉ cần đăng ký là được quay miễn phí 1 lần, nhấn đăng ký ngay để thử vận may nhé!`,
        `Đăng ký tài khoản ${platform} nhận ngay lượt quay may mắn trúng ${prize}. Rút tiền về ATM trong 5 phút.`,
        `Thử vận may với vòng quay ${platform}: 100% trúng thưởng, cơ hội nhận ${prize} và quà tặng giá trị.`,
        `Mời bạn bè tham gia ${platform} nhận hoa hồng {money}đ và thêm lượt quay miễn phí mỗi ngày.`,
      ]) : `I just got free spins on ${platform} and won cash prizes! Register now to spin and claim your rewards instantly.`,
      text: isSpa ? `${platform} Official Store` : (vi ? some([
        `Vừa rồi mình quay miễn phí trên ${platform} và trúng ${prize} luôn!`,
        `Bạn chỉ cần đăng ký là được quay miễn phí 1 lần, nhấn đăng ký ngay để thử vận may nhé!`,
        'Nạp tiền tích điểm, nâng hạng VIP nhận thêm lượt quay.',
        'Rút tiền về tài khoản ngân hàng siêu tốc 24/7.',
        'Mời bạn bè cùng tham gia nhận hoa hồng không giới hạn.',
        `Đã có {n}.{n} người rút tiền thành công hôm nay.`,
        'Điểm danh hàng ngày nhận lượt quay may mắn.',
        'Liên hệ chăm sóc khách hàng trực tuyến 24/7.',
      ], 3, 7).join(' ') : 'Spin the wheel, win cash rewards and withdraw instantly. Invite friends to get more bonuses.'),
      struct: phishStruct({ forms: !isSpa }),
    });
  },

  gov_scam: () => {
    const vi = maybe(0.7);
    const agency = vi ? pick(VN_GOV) : pick(INTL_GOV);
    return finalize({
      label: 1, theme: 'gov_scam', lang: vi ? 'vi' : 'en',
      title: vi ? pick([`${agency} - Xác thực định danh điện tử`, `Cổng dịch vụ công - ${agency}`, `Hoàn thuế thu nhập cá nhân - ${agency}`, `${agency} | Thông báo`])
        : pick([`${agency} - Tax refund`, `${agency}: You are eligible for a refund`, `${agency} - Unpaid toll notice`, `${agency} | Verify your identity`]),
      description: '',
      text: vi
        ? some([
          `Theo quy định mới, công dân cần cập nhật tài khoản định danh điện tử mức 2 trước ngày {n}/12.`,
          `Bạn đủ điều kiện hoàn thuế thu nhập cá nhân số tiền {big}đ.`, `Vui lòng cung cấp số CCCD, ngày cấp và tài khoản ngân hàng nhận tiền.`,
          `Hóa đơn tiền điện của quý khách đã quá hạn, nguồn điện sẽ bị ngắt trong {hours} giờ.`, `Phạt nguội vi phạm giao thông, nộp phạt trực tuyến tại đây.`,
          `Tải ứng dụng phiên bản mới để đồng bộ dữ liệu dân cư.`, `Số CCCD`, `Họ và tên`, `Số tài khoản ngân hàng`, `Mật khẩu ứng dụng ngân hàng`, `Xác nhận`,
        ], 4, 8).join(' ')
        : some([
          'You are eligible to receive a tax refund of ${n}${n}.', 'Submit the form below to process your refund.', 'Your vehicle has an unpaid toll balance. Pay now to avoid penalties.',
          'Social Security Number', 'Date of birth', 'Bank account and routing number', 'Card number', 'Submit', 'Failure to respond will result in additional fees.',
        ], 4, 8).join(' '),
      struct: phishStruct({ password: maybe(0.3), sensitive: some(['Giấy tờ tùy thân', 'Thẻ thanh toán', 'OTP'], 1, 2) }),
    });
  },

  crypto_wallet: () => {
    const wallet = pick(WALLETS);
    return finalize({
      label: 1, theme: 'crypto_wallet', lang: maybe(0.8) ? 'en' : 'vi',
      title: pick([`${wallet} - Restore your wallet`, `${wallet}® — Official`, `Connect Wallet | ${wallet}`, `${pick(['Airdrop', 'Claim', 'Rewards'])} - ${wallet}`, `${wallet} Wallet Validation`]),
      description: maybe(0.5) ? `${wallet} - the most trusted crypto wallet` : '',
      text: some([
        'Connect your wallet', 'Import wallet', 'Enter your 12-word or 24-word recovery phrase', 'Secret Recovery Phrase', 'Private key', 'Keystore JSON',
        'Your wallet needs to be synchronized to continue.', 'Claim your airdrop allocation before it expires.', 'Validate your wallet to unlock withdrawals.',
        'Wallet connection failed. Please connect manually.', `Download ${wallet} official app`, 'Your assets are at risk. Migrate now.',
        'Nhập cụm từ khôi phục 12 từ để đồng bộ ví', 'Nhận airdrop miễn phí', 'Kết nối ví',
      ], 3, 7).join(' '),
      struct: phishStruct({ password: maybe(0.3), sensitive: ['Cụm từ khôi phục ví'] }),
    });
  },

  meta_support: () => finalize({
    label: 1, theme: 'meta_support', lang: maybe(0.7) ? 'en' : 'vi',
    title: pick(['Meta Business Help Center', 'Business Help Center | Privacy Policy', 'Meta for Business - Appeal', 'Facebook Support - Page Restricted', 'Meta Verified - Get your blue badge']),
    description: '',
    text: some([
      'Your page has been scheduled for permanent deletion due to a violation of our Community Standards.', 'We received a copyright infringement report about your page.',
      'If you believe this is a mistake, submit an appeal within 24 hours.', 'Page name', 'Full name', 'Business email', 'Phone number', 'Facebook password',
      'Two-factor authentication code', 'Submit appeal', 'Case number #{n}{n}{n}{n}', 'Get verified with Meta Verified for free',
      'Trang của bạn đã bị hạn chế do vi phạm bản quyền. Vui lòng gửi kháng nghị.', 'Meta Platforms, Inc.',
    ], 3, 8).join(' '),
    struct: phishStruct({ password: true, sensitive: some(['OTP'], 0, 1) }),
  }),

  task_scam: () => finalize({
    label: 1, theme: 'task_scam', lang: 'vi',
    title: pick(['Việc làm online tại nhà - Thu nhập hấp dẫn', 'Tuyển cộng tác viên bán hàng online', 'Làm nhiệm vụ nhận hoa hồng', `Cộng tác viên ${pick(ECOM)} - Thu nhập {big}đ/tháng`]),
    description: 'Việc nhẹ lương cao, không cần kinh nghiệm',
    text: some([
      'Việc làm online tại nhà, thu nhập 500k - 2 triệu mỗi ngày.', 'Chỉ cần điện thoại, làm 1-2 giờ mỗi ngày.', 'Thả tim, like video TikTok, đánh giá sản phẩm nhận hoa hồng.',
      'Nạp tiền làm nhiệm vụ, hoàn vốn kèm hoa hồng 30% ngay lập tức.', 'Liên hệ CSKH qua Zalo/Telegram để nhận nhiệm vụ.', 'Không cần kinh nghiệm, không cần đặt cọc.',
      'Nhiệm vụ VIP: nạp {big}đ nhận lại gấp đôi.', `Đã có {n}.{n} cộng tác viên tham gia.`, 'Rút tiền về tài khoản ngân hàng trong 5 phút.', 'Đăng ký ngay',
    ], 4, 8).join(' '),
    struct: phishStruct({ password: maybe(0.5), sensitive: maybe(0.3) ? ['Giấy tờ tùy thân'] : [], forms: maybe(0.6) }),
  }),

  investment_scam: () => {
    const vi = maybe(0.6);
    return finalize({
      label: 1, theme: 'investment_scam', lang: vi ? 'vi' : 'en',
      title: vi ? pick(['Sàn đầu tư uy tín - Lợi nhuận cao', 'Đầu tư vàng/forex/crypto lợi nhuận mỗi ngày', 'Quỹ đầu tư an toàn cam kết lợi nhuận'])
        : pick(['AI Trading Platform - Guaranteed Returns', 'Invest in Crypto - Daily Profit', 'Quantum AI Trading']),
      description: '',
      text: vi
        ? some([
          'Lợi nhuận 3% - 5% mỗi ngày, cam kết hoàn vốn 100%.', 'Đầu tư chỉ từ {big}đ, rút lãi hằng ngày.', 'Chuyên gia hướng dẫn 1 kèm 1 qua Zalo.',
          'Hoa hồng giới thiệu nhiều cấp.', 'Robot AI giao dịch tự động, không thể thua lỗ.', 'Nạp tiền qua tài khoản cá nhân của nhân viên hỗ trợ.', 'Mở tài khoản ngay',
        ], 3, 6).join(' ')
        : some([
          'Earn up to 5% daily returns with our AI trading bot.', 'Guaranteed profits, zero risk.', 'Minimum deposit $250.', 'As seen on TV.',
          'Withdraw anytime.', 'Limited spots available today.', 'Refer friends and earn commissions.', 'Start investing now',
        ], 3, 6).join(' '),
      struct: phishStruct({ password: maybe(0.6), sensitive: maybe(0.3) ? ['Thẻ thanh toán'] : [] }),
    });
  },

  loan_scam: () => finalize({
    label: 1, theme: 'loan_scam', lang: 'vi',
    title: pick(['Vay tiền online nhanh - Giải ngân 5 phút', 'Vay tín chấp không thẩm định', 'Vay tiền chỉ cần CCCD']),
    description: '',
    text: some([
      'Vay tiền online không thẩm định, không cần chứng minh thu nhập.', 'Giải ngân trong 5 phút, chỉ cần CCCD.', 'Hạn mức lên tới {big}đ, lãi suất 0%.',
      'Nợ xấu vẫn vay được.', 'Vui lòng đóng phí bảo hiểm khoản vay {money}đ trước khi giải ngân.', 'Tài khoản nhận tiền bị sai, cần nộp phí mở khóa.',
      'Chụp ảnh 2 mặt CCCD và ảnh chân dung.', 'Đăng ký vay ngay',
    ], 3, 7).join(' '),
    struct: phishStruct({ password: false, sensitive: ['Giấy tờ tùy thân'] }),
  }),

  fake_shop: () => {
    const vi = maybe(0.6);
    const brand = pick(['Nike', 'Adidas', 'Apple', 'Dyson', 'Rolex', 'Louis Vuitton', 'Samsung', ...VN_BRANDS_LEGIT]);
    return finalize({
      label: 1, theme: 'fake_shop', lang: vi ? 'vi' : 'en',
      title: vi ? pick([`${brand} chính hãng giảm 90% - Thanh lý kho`, `Xả kho ${brand} - Chỉ hôm nay`, `${brand} Outlet Việt Nam`])
        : pick([`${brand} Outlet - Up to 90% Off`, `${brand} Clearance Sale`, `${brand} Official Store - Closing Down Sale`]),
      description: '',
      text: vi
        ? some([
          `Thanh lý toàn bộ kho ${brand}, giảm giá 70% - 90%.`, 'Chỉ còn hôm nay!', 'Miễn phí vận chuyển toàn quốc.', 'Chuyển khoản trước để giữ hàng.',
          'Không hỗ trợ ship COD cho đơn khuyến mãi.', `Giá gốc {big}đ chỉ còn {money}đ`, 'Liên hệ Zalo để đặt hàng.', 'Mua ngay',
        ], 3, 7).join(' ')
        : some([
          `${brand} clearance: everything up to 90% off.`, 'Today only!', 'Free shipping worldwide.', 'Limited stock.', 'Pay by bank transfer or gift card for extra discount.',
          'Was $299 now $29.99', 'Add to cart', 'Checkout',
        ], 3, 7).join(' '),
      struct: (() => {
        const s = phishStruct({ password: false, sensitive: maybe(0.6) ? ['Thẻ thanh toán'] : [] });
        s.linkCount = between(10, 60); // shop giả thường có nhiều liên kết sản phẩm
        s.nullLinkRatio = rnd() * 0.6;
        return s;
      })(),
    });
  },

  fake_download: () => {
    const app = pick(['VNeID', 'Cổng dịch vụ công', 'Etax Mobile', ...VN_BANKS.map(b => b[1]), 'TokenPocket', 'imToken', 'Trust Wallet', 'Telegram', 'WhatsApp']);
    return finalize({
      label: 1, theme: 'fake_download', lang: maybe(0.6) ? 'vi' : 'en',
      title: pick([`Tải ${app} phiên bản mới`, `${app} - Tải ứng dụng chính thức (APK)`, `${app} official download`, `${app}官方下载`]),
      description: '',
      text: some([
        `Tải ứng dụng ${app} phiên bản mới nhất cho Android.`, 'Cài đặt file APK, cho phép cài đặt từ nguồn không xác định.', 'Cấp quyền trợ năng để ứng dụng hoạt động.',
        `Download the official ${app} app (APK)`, 'Allow installation from unknown sources', '官方下载 安全 极速安装', 'Tải xuống', 'Download',
      ], 3, 6).join(' '),
      struct: phishStruct({ password: false, sensitive: [], forms: false }),
    });
  },

  gambling: () => {
    const variant = pick(['vi', 'vi', 'en', 'en', 'intl', 'zh', 'affiliate'] as const);
    const brand = pick(['Bet', 'Win', 'Lucky', 'Royal', 'Mega', 'Star', 'King', 'Vip']) + pick(['88', '99', '365', '777', 'Club', 'Vegas', 'Win', 'Bet']);
    const lang = variant === 'vi' ? 'vi' : 'en';
    const texts: Record<typeof variant, () => [string, string]> = {
      vi: () => [
        pick([`${brand} - Nhà cái uy tín số 1 Việt Nam`, `${brand} | Trang cá cược thể thao & casino`, `Link vào ${brand} mới nhất ${year()}`, 'Game bài đổi thưởng uy tín', 'Kèo nhà cái hôm nay']),
        some(['Cá cược thể thao', 'Casino trực tuyến', 'Thể thao ảo', 'Xổ số', 'Đá gà', 'Bắn cá', 'Nổ hũ', 'Game bài', 'Khuyến mãi', 'Hoàn trả mỗi ngày',
          'Đại lý', 'Link vào không bị chặn', 'Link dự phòng', 'Nạp tiền', 'Rút tiền', 'Tỷ lệ kèo', 'Tặng 100K khi đăng ký', 'Nạp đầu thưởng 100%',
          'Nạp rút siêu tốc 1:1', 'Hỗ trợ 24/7', 'Đăng nhập', 'Đăng ký', 'Tải app', 'Sảnh casino', 'Thể thao SABA', 'Bóng đá', 'Tennis'], 8, 16).join(' '),
      ],
      en: () => [
        pick([`${brand} | Online Sportsbook, Casino and Poker`, `Play Online Poker | ${brand}`, `${brand} - Sports Betting & Live Casino`, `${brand} Casino - Welcome Bonus`]),
        some(['Sportsbook', 'Live Casino', 'Poker', 'Slots', 'Jackpots', 'Table games', 'Blackjack', 'Roulette', 'Baccarat', 'In-Play', 'Odds', 'Bet Builder',
          'Cash Out', 'Promotions', 'Welcome Offer', 'Deposit', 'Withdraw', 'Tournaments', 'Responsible Gaming', '18+', 'Gamble responsibly',
          `Licensed and regulated by the ${pick(['Malta Gaming Authority', 'Curaçao eGaming', 'UK Gambling Commission', 'Kahnawake Gaming Commission'])}`,
          'Join now', 'Log in', 'Sign up', 'Free spins', 'Esports betting', 'Horse racing', 'NFL odds', 'Premier League'], 8, 16).join(' '),
      ],
      intl: () => {
        const l = pick(['pl', 'pt', 'es', 'id'] as const);
        const words = {
          pl: ['Kasyno online', 'Zakłady bukmacherskie', 'Bonus powitalny', 'Minimalny depozyt', 'Darmowe spiny', 'Ranking kasyn', 'Automaty', 'Wypłata'],
          pt: ['Apostas esportivas', 'Cassino online', 'Bônus de boas-vindas', 'Rodadas grátis', 'Depósito mínimo', 'Saque rápido', 'Caça-níqueis', 'Odds'],
          es: ['Apuestas deportivas', 'Casino en línea', 'Bono de bienvenida', 'Giros gratis', 'Tragamonedas', 'Retiro rápido', 'Cuotas', 'Ruleta en vivo'],
          id: ['Situs judi online', 'Slot gacor', 'Togel', 'Bandar bola', 'Deposit pulsa', 'Bonus new member', 'Live casino', 'Daftar sekarang'],
        }[l];
        return [`${brand} - ${words[0]}`, some(words, 5, 8).join(' ')];
      },
      zh: () => [pick(['真人视讯 体育投注 娱乐场', `${brand}-亚洲最佳体育滚球首选平台`, '百家乐 老虎机 棋牌']), some(['真人视讯', '体育投注', '滚球', '赔率', '娱乐场', '百家乐', '老虎机', '彩票', '注册送彩金', '立即下注', '棋牌', '电子游艺'], 5, 10).join(' ')],
      affiliate: () => [
        pick([`Best Online Casinos ${year()} - Top Casino Bonuses`, `Top 10 nhà cái uy tín nhất ${year()}`, `Casino Reviews & Ratings ${year()}`, `Ranking kasyn online ${year()}`]),
        some(['Our experts rated the best real money casinos.', 'Compare welcome bonuses and free spins.', 'Claim bonus', 'Fast payout casinos', 'Minimum deposit casinos',
          'Đánh giá nhà cái', 'Khuyến mãi nạp đầu', 'Link vào nhà cái', 'Visit casino', 'T&Cs apply. 18+'], 4, 8).join(' '),
      ],
    };
    const [title, body] = texts[variant]();
    return finalize({
      label: 1, theme: 'gambling', lang,
      title, description: maybe(0.5) ? body.slice(0, 120) : '',
      text: [maybe(0.5) ? nav(lang) : '', body, maybe(0.5) ? legitFooter(lang, brand) : ''].join(' '),
      // Nhà cái lớn đầu tư website chuyên nghiệp: cấu trúc giống hệt trang hợp pháp
      struct: maybe(0.7) ? legitStruct({ login: maybe(0.6) }) : phishStruct({ password: maybe(0.6), sensitive: [] }),
    });
  },

  game_scam: () => finalize({
    label: 1, theme: 'game_scam', lang: maybe(0.5) ? 'vi' : 'en',
    title: pick(['Free Robux Generator', 'Nhận kim cương Free Fire miễn phí', 'Liên Quân - Nhận skin miễn phí', 'Free V-Bucks 2026', 'Steam gift - claim your free game']),
    description: '',
    text: some([
      'Nhập tên tài khoản game để nhận quà.', 'Đăng nhập bằng Facebook để xác minh.', 'Nhận {n}.000 kim cương miễn phí.', 'Enter your username and password to receive your free Robux.',
      'Generator online - no human verification.', 'Complete human verification to continue.', 'Claim now', 'Nhận ngay',
    ], 3, 6).join(' '),
    struct: phishStruct({ password: true, sensitive: [] }),
  }),

  tech_support: () => finalize({
    label: 1, theme: 'tech_support', lang: maybe(0.7) ? 'en' : 'vi',
    title: pick(['Windows Defender Security Warning', 'Microsoft Support - Your PC is infected', 'Apple Security Alert', 'Cảnh báo virus - Máy tính của bạn bị nhiễm']),
    description: '',
    text: some([
      'Your computer has been infected with a Trojan virus.', 'Do not close this window or restart your computer.', 'Call Microsoft Support immediately: +1-8{n}{n}-{n}{n}{n}-{n}{n}{n}{n}',
      'Your personal data and banking information are at risk.', 'Access to this PC has been blocked for security reasons.', 'Máy tính của bạn đã bị nhiễm virus, gọi ngay tổng đài hỗ trợ.',
    ], 3, 5).join(' '),
    struct: (() => {
      const s = phishStruct({ password: false, sensitive: [], forms: false });
      s.obfuscationSignals = between(1, 3);
      return s;
    })(),
  }),

  romance_dating_scam: () => {
    const vi = maybe(0.7);
    const title = vi
      ? pick(['Hẹn Hò Bí Mật - Câu Lạc Bộ VIP', 'Tìm Bạn Gái Tâm Sự - Kết Nối Bốn Phương', 'Dating Club VIP - Ghép Đôi Nhanh', 'Hẹn Hò Người Đẹp - Xác Minh Gặp Mặt'])
      : pick(['Secret Dating Lounge - VIP Member Access', 'Exclusive Dating Club - Meet Singles Tonight', 'VIP Companion Matchmaker', 'Private Date Verification Portal']);
    const desc = vi ? 'Câu lạc bộ hẹn hò kín đáo, kết nối bạn gái sinh viên, người mẫu, quý cô độc thân.' : 'Exclusive private dating network for verified singles. Safe and discreet.';
    const text = vi
      ? some([
        'Đăng ký thành viên VIP để mở khóa hồ sơ và xem số điện thoại của bạn gái.',
        'Nạp phí bảo lãnh câu lạc bộ {big}đ để đặt lịch hẹn và nhận mã phòng khách sạn.',
        'Cam kết hoàn trả 100% tiền bảo lãnh ngay sau buổi gặp gỡ theo chính sách câu lạc bộ.',
        'Xác minh thông tin tài khoản ngân hàng để chứng minh năng lực tài chính trước khi ghép đôi.',
        'Chat trực tiếp với người mẫu, hoa khôi, nữ tiếp viên hàng không độc thân.',
        'Nhập số điện thoại Zalo hoặc Telegram để điều phối viên liên hệ xếp lịch hẹn trong tối nay.',
        'Để đảm bảo an toàn cho các bạn nữ, quý khách vui lòng thanh toán phí bảo hiểm gặp mặt trước khi nhận định vị.',
      ], 3, 6).join(' ')
      : some([
        'Join our exclusive VIP dating club to browse private profiles and photos.',
        'A refundable verification deposit of ${money} is required to unlock direct contact.',
        '100% money-back guarantee immediately following your first meeting.',
        'Verify your identity and financial status to match with premium members.',
        'Private and confidential matchmaking services in your city.',
      ], 3, 5).join(' ');
    return finalize({
      label: 1, theme: 'romance_dating_scam', lang: vi ? 'vi' : 'en',
      title, description: desc,
      text: [maybe(0.4) ? nav(vi ? 'vi' : 'en') : '', text].join(' '),
      struct: phishStruct({ password: maybe(0.5), sensitive: some(['Thẻ thanh toán', 'Giấy tờ tùy thân'], 1, 2) }),
    });
  },

  sbv_gold_scam: () => {
    const title = pick([
      'Cổng Đăng Ký Mua Vàng Miếng SJC - Ngân Hàng Nhà Nước',
      'Đăng Ký Mua Vàng SJC Trực Tuyến - Bình Ổn Thị Trường',
      'Hệ Thống Phân Phối Vàng Miếng SJC Bình Ổn Giá',
      'Đăng Ký Mua Vàng Online - Ngân Hàng Nhà Nước Việt Nam',
    ]);
    const desc = 'Cổng thông tin tiếp nhận hồ sơ đăng ký mua vàng miếng SJC trực tuyến theo chỉ đạo của Ngân hàng Nhà nước.';
    const text = some([
      'Ngân hàng Nhà nước Việt Nam thông báo mở cổng đăng ký mua vàng miếng SJC bình ổn giá.',
      'Khách hàng vui lòng nhập đầy đủ họ tên, số Căn cước công dân (CCCD) gắn chip và số điện thoại.',
      'Chọn số lượng vàng miếng cần mua: 1 lượng, 2 lượng, 5 lượng. Giá vàng niêm yết: {money}.000đ/chỉ.',
      'Chuyển khoản đặt cọc {big}đ vào tài khoản chỉ định của hội đồng phân phối để nhận mã số thứ tự giao dịch.',
      'Nhập mã OTP xác thực giao dịch chuyển tiền giữ chỗ được gửi về số điện thoại của quý khách.',
      'Số lượng vàng mở bán có hạn, mỗi công dân chỉ được đăng ký tối đa 2 lượng trong đợt này.',
      'Vui lòng hoàn tất đăng ký và đặt cọc trong vòng 15 phút, quá thời gian trên mã giữ chỗ sẽ bị hủy.',
    ], 4, 7).join(' ');
    return finalize({
      label: 1, theme: 'sbv_gold_scam', lang: 'vi',
      title, description: desc,
      text: [nav('vi'), text, 'Bộ Công Thương - Cổng Thông Tin Điện Tử', 'Ngân Hàng Nhà Nước Việt Nam © {year}'].join(' '),
      struct: phishStruct({ password: false, sensitive: ['Giấy tờ tùy thân', 'OTP', 'Thẻ thanh toán'] }),
    });
  },

  card_scraping_scam: () => {
    const title = pick([
      'Đổi Thẻ Cào 247 - Đổi Thẻ Ra Tiền Mặt Chiết Khấu Thấp',
      'Gạch Thẻ Cào Tự Động Uy Tín - Rút Tiền Về ATM 30 Giây',
      'Hệ Thống Đổi Thẻ Cào Sang Tiền Mặt - Chiết Khấu 98%',
      'Cổng Gạch Thẻ Tự Động Chiết Khấu Rẻ Nhất Thị Trường',
    ]);
    const desc = 'Dịch vụ thu mua và đổi thẻ cào điện thoại Viettel, Vina, Mobi, Garena, Zing sang tiền mặt, rút tiền tự động về ATM và ví MoMo.';
    const text = some([
      'Thu mua thẻ cào Viettel, Vinaphone, Mobifone, Vietnamobile, Garena, Zing, VTC Gate chiết khấu tốt nhất lên tới 98%.',
      'Rút tiền về tài khoản ngân hàng ATM, ví điện tử MoMo, ZaloPay hoàn toàn tự động chỉ trong 30 giây.',
      'Chọn loại thẻ: Viettel, Vinaphone, Mobifone, Garena, Zing. Chọn mệnh giá: 50.000đ, 100.000đ, 200.000đ, 500.000đ.',
      'Nhập số seri thẻ cào và mã nạp (mã PIN dưới lớp tráng bạc).',
      'Nhập số tài khoản ngân hàng thụ hưởng và tên chủ tài khoản nhận tiền.',
      'Hệ thống xử lý tự động 24/7. Nếu thẻ sai mệnh giá hoặc có lỗi giao dịch, quý khách vui lòng nạp thêm thẻ mệnh giá tương đương để kích hoạt lại cổng rút.',
    ], 4, 6).join(' ');
    return finalize({
      label: 1, theme: 'card_scraping_scam', lang: 'vi',
      title, description: desc,
      text: [nav('vi'), text].join(' '),
      struct: phishStruct({ password: false, sensitive: ['Thẻ thanh toán'] }),
    });
  },

  fake_travel_tourism: () => {
    const title = pick([
      'Combo Du Lịch Phú Quốc Giá Sốc - VNPAY Travel',
      'Vé Máy Bay Giá Rẻ 0Đ - Đại Lý Vé Máy Bay Cấp 1',
      'Tour Nghỉ Dưỡng Đà Nẵng Nha Trang Trọn Gói Khách Sạn 5 Sao',
      'Tri Ân Khách Hàng - Tặng Combo Vé Máy Bay & Resort 5 Sao',
    ]);
    const desc = 'Ưu đãi du lịch hấp dẫn, combo vé máy bay khứ hồi và phòng khách sạn 5 sao giá cực rẻ.';
    const text = some([
      'Chương trình tri ân mùa hè: Combo Phú Quốc 3 ngày 2 đêm khách sạn 5 sao kèm vé máy bay khứ hồi chỉ {big}đ/người.',
      'Số lượng vé khuyến mãi có hạn, chỉ còn {n} suất cuối cùng trong ngày hôm nay.',
      'Đặt cọc ngay 50% tổng giá trị tour vào số tài khoản quản lý để được giữ vé ưu đãi và nhận mã vé điện tử.',
      'Nhập thông tin hành khách bay: Họ và tên, số CCCD/Hộ chiếu, ngày tháng năm sinh, số điện thoại người nhận.',
      'Đại lý du lịch ủy quyền chính thức của Vietnam Airlines, Bamboo Airways và Vietjet Air.',
      'Cam kết hoàn tiền nếu không hài lòng. Hỗ trợ đổi ngày bay miễn phí.',
    ], 4, 6).join(' ');
    return finalize({
      label: 1, theme: 'fake_travel_tourism', lang: 'vi',
      title, description: desc,
      text: [nav('vi'), text, 'Hotline đặt vé: 09{phone}'].join(' '),
      struct: phishStruct({ password: false, sensitive: ['Giấy tờ tùy thân'] }),
    });
  },

  scam_recovery_scam: () => {
    const title = pick([
      'Văn Phòng Luật Sư Hỗ Trợ Thu Hồi Vốn Treo Lừa Đảo',
      'Cổng Tiếp Nhận Tố Giác & Thu Hồi Tiền Lừa Đảo Trực Tuyến',
      'Hỗ Trợ Nạn Nhân Lấy Lại Tiền Bị Lừa Đảo Qua Mạng',
      'Ban Pháp Lý An Ninh Mạng - Hỗ Trợ Thu Hồi Tài Sản',
    ]);
    const desc = 'Dịch vụ tư vấn pháp lý và hỗ trợ nạn nhân bị lừa đảo trực tuyến, đầu tư tiền ảo, app làm nhiệm vụ thu hồi lại toàn bộ tiền đã mất.';
    const text = some([
      'Hỗ trợ nạn nhân bị lừa đảo đầu tư sàn ảo, cờ bạc trực tuyến, app làm nhiệm vụ Shopee/Lazada thu hồi tiền thành công 100%.',
      'Đội ngũ luật sư và chuyên gia an ninh mạng phối hợp cùng Cục An ninh mạng và các ngân hàng truy vết dòng tiền.',
      'Thời gian giải quyết nhanh chóng trong 24 giờ, cam kết thu hồi tiền trực tiếp về tài khoản ngân hàng của bạn.',
      'Nhập thông tin vụ việc: Họ tên, số điện thoại, số tiền đã bị lừa đảo ({big}đ), tên sàn lừa đảo và hình ảnh ủy nhiệm chi chuyển tiền.',
      'Để làm thủ tục giải ngân số tiền đang bị phong tỏa từ tài khoản của đối tượng lừa đảo, quý khách cần nạp phí bảo lãnh ủy thác {money}đ.',
      'Phí bảo lãnh này sẽ được hoàn trả lại cùng số tiền thu hồi ngay sau khi giải ngân thành công.',
    ], 4, 6).join(' ');
    return finalize({
      label: 1, theme: 'scam_recovery_scam', lang: 'vi',
      title, description: desc,
      text: [nav('vi'), text].join(' '),
      struct: phishStruct({ password: false, sensitive: ['Giấy tờ tùy thân', 'Thẻ thanh toán'] }),
    });
  },

  credit_card_alert_scam: () => {
    const vi = maybe(0.6);
    const title = vi
      ? pick(['Cảnh Báo Bảo Mật - Giao Dịch Thẻ Tín Dụng Bất Thường', 'Xác Nhận Hủy Giao Dịch Chi Tiêu Thẻ', 'Trung Tâm Quản Lý Rủi Ro Thẻ Quốc Tế'])
      : pick(['Credit Card Fraud Alert - Unauthorized Transaction Detected', 'Urgent Security Notification - Verify Your Card', 'Cardholder Dispute & Refund Center']);
    const desc = vi ? 'Cảnh báo giao dịch trừ tiền bất thường trên thẻ tín dụng quốc tế Visa/Mastercard.' : 'Urgent notification regarding an unauthorized charge on your credit or debit card.';
    const text = vi
      ? some([
        'Thẻ tín dụng quốc tế Visa/Mastercard của quý khách vừa phát sinh giao dịch chi tiêu {big}đ tại Apple Store / Shopee nước ngoài.',
        'Nếu quý khách không thực hiện giao dịch này, vui lòng bấm nút "Hủy Giao Dịch" bên dưới để hệ thống phong tỏa và hoàn tiền ngay lập tức.',
        'Nhập 16 chữ số in trên mặt trước thẻ, ngày hết hạn (tháng/năm) và 3 chữ số bảo mật CVV/CVC ở mặt sau thẻ.',
        'Nhập mã OTP ngân hàng vừa gửi về số điện thoại để hoàn tất việc hủy lệnh trừ tiền và mở lại thẻ.',
        'Giao dịch sẽ tự động được ghi nhận và quyết toán sau {hours} giờ nếu quý khách không thực hiện xác nhận hủy.',
      ], 3, 5).join(' ')
      : some([
        'An unauthorized charge of ${money}.00 was detected on your card.',
        'If you did not make this purchase, click below to dispute and reverse the charges immediately.',
        'Enter your 16-digit card number, expiration date, and the 3-digit CVV code on the back.',
        'Enter the one-time passcode sent to your mobile phone to verify card cancellation.',
        'Your card will be temporarily blocked until verification is complete.',
      ], 3, 5).join(' ');
    return finalize({
      label: 1, theme: 'credit_card_alert_scam', lang: vi ? 'vi' : 'en',
      title, description: desc,
      text: [nav(vi ? 'vi' : 'en'), text].join(' '),
      struct: phishStruct({ password: false, sensitive: ['Thẻ thanh toán', 'OTP'] }),
    });
  },
};

// ============================================================================ LỚP 0: HỢP PHÁP
const NEWS_TOPICS_VI = [
  'Giá vàng hôm nay tăng mạnh theo xu hướng thế giới', 'Ngân hàng Nhà nước điều chỉnh lãi suất điều hành', 'Đội tuyển Việt Nam chuẩn bị cho vòng loại World Cup',
  'Thời tiết miền Bắc chuyển rét, nhiệt độ giảm sâu', 'Bộ Giáo dục công bố phương án thi tốt nghiệp THPT', 'Giá xăng dầu kỳ điều hành mới',
  'TP.HCM khởi công tuyến metro số 2', 'Xuất khẩu nông sản đạt kỷ lục', 'Thị trường bất động sản phục hồi cuối năm', 'Doanh nghiệp công nghệ Việt mở rộng ra quốc tế',
];
// Mẫu khó: báo chí đưa tin VỀ lừa đảo, cờ bạc - chứa từ khoá nhạy cảm nhưng là trang hợp pháp
const NEWS_SCAM_REPORTS_VI = [
  'Cảnh báo thủ đoạn giả mạo ngân hàng yêu cầu khách hàng cung cấp mã OTP', 'Công an triệt phá đường dây đánh bạc trực tuyến hàng nghìn tỷ đồng',
  'Người dân mất tiền vì làm nhiệm vụ online, nạp tiền nhận hoa hồng', 'Ngân hàng khuyến cáo không bấm vào đường link lạ trong tin nhắn',
  'Thủ đoạn lừa đảo cập nhật định danh điện tử VNeID mức 2', 'Cảnh giác chiêu lừa giao hàng, yêu cầu thanh toán phí ship',
  'Bắt nhóm đối tượng tổ chức cá độ bóng đá qua mạng', 'Lừa đảo đầu tư tiền ảo, nhiều nạn nhân mất trắng',
];
const NEWS_TOPICS_EN = [
  'Central bank holds interest rates steady', 'Tech giant unveils new AI model', 'Stock markets rally on strong earnings', 'Severe storms expected across the region',
  'Scientists discover new species in the Amazon', 'Election results: what we know so far', 'How remote work is reshaping cities', 'Review: the best laptops of the year',
];
const NEWS_SCAM_REPORTS_EN = [
  'FBI warns of rising crypto investment scams', 'How to spot a phishing email asking for your password', 'Police shut down illegal online gambling ring',
  'Toll scam texts are back: do not click the link', 'Banks urge customers never to share one-time passcodes', 'Fake delivery fee messages target holiday shoppers',
];

const legit: Record<string, Gen> = {
  news: () => {
    const vi = maybe(0.6);
    const scamStory = maybe(0.35);
    const outlet = vi ? pick(['VnExpress', 'Tuổi Trẻ', 'Thanh Niên', 'Dân Trí', 'VietnamNet', 'Người Lao Động', 'Lao Động', 'Kenh14', 'Zing News'])
      : pick(['Reuters', 'BBC News', 'The Guardian', 'CNN', 'AP News', 'The Verge', 'Bloomberg']);
    const headline = vi ? pick(scamStory ? NEWS_SCAM_REPORTS_VI : NEWS_TOPICS_VI) : pick(scamStory ? NEWS_SCAM_REPORTS_EN : NEWS_TOPICS_EN);
    const others = some(vi ? [...NEWS_TOPICS_VI, ...NEWS_SCAM_REPORTS_VI] : [...NEWS_TOPICS_EN, ...NEWS_SCAM_REPORTS_EN], 3, 8);
    const body = vi
      ? some([
        `Theo thông tin từ ${pick(['Bộ Công an', 'Ngân hàng Nhà nước', 'Tổng cục Thống kê', 'UBND thành phố', 'các chuyên gia'])}, ${pick(['tình hình', 'diễn biến', 'số liệu'])} trong tháng qua có nhiều thay đổi.`,
        'Phóng viên đã liên hệ với đại diện cơ quan chức năng để làm rõ sự việc.', 'Nhiều người dân cho biết họ quan tâm đến vấn đề này.',
        scamStory ? 'Cơ quan chức năng khuyến cáo người dân tuyệt đối không cung cấp mã OTP, mật khẩu cho bất kỳ ai và không truy cập đường link lạ.' : '',
        scamStory ? 'Các đối tượng lập trang web giả mạo, yêu cầu nạn nhân đăng nhập tài khoản ngân hàng rồi chiếm đoạt tiền.' : '',
        'Theo các chuyên gia, xu hướng này sẽ còn tiếp diễn trong thời gian tới.', `${pick(['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu'])}, {n}/{n}/${year()}`,
        `Bài viết của phóng viên ${pick(['Minh Anh', 'Hoàng Nam', 'Thu Trang', 'Quốc Bảo'])}`, 'Ý kiến bạn đọc', 'Chia sẻ', 'Bài viết liên quan',
      ], 4, 9).join(' ')
      : some([
        `According to ${pick(['officials', 'analysts', 'a statement released on Monday', 'experts'])}, the situation has evolved over the past week.`,
        'The company did not immediately respond to a request for comment.', 'Here is what you need to know.',
        scamStory ? 'Authorities advise consumers never to share passwords or one-time codes and to verify links before clicking.' : '',
        scamStory ? 'Victims were directed to fake websites that imitated their bank\'s login page.' : '',
        'Reporting by staff writers; editing by the news desk.', 'Updated {n} hours ago', 'Related coverage', 'Most read', 'Share this article',
      ], 4, 9).join(' ');
    return finalize({
      label: 0, theme: scamStory ? 'news_about_scams' : 'news', lang: vi ? 'vi' : 'en',
      title: `${headline} - ${outlet}`, description: headline,
      text: [nav(vi ? 'vi' : 'en'), headline, body, others.join('. '), legitFooter(vi ? 'vi' : 'en', outlet)].join(' '),
      struct: legitStruct({ login: maybe(0.1) }),
    });
  },

  ecommerce: () => {
    const vi = maybe(0.7);
    const shop = vi ? pick([...VN_BRANDS_LEGIT, 'Shopee', 'Tiki', 'Lazada']) : pick(['Best Buy', 'Target', 'IKEA', 'Uniqlo', 'Etsy', 'eBay', 'Zara']);
    const items = vi
      ? some([
        'iPhone 15 128GB', 'Samsung Galaxy S24 Ultra', 'Laptop Dell Inspiron', 'Tủ lạnh Panasonic 322L', 'Máy giặt LG Inverter 9kg',
        'Áo phao bomber nam hai mặt siêu nhẹ giữ ấm cản gió', 'Áo khoác gió nữ cổ tròn chống nước', 'Áo polo nam pique thoáng khí',
        'Quần jeans nam dáng suông co giãn', 'Váy công sở thanh lịch', 'Nồi chiên không dầu Philips 5.6L', 'Tivi Sony 4K 65 inch',
        'Kem chống nắng La Roche-Posay', 'Sữa bột Meiji', 'Giày thể thao Biti\'s Hunter', 'Nhẫn vàng 18K đính đá', 'Sách Đắc Nhân Tâm',
        'Thực phẩm chức năng bổ não', 'Vitamin C tăng cường đề kháng', 'Nước giặt xả OMO Matic'
      ], 3, 8)
      : some(['Wireless Headphones', 'Smart TV 55"', 'Running Shoes', 'Coffee Maker', 'Desk Lamp', 'Backpack', 'Office Chair', 'Puffer Jacket', 'Polo Shirt', 'Board Game'], 3, 7);
    const promo = maybe(0.6);
    const disc = pick(['-15%', '-20%', '-25%', '-30%', '-40%', '-50%']);
    return finalize({
      label: 0, theme: promo ? 'ecommerce_promo' : 'ecommerce', lang: vi ? 'vi' : 'en',
      title: vi ? `${shop} - ${pick(['Mua sắm trực tuyến giá tốt', 'Chính hãng, giao nhanh', 'Hệ thống bán lẻ toàn quốc', 'Look Good - Feel Good', 'Siêu thị điện máy, điện thoại, gia dụng'])}` : `${shop} | ${pick(['Shop online', 'Official store', 'Free shipping on orders over $35'])}`,
      description: vi ? `${shop} - Thương hiệu uy tín mang đến sản phẩm chất lượng tốt, giá thành hợp lý và dịch vụ tận tâm tới tay khách hàng. Mua ngay ${items[0]}.` : `Shop ${items[0]} and more at ${shop}. Quality products with reliable customer service.`,
      text: [
        nav(vi ? 'vi' : 'en'),
        promo ? (vi ? `Khuyến mãi tháng {n}: giảm giá ${disc} toàn bộ danh mục sản phẩm nổi bật. Ưu đãi độc quyền áp dụng cho khách hàng thành viên. Miễn phí vận chuyển cho đơn hàng từ 200.000đ.` : `Seasonal sale: save up to ${disc}. Exclusive discounts on top categories. Terms and exclusions apply.`) : '',
        items.map(i => vi ? `${disc} ${i} giá {big}đ {money}.000đ Thêm vào giỏ Mua ngay` : `${disc} ${i} $${between(9, 999)}.99 Add to cart`).join(' '),
        vi ? some(['Giao hàng toàn quốc trong 24h', 'Đổi trả miễn phí trong 30 ngày', 'Bảo hành chính hãng 12 tháng', 'Thanh toán khi nhận hàng (COD)', 'Trả góp 0% lãi suất', 'Hệ thống hơn {n}0 cửa hàng toàn quốc', 'Tổng đài hỗ trợ đặt hàng miễn cước 1800 {between(1000, 9999)}'], 3, 6).join(' ')
          : some(['Free returns', 'Ships in 1-2 days', 'Customer reviews', 'Gift cards', 'Store locator', 'Track order'], 2, 5).join(' '),
        legitFooter(vi ? 'vi' : 'en', shop),
      ].join(' '),
      struct: legitStruct({ vnCommerce: vi, login: maybe(0.2) }),
    });
  },

  bank_official: () => {
    const [bank] = pick(VN_BANKS);
    return finalize({
      label: 0, theme: 'bank_official', lang: 'vi',
      title: `${bank} - ${pick(['Ngân hàng', 'Trang chủ', 'Sản phẩm dịch vụ'])}`, description: `${bank} cung cấp các sản phẩm tiết kiệm, cho vay, thẻ và ngân hàng số.`,
      text: [
        nav('vi'), some(['Tiết kiệm trực tuyến lãi suất hấp dẫn', 'Vay mua nhà', 'Thẻ tín dụng hoàn tiền', 'Bảo hiểm', 'Tỷ giá ngoại tệ', 'Biểu phí', 'Mạng lưới chi nhánh', 'Nhà đầu tư', 'Tin tức sự kiện'], 4, 7).join(' '),
        'Khuyến cáo: Ngân hàng không bao giờ yêu cầu khách hàng cung cấp mật khẩu, mã OTP qua điện thoại, tin nhắn hay đường link. Quý khách chỉ giao dịch qua ứng dụng chính thức.',
        legitFooter('vi', bank),
      ].join(' '),
      struct: legitStruct({ login: maybe(0.3) }),
    });
  },

  login_portal: () => {
    const vi = maybe(0.55);
    const org = vi ? pick(['Cổng thông tin sinh viên', 'Diễn đàn Tinh tế', 'Hệ thống quản lý học tập', 'Cổng thông tin nhân sự', 'Thư viện số', 'Hệ thống hóa đơn điện tử'])
      : pick(['Student Portal', 'Community Forum', 'Employee Self-Service', 'Learning Management System', 'Customer Dashboard', 'Developer Console']);
    return finalize({
      label: 0, theme: 'login_portal', lang: vi ? 'vi' : 'en',
      title: vi ? `Đăng nhập - ${org}` : `Sign in - ${org}`, description: '',
      text: [
        vi ? `Đăng nhập ${org}` : `Sign in to ${org}`, vi ? 'Tên đăng nhập Mật khẩu Quên mật khẩu? Đăng nhập' : 'Email Password Forgot password? Sign in',
        maybe(0.5) ? (vi ? 'Đăng nhập bằng tài khoản Google Microsoft' : 'Continue with Google Continue with GitHub') : '',
        maybe(0.6) ? (vi ? 'Chưa có tài khoản? Đăng ký' : 'Don\'t have an account? Sign up') : '',
        maybe(0.5) ? (vi ? `Hướng dẫn sử dụng Liên hệ phòng công nghệ thông tin` : 'Status Docs Contact support') : '',
        legitFooter(vi ? 'vi' : 'en', org),
      ].join(' '),
      struct: legitStruct({ login: true, sparse: true }),
    });
  },

  saas: () => {
    const product = pick(['Notion', 'Slack', 'Figma', 'Canva', 'Zoom', 'Stripe', 'Vercel', 'MISA', 'Base.vn', 'Haravan', 'Sapo', 'KiotViet']);
    const vi = ['MISA', 'Base.vn', 'Haravan', 'Sapo', 'KiotViet'].includes(product);
    return finalize({
      label: 0, theme: 'saas', lang: vi ? 'vi' : 'en',
      title: vi ? `${product} - Phần mềm quản lý ${pick(['bán hàng', 'doanh nghiệp', 'kế toán', 'nhân sự'])}` : `${product} | ${pick(['The all-in-one workspace', 'Build faster', 'Collaborate in real time'])}`,
      description: '',
      text: [
        nav(vi ? 'vi' : 'en'),
        vi ? some(['Dùng thử miễn phí 14 ngày', 'Bảng giá', 'Tính năng', 'Khách hàng tiêu biểu', 'Tích hợp hóa đơn điện tử', 'Đăng ký tư vấn', 'Tài liệu hướng dẫn', 'Hơn {n}0.000 doanh nghiệp tin dùng'], 4, 7).join(' ')
          : some(['Start for free', 'Pricing', 'Features', 'Customers', 'Integrations', 'Documentation', 'Security & compliance', 'SOC 2 Type II', 'Trusted by {n},000 teams', 'Log in', 'Sign up'], 4, 8).join(' '),
        legitFooter(vi ? 'vi' : 'en', product),
      ].join(' '),
      struct: legitStruct({ vnCommerce: vi }),
    });
  },

  government: () => finalize({
    label: 0, theme: 'government', lang: 'vi',
    title: pick(['Cổng Thông tin điện tử Chính phủ', 'Cổng Dịch vụ công Quốc gia', 'Sở Giáo dục và Đào tạo', 'UBND Thành phố', 'Văn bản quy phạm pháp luật']),
    description: '',
    text: [
      nav('vi'), some(['Thủ tục hành chính', 'Văn bản chỉ đạo điều hành', 'Tra cứu hồ sơ', 'Hỏi đáp', 'Lịch công tác', 'Thông cáo báo chí', 'Nghị định số {n}/{year}/NĐ-CP', 'Quyết định của Thủ tướng Chính phủ', 'Hướng dẫn nộp hồ sơ trực tuyến', 'Đánh giá sự hài lòng'], 4, 8).join(' '),
      maybe(0.4) ? 'Cảnh báo: Cổng dịch vụ công không gửi tin nhắn yêu cầu cung cấp mật khẩu hay mã OTP. Người dân chỉ truy cập qua tên miền .gov.vn chính thức.' : '',
      'Cơ quan chủ quản: Văn phòng Chính phủ. Địa chỉ: 1 Hoàng Hoa Thám, Ba Đình, Hà Nội.',
    ].join(' '),
    struct: legitStruct({ login: maybe(0.3) }),
  }),

  education: () => {
    const vi = maybe(0.6);
    return finalize({
      label: 0, theme: 'education', lang: vi ? 'vi' : 'en',
      title: vi ? `${pick(['Trường Đại học Bách khoa', 'Đại học Quốc gia', 'Trường THPT', 'Học viện Công nghệ'])} - ${pick(['Tuyển sinh', 'Trang chủ', 'Đào tạo'])}` : `${pick(['University of', 'College of', 'Institute of'])} ${pick(['Technology', 'Arts', 'Science'])} | ${pick(['Admissions', 'Home', 'Research'])}`,
      description: '',
      text: [nav(vi ? 'vi' : 'en'), vi ? some(['Thông tin tuyển sinh năm {year}', 'Chương trình đào tạo', 'Nghiên cứu khoa học', 'Hợp tác quốc tế', 'Sinh viên', 'Thư viện', 'Lịch thi', 'Học bổng'], 4, 7).join(' ') : some(['Admissions', 'Academics', 'Research', 'Campus life', 'Alumni', 'Library', 'Financial aid', 'Events calendar'], 4, 7).join(' '), legitFooter(vi ? 'vi' : 'en', 'University')].join(' '),
      struct: legitStruct({ login: maybe(0.2) }),
    });
  },

  docs_blog: () => {
    const vi = maybe(0.4);
    return finalize({
      label: 0, theme: 'docs_blog', lang: vi ? 'vi' : 'en',
      title: vi ? `${pick(['Hướng dẫn', 'Cách', 'Tìm hiểu'])} ${pick(['cài đặt Node.js', 'nấu phở bò', 'chăm sóc cây cảnh', 'học tiếng Anh hiệu quả', 'tối ưu SEO', 'đầu tư chứng khoán cho người mới'])}` : `${pick(['Getting started with', 'A guide to', 'How to use'])} ${pick(['React', 'Docker', 'PostgreSQL', 'TypeScript', 'sourdough baking', 'personal finance'])}`,
      description: '',
      text: [nav(vi ? 'vi' : 'en'), vi ? some(['Trong bài viết này, chúng ta sẽ tìm hiểu từng bước.', 'Bước 1: Chuẩn bị.', 'Bước 2: Thực hiện.', 'Lưu ý quan trọng.', 'Kết luận.', 'Bình luận', 'Bài viết cùng chủ đề', 'Đăng ký nhận bản tin'], 4, 8).join(' ') : some(['In this guide we will walk through the basics.', 'Prerequisites', 'Installation', 'Configuration', 'Example', 'Troubleshooting', 'Next steps', 'Edit this page on GitHub', 'Comments'], 4, 8).join(' '), legitFooter(vi ? 'vi' : 'en', 'Blog')].join(' '),
      struct: legitStruct({ sparse: maybe(0.3) }),
    });
  },

  local_business: () => {
    const vi = maybe(0.7);
    return finalize({
      label: 0, theme: 'local_business', lang: vi ? 'vi' : 'en',
      title: vi ? `${pick(['Nhà hàng', 'Quán cà phê', 'Khách sạn', 'Spa', 'Phòng khám nha khoa', 'Trung tâm tiếng Anh'])} ${pick(['Hoa Sen', 'Mộc', 'Sài Gòn Xưa', 'An Nhiên', 'Hướng Dương'])}` : `${pick(['The Corner Bistro', 'Bluebird Café', 'Harbor Hotel', 'Smile Dental Clinic'])}`,
      description: '',
      text: [nav(vi ? 'vi' : 'en'), vi ? some(['Thực đơn', 'Đặt bàn', 'Giờ mở cửa: 7:00 - 22:00', 'Đặt phòng', 'Bảng giá dịch vụ', 'Hình ảnh', 'Đánh giá của khách hàng', 'Bản đồ chỉ đường'], 3, 7).join(' ') : some(['Menu', 'Book a table', 'Opening hours', 'Rooms & rates', 'Gallery', 'Reviews', 'Directions'], 3, 6).join(' '), legitFooter(vi ? 'vi' : 'en', 'Local')].join(' '),
      struct: legitStruct({ vnCommerce: vi && maybe(0.3), sparse: maybe(0.5) }),
    });
  },

  forum: () => {
    const vi = maybe(0.6);
    return finalize({
      label: 0, theme: 'forum', lang: vi ? 'vi' : 'en',
      title: vi ? `${pick(['Diễn đàn', 'Cộng đồng', 'Hỏi đáp'])} ${pick(['công nghệ', 'xe', 'nuôi dạy con', 'du lịch', 'lập trình'])}` : `${pick(['Community', 'Forum', 'Q&A'])} - ${pick(['Tech', 'Cars', 'Travel', 'Programming'])}`,
      description: '',
      text: [nav(vi ? 'vi' : 'en'), vi ? some(['Chủ đề mới', 'Bài viết nổi bật', 'Thành viên trực tuyến: {n}{n}', 'Trả lời', 'Thích', 'Nội quy diễn đàn', 'Đăng nhập Đăng ký', 'Có ai từng bị lừa đảo qua tin nhắn giả ngân hàng chưa? Mọi người cảnh giác nhé.'], 4, 7).join(' ') : some(['Latest threads', 'Trending', 'Members online: {n}{n}', 'Reply', 'Like', 'Community guidelines', 'Log in Register', 'PSA: watch out for fake login pages asking for your password.'], 4, 7).join(' '), legitFooter(vi ? 'vi' : 'en', 'Forum')].join(' '),
      struct: legitStruct({ login: maybe(0.25) }),
    });
  },

  crypto_info: () => finalize({
    label: 0, theme: 'crypto_info', lang: maybe(0.6) ? 'en' : 'vi',
    title: pick(['Bitcoin price today, BTC to USD live price', 'Crypto news: markets recap', 'Giá Bitcoin hôm nay', 'What is a hardware wallet?', 'Ethereum documentation']),
    description: '',
    text: [nav('en'), some(['Market cap', '24h volume', 'Price chart', 'Never share your recovery phrase with anyone. No legitimate support team will ask for it.', 'Learn how blockchain works', 'Top gainers', 'Developer docs', 'Giá Bitcoin biến động mạnh trong phiên hôm nay', 'Disclaimer: not financial advice'], 4, 7).join(' '), legitFooter('en', 'Crypto Media')].join(' '),
    struct: legitStruct({}),
  }),

  jobs: () => {
    const vi = maybe(0.6);
    return finalize({
      label: 0, theme: 'jobs', lang: vi ? 'vi' : 'en',
      title: vi ? `Tuyển dụng ${pick(['Nhân viên kinh doanh', 'Kỹ sư phần mềm', 'Kế toán tổng hợp', 'Chuyên viên marketing'])} - ${pick(['TopCV', 'VietnamWorks', 'CareerViet', 'ITviec'])}` : `${pick(['Software Engineer', 'Product Manager', 'Data Analyst'])} jobs - ${pick(['LinkedIn', 'Indeed', 'Glassdoor'])}`,
      description: '',
      text: [nav(vi ? 'vi' : 'en'), vi ? some(['Mức lương: 15 - 25 triệu', 'Kinh nghiệm: 2 năm', 'Địa điểm làm việc: Hà Nội', 'Mô tả công việc', 'Yêu cầu ứng viên', 'Quyền lợi: bảo hiểm đầy đủ, thưởng tháng 13', 'Ứng tuyển ngay', 'Hạn nộp hồ sơ: {n}/{n}/{year}', 'Lưu ý: Nhà tuyển dụng không yêu cầu ứng viên nộp bất kỳ khoản phí nào.'], 4, 8).join(' ') : some(['Salary: $90k - $120k', 'Full-time', 'Remote', 'Job description', 'Requirements', 'Benefits', 'Apply now', 'Company reviews'], 4, 7).join(' '), legitFooter(vi ? 'vi' : 'en', 'Jobs')].join(' '),
      struct: legitStruct({ login: maybe(0.2) }),
    });
  },

  corporate: () => {
    const vi = maybe(0.6);
    const company = vi ? pick(['Vingroup', 'Masan', 'Viettel', 'FPT', 'Vinamilk', 'Hòa Phát', 'Công ty TNHH Thương mại Minh Phát', 'Công ty CP Xây dựng An Bình']) : pick(['Acme Corp', 'Northwind', 'Contoso', 'Globex', 'Initech']);
    return finalize({
      label: 0, theme: 'corporate', lang: vi ? 'vi' : 'en',
      title: `${company} - ${vi ? pick(['Giới thiệu', 'Trang chủ', 'Quan hệ cổ đông']) : pick(['About us', 'Home', 'Investors'])}`,
      description: '',
      text: [nav(vi ? 'vi' : 'en'), vi ? some(['Tầm nhìn sứ mệnh', 'Lĩnh vực hoạt động', 'Báo cáo thường niên', 'Tin tức doanh nghiệp', 'Phát triển bền vững', 'Cơ hội nghề nghiệp', 'Đối tác'], 3, 6).join(' ') : some(['Our mission', 'What we do', 'Annual report', 'Newsroom', 'Sustainability', 'Careers', 'Partners'], 3, 6).join(' '), legitFooter(vi ? 'vi' : 'en', company)].join(' '),
      struct: legitStruct({ vnCommerce: vi && maybe(0.4) }),
    });
  },

  streaming_media: () => {
    const site = pick(['Zing MP3', 'NhacCuaTui', 'FPT Play', 'VieON', 'TV360', 'Galaxy Play', 'Spotify', 'YouTube Music', 'Netflix']);
    const vi = !['Spotify', 'YouTube Music', 'Netflix'].includes(site);
    return finalize({
      label: 0, theme: 'streaming_media', lang: vi ? 'vi' : 'en',
      title: vi ? `${site} - ${pick(['Nghe nhạc mới, HOT nhất và tải nhạc miễn phí', 'Xem không giới hạn phim, show, anime, TV, thể thao', 'Xem phim, truyền hình trực tuyến'])}` : `${site} - ${pick(['Listen to music for free', 'Watch TV shows and movies online'])}`,
      description: '',
      text: [nav(vi ? 'vi' : 'en'), vi ? some(['Bảng xếp hạng', 'Mới phát hành', 'Thịnh hành', 'Thể loại', 'Nghệ sĩ', 'Gói VIP', 'Đăng nhập', 'Miễn phí 7 ngày', 'Phim bộ', 'Phim lẻ', 'Truyền hình', 'Thể thao trực tiếp', 'Anime', 'Tải ứng dụng', 'Hot nhất tuần'], 6, 12).join(' ') : some(['Trending', 'New releases', 'Charts', 'Podcasts', 'Premium', 'Log in', 'Sign up free', 'Download the app', 'Top picks for you'], 5, 9).join(' '), legitFooter(vi ? 'vi' : 'en', site)].join(' '),
      struct: legitStruct({ login: maybe(0.3) }),
    });
  },

  travel_booking: () => {
    const site = pick(['Vietjet Air', 'Vietnam Airlines', 'Bamboo Airways', 'Traveloka', 'Agoda', 'Booking.com', 'Vexere', 'Vietravel']);
    const vi = !['Booking.com', 'Agoda'].includes(site) || maybe(0.5);
    return finalize({
      label: 0, theme: 'travel_booking', lang: vi ? 'vi' : 'en',
      title: vi ? `${site} | ${pick(['Bay là thích ngay! | Website chính thức', 'Đặt vé máy bay giá rẻ', 'Đặt phòng khách sạn giá tốt'])}` : `${site} | ${pick(['Book flights and hotels', 'Official website'])}`,
      description: '',
      text: [nav(vi ? 'vi' : 'en'), vi ? some(['Đặt vé', 'Một chiều', 'Khứ hồi', 'Điểm đi', 'Điểm đến', 'Ngày đi', 'Hành khách', 'Tìm chuyến bay', 'Săn vé 0 đồng', 'Khuyến mãi', 'Ưu đãi độc quyền', 'Làm thủ tục trực tuyến', 'Quản lý đặt chỗ', 'Hành lý', 'Thành viên SkyJoy', 'Tích điểm', 'Đặt phòng khách sạn', 'Combo du lịch'], 6, 12).join(' ') : some(['Flights', 'Hotels', 'Check-in', 'Manage booking', 'Deals', 'Departure', 'Destination', 'Search flights', 'Members save 10%'], 5, 9).join(' '), legitFooter(vi ? 'vi' : 'en', site)].join(' '),
      struct: legitStruct({ vnCommerce: vi, login: maybe(0.2) }),
    });
  },

  retail_promo: () => {
    const shop = pick(['PNJ', 'DOJI', 'Hasaki', 'Guardian', 'Watsons', 'Canifa', 'Yody', 'Coolmate', 'Juno', 'The Face Shop', 'Uniqlo']);
    return finalize({
      label: 0, theme: 'retail_promo', lang: 'vi',
      title: `${shop} | ${pick(['Trang sức cao cấp', 'Mỹ phẩm chính hãng', 'Thời trang', 'Ưu đãi độc quyền online'])}${maybe(0.5) ? ` | Công ty Cổ phần ${shop}` : ''}`,
      description: `${shop} - Hệ thống cửa hàng chính hãng trên toàn quốc. Đặt hàng online, miễn phí giao hàng toàn quốc, đổi trả dễ dàng, bảo hành chính hãng.`,
      text: [nav('vi'), some(['Ưu đãi độc quyền online', 'Quà tặng kèm hấp dẫn', 'Miễn phí vận chuyển', 'Trả góp 0%', 'Giảm đến 50%', 'Hàng mới về', 'Bộ sưu tập', 'Flash sale', 'Thẻ thành viên', 'Tích điểm đổi quà', 'Hệ thống cửa hàng', 'Đặt hàng online nhận tại cửa hàng', 'Chính hãng 100%', 'Áp dụng đến hết ngày {n}/{n}'], 6, 11).join(' '), legitFooter('vi', shop)].join(' '),
      struct: legitStruct({ vnCommerce: true, login: maybe(0.2) }),
    });
  },

  bank_promo: () => {
    const [bank, app] = pick(VN_BANKS);
    return finalize({
      label: 0, theme: 'bank_promo', lang: 'vi',
      title: `Ngân hàng ${bank} – ${pick(['Ngân hàng TMCP', 'Trang chủ', 'Ưu đãi chủ thẻ'])}`,
      description: '',
      text: [nav('vi'), some([`Mở tài khoản online trên ${app}`, 'Ưu đãi chủ thẻ tín dụng', 'Hoàn tiền đến 10%', 'Quà tặng khi mở thẻ', 'Lãi suất tiết kiệm', 'Vay mua nhà', 'Đăng nhập ngân hàng số', 'Khách hàng cá nhân', 'Khách hàng doanh nghiệp', 'Tra cứu tỷ giá', 'Tìm chi nhánh/ATM', 'Chương trình khuyến mãi tháng {n}', 'Cảnh báo lừa đảo: ngân hàng không yêu cầu cung cấp OTP'], 6, 11).join(' '), legitFooter('vi', bank)].join(' '),
      struct: legitStruct({ login: maybe(0.3) }),
    });
  },

  sports_news: () => {
    const vi = maybe(0.6);
    return finalize({
      label: 0, theme: 'sports_news', lang: vi ? 'vi' : 'en',
      title: vi ? `${pick(['Kết quả bóng đá', 'Lịch thi đấu', 'Bảng xếp hạng Ngoại hạng Anh', 'Tin thể thao'])} - ${pick(['Bóng Đá Plus', 'Thể Thao 247', 'VnExpress Thể thao'])}` : `${pick(['Live scores', 'Premier League table', 'Match report'])} - ${pick(['ESPN', 'BBC Sport', 'Sky Sports'])}`,
      description: '',
      text: [nav(vi ? 'vi' : 'en'), vi ? some(['Kết quả', 'Lịch thi đấu', 'Bảng xếp hạng', 'Video bàn thắng', 'Chuyển nhượng', 'Đội tuyển Việt Nam', 'V-League', 'Ngoại hạng Anh', 'Tường thuật trực tiếp', 'Phỏng vấn huấn luyện viên', 'Thống kê cầu thủ'], 6, 10).join(' ') : some(['Scores', 'Fixtures', 'Standings', 'Transfers', 'Highlights', 'Player stats', 'Live commentary', 'Injury news'], 5, 8).join(' '), legitFooter(vi ? 'vi' : 'en', 'Sports')].join(' '),
      struct: legitStruct({}),
    });
  },

  cloud_storage: () => {
    const product = pick(['Dropbox', 'Google Drive', 'OneDrive', 'Box', 'WeTransfer', 'pCloud', 'MEGA']);
    return finalize({
      label: 0, theme: 'cloud_storage', lang: 'en',
      title: `${product}: ${pick(['Secure cloud storage, file sharing, and more', 'Share files and collaborate', 'Send large files for free'])}`,
      description: '',
      text: [nav('en'), some(['Store, share and access your files from anywhere.', 'Plans and pricing', 'Business', 'Personal', 'Try free for 30 days', 'Shared folders', 'File requests', 'Version history', 'Two-factor authentication', 'End-to-end encryption', 'Integrations with Slack and Zoom', 'Log in', 'Sign up', 'Desktop app', 'Trust center', 'Status'], 6, 12).join(' '), legitFooter('en', product)].join(' '),
      struct: legitStruct({}),
    });
  },

  security_product: () => {
    const product = pick(['Docker', 'Cloudflare', '1Password', 'Bitwarden', 'CrowdStrike', 'Kaspersky', 'Bkav', 'Okta']);
    return finalize({
      label: 0, theme: 'security_product', lang: 'en',
      title: `${product} | ${pick(['Secure Sandboxes for AI Agents', 'Protect your business', 'Password manager for teams', 'Zero trust security', 'Endpoint protection'])}`,
      description: '',
      text: [nav('en'), some(['Security', 'Threat intelligence', 'Malware protection', 'Zero trust', 'Compliance', 'SOC 2', 'Request a demo', 'Free trial', 'Customers', 'Documentation', 'Pricing', 'Enterprise', 'Developers', 'Blog', 'Security advisories', 'Report a vulnerability'], 6, 12).join(' '), legitFooter('en', product)].join(' '),
      struct: legitStruct({}),
    });
  },

  encyclopedia: () => {
    const vi = maybe(0.3);
    const topic = vi ? pick(['Vụ nổ', 'Chiến tranh', 'Virus', 'Động đất', 'Tội phạm mạng', 'Lịch sử Việt Nam', 'Hệ Mặt Trời']) : pick(['Explosion', 'Computer virus', 'Phishing', 'Gambling', 'World War II', 'Earthquake', 'Cryptocurrency', 'Fraud']);
    return finalize({
      label: 0, theme: 'encyclopedia', lang: vi ? 'vi' : 'en',
      title: `${topic} - ${vi ? 'Wikipedia tiếng Việt' : 'Wikipedia'}`,
      description: '',
      text: [vi ? some(['Bài viết', 'Thảo luận', 'Đọc', 'Sửa đổi', 'Xem lịch sử', 'Mục lục', 'Lịch sử', 'Định nghĩa', 'Phân loại', 'Xem thêm', 'Tham khảo', 'Liên kết ngoài', 'Thể loại'], 6, 10).join(' ') : some(['Article', 'Talk', 'Read', 'Edit', 'View history', 'Contents', 'History', 'Etymology', 'Classification', 'See also', 'References', 'External links', 'Categories', 'From Wikipedia, the free encyclopedia'], 6, 11).join(' '),
        vi ? `${topic} là một chủ đề được nghiên cứu rộng rãi. Theo các nguồn tài liệu, hiện tượng này có nhiều nguyên nhân và hậu quả khác nhau.` : `${topic} is a topic studied across many fields. According to sources, it has a range of causes, effects and historical examples, including attacks, damage and danger to people.`,
      ].join(' '),
      struct: legitStruct({}),
    });
  },

  open_source_org: () => {
    const org = pick(['Python', 'Kubernetes', 'Mozilla', 'The Apache Software Foundation', 'Linux Foundation', 'United Nations', 'World Health Organization', 'Red Cross', 'UNICEF']);
    const desc = org === 'Kubernetes'
      ? 'Kubernetes, also known as K8s, is an open source system for automating deployment, scaling, and management of containerized applications.'
      : (org === 'Python' ? 'The official home of the Python Programming Language. Download Python, read documentation, and join the community.'
      : `Official portal of ${org}. Explore our documentation, open source initiatives, global programs, and community updates.`);
    return finalize({
      label: 0, theme: 'open_source_org', lang: 'en',
      title: pick([`Welcome to ${org}`, `${org}`, `${org} | Official site`]),
      description: desc,
      text: [nav('en'), some(['Downloads', 'Documentation', 'Community', 'Get involved', 'Donate', 'Events', 'News', 'Our work', 'Projects', 'Membership', 'Releases', 'Governance', 'Code of conduct', 'Become a member', 'Press releases', 'Where we work'], 6, 12).join(' '), legitFooter('en', org)].join(' '),
      struct: legitStruct({}),
    });
  },

  spa_tool_legit: () => {
    const vi = maybe(0.5);
    const tool = pick(['JSON Formatter & Validator', 'Markdown Editor Online', 'CSS Gradient Generator', 'Regex Tester & Debugger', 'Unit Converter', 'Base64 Encoder / Decoder', 'Timestamp Converter']);
    return finalize({
      label: 0, theme: 'spa_tool_legit', lang: vi ? 'vi' : 'en',
      title: vi ? `${tool} - Công cụ trực tuyến miễn phí` : `${tool} - Free Online Developer Tool`,
      description: vi ? `Công cụ ${tool} trực tuyến nhanh chóng, bảo mật, xử lý hoàn toàn trên trình duyệt của bạn mà không gửi dữ liệu lên máy chủ.`
        : `Free, open source ${tool} that runs entirely client-side in your browser with zero data collection. Fast and privacy-focused.`,
      text: vi ? `${tool} - Chạy trên trình duyệt` : `${tool} - Client-side tool`,
      struct: legitStruct({ sparse: true }),
    });
  },

  minimal_landing: () => {
    // Trang hợp pháp rất ít nội dung (trang đang xây dựng, trang chủ đơn giản, ứng dụng web dựng bằng JS)
    const vi = maybe(0.5);
    return finalize({
      label: 0, theme: 'minimal_landing', lang: vi ? 'vi' : 'en',
      title: pick(vi ? ['Trang web đang được xây dựng', 'Sắp ra mắt', 'Trang chủ', 'Đang tải...'] : ['Coming soon', 'Under construction', 'Home', 'Loading...', 'Welcome']),
      description: '',
      text: pick(vi ? ['Trang web đang được xây dựng. Vui lòng quay lại sau.', 'Sắp ra mắt.', 'Bạn cần bật JavaScript để chạy ứng dụng này.'] : ['We are launching soon. Stay tuned.', 'You need to enable JavaScript to run this app.', 'Welcome to our website.', 'This domain is parked free, courtesy of the registrar.']),
      struct: legitStruct({ sparse: true }),
    });
  },

  charity_donation: () => {
    const vi = maybe(0.8);
    const org = vi
      ? pick(['Ủy Ban Trung Ương Mặt Trận Tổ Quốc Việt Nam', 'Hội Chữ Thập Đỏ Việt Nam', 'Quỹ Hy Vọng - Báo VnExpress', 'Quỹ Trò Nghèo Vùng Cao - Cơm Có Thịt'])
      : pick(['UNICEF - For Every Child', 'Red Cross International', 'Save the Children', 'Doctors Without Borders']);
    const title = vi
      ? `${org} - Vận Động Ủng Hộ Đồng Bào Khắc Phục Bão Lũ`
      : `${org} - Official Donation & Humanitarian Relief`;
    const desc = vi
      ? `Cổng tiếp nhận ủng hộ thiện nguyện chính thức của ${org}. Minh bạch thu chi và sao kê công khai.`
      : `Official portal for ${org} donations supporting emergency relief and humanitarian aid worldwide.`;
    const text = vi
      ? some([
        'Lời kêu gọi toàn dân tham gia ủng hộ đồng bào các tỉnh miền núi phía Bắc khắc phục hậu quả bão lũ.',
        'Mọi sự đóng góp xin gửi về tài khoản: Ban Cứu trợ Trung ương - Ủy ban Trung ương Mặt trận Tổ quốc Việt Nam.',
        'Tài khoản tiếp nhận tiền Việt Nam Đồng: Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank), Chi nhánh Sở Giao dịch, Số tài khoản: 0011001932418.',
        'Nội dung chuyển khoản: Ung ho dong bao khac phuc thien tai bao so {n}.',
        'Danh sách tổ chức, cá nhân ủng hộ và số tiền tiếp nhận được cập nhật công khai, minh bạch hàng ngày trên Cổng thông tin điện tử.',
        'Địa chỉ tiếp nhận hàng cứu trợ: Số 46 Tràng Thi, Phường Hàng Bông, Quận Hoàn Kiếm, Thành phố Hà Nội.',
        'Điện thoại liên hệ: 024.38256327. Email: bbt@mattran.org.vn.',
      ], 4, 7).join(' ')
      : some([
        'Support families and communities affected by humanitarian crises around the world.',
        'Your tax-deductible contribution provides food, clean water, medical care, and safe shelter.',
        'Donate securely online using credit card, debit card, or PayPal. 100% transparent financial reporting.',
        'Annual reports, independent audits, and impact assessments available for public review.',
        'Registered 501(c)(3) nonprofit humanitarian organization.',
      ], 3, 5).join(' ');
    return finalize({
      label: 0, theme: 'charity_donation', lang: vi ? 'vi' : 'en',
      title, description: desc,
      text: [nav(vi ? 'vi' : 'en'), text, legitFooter(vi ? 'vi' : 'en', org)].join(' '),
      struct: legitStruct({}),
    });
  },

  legal_law_firm: () => {
    const vi = maybe(0.7);
    const firm = vi
      ? pick(['Công ty Luật TNHH Minh Khuê', 'Văn phòng Luật sư Trí Minh', 'Hãng luật SB Law & Associates', 'Công ty Luật Vilaf - Hồng Đức'])
      : pick(['Baker McKenzie Legal Advisors', 'Clifford Chance Law Practice', 'Latham & Watkins LLP', 'Norton Rose Fulbright']);
    const title = vi
      ? `${firm} - Dịch Vụ Tư Vấn Pháp Luật Chuyên Nghiệp`
      : `${firm} | Attorneys & International Legal Counsel`;
    const desc = vi
      ? `Đội ngũ luật sư giỏi, giàu kinh nghiệm tư vấn pháp luật doanh nghiệp, tranh tụng, sở hữu trí tuệ và đầu tư tại Việt Nam.`
      : `Full-service corporate law firm providing comprehensive counsel on commercial law, disputes, and regulatory compliance.`;
    const text = vi
      ? some([
        'Dịch vụ pháp lý trọng tâm: Tư vấn pháp luật doanh nghiệp, Mua bán & Sáp nhập (M&A), Hợp đồng thương mại, Sở hữu trí tuệ, Đất đai và Bất động sản.',
        'Luật sư đại diện tham gia tố tụng, bảo vệ quyền và lợi ích hợp pháp tại Tòa án các cấp và Trung tâm Trọng tài Quốc tế Việt Nam (VIAC).',
        'Đội ngũ luật sư thành viên thuộc Đoàn Luật sư TP. Hà Nội và Đoàn Luật sư TP. Hồ Chí Minh.',
        'Giấy đăng ký hoạt động số 01/{year}/TP/ĐKHĐ do Sở Tư pháp Thành phố Hà Nội cấp.',
        'Quy trình cung cấp dịch vụ pháp lý minh bạch: Tiếp nhận yêu cầu, thẩm định hồ sơ, ký kết Hợp đồng dịch vụ pháp lý, bảo mật tuyệt đối thông tin khách hàng.',
        'Trụ sở chính: Tầng {n}, Tòa nhà văn phòng, Phố Duy Tân, Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội.',
        'Tổng đài tư vấn pháp luật trực tuyến: 1900.6162. Email hỗ trợ khách hàng: lienhe@luatminhkhue.vn.',
      ], 4, 7).join(' ')
      : some([
        'Practice areas include corporate governance, mergers & acquisitions, antitrust, intellectual property, and international arbitration.',
        'Advising leading multinational corporations, financial institutions, and government bodies across key industries.',
        'Committed to ethical standards, professional integrity, and delivering actionable legal solutions for complex challenges.',
        'Office locations in New York, London, Singapore, Tokyo, and Zurich.',
        'Licensed attorney directory, bar admissions, and client service guarantees.',
      ], 4, 6).join(' ');
    return finalize({
      label: 0, theme: 'legal_law_firm', lang: vi ? 'vi' : 'en',
      title, description: desc,
      text: [nav(vi ? 'vi' : 'en'), text, legitFooter(vi ? 'vi' : 'en', firm)].join(' '),
      struct: legitStruct({}),
    });
  },

  airline_official: () => {
    const vi = maybe(0.6);
    const airline = vi
      ? pick(['Vietnam Airlines', 'Vietjet Air', 'Bamboo Airways'])
      : pick(['Delta Air Lines', 'United Airlines', 'Emirates', 'Singapore Airlines', 'British Airways', 'Qatar Airways']);
    const title = vi
      ? `${airline} - Hãng Hàng Không Quốc Gia Việt Nam | Đặt Vé Máy Bay Trực Tuyến`
      : `${airline} | Official Website - Flights, Bookings & Flight Status`;
    const desc = vi
      ? `Trang đặt vé máy bay trực tuyến chính thức của ${airline}. Tìm kiếm chuyến bay giá tốt, làm thủ tục check-in online nhanh chóng.`
      : `Book flights, manage reservations, check flight status, and join our frequent flyer loyalty program with ${airline}.`;
    const text = vi
      ? some([
        'Tìm kiếm chuyến bay: Chuyến bay một chiều, khứ hồi, nhiều chặng. Điểm đi: Hà Nội (HAN), TP.HCM (SGN), Đà Nẵng (DAD). Điểm đến quốc tế và nội địa.',
        'Hạng dịch vụ: Phổ thông (Economy), Phổ thông đặc biệt (Premium Economy), Thương gia (Business Class).',
        'Làm thủ tục trực tuyến (Web Check-in): Mở từ 24 giờ đến 60 phút trước giờ khởi hành dự kiến. Chọn chỗ ngồi yêu thích và nhận thẻ lên tàu bay điện tử.',
        'Quản lý đặt chỗ: Nhập Mã đặt chỗ (PNR) 6 ký tự và Họ hành khách để kiểm tra hành trình, mua thêm hành lý ký gửi, đặt suất ăn đặc biệt.',
        'Chương trình hội viên Bông Sen Vàng: Tích lũy dặm bay, đổi vé thưởng, nâng hạng ghế và tận hưởng đặc quyền tại phòng chờ Thương gia.',
        'Phương thức thanh toán an toàn bảo mật 3D Secure: Thẻ tín dụng quốc tế Visa/Mastercard/JCB, quét mã VNPAY-QR, ví MoMo, chuyển khoản ngân hàng.',
        'Tổng đài chăm sóc khách hàng 24/7: 1900 1100. Giấy phép kinh doanh vận tải hàng không số 01/GP-CHK do Cục Hàng không Việt Nam cấp.',
      ], 4, 7).join(' ')
      : some([
        'Search flights, compare airfares, and customize your travel with our low fare calendar.',
        'Online check-in opens 24 hours prior to departure. Download your mobile boarding pass directly to your phone.',
        'Manage reservation: add checked baggage, select premium seating, request special meals, or modify travel dates.',
        'Frequent flyer loyalty program: earn award miles on every qualifying flight and partner hotel stays.',
        'Travel alerts, baggage policies, onboard amenities, and 24/7 customer assistance.',
      ], 4, 6).join(' ');
    return finalize({
      label: 0, theme: 'airline_official', lang: vi ? 'vi' : 'en',
      title, description: desc,
      text: [nav(vi ? 'vi' : 'en'), text, legitFooter(vi ? 'vi' : 'en', airline)].join(' '),
      struct: legitStruct({}),
    });
  },

  gold_jewelry_official: () => {
    const vi = maybe(0.8);
    const brand = vi
      ? pick(['PNJ - Vàng Bạc Đá Quý Phú Nhuận', 'DOJI - Tập Đoàn Vàng Bạc Đá Quý', 'SJC - Công Ty Vàng Bạc Đá Quý Sài Gòn', 'Bảo Tín Minh Châu'])
      : pick(['Tiffany & Co.', 'Cartier Official Store', 'Bulgari Fine Jewelry', 'Pandora Jewelry Official']);
    const title = vi
      ? `${brand} | Trang Sức Cao Cấp - Nhẫn Cưới, Kim Cương, Vàng Phong Thủy`
      : `${brand} | Luxury Fine Jewelry, Engagement Rings & Diamond Collections`;
    const desc = vi
      ? `Hệ thống phân phối trang sức vàng bạc, kim cương tự nhiên, vàng miếng SJC và vàng tài lộc uy tín số 1 Việt Nam.`
      : `Discover timeless luxury fine jewelry, iconic engagement rings, diamond necklaces, and wedding bands at ${brand}.`;
    const text = vi
      ? some([
        'Bảng giá vàng hôm nay: Vàng miếng SJC 9999 mua vào 82.500.000đ/lượng, bán ra 84.500.000đ/lượng. Vàng nhẫn trơn 999.9 Hưng Thịnh Vượng.',
        'Bộ sưu tập nhẫn cưới hạnh phúc, nhẫn đính hôn kim cương tự nhiên đạt chứng nhận quốc tế GIA.',
        'Trang sức phong thủy tài lộc: Tượng vàng 24K, linh vật chiêu tài, vòng tay chỉ đỏ may mắn.',
        'Chính sách thu đổi và bảo hành: Bảo hành làm sạch, đánh bóng, xi mạ trang sức trọn đời miễn phí tại mọi cửa hàng trên toàn quốc.',
        'Cam kết vàng đúng tuổi, chuẩn trọng lượng, xuất hóa đơn điện tử giá trị gia tăng (VAT) đầy đủ theo quy định của Tổng cục Thuế.',
        'Hệ thống mạng lưới hơn 400 trung tâm kim hoàn tại 63 tỉnh thành phố. Hotline tư vấn miễn phí: 1800 545457.',
      ], 4, 7).join(' ')
      : some([
        'Explore extraordinary collections of handcrafted diamond engagement rings, necklaces, bracelets, and luxury timepieces.',
        'Ethically sourced gemstones and conflict-free natural diamonds certified by recognized gemological institutes.',
        'Complimentary lifetime cleaning and inspection services at any of our boutique stores worldwide.',
        'Secure insured shipping, complimentary signature gift packaging, and flexible return policies.',
      ], 3, 5).join(' ');
    return finalize({
      label: 0, theme: 'gold_jewelry_official', lang: vi ? 'vi' : 'en',
      title, description: desc,
      text: [nav(vi ? 'vi' : 'en'), text, legitFooter(vi ? 'vi' : 'en', brand)].join(' '),
      struct: legitStruct({ vnCommerce: true }),
    });
  },

  cybersecurity_news_adv: () => {
    const vi = maybe(0.7);
    const site = vi
      ? pick(['Trung Tâm Giám Sát An Toàn Không Gian Mạng Quốc Gia (NCSC)', 'Báo Pháp Luật TP.HCM - Chuyên Mục An Ninh Trật Tự', 'Cục An Toàn Thông Tin - Bộ Thông Tin và Truyền Thông', 'Cổng Thông Tin Phòng Chống Lừa Đảo Trực Tuyến'])
      : pick(['Cybersecurity & Infrastructure Security Agency (CISA)', 'Krebs on Security', 'BleepingComputer Cybersecurity News', 'National Cyber Security Centre (NCSC UK)']);
    const title = vi
      ? `${site} - Cảnh Báo Thủ Đoạn Tội Phạm Công Nghệ Cao Mới Nhất`
      : `${site} - Cyber Threat Advisories & Security Alerts`;
    const desc = vi
      ? `Báo cáo tình hình an toàn thông tin, phân tích phương thức lừa đảo qua mạng, hướng dẫn bảo vệ tài khoản ngân hàng và dữ liệu cá nhân.`
      : `Official advisories, incident response guidelines, threat intelligence alerts, and cybersecurity awareness best practices.`;
    const text = vi
      ? some([
        'Báo cáo an toàn không gian mạng tuần qua: Cơ quan chức năng ghi nhận hàng nghìn phản ánh về các chiến dịch lừa đảo mạo danh ngân hàng, tuyển cộng tác viên xử lý đơn hàng và sàn giao dịch nhị phân giả mạo.',
        'Phương thức hoạt động của các đối tượng tội phạm: Sử dụng tin nhắn SMS Brandname giả, dẫn dụ nạn nhân vào các nhóm chat Telegram kín, cam kết lợi nhuận khủng 30-50% mỗi ngày.',
        'Thủ đoạn chiếm đoạt tài sản: Sau khi nạn nhân chuyển khoản các đơn hàng nhỏ có hoa hồng mồi nhử, đối tượng đưa ra lý do sai cú pháp, lỗi hệ thống để yêu cầu nạp thêm số tiền lớn hơn rồi cắt đứt liên lạc.',
        'Khuyến nghị phòng ngừa từ chuyên gia: Người dân tuyệt đối không chia sẻ mã OTP, không truy cập đường link lạ, không cài đặt ứng dụng qua file APK từ nguồn trôi nổi trên mạng xã hội.',
        'Khi phát hiện dấu hiệu lừa đảo, người dân cần chụp lại tin nhắn, sao kê tài khoản ngân hàng và làm đơn trình báo ngay tới cơ quan Công an có thẩm quyền để kịp thời xác minh, ngăn chặn.',
        'Số điện thoại đường dây nóng tố giác tội phạm mạng: 069.2348560 (Cục An ninh mạng và phòng, chống tội phạm sử dụng công nghệ cao - Bộ Công an).',
      ], 4, 7).join(' ')
      : some([
        'Weekly threat assessment: Significant increase in credential phishing targeting corporate enterprise accounts and cloud infrastructure.',
        'Advisory on social engineering tactics: Attackers impersonate IT helpdesks and financial institutions to bypass multi-factor authentication.',
        'Recommended mitigation measures: Implement phishing-resistant MFA (FIDO2/WebAuthn), enforce strict SPF/DKIM/DMARC policies, and conduct continuous security training.',
        'Incident response protocol: Immediately isolate affected endpoints, revoke active sessions, and notify internal security teams.',
        'Subscribe to our automated vulnerability bulletins and national threat feed alerts.',
      ], 4, 6).join(' ');
    return finalize({
      label: 0, theme: 'cybersecurity_news_adv', lang: vi ? 'vi' : 'en',
      title, description: desc,
      text: [nav(vi ? 'vi' : 'en'), text, legitFooter(vi ? 'vi' : 'en', site)].join(' '),
      struct: legitStruct({}),
    });
  },

  gaming_official: () => {
    const vi = maybe(0.6);
    const publisher = vi
      ? pick(['Garena Vietnam', 'Riot Games Vietnam', 'VTC Game', 'SohaGame Official'])
      : pick(['Valve Steam Store', 'Epic Games Official Store', 'Blizzard Entertainment', 'PlayStation Network Official']);
    const title = vi
      ? `${publisher} - Cổng Game Trực Tuyến & Nạp Thẻ Bản Quyền Chính Thức`
      : `${publisher} | Official Gaming Store & Community Platform`;
    const desc = vi
      ? `Cổng phát hành trò chơi điện tử trực tuyến được cấp phép tại Việt Nam. Nạp thẻ chính hãng, cập nhật giải đấu Esports chuyên nghiệp.`
      : `Discover popular PC and console games, download updates, purchase official game passes, and join community tournaments with ${publisher}.`;
    const text = vi
      ? some([
        'Trung tâm chăm sóc khách hàng và thanh toán dịch vụ game trực tuyến chính thức. Hỗ trợ các tựa game hàng đầu: Liên Quân Mobile, Free Fire, FC Online, Valorant, Liên Minh Huyền Thoại.',
        'Kênh nạp thẻ và thanh toán được cấp phép: Nạp Sò, nạp Kim Cương, mua Quân Huy qua cổng thanh toán bảo mật Napthe.vn, ví MoMo, ZaloPay, ShopeePay, thẻ ATM ngân hàng nội địa.',
        'Sự kiện thể thao điện tử chuyên nghiệp: Theo dõi lịch thi đấu vòng bảng, cập nhật bảng xếp hạng giải đấu quốc gia Đấu Trường Danh Vọng và Chung Kết Thế Giới.',
        'Cảnh báo an toàn tài khoản: Nhà phát hành không bao giờ yêu cầu game thủ cung cấp mật khẩu tài khoản hoặc mã OTP. Hãy cảnh giác trước các trang web lừa đảo tặng skin miễn phí, tặng robux hay vòng quay kim cương ảo.',
        'Giấy phép cung cấp dịch vụ trò chơi điện tử G1 trên mạng số 248/GP-BTTTT do Bộ Thông tin và Truyền thông cấp ngày 15/06/2020.',
        'Hệ thống quản lý thời gian chơi: Chơi game quá 180 phút một ngày sẽ ảnh hưởng xấu đến sức khỏe. Dành cho người chơi từ 12 tuổi trở lên.',
      ], 4, 7).join(' ')
      : some([
        'Browse thousands of free-to-play and premium games, downloadable content, and community mods.',
        'Official digital distribution platform with secure payment processing, cloud game saves, and automatic title updates.',
        'Security advisory: Never share your account credentials or Steam Guard mobile authenticator codes with unverified third parties.',
        'Join multiplayer matchmaking, competitive leaderboards, and seasonal community events.',
        'Customer support ticket portal, refund policies, and user safety guidelines.',
      ], 4, 6).join(' ');
    return finalize({
      label: 0, theme: 'gaming_official', lang: vi ? 'vi' : 'en',
      title, description: desc,
      text: [nav(vi ? 'vi' : 'en'), text, legitFooter(vi ? 'vi' : 'en', publisher)].join(' '),
      struct: legitStruct({ login: maybe(0.3), vnCommerce: true }),
    });
  },
};

/** Sinh n mẫu cân bằng hai lớp; trong mỗi lớp các kịch bản được lấy mẫu đều nhau. */
export function generateCorpus(n: number, seed = 20261107): CorpusSample[] {
  seedCorpus(seed);
  const out: CorpusSample[] = [];
  const phishGens = Object.values(phishing);
  const legitGens = Object.values(legit);
  for (let i = 0; i < n; i++) out.push(i % 2 === 0 ? pick(phishGens)() : pick(legitGens)());
  return out;
}

export const CORPUS_THEMES = { phishing: Object.keys(phishing), legit: Object.keys(legit) };
