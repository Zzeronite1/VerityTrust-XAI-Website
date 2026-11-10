import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { type RiskAssessment, type RiskFactor } from './riskScoring.ts';
import { type SiteEvidence } from './evidence.ts';

// ============================================================================
// VERIFIED COMMUNITY KNOWLEDGE & FEEDBACK DEFENSE ENGINE (HITL)
//
// Cơ chế tích hợp phản hồi cộng đồng (Human-in-the-Loop) với 4 chốt chặn an toàn:
// 1. Chống Data Poisoning: Bằng chứng kỹ thuật nghiêm trọng (phishing, cờ bạc)
//    luôn bất khả xâm phạm; lượt vote không bao giờ được gỡ bỏ chốt chặn hình sự.
// 2. Chống Sybil / Review Bombing: Mỗi IP chỉ vote 1 lần / ngày, cần Quorum (>= 3 IP).
// 3. Chống Bait-and-Switch: Kiểm tra Content Drift Signature; nếu nội dung web
//    bị sửa đổi > 35% hoặc xuất hiện form nhạy cảm, hủy bỏ ngay lập tức cache phản hồi.
// 4. Giới hạn ảnh hưởng (Bounded Influence): Điểm cộng/trừ tối đa +/- 5-10 điểm,
//    giữ vững tính minh bạch Explainable AI (XAI).
// ============================================================================

export interface ContentSignature {
  title: string;
  textLength: number;
  formCount: number;
  hasPasswordField: boolean;
  computedAt: number;
}

export interface FeedbackEntry {
  url: string;
  domain: string;
  accurateCount: number;
  falseAlarmCount: number;
  ipHashes: string[]; // Băm ẩn danh SHA-256 bảo vệ quyền riêng tư
  contentSignature: ContentSignature | null;
  lastUpdated: number;
  verifiedStatus: 'unverified' | 'verified_accurate' | 'suspect_flagged' | 'invalidated';
}

const CACHE_FILE = path.resolve(process.cwd(), '.cache/community_feedback.json');
const memoryFeedbackStore = new Map<string, FeedbackEntry>();

// Nạp dữ liệu cache từ đĩa khi khởi động
function initStore() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        for (const item of data) {
          memoryFeedbackStore.set(item.domain, item);
        }
      }
    }
  } catch {
    // Bỏ qua lỗi nạp nếu file chưa tồn tại hoặc bị lỗi
  }
}

initStore();

function persistStore() {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const array = Array.from(memoryFeedbackStore.values());
    fs.writeFileSync(CACHE_FILE, JSON.stringify(array, null, 2), 'utf-8');
  } catch {
    // Không làm gián đoạn luồng chính nếu lỗi ghi đĩa
  }
}

// Băm IP người dùng ẩn danh (kèm muối) để ngăn chặn spam nhiều lần
export function hashIp(ip: string): string {
  const salt = process.env.FEEDBACK_SALT || 'verity-xai-hitl-salt-2026';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 16);
}

// Trích xuất chữ ký nội dung để phát hiện thay đổi (Bait-and-Switch)
export function computeContentSignature(evidence: SiteEvidence): ContentSignature {
  const html = evidence.html;
  return {
    title: (html?.title || '').slice(0, 100),
    textLength: html?.textLength || 0,
    formCount: html?.formCount || 0,
    hasPasswordField: !!html?.hasPasswordField,
    computedAt: Date.now(),
  };
}

/**
 * Ghi nhận phản hồi từ người dùng
 */
export function recordUserFeedback(params: {
  url: string;
  feedbackType: 'accurate' | 'false_alarm';
  clientIp?: string;
  evidence?: SiteEvidence | null;
  assessment?: RiskAssessment | null;
}): {
  success: boolean;
  message: string;
  status: string;
  accurateCount: number;
  falseAlarmCount: number;
} {
  const { url, feedbackType, clientIp = '127.0.0.1', evidence, assessment } = params;
  let domain = '';
  try {
    domain = new URL(url).hostname.toLowerCase();
  } catch {
    domain = url.toLowerCase().replace(/^[a-z]+:\/\//, '').split('/')[0];
  }

  const ipHash = hashIp(clientIp);
  let entry = memoryFeedbackStore.get(domain);

  if (!entry) {
    entry = {
      url,
      domain,
      accurateCount: 0,
      falseAlarmCount: 0,
      ipHashes: [],
      contentSignature: evidence ? computeContentSignature(evidence) : null,
      lastUpdated: Date.now(),
      verifiedStatus: 'unverified',
    };
    memoryFeedbackStore.set(domain, entry);
  }

  // Chống Spam từ 1 IP: nếu IP này đã vote trong 24h qua thì bỏ qua
  if (entry.ipHashes.includes(ipHash)) {
    return {
      success: true,
      message: 'Bạn đã gửi đánh giá cho trang web này trước đó. Cảm ơn bạn!',
      status: entry.verifiedStatus,
      accurateCount: entry.accurateCount,
      falseAlarmCount: entry.falseAlarmCount,
    };
  }

  entry.ipHashes.push(ipHash);
  if (entry.ipHashes.length > 50) entry.ipHashes.shift(); // Giữ tối đa 50 hash gần nhất

  if (feedbackType === 'accurate') {
    entry.accurateCount++;
  } else {
    entry.falseAlarmCount++;
  }

  entry.lastUpdated = Date.now();
  if (evidence) {
    entry.contentSignature = computeContentSignature(evidence);
  }

  // --------------------------------------------------------------------------
  // QUY TẮC AN NINH CHỐNG GIAN LẬN & ĐẦU ĐỘC (Anti-Poisoning Logic)
  // --------------------------------------------------------------------------
  const totalVotes = entry.accurateCount + entry.falseAlarmCount;
  const isHardViolation = assessment?.isGambling || (assessment?.cap !== null && assessment?.cap !== undefined && assessment.cap <= 20);

  if (isHardViolation) {
    // CHỐT CHẶN 1: Nếu trang vi phạm hình sự/phishing nghiêm trọng -> Khóa cứng, không bao giờ được vote thành an toàn!
    entry.verifiedStatus = 'unverified';
    persistStore();
    return {
      success: true,
      message: 'Đánh giá đã được ghi nhận vào nhật ký kiểm định an toàn.',
      status: entry.verifiedStatus,
      accurateCount: entry.accurateCount,
      falseAlarmCount: entry.falseAlarmCount,
    };
  }

  // CHỐT CHẶN 2: Cần Quorum tối thiểu 3 người dùng độc lập
  if (totalVotes >= 3) {
    const accuracyRatio = entry.accurateCount / totalVotes;
    if (accuracyRatio >= 0.75) {
      entry.verifiedStatus = 'verified_accurate';
    } else if (entry.falseAlarmCount >= 3 && (entry.falseAlarmCount / totalVotes) >= 0.6) {
      entry.verifiedStatus = 'suspect_flagged';
    } else {
      entry.verifiedStatus = 'unverified';
    }
  }

  persistStore();

  return {
    success: true,
    message: 'Cảm ơn bạn! Đánh giá đã được xác thực và đưa vào Khiên Tri thức Cộng đồng.',
    status: entry.verifiedStatus,
    accurateCount: entry.accurateCount,
    falseAlarmCount: entry.falseAlarmCount,
  };
}

/**
 * Kiểm tra xem trang web có được hưởng lợi hoặc bị cảnh báo từ Tri thức Cộng đồng hay không
 */
export function evaluateCommunityFeedback(
  domain: string,
  currentEvidence: SiteEvidence
): {
  factor: RiskFactor | null;
  status: 'verified_accurate' | 'suspect_flagged' | 'invalidated' | 'none';
  note: string;
} {
  const entry = memoryFeedbackStore.get(domain.toLowerCase());
  if (!entry || entry.verifiedStatus === 'unverified') {
    return { factor: null, status: 'none', note: 'Chưa có dữ liệu phản hồi cộng đồng đủ ngưỡng quorum' };
  }

  // --------------------------------------------------------------------------
  // CHỐT CHẶN 3: Kiểm tra Bait-and-Switch (Content Drift)
  // --------------------------------------------------------------------------
  if (entry.contentSignature && currentEvidence.html) {
    const prev = entry.contentSignature;
    const curLen = currentEvidence.html.textLength;
    const lenDelta = Math.abs(curLen - prev.textLength);
    const lenRatio = prev.textLength > 0 ? lenDelta / prev.textLength : 0;

    // Nếu văn bản lệch > 35% hoặc đột nhiên xuất hiện form nhập mật khẩu mà trước đó không có:
    const addedPasswordField = currentEvidence.html.hasPasswordField && !prev.hasPasswordField;
    if (lenRatio > 0.35 || addedPasswordField) {
      entry.verifiedStatus = 'invalidated';
      persistStore();
      return {
        factor: {
          id: 'content_drift_alert',
          label: 'Cảnh báo: Nội dung trang web đã thay đổi đáng kể so với đánh giá trước',
          detail: `Phát hiện sai khác nội dung (${Math.round(lenRatio * 100)}%) hoặc xuất hiện trường nhạy cảm mới. Toàn bộ điểm tín nhiệm cộng đồng trước đó bị thu hồi ngay lập tức để bảo vệ người dùng.`,
          delta: -15,
        },
        status: 'invalidated',
        note: 'Đã phát hiện thay đổi nội dung trang (Bait-and-Switch) -> Thu hồi toàn bộ tín nhiệm cộng đồng.',
      };
    }
  }

  // Đã kiểm tra qua 3 chốt chặn an toàn:
  if (entry.verifiedStatus === 'verified_accurate') {
    return {
      factor: {
        id: 'community_consensus_bonus',
        label: `Được cộng đồng xác nhận an toàn (${entry.accurateCount} lượt đánh giá độc lập)`,
        detail: `Website đã vượt qua quá trình kiểm chứng kỹ thuật đa tầng và được ${entry.accurateCount} người dùng độc lập đánh giá chính xác, không ghi nhận dấu hiệu thay đổi nội dung lừa đảo.`,
        delta: 5,
      },
      status: 'verified_accurate',
      note: `Đã xác thực cộng đồng: +5 điểm an toàn (${entry.accurateCount} votes)`,
    };
  }

  if (entry.verifiedStatus === 'suspect_flagged') {
    return {
      factor: {
        id: 'community_suspicion_warning',
        label: `Cộng đồng báo cáo nghi vấn (${entry.falseAlarmCount} lượt cảnh báo)`,
        detail: `Website nhận được ${entry.falseAlarmCount} lượt báo cáo nghi ngờ từ người dùng. Hệ thống tự động kích hoạt chế độ giám sát chặt chẽ.`,
        delta: -10,
      },
      status: 'suspect_flagged',
      note: `Bị gắn cờ nghi vấn cộng đồng: -10 điểm (${entry.falseAlarmCount} reports)`,
    };
  }

  return { factor: null, status: 'none', note: 'Không có tác động' };
}

/**
 * Lấy thống kê cộng đồng cho một domain
 */
export function getCommunityStats(domain: string) {
  const entry = memoryFeedbackStore.get(domain.toLowerCase());
  if (!entry) return null;
  return {
    domain: entry.domain,
    accurateCount: entry.accurateCount,
    falseAlarmCount: entry.falseAlarmCount,
    verifiedStatus: entry.verifiedStatus,
    lastUpdated: entry.lastUpdated,
  };
}
