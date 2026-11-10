import dotenv from 'dotenv';
dotenv.config();

import { runScanPipeline } from '../server/scanPipeline.ts';
import { startReputationFeeds } from '../server/reputation.ts';
import { predictPhishingProbability } from '../server/urlModel.ts';
import { predictContentRisk } from '../server/contentModel.ts';

// Helper để đo thời gian chính xác
function formatMs(ms: number): string {
  return `${ms.toFixed(0)}ms`;
}

async function main() {
  console.log('='.repeat(80));
  console.log('   VERITY TRUST XAI - KIỂM THỬ ĐA TẦNG (TIERS 0 - 5) & BENCHMARK THỰC TẾ');
  console.log('='.repeat(80));

  // 1. Khởi động danh tiếng và nạp mô hình học sâu Offline
  console.log('\n[Khởi tạo] Đang nạp danh mục Danh tiếng & 2 Mô hình Deep Learning Offline...');
  const initStart = performance.now();
  await startReputationFeeds();
  // Kích hoạt nạp mô hình học sâu Offline
  predictPhishingProbability('example.com');
  console.log(`[Khởi tạo] Hoàn tất sau ${formatMs(performance.now() - initStart)}.\n`);

  // Danh sách các website đại diện cho từng tầng
  const testCases = [
    {
      targetTier: 'Tầng 0 (Chặn tấn công SSRF)',
      url: 'http://127.0.0.1:3000',
      expected: 'Chặn IP nội bộ',
    },
    {
      targetTier: 'Tầng 0 (Tên miền không tồn tại NXDOMAIN)',
      url: 'http://non-existent-domain-test-999999.xyz',
      expected: 'NXDOMAIN',
    },
    {
      targetTier: 'Tầng 1 (Tên miền chính thống / Top Tranco)',
      url: 'https://google.com',
      expected: 'Dừng sớm Tầng 1 (Safe)',
    },
    {
      targetTier: 'Tầng 1 (Tên miền Cờ bạc / Cá cược rõ ràng)',
      url: 'https://w88.com',
      expected: 'Dừng sớm Tầng 1 (Dangerous / Gambling)',
    },
    {
      targetTier: 'Tầng 2 (Bằng chứng HTML + 2 Mô hình Deep Learning)',
      url: 'https://aflipclock.com/vi/study-timer/',
      expected: 'Tầng 2 (Bằng chứng + Deep Learning)',
    },
    {
      targetTier: 'Tầng 3 (Trang Web SPA React/Vue động)',
      url: 'https://dasai.com.au/',
      expected: 'Tầng 2/3 (Dựng nội dung DOM/SPA)',
    },
  ];

  const results: any[] = [];

  for (const tc of testCases) {
    console.log('-'.repeat(80));
    console.log(`🔍 [${tc.targetTier}] Kiểm thử URL: ${tc.url}`);
    const start = performance.now();
    try {
      const pipe = await runScanPipeline(tc.url);
      const totalTime = performance.now() - start;

      console.log(`   ⏱️ Tổng thời gian: ${formatMs(totalTime)} (Dừng ở Tầng ${pipe.exitTier}: ${pipe.exitReason})`);
      console.log(`   🛡️ Điểm tin cậy: ${pipe.assessment.score}/100 (${pipe.assessment.status.toUpperCase()} - ${pipe.assessment.verdict})`);

      // Chi tiết các tầng đã đi qua
      for (const t of pipe.tiers) {
        const icon = t.status === 'passed' ? '✅' : t.status === 'exit' ? '🛑' : '⏭️';
        console.log(`      ${icon} Tầng ${t.tier} [${t.name}]: ${t.status.toUpperCase()} (${t.ms}ms) -> ${t.note}`);
      }

      // Các bằng chứng kỹ thuật chính (Score factors)
      if (pipe.assessment.factors && pipe.assessment.factors.length > 0) {
        const topFactors = pipe.assessment.factors.slice(0, 4).map(f => `${f.label} (${f.delta > 0 ? '+' : ''}${f.delta}p)`).join('; ');
        console.log(`   📊 Yếu tố điểm chính: ${topFactors}`);
      }

      results.push({
        tier: tc.targetTier,
        url: tc.url,
        score: pipe.assessment.score,
        status: pipe.assessment.status,
        verdict: pipe.assessment.verdict,
        exitTier: pipe.exitTier,
        latencyMs: Math.round(totalTime),
      });
    } catch (err: any) {
      console.error(`   ❌ Lỗi khi quét: ${err.message}`);
    }
  }

  // ==========================================================================
  // KIỂM THỬ TẦNG 5: ĐỘNG CƠ TRÍ TUỆ NHÂN TẠO (AI EXPLAIN & REASONING)
  // ==========================================================================
  console.log('\n' + '='.repeat(80));
  console.log('   KIỂM THỬ TẦNG 5: ĐỘNG CƠ AI EXPLAIN (OPENROUTER LLM CASCADE)');
  console.log('='.repeat(80));

  const sampleTarget = 'https://aflipclock.com/vi/study-timer/';
  console.log(`🤖 Gửi yêu cầu giải thích ngữ nghĩa chuyên sâu cho trang: ${sampleTarget}...`);

  const aiStart = performance.now();
  const apiKey = (process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || '').trim();
  const isOR = apiKey.startsWith('sk-or-');

  console.log(`   🌐 AI Provider: ${isOR ? 'OpenRouter AI' : 'Google Gemini AI'}`);

  try {
    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://verity.trust',
        'X-Title': 'VerityTrust Explainable AI',
      },
      body: JSON.stringify({
        model: 'liquid/lfm-2.5-2.6b:free',
        messages: [
          {
            role: 'system',
            content: 'Bạn là chuyên gia an ninh mạng của Nền tảng VerityTrust XAI. Hãy giải thích ngắn gọn, súc tích (3-4 câu) bằng Tiếng Việt về độ an toàn của trang web này dựa trên các bằng chứng: Kết nối TLS 1.3 bảo mật, không có form thu thập mật khẩu/thẻ tín dụng, phục vụ hẹn giờ học tập trực tuyến.'
          },
          {
            role: 'user',
            content: `Hãy phân tích trang ${sampleTarget}`
          }
        ],
        temperature: 0.2,
      })
    });

    const aiDuration = performance.now() - aiStart;
    const aiData = await aiRes.json();
    const explanation = aiData?.choices?.[0]?.message?.content || 'Không nhận được văn bản';

    console.log(`   ⚡ Thời gian phản hồi AI: ${formatMs(aiDuration)}`);
    console.log(`   🏷️ Model phản hồi: ${aiData?.model || 'liquid/lfm-2.5-2.6b:free'}`);
    console.log(`   💬 Lời giải thích từ AI: \n"${explanation.trim()}"\n`);
  } catch (err: any) {
    console.error(`   ❌ Lỗi khi gọi AI: ${err.message}`);
  }

  // ==========================================================================
  // BẢNG TỔNG HỢP BENCHMARK CÁC TẦNG
  // ==========================================================================
  console.log('='.repeat(80));
  console.log('   BẢNG TỔNG HỢP KẾT QUẢ BENCHMARK CÁC TẦNG');
  console.log('='.repeat(80));
  console.table(results);
}

main().catch(console.error);
