/**
 * Module tích hợp Jev / OpenJev Decision Gateway.
 * Cung cấp tùy chọn cấu hình linh hoạt:
 *   - JEV_MODE=off      : (Mặc định) Tắt, dùng động cơ bằng chứng và mạng nơ-ron Hashed MLP nội bộ (0đ, nhẹ máy, không cần AVX2).
 *   - JEV_MODE=api      : Sử dụng TypeSafe AI Jev Cloud API thương mại (cần JEV_API_KEY).
 *   - JEV_MODE=openjev  : Sử dụng OpenJev tự host (mã nguồn mở / open-weights) qua OPENJEV_ENDPOINT.
 */

import type { SiteEvidence } from './evidence.ts';
import type { RiskAssessment } from './riskScoring.ts';

export type JevMode = 'off' | 'api' | 'openjev';

export interface JevDecisionResult {
  engine: 'jev-api' | 'openjev';
  latencyMs: number;
  isCredentialHarvesting: boolean;
  isCredentialHarvestingConfidence: number;
  isFinancialOrGamblingScam: boolean;
  isFinancialOrGamblingScamConfidence: number;
  isBrandImpersonation: boolean;
  isBrandImpersonationConfidence: number;
  verdict: 'safe' | 'suspicious' | 'phishing' | 'gambling' | 'malicious';
  verdictProbabilities: Record<string, number>;
}

export interface JevConfig {
  mode: JevMode;
  apiUrl: string;
  apiKey: string;
  openJevEndpoint: string;
  openJevApiKey: string;
  grayZoneOnly: boolean;
  timeoutMs: number;
}

export function getJevConfig(): JevConfig {
  const rawMode = (process.env.JEV_MODE || 'off').toLowerCase().trim();
  const mode: JevMode = rawMode === 'api' || rawMode === 'openjev' ? rawMode : 'off';
  return {
    mode,
    apiUrl: process.env.JEV_API_URL || 'https://api.typesafe.ai/v1/decision',
    apiKey: process.env.JEV_API_KEY || '',
    openJevEndpoint: process.env.OPENJEV_ENDPOINT || 'http://localhost:8080/v1/decide',
    openJevApiKey: process.env.OPENJEV_API_KEY || '',
    grayZoneOnly: process.env.JEV_GRAY_ZONE_ONLY !== 'false', // Mặc định chỉ gọi cho ca vùng xám 40-75 điểm
    timeoutMs: parseInt(process.env.JEV_TIMEOUT_MS || '3000', 10),
  };
}

/**
 * Trích xuất State cô đọng từ Evidence kỹ thuật để gửi cho Decision Model
 */
export function buildJevState(e: SiteEvidence, a: RiskAssessment) {
  const html = e.html;
  return {
    domain: e.domain.host,
    domain_suffix: e.domain.publicSuffix,
    domain_age_days: e.domainAge?.ageDays ?? null,
    is_popular: e.popularityRank !== null && e.popularityRank <= 200000,
    popularity_rank: e.popularityRank ?? null,
    tls_valid: e.tls?.ok ?? false,
    tls_age_days: e.tls?.certAgeDays ?? null,
    tls_issuer: e.tls?.issuer ?? null,
    has_password_field: html?.hasPasswordField ?? false,
    sensitive_inputs: html?.sensitiveFields ?? [],
    external_form_action: html?.externalFormAction ?? null,
    telegram_exfiltration: html?.telegramExfiltration ?? false,
    brand_mentions: html?.brandMentions ?? [],
    bot_challenge: html?.botChallenge ?? false,
    base_evidence_score: a.score,
    page_title: html?.title ?? '',
    page_markdown: html?.text ? html.text.slice(0, 3000) : '',
  };
}

/**
 * Định nghĩa bộ câu hỏi tiêu chuẩn (Typed Questions Schema)
 */
export const STANDARD_JEV_QUESTIONS = [
  {
    id: 'is_credential_harvesting',
    type: 'noul',
    premise: 'Trang web này có hành vi thu thập trái phép thông tin xác thực nhạy cảm (mật khẩu, OTP SMS, số thẻ ngân hàng, cụm từ khôi phục ví bí mật) không?'
  },
  {
    id: 'is_financial_or_gambling_scam',
    type: 'noul',
    premise: 'Trang web này có dấu hiệu tổ chức cờ bạc cá cược, lừa đảo đầu tư tài chính sinh lời cao, làm nhiệm vụ ảo đa cấp Ponzi không?'
  },
  {
    id: 'is_brand_impersonation',
    type: 'noul',
    premise: 'Trang web này có mạo danh thương hiệu, ngân hàng, sàn thương mại điện tử hoặc cổng dịch vụ công của nhà nước không?'
  },
  {
    id: 'final_verdict',
    type: 'choice',
    options: ['safe', 'suspicious', 'phishing', 'gambling', 'malicious']
  }
];

/**
 * Gửi yêu cầu phân xử tới Jev Cloud API hoặc OpenJev Local/Worker Endpoint
 */
export async function queryJevDecision(e: SiteEvidence, a: RiskAssessment): Promise<JevDecisionResult | null> {
  const cfg = getJevConfig();
  if (cfg.mode === 'off') return null;

  // Nếu chỉ bật cho vùng xám (40 - 74 điểm) và bằng chứng đã dứt khoát rõ ràng -> Bỏ qua
  if (cfg.grayZoneOnly && (a.score < 40 || a.score >= 75)) {
    return null;
  }

  const targetUrl = cfg.mode === 'api' ? cfg.apiUrl : cfg.openJevEndpoint;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (cfg.mode === 'api' && cfg.apiKey) {
    headers['Authorization'] = `Bearer ${cfg.apiKey}`;
  } else if (cfg.mode === 'openjev' && cfg.openJevApiKey) {
    headers['Authorization'] = `Bearer ${cfg.openJevApiKey}`;
  }

  const payload = {
    state: buildJevState(e, a),
    questions: STANDARD_JEV_QUESTIONS,
  };

  const t0 = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[Jev Gateway] ${cfg.mode} trả về lỗi HTTP ${res.status}: ${res.statusText}`);
      return null;
    }

    const data: any = await res.json();
    const latencyMs = Date.now() - t0;

    // Chuẩn hóa kết quả đầu ra (Hỗ trợ định dạng của cả Jev API lẫn OpenJev Qwen/DeBERTa)
    const decisions = data.decisions || data;
    const cred = decisions.is_credential_harvesting;
    const fin = decisions.is_financial_or_gambling_scam;
    const brand = decisions.is_brand_impersonation;
    const verdictData = decisions.final_verdict;

    const parseNoul = (n: any) => {
      if (typeof n === 'boolean') return { val: n, conf: 1 };
      if (typeof n === 'number') return { val: n >= 0.5, conf: n };
      return {
        val: n?.value === true || (typeof n?.confidence === 'number' && n.confidence >= 0.5),
        conf: typeof n?.confidence === 'number' ? n.confidence : 0.5,
      };
    };

    const cRes = parseNoul(cred);
    const fRes = parseNoul(fin);
    const bRes = parseNoul(brand);

    let finalChoice: JevDecisionResult['verdict'] = 'suspicious';
    let probs: Record<string, number> = {};

    if (typeof verdictData === 'string' && ['safe', 'suspicious', 'phishing', 'gambling', 'malicious'].includes(verdictData)) {
      finalChoice = verdictData as any;
      probs[finalChoice] = 1;
    } else if (verdictData?.choice) {
      finalChoice = verdictData.choice;
      probs = verdictData.probabilities || {};
    }

    console.log(`[Jev Gateway] 🎯 Phân xử (${cfg.mode}) hoàn tất trong ${latencyMs}ms: ${finalChoice} (Cred: ${(cRes.conf * 100).toFixed(0)}%, Brand: ${(bRes.conf * 100).toFixed(0)}%, Fin: ${(fRes.conf * 100).toFixed(0)}%)`);

    return {
      engine: cfg.mode === 'api' ? 'jev-api' : 'openjev',
      latencyMs,
      isCredentialHarvesting: cRes.val,
      isCredentialHarvestingConfidence: cRes.conf,
      isFinancialOrGamblingScam: fRes.val,
      isFinancialOrGamblingScamConfidence: fRes.conf,
      isBrandImpersonation: bRes.val,
      isBrandImpersonationConfidence: bRes.conf,
      verdict: finalChoice,
      verdictProbabilities: probs,
    };
  } catch (err: any) {
    console.warn(`[Jev Gateway] Không gọi được ${cfg.mode} (${err?.message || err}) sau ${Date.now() - t0}ms. Rơi về chấm điểm bằng chứng nội bộ.`);
    return null;
  }
}

/**
 * Áp dụng kết quả từ Jev/OpenJev vào bảng điểm bằng chứng (RiskAssessment).
 * Tuân thủ nguyên tắc XAI: Mọi phán quyết của Jev đều được chuyển đổi thành
 * các yếu tố rủi ro có giải thích minh bạch (Factor Breakdown).
 */
export function applyJevDecision(a: RiskAssessment, j: JevDecisionResult): RiskAssessment {
  const engineName = j.engine === 'jev-api' ? 'Jev AI (TypeSafe)' : 'OpenJev Decision Gateway';
  const factors = [...a.factors];
  let score = a.score;
  let cap = a.cap;
  let verdict = a.verdict;

  if (j.isBrandImpersonation && j.isBrandImpersonationConfidence >= 0.80) {
    const pct = Math.round(j.isBrandImpersonationConfidence * 100);
    factors.push({
      id: 'jev_brand_impersonation',
      label: `${engineName}: Xác nhận mạo danh thương hiệu (${pct}%)`,
      detail: `Mô hình ra quyết định xác nhận website này cố tình giả mạo logo, giao diện hoặc tên tuổi của tổ chức/doanh nghiệp hợp pháp khác với độ tin cậy ${pct}%.`,
      delta: -35,
    });
    score = Math.min(score, 15);
    cap = cap !== null ? Math.min(cap, 15) : 15;
    verdict = 'phishing';
  }

  if (j.isCredentialHarvesting && j.isCredentialHarvestingConfidence >= 0.80) {
    const pct = Math.round(j.isCredentialHarvestingConfidence * 100);
    factors.push({
      id: 'jev_credential_harvesting',
      label: `${engineName}: Phát hiện bẫy thu thập OTP/Mật khẩu (${pct}%)`,
      detail: `Mô hình phát hiện biểu mẫu thu thập dữ liệu nhạy cảm có mục đích đánh cắp tài khoản (độ tin cậy ${pct}%).`,
      delta: -30,
    });
    score = Math.min(score, 15);
    cap = cap !== null ? Math.min(cap, 15) : 15;
    verdict = 'phishing';
  }

  if (j.isFinancialOrGamblingScam && j.isFinancialOrGamblingScamConfidence >= 0.80) {
    const pct = Math.round(j.isFinancialOrGamblingScamConfidence * 100);
    factors.push({
      id: 'jev_financial_scam',
      label: `${engineName}: Phát hiện lừa đảo tài chính / cờ bạc (${pct}%)`,
      detail: `Mô hình nhận diện dấu hiệu lừa đảo đa cấp, nhiệm vụ ảo, đầu tư tiền ảo hoặc hoạt động cờ bạc bất hợp pháp (độ tin cậy ${pct}%).`,
      delta: -35,
    });
    score = Math.min(score, 15);
    cap = cap !== null ? Math.min(cap, 15) : 15;
    verdict = j.verdict === 'gambling' ? 'gambling' : 'malicious';
  }

  // Nếu Jev xác nhận an toàn cao trên ca nghi ngờ oan (giải oan cho website hợp pháp mới tạo)
  const safeProb = j.verdictProbabilities['safe'] || 0;
  if (j.verdict === 'safe' && safeProb >= 0.85 && !j.isBrandImpersonation && !j.isCredentialHarvesting && !j.isFinancialOrGamblingScam) {
    factors.push({
      id: 'jev_safe_confirmation',
      label: `${engineName}: Xác nhận trang web hợp pháp/an toàn (${Math.round(safeProb * 100)}%)`,
      detail: `Mô hình kiểm định toàn diện nội dung và cấu trúc, xác nhận website hoạt động bình thường, không chứa mã độc hay bẫy lừa đảo.`,
      delta: +15,
    });
    score = Math.min(95, score + 15);
    if (score >= 75) verdict = 'legit';
  }

  // Tính lại status theo điểm
  const status: RiskAssessment['status'] = score >= 75 ? 'Safe' : score >= 50 ? 'Warning' : 'Dangerous';

  return {
    ...a,
    score: Math.max(0, Math.min(100, Math.round(score))),
    status,
    verdict,
    factors,
    cap,
  };
}
