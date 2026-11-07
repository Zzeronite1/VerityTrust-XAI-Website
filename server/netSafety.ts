import dns from 'node:dns/promises';
import net from 'node:net';

// ============================================================================
// CHỐNG SSRF: Không cho phép máy chủ Verity truy cập địa chỉ nội bộ / loopback /
// link-local (vd. 127.0.0.1, 10.x, 192.168.x, 169.254.169.254 metadata của cloud)
// thông qua URL do người dùng nhập hoặc qua chuyển hướng (redirect).
// ============================================================================
const NON_PUBLIC_NETWORKS = new net.BlockList();
for (const [addr, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
] as const) {
  NON_PUBLIC_NETWORKS.addSubnet(addr, prefix, 'ipv4');
}
for (const [addr, prefix] of [
  ['::', 128], ['::1', 128], ['64:ff9b::', 96], ['100::', 64], ['2001:db8::', 32],
  ['fc00::', 7], ['fe80::', 10], ['ff00::', 8],
] as const) {
  NON_PUBLIC_NETWORKS.addSubnet(addr, prefix, 'ipv6');
}

export function isPublicIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return !NON_PUBLIC_NETWORKS.check(ip, 'ipv4');
  if (family === 6) {
    const mapped = ip.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return !NON_PUBLIC_NETWORKS.check(mapped[1], 'ipv4');
    return !NON_PUBLIC_NETWORKS.check(ip, 'ipv6');
  }
  return false;
}

export class BlockedTargetError extends Error {}

export class FetchRedirectError extends Error {
  redirects: string[];
  lastUrl: string;
  constructor(message: string, redirects: string[], lastUrl: string) {
    super(message);
    this.name = 'FetchRedirectError';
    this.redirects = redirects;
    this.lastUrl = lastUrl;
  }
}

async function lookupWithTimeout(hostname: string, timeoutMs: number) {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      dns.lookup(hostname, { all: true }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('DNS Timeout')), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

// Phân giải tên miền và bảo đảm MỌI địa chỉ trả về đều là IP công khai
export async function resolvePublicAddress(hostname: string, timeoutMs = 2000): Promise<string> {
  const host = hostname.replace(/^\[|\]$/g, '');
  const addresses = net.isIP(host) ? [{ address: host }] : await lookupWithTimeout(host, timeoutMs);
  if (!addresses.length) throw new Error('ENOTFOUND');
  const blocked = addresses.find(a => !isPublicIp(a.address));
  if (blocked) {
    throw new BlockedTargetError(`Địa chỉ nội bộ/không công khai bị chặn (${blocked.address})`);
  }
  return addresses[0].address;
}

/**
 * fetch an toàn cho URL do người dùng cung cấp:
 * - Chỉ http/https, kiểm tra IP công khai ở mỗi bước redirect (tối đa 5 lần)
 * - Một timeout duy nhất bao trùm cả kết nối lẫn việc đọc body
 * - Chỉ đọc tối đa maxBytes của body (maxBytes = 0: không đọc body)
 */
export async function safeFetch(urlStr: string, options: {
  timeoutMs: number;
  maxBytes: number;
  headers?: Record<string, string>;
  maxRedirects?: number;
}): Promise<{ status: number; headers: Headers; finalUrl: string; body: string; redirects: string[] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  const redirects: string[] = [];
  try {
    let currentUrl = urlStr;
    for (let hop = 0; hop <= (options.maxRedirects ?? 5); hop++) {
      const parsed = new URL(currentUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new BlockedTargetError(`Giao thức không được hỗ trợ: ${parsed.protocol}`);
      }
      try {
        await resolvePublicAddress(parsed.hostname, options.timeoutMs);
      } catch (err: any) {
        if (redirects.length > 0) {
          throw new FetchRedirectError(err?.message || String(err), redirects, currentUrl);
        }
        throw err;
      }

      let response: Response;
      try {
        response = await fetch(parsed.href, {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: options.headers,
        });
      } catch (err: any) {
        if (redirects.length > 0) {
          throw new FetchRedirectError(err?.message || String(err), redirects, currentUrl);
        }
        throw err;
      }

      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) {
        await response.body?.cancel().catch(() => {});
        redirects.push(currentUrl);
        currentUrl = new URL(location, parsed.href).href;
        continue;
      }

      let body = '';
      if (options.maxBytes > 0 && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let received = 0;
        while (received < options.maxBytes) {
          const { done, value } = await reader.read();
          if (done) break;
          received += value.byteLength;
          body += decoder.decode(value, { stream: true });
        }
        await reader.cancel().catch(() => {});
      } else {
        await response.body?.cancel().catch(() => {});
      }
      return { status: response.status, headers: response.headers, finalUrl: parsed.href, body, redirects };
    }
    throw new Error('Quá nhiều lần chuyển hướng (redirect)');
  } finally {
    clearTimeout(timer);
  }
}
