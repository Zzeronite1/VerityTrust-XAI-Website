import fs from 'node:fs';
import { resolvePublicAddress } from './netSafety.ts';

// ============================================================================
// TẦNG 3: HEADLESS BROWSER (chỉ chạy khi cần)
// Dựng trang bằng trình duyệt thật để lấy DOM sau khi JavaScript chạy - dành cho trang SPA/HTML rỗng
// (nhiều bộ kit lừa đảo chỉ vẽ form bằng JS để né bộ quét tĩnh).
//
// An toàn:
// - Mỗi lần dựng dùng một context ẩn danh mới, đóng ngay khi xong; tối đa HEADLESS_CONCURRENCY trang cùng lúc
// - MỌI request của trình duyệt (kể cả do JS của trang tạo ra) đều qua bộ chặn SSRF: host phải phân giải ra IP công khai
// - Chặn ảnh/CSS/font/media để nhẹ và nhanh; chặn tải file; không cấp quyền thông báo/vị trí/camera
// - Giới hạn thời gian HEADLESS_TIMEOUT_MS (mặc định 8s)
//
// Bật/tắt: HEADLESS_RENDER=auto (mặc định: dùng nếu tìm thấy Chrome/Chromium) | on | off
// Đường dẫn trình duyệt: CHROME_PATH (mặc định tự dò Google Chrome / Chromium trên máy)
// ============================================================================

const MODE = (process.env.HEADLESS_RENDER || 'auto').toLowerCase();
const TIMEOUT_MS = parseInt(process.env.HEADLESS_TIMEOUT_MS || '8000', 10);
const MAX_CONCURRENCY = parseInt(process.env.HEADLESS_CONCURRENCY || '2', 10);

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter((p): p is string => !!p);

const executablePath = MODE === 'off' ? null : CHROME_CANDIDATES.find(p => fs.existsSync(p)) || null;

export function isHeadlessAvailable(): boolean {
  return MODE !== 'off' && !!executablePath;
}

let browserPromise: Promise<any> | null = null;
let active = 0;
const waiters: Array<() => void> = [];

async function acquire() {
  if (active >= MAX_CONCURRENCY) await new Promise<void>(resolve => waiters.push(resolve));
  active++;
}
function release() {
  active--;
  waiters.shift()?.();
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = (async () => {
      const { chromium } = await import('playwright-core');
      const browser = await chromium.launch({
        executablePath: executablePath!,
        headless: true,
        args: ['--disable-extensions', '--disable-background-networking', '--disable-sync', '--no-first-run', '--mute-audio'],
      });
      browser.on('disconnected', () => {
        browserPromise = null;
      });
      return browser;
    })().catch(err => {
      browserPromise = null;
      throw err;
    });
  }
  return browserPromise;
}

export interface RenderedPage {
  html: string;
  finalUrl: string;
  blockedRequests: number;
  renderMs: number;
}

/** Dựng trang bằng trình duyệt headless và trả về HTML của DOM cuối cùng, hoặc null nếu không khả dụng/thất bại. */
export async function renderPage(url: string): Promise<RenderedPage | null> {
  if (!isHeadlessAvailable()) return null;
  const started = Date.now();
  await acquire();
  let context: any = null;
  try {
    const browser = await getBrowser();
    context = await browser.newContext({
      acceptDownloads: false,
      javaScriptEnabled: true,
      serviceWorkers: 'block',
      permissions: [],
      locale: 'vi-VN',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    let blockedRequests = 0;
    const checkedHosts = new Map<string, boolean>();
    await context.route('**/*', async (route: any) => {
      const req = route.request();
      const type = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(type)) return route.abort();
      let allowed = false;
      try {
        const u = new URL(req.url());
        if (u.protocol === 'data:' || u.protocol === 'blob:') return route.continue();
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          allowed = false;
        } else if (checkedHosts.has(u.hostname)) {
          allowed = checkedHosts.get(u.hostname)!;
        } else {
          // Host trỏ về IP nội bộ (SSRF qua trình duyệt) hoặc không phân giải được -> chặn
          allowed = await resolvePublicAddress(u.hostname, 2000).then(() => true, () => false);
          checkedHosts.set(u.hostname, allowed);
        }
      } catch {
        allowed = false;
      }
      if (!allowed) {
        blockedRequests++;
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('dialog', (d: any) => d.dismiss().catch(() => {}));
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
    // Cho JS thêm một nhịp để vẽ form (không chờ networkidle vì trang lừa đảo hay giữ kết nối mở)
    await page.waitForLoadState('networkidle', { timeout: Math.min(3000, TIMEOUT_MS) }).catch(() => {});
    const html: string = await page.content();
    return { html: html.slice(0, 1024 * 1024), finalUrl: page.url(), blockedRequests, renderMs: Date.now() - started };
  } catch (err: any) {
    console.warn(`[Headless] Không dựng được ${url}: ${err?.message?.split('\n')[0] || err}`);
    return null;
  } finally {
    await context?.close().catch(() => {});
    release();
  }
}

/** Đóng trình duyệt khi tắt server. */
export async function closeHeadless() {
  const p = browserPromise;
  browserPromise = null;
  if (p) await (await p).close().catch(() => {});
}
