import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

// ============================================================================
// NGUỒN DANH TIẾNG BÊN NGOÀI (tải nền, lưu đệm ra đĩa, tự làm mới định kỳ)
// - Tranco top list: độ phổ biến của tên miền (site lớn hiếm khi là trang lừa đảo)
// - Phishing.Database + OpenPhish: danh sách đen phishing đang hoạt động
// - RDAP: ngày đăng ký tên miền (tên miền mới tạo là dấu hiệu lừa đảo mạnh)
// - Google Safe Browsing (tuỳ chọn, cần GOOGLE_SAFE_BROWSING_API_KEY)
// Tắt bằng POPULARITY_LIST=off / THREAT_FEEDS=off / DOMAIN_AGE_LOOKUP=off.
// ============================================================================

const CACHE_DIR = path.resolve(process.env.REPUTATION_CACHE_DIR || '.cache/reputation');
const REFRESH_MS = 6 * 60 * 60 * 1000;
const POPULARITY_LIMIT = 200_000;

const POPULARITY_ENABLED = process.env.POPULARITY_LIST !== 'off';
const THREAT_FEEDS_ENABLED = process.env.THREAT_FEEDS !== 'off';
const DOMAIN_AGE_ENABLED = process.env.DOMAIN_AGE_LOOKUP !== 'off';
const SAFE_BROWSING_KEY = (process.env.GOOGLE_SAFE_BROWSING_API_KEY || '').trim();

let popularityRanks = new Map<string, number>();
let threatDomains = new Set<string>();
let threatUrls = new Set<string>();

async function readCached(file: string, maxAgeMs: number): Promise<string | null> {
  try {
    const full = path.join(CACHE_DIR, file);
    const stat = await fs.stat(full);
    if (Date.now() - stat.mtimeMs > maxAgeMs) return null;
    return await fs.readFile(full, 'utf8');
  } catch {
    return null;
  }
}

async function writeCached(file: string, content: string) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(path.join(CACHE_DIR, file), content);
  } catch (err) {
    console.warn(`[Reputation] Không ghi được cache ${file}:`, err);
  }
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status} khi tải ${url}`);
  return res.text();
}

async function loadPopularity(force = false) {
  let csv = force ? null : await readCached('tranco-top.csv', REFRESH_MS * 4);
  if (!csv) {
    const res = await fetch('https://tranco-list.eu/top-1m.csv.zip', { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status} khi tải Tranco`);
    const zip = await JSZip.loadAsync(await res.arrayBuffer());
    const entry = Object.values(zip.files).find(f => f.name.endsWith('.csv'));
    if (!entry) throw new Error('Không tìm thấy CSV trong file Tranco');
    const full = await entry.async('string');
    csv = full.split('\n', POPULARITY_LIMIT).join('\n');
    await writeCached('tranco-top.csv', csv);
  }
  const ranks = new Map<string, number>();
  for (const line of csv.split('\n')) {
    const comma = line.indexOf(',');
    if (comma > 0) ranks.set(line.slice(comma + 1).trim().toLowerCase(), parseInt(line.slice(0, comma), 10));
  }
  popularityRanks = ranks;
  console.log(`[Reputation] 📊 Đã nạp ${ranks.size.toLocaleString()} tên miền phổ biến (Tranco).`);
}

async function loadThreatFeeds(force = false) {
  const sources: Array<{ file: string; url: string }> = [
    { file: 'phishing-database-domains.txt', url: 'https://raw.githubusercontent.com/Phishing-Database/Phishing.Database/master/phishing-domains-ACTIVE.txt' },
    { file: 'openphish.txt', url: 'https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt' },
  ];
  const domains = new Set<string>();
  const urls = new Set<string>();
  for (const source of sources) {
    let text = force ? null : await readCached(source.file, REFRESH_MS);
    if (!text) {
      try {
        text = await fetchText(source.url, 60_000);
        await writeCached(source.file, text);
      } catch (err: any) {
        console.warn(`[Reputation] Không tải được ${source.url}: ${err?.message}`);
        text = await readCached(source.file, Infinity);
      }
    }
    for (const raw of (text || '').split('\n')) {
      const line = raw.trim().toLowerCase();
      if (!line || line.startsWith('#')) continue;
      if (/^https?:\/\//.test(line)) {
        urls.add(line.replace(/\/+$/, ''));
        try {
          domains.add(new URL(line).hostname.replace(/^www\./, ''));
        } catch {
          // bỏ qua dòng hỏng
        }
      } else {
        domains.add(line.replace(/^www\./, ''));
      }
    }
  }
  threatDomains = domains;
  threatUrls = urls;
  console.log(`[Reputation] 🛡️ Đã nạp ${domains.size.toLocaleString()} tên miền phishing đang hoạt động.`);
}

/** Khởi động tải nền các nguồn danh tiếng; không chặn server khởi động. */
export function startReputationFeeds() {
  const run = (name: string, loader: (force?: boolean) => Promise<void>) => {
    loader().catch(err => console.warn(`[Reputation] ${name}: ${err?.message || err}`));
    setInterval(() => {
      loader(true).catch(err => console.warn(`[Reputation] ${name}: ${err?.message || err}`));
    }, REFRESH_MS).unref();
  };
  if (POPULARITY_ENABLED) run('Tranco', loadPopularity);
  if (DOMAIN_AGE_ENABLED) getRdapBootstrap().catch(err => console.warn(`[Reputation] RDAP bootstrap: ${err?.message || err}`));
  if (THREAT_FEEDS_ENABLED) run('Threat feeds', loadThreatFeeds);
}

/** Thứ hạng phổ biến của tên miền (1 = phổ biến nhất), null nếu ngoài top list. */
export function getPopularityRank(domain: string): number | null {
  return popularityRanks.get(domain.toLowerCase()) ?? null;
}

export function isPopularityLoaded(): boolean {
  return popularityRanks.size > 0;
}

/**
 * Tra danh sách đen phishing. Chỉ khớp chính xác host/tên miền chủ sở hữu/URL, và bỏ qua các tên miền
 * rất phổ biến (feed cộng đồng đôi khi liệt kê nhầm gravatar.com, amazon.ie, pastebin.com...).
 */
export function checkThreatFeeds(host: string, ownerDomain: string, url: string): string[] {
  const hits: string[] = [];
  if (!THREAT_FEEDS_ENABLED || threatDomains.size === 0) return hits;
  const rank = getPopularityRank(ownerDomain);
  if (rank !== null && rank <= 20_000) return hits;
  const h = host.replace(/^www\./, '');
  if (threatDomains.has(h) || threatDomains.has(ownerDomain)) hits.push('Phishing.Database / OpenPhish (tên miền)');
  if (threatUrls.has(url.toLowerCase().replace(/\/+$/, ''))) hits.push('OpenPhish (URL)');
  return hits;
}

export async function checkSafeBrowsing(url: string): Promise<string[]> {
  if (!SAFE_BROWSING_KEY) return [];
  try {
    const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(SAFE_BROWSING_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(3000),
      body: JSON.stringify({
        client: { clientId: 'verity-xai', clientVersion: '2.0' },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }],
        },
      }),
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    return (data?.matches || []).map((m: any) => `Google Safe Browsing (${m.threatType})`);
  } catch {
    return [];
  }
}

// ----------------------------------------------------------------------------
// Tuổi tên miền qua RDAP (chuẩn thay thế WHOIS). Không hỗ trợ .vn (VNNIC chưa có RDAP).
// ----------------------------------------------------------------------------
const domainAgeCache = new Map<string, { value: DomainAge; expiresAt: number }>();

export interface DomainAge {
  registeredAt: string | null;
  ageDays: number | null;
  registrar: string | null;
}

// Bảng IANA ánh xạ TLD -> máy chủ RDAP chính thức của nhà đăng ký (gọi thẳng, không qua dịch vụ trung gian)
let rdapBootstrap: Map<string, string> | null = null;
let rdapBootstrapPromise: Promise<Map<string, string>> | null = null;

async function getRdapBootstrap(): Promise<Map<string, string>> {
  if (rdapBootstrap) return rdapBootstrap;
  rdapBootstrapPromise ??= (async () => {
    let json = await readCached('iana-rdap-dns.json', 7 * 24 * 60 * 60_000);
    if (!json) {
      json = await fetchText('https://data.iana.org/rdap/dns.json', 10_000);
      await writeCached('iana-rdap-dns.json', json);
    }
    const map = new Map<string, string>();
    for (const [tlds, urls] of JSON.parse(json).services as [string[], string[]][]) {
      const base = urls.find(u => u.startsWith('https://')) || urls[0];
      for (const tld of tlds) map.set(tld.toLowerCase(), base.endsWith('/') ? base : `${base}/`);
    }
    rdapBootstrap = map;
    return map;
  })().catch(err => {
    rdapBootstrapPromise = null;
    throw err;
  });
  return rdapBootstrapPromise;
}

export async function lookupDomainAge(icannDomain: string, timeoutMs = 4000): Promise<DomainAge> {
  const empty: DomainAge = { registeredAt: null, ageDays: null, registrar: null };
  if (!DOMAIN_AGE_ENABLED || !icannDomain || icannDomain.endsWith('.vn')) return empty;
  const cached = domainAgeCache.get(icannDomain);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  let value = empty;
  // Chỉ lưu đệm kết quả chắc chắn; lỗi tạm thời (timeout, 429, 5xx) không được lưu để lần sau tra lại
  let cacheTtlMs = 0;
  try {
    const tld = icannDomain.split('.').pop() || '';
    const server = (await getRdapBootstrap()).get(tld);
    if (!server) return empty;
    const query = () => fetch(`${server}domain/${encodeURIComponent(icannDomain)}`, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: 'application/rdap+json', 'User-Agent': 'Verity-Security-Audit/2.0' },
    });
    // Máy chủ RDAP giới hạn tần suất (429) hoặc chập chờn (5xx/timeout): thử lại một lần sau 600ms
    let res: Response;
    try {
      res = await query();
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
    } catch {
      await new Promise(resolve => setTimeout(resolve, 600));
      res = await query();
    }
    if (res.status === 404) cacheTtlMs = 6 * 60 * 60_000;
    if (res.ok) {
      cacheTtlMs = 24 * 60 * 60_000;
      const data: any = await res.json();
      const reg = (data?.events || []).find((e: any) => e?.eventAction === 'registration')?.eventDate;
      const registrarEntity = (data?.entities || []).find((e: any) => (e?.roles || []).includes('registrar'));
      const registrar = registrarEntity?.vcardArray?.[1]?.find((v: any) => v?.[0] === 'fn')?.[3] || null;
      if (reg) {
        const ageDays = Math.floor((Date.now() - new Date(reg).getTime()) / 86_400_000);
        value = { registeredAt: reg, ageDays: Number.isFinite(ageDays) ? ageDays : null, registrar };
      }
    }
  } catch {
    // RDAP chậm/không hỗ trợ: coi như không có dữ liệu
  }
  if (cacheTtlMs > 0) {
    if (domainAgeCache.size > 5000) domainAgeCache.clear();
    domainAgeCache.set(icannDomain, { value, expiresAt: Date.now() + cacheTtlMs });
  }
  return value;
}
