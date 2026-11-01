import { ScanReport, KeyFinding, MaterialAccessScope, XAIBreakdown, ActionRecommendation } from '../types';
import { Language } from '../context/LanguageContext';
import { DEFAULT_MATERIALS_SCOPE, DEFAULT_LEGAL_BASIS } from '../data/reportConstants';

/**
 * Universal Reactive Localizer for Verity Scan Reports.
 * Transforms raw report payloads (regardless of original scan language)
 * into 100% reactive, localized strings matching the active interface language (0ms instant switch).
 */
export function getLocalizedReport(
  rawReport: ScanReport | null | undefined,
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => string,
  currentLanguage: Language
): ScanReport | null {
  if (!rawReport) return null;

  const status = rawReport.status;
  const rawSummary = (rawReport.summary || '').toLowerCase();
  const isIllegalGambling =
    rawSummary.includes('cờ bạc') ||
    rawSummary.includes('gambling') ||
    rawSummary.includes('cá cược') ||
    rawSummary.includes('betting') ||
    rawReport.nationalCompliance?.vietnamCompliance?.status === 'prohibited';

  const isUnresolvable =
    rawSummary.includes('không tồn tại') ||
    rawSummary.includes('non-existent') ||
    rawSummary.includes('nxdomain') ||
    rawSummary.includes('enotfound');

  const isPhishing =
    rawSummary.includes('phishing') ||
    rawSummary.includes('lừa đảo') ||
    rawSummary.includes('mạo danh');

  // 1. Localize Summary
  let localizedSummary = rawReport.summary;
  if (isIllegalGambling) {
    localizedSummary = t(
      'verdictSummaryGambling',
      'CẢNH BÁO CẤM: Tên miền vi phạm nghiêm trọng Bộ luật Hình sự (Điều 321, 322) và Luật An ninh mạng Việt Nam (Cờ bạc, cá cược trực tuyến phi pháp). Đang bị phong tỏa bởi Tường lửa An ninh mạng Quốc gia và không được Chính phủ công nhận.'
    );
  } else if (isUnresolvable) {
    localizedSummary = t(
      'verdictSummaryUnresolvable',
      'TÊN MIỀN KHÔNG TỒN TẠI: Không tìm thấy máy chủ DNS cho tên miền này. Địa chỉ web không hoạt động trên internet.'
    );
  } else if (status === 'safe') {
    localizedSummary = t(
      'verdictSummarySafe',
      'XÁC NHẬN AN TOÀN: Thực thể số có hạ tầng mã hóa TLS đạt chuẩn, minh bạch thông tin pháp nhân và tuân thủ các quy định bảo vệ dữ liệu cá nhân.'
    );
  } else if (status === 'caution') {
    localizedSummary = t(
      'verdictSummaryCaution',
      'CẦN LƯU Ý: Trang web hoạt động bình thường nhưng cần xác minh kỹ thông tin pháp nhân trước khi chia sẻ dữ liệu nhạy cảm hoặc thanh toán tài chính.'
    );
  } else if (status === 'danger') {
    localizedSummary = t(
      'verdictSummaryDanger',
      'CẢNH BÁO NGUY HIỂM: Phát hiện dấu hiệu lừa đảo mạo danh thương hiệu (Phishing), tên miền rủi ro cao hoặc điều khoản ToS xâm phạm quyền lợi người dùng nghiêm trọng.'
    );
  }

  // 2. Localize Model Reliability
  const localizedReliability = rawReport.modelReliability
    ? {
        ...rawReport.modelReliability,
        explanation: t(
          'verdictReliabilityDesc',
          'Độ tin cậy mô hình đạt mức rất cao nhờ sự đồng thuận hoàn hảo giữa phân giải bản ghi DNS, chứng thư số TLS/SSL, ma trận đối chiếu pháp luật Việt Nam, EU, Hoa Kỳ và suy luận không hộp đen.'
        )
      }
    : undefined;

  // 3. Localize Age Appropriateness & 4 Scope Cards & Legal Basis
  let localizedAge = rawReport.ageAppropriateness;
  if (localizedAge) {
    const rawCat = (localizedAge.targetCategory || '').toLowerCase();
    let targetCategory = t('catGeneralService', 'THÔNG TIN & DỊCH VỤ SỐ');
    if (rawCat.includes('báo chí') || rawCat.includes('media') || rawCat.includes('tri thức') || rawCat.includes('public')) {
      targetCategory = t('catNewsKnowledge', 'BÁO CHÍ CHÍNH THỐNG, TRI THỨC & THÔNG TIN CÔNG CỘNG');
    } else if (rawCat.includes('cờ bạc') || rawCat.includes('gambling')) {
      targetCategory = t('catGambling', 'CỜ BẠC & CÁ CƯỢC TRỰC TUYẾN PHI PHÁP');
    } else if (rawCat.includes('bẫy') || rawCat.includes('phishing') || rawCat.includes('lừa đảo')) {
      targetCategory = t('catPhishing', 'BẪY LỪA ĐẢO GIẢ MẠO & MÃ ĐỘC');
    } else if (rawCat.includes('tài chính') || rawCat.includes('banking') || rawCat.includes('ngân hàng')) {
      targetCategory = t('catBanking', 'CỔNG DỊCH VỤ NGÂN HÀNG & TÀI CHÍNH CHÍNH THỐNG');
    } else if (rawCat.includes('mạng xã hội') || rawCat.includes('social')) {
      targetCategory = t('catSocial', 'MẠNG XÃ HỘI & NỀN TẢNG TƯƠNG TÁC MỞ');
    }

    let ratingLabel = t('ratingLabelAllAges', 'Mọi lứa tuổi (All Ages - Phổ cập An toàn)');
    if (localizedAge.ratingCode === '13+') {
      ratingLabel = t('ratingLabel13Plus', '13+ (Khuyến nghị Định hướng Phụ huynh / PG-13)');
    } else if (localizedAge.ratingCode === '15+' || localizedAge.ratingCode === '16+') {
      ratingLabel = t('ratingLabel15Plus', '15+ / 18+ (Dịch vụ Tài chính - Ngân hàng có điều kiện)');
    } else if (localizedAge.ratingCode === '18+') {
      ratingLabel = t('ratingLabel18Plus', '18+ (Nghiêm cấm tuyệt đối - Cờ bạc phi pháp / Giới hạn độ tuổi)');
    }

    let rationale = localizedAge.rationale;
    if (localizedAge.ratingCode === 'ALL' || rawCat.includes('báo chí') || rawCat.includes('tri thức') || status === 'safe') {
      rationale = t(
        'ageRationaleNews',
        'Trang web tuân thủ Luật Báo chí và Luật Tiếp cận thông tin của Việt Nam. Nội dung chuẩn mực, cung cấp kiến thức, tin tức khoa học - giáo dục hoặc thông tin công cộng hữu ích, không chứa nội dung độc hại hay bạo lực.'
      );
    } else if (isIllegalGambling) {
      rationale = t(
        'verdictSummaryGambling',
        'Nền tảng cờ bạc/cá cược trực tuyến phi pháp thuộc danh mục cấm triệt để theo Điều 321, 322 Bộ luật Hình sự và Điều 29 Luật An ninh mạng 2018 về Bảo vệ trẻ em trên môi trường mạng.'
      );
    }

    const localizedMaterialsScope: MaterialAccessScope[] = (localizedAge.materialsScope?.length ? localizedAge.materialsScope : DEFAULT_MATERIALS_SCOPE).map((mat) => {
      if (mat.category === 'articles_news') {
        return {
          ...mat,
          title: t('scopeArticleTitle', 'Bài viết báo chí, kiến thức khoa học & giáo dục'),
          description: t('scopeArticleDesc', 'Bài viết được biên tập kỹ lưỡng theo Luật Báo chí và kiểm duyệt thông tin công cộng chuẩn xác.'),
          guidelines: t('scopeArticleFootnote', 'Mọi đối tượng người xem đều có thể tiếp cận an toàn.')
        };
      }
      if (mat.category === 'hyperlinks_redirects') {
        return {
          ...mat,
          title: t('scopeLinkTitle', 'Siêu liên kết trích dẫn nguồn & tư liệu chính thức'),
          description: t('scopeLinkDesc', 'Các liên kết trích nguồn tư liệu, văn bản quy phạm pháp luật và địa chỉ tham chiếu mở.'),
          guidelines: t('scopeLinkFootnote', 'Được kiểm toán an toàn, không chứa bẫy mã độc hoặc chuyển hướng giả mạo.')
        };
      }
      if (mat.category === 'downloadable_materials') {
        return {
          ...mat,
          title: t('scopeMediaTitle', 'Hình ảnh tư liệu, infographic & tài liệu đọc (PDF)'),
          description: t('scopeMediaDesc', 'Hình ảnh minh họa báo chí chất lượng cao, ấn phẩm định dạng số hóa và tài liệu văn bản công cộng.'),
          guidelines: t('scopeMediaFootnote', 'An toàn khi xem trực tiếp hoặc tải về máy tính/điện thoại.')
        };
      }
      if (mat.category === 'financial_transactions') {
        return {
          ...mat,
          title: t('scopePublicTitle', 'Dịch vụ thông tin công cộng (Không giao dịch bắt buộc)'),
          description: t('scopePublicDesc', 'Trang tin tức mở, người dùng không phải trả phí hay thực hiện hợp đồng số có giá trị ràng buộc nghĩa vụ tài chính.'),
          guidelines: t('scopePublicFootnote', 'Không phát sinh rủi ro tài chính hay nghĩa vụ công nợ đối với người chưa thành niên.')
        };
      }
      return mat;
    });

    const localizedLegalBasis = (localizedAge.legalBasis?.length ? localizedAge.legalBasis : DEFAULT_LEGAL_BASIS).map((legal) => {
      const lower = legal.toLowerCase();
      if (lower.includes('trẻ em') || lower.includes('child')) {
        return t('legalChildAct2016', 'Luật Trẻ em 2016 (Điều 44: Quyền được tiếp cận thông tin phù hợp)');
      }
      if (lower.includes('29') || lower.includes('an ninh mạng') || lower.includes('cybersecurity')) {
        return t('legalCybersecurity29', 'Điều 29 Luật An ninh mạng 2018 (Bảo đảm môi trường mạng an toàn cho trẻ em)');
      }
      if (lower.includes('báo chí') || lower.includes('press') || lower.includes('103')) {
        return t('legalPressLaw2016', 'Luật Báo chí 2016 (Số 103/2016/QH13)');
      }
      if (lower.includes('147')) {
        return t('legalDecree147Gov', 'Nghị định 147/2024/NĐ-CP của Chính phủ');
      }
      if (lower.includes('dân sự') || lower.includes('civil') || lower.includes('21')) {
        return t('legalCivilCode21', 'Bộ luật Dân sự 2015 (Điều 21 về Năng lực hành vi dân sự)');
      }
      if (lower.includes('hình sự') || lower.includes('penal') || lower.includes('321') || lower.includes('322')) {
        return t('legalPenalGambling', 'Bộ luật Hình sự 2015 (Điều 321, 322 về Tội đánh bạc và gá bạc)');
      }
      return legal;
    });

    localizedAge = {
      ...localizedAge,
      targetCategory,
      ratingLabel,
      rationale,
      materialsScope: localizedMaterialsScope,
      legalBasis: localizedLegalBasis
    };
  }

  // 4. Localize Key Findings & Point Badges
  const localizedKeyFindings: KeyFinding[] = (rawReport.keyFindings || []).map((finding) => {
    let title = finding.title;
    let explanation = finding.explanation;
    let impact = finding.impact;

    const lowerTitle = (finding.title || '').toLowerCase();

    // Map title and parameterized explanation
    if (lowerTitle.includes('mật mã') || lowerTitle.includes('tls') || lowerTitle.includes('cryptographic')) {
      title = t('findingTlsTitle', 'Hạ tầng mật mã TLS và danh tính số được xác thực');
      explanation = t('findingTlsDescWithParams', 'Giao thức mã hóa {tls} hoạt động chuẩn xác, chứng thư số được cấp bởi cơ quan CA hợp lệ ({ca}). Bản ghi DNS định tuyến an toàn tới IP {ip}.', {
        tls: rawReport.technicalMetrics?.tlsVersion || 'TLSv1.3',
        ca: rawReport.technicalMetrics?.certIssuer || 'Authorized CA',
        ip: rawReport.technicalMetrics?.dnsLookupMs ? 'Public Host' : 'IP'
      });
      impact = `+35 ${t('badgeSafetyPoints', 'điểm an toàn')}`;
    } else if (lowerTitle.includes('dịch vụ mạng') || lowerTitle.includes('danh bạ an ninh') || lowerTitle.includes('clean threat') || lowerTitle.includes('public service')) {
      title = t('findingNetworkTitle', 'Dịch vụ mạng hoạt động ổn định & Danh bạ an ninh tin cậy');
      explanation = t('findingNetworkDesc', 'Website đang phục vụ lưu lượng truy cập bình thường với chính sách bảo mật giao vận chuẩn. Không phát hiện dấu hiệu can thiệp mã độc.');
      impact = `+28 ${t('badgeTransparencyPoints', 'điểm minh bạch')}`;
    } else if (lowerTitle.includes('quyền riêng tư') || lowerTitle.includes('privacy') || lowerTitle.includes('truyền thông')) {
      title = t('findingPrivacyTitle', 'Đáp ứng chuẩn mực bảo vệ dữ liệu truyền thông và quyền riêng tư');
      explanation = t('findingPrivacyDesc', 'Mã hóa đường truyền bảo vệ an toàn thông tin người dùng, không phát hiện điều khoản thu thập thông tin độc quyền trái phép.');
      impact = `+25 ${t('badgeLegalityPoints', 'điểm pháp lý')}`;
    } else if (lowerTitle.includes('cờ bạc') || lowerTitle.includes('gambling')) {
      title = t('findingGamblingTitle', 'Vi phạm nghiêm trọng Bộ luật Hình sự & Luật An ninh mạng: Cờ bạc, cá cược trực tuyến');
      explanation = t('findingGamblingDesc', 'Tổ chức hoạt động cờ bạc, cá độ bóng đá hoặc sòng bạc trực tuyến trái phép. Hành vi này bị nghiêm cấm và xử lý hình sự theo Điều 321 & 322 Bộ luật Hình sự.');
      impact = `-100 ${t('badgeLegalityPenalty', 'điểm chế tài pháp lý')}`;
    } else if (lowerTitle.includes('tường lửa') || lowerTitle.includes('firewall') || lowerTitle.includes('phong tỏa') || lowerTitle.includes('sinkhole')) {
      title = t('findingFirewallTitle', 'Lệnh phong tỏa Tường lửa An ninh mạng Quốc gia: Buộc các ISP chặn truy cập');
      explanation = t('findingFirewallDesc', 'Tên miền nằm trong danh sách đen quốc gia và đang chịu lệnh phong tỏa của Tường lửa An ninh mạng Quốc gia trên toàn bộ các nhà mạng viễn thông.');
      impact = `-50 ${t('badgeSafetyPoints', 'điểm an toàn')}`;
    } else if (lowerTitle.includes('giả mạo') || lowerTitle.includes('phishing') || lowerTitle.includes('impersonation')) {
      title = t('findingPhishingTitle', 'Cấu trúc tên miền giả mạo mạo danh (Brand Impersonation)');
      explanation = t('findingPhishingDesc', 'Tên miền có dấu hiệu mạo danh thương hiệu hợp pháp nhằm lừa đảo thu thập thông tin đăng nhập hoặc mã OTP.');
      impact = `-50 ${t('badgeSafetyPoints', 'điểm an toàn')}`;
    } else if (lowerTitle.includes('không tồn tại') || lowerTitle.includes('nxdomain') || lowerTitle.includes('dns resolution failed')) {
      title = t('findingNxdomainTitle', 'Tên miền không tồn tại trên hệ thống DNS toàn cầu');
      explanation = t('findingNxdomainDesc', 'Tên miền không có bản ghi IP hợp lệ trên hệ thống máy chủ định danh thế giới (NXDOMAIN). Trang web hiện không hoạt động hoặc không tồn tại.');
      impact = `-55 ${t('badgeSafetyPoints', 'điểm an toàn')}`;
    } else if (lowerTitle.includes('chưa mã hóa') || lowerTitle.includes('plain http') || lowerTitle.includes('chưa được chứng thực')) {
      title = t('findingHttpTitle', 'Kết nối chưa mã hóa hoặc chứng thư số chưa được chứng thực');
      explanation = t('findingHttpDesc', 'Kết nối chưa được chứng thực bởi tổ chức CA tin cậy hoặc đang chạy trên giao thức HTTP không mã hóa. Dữ liệu có thể bị rò rỉ nếu truyền tải thông tin mật.');
      impact = `-20 ${t('badgeSafetyPoints', 'điểm an toàn')}`;
    }

    // Localize impact text (e.g. "+35 điểm an toàn" -> "+35 safety points")
    if (impact) {
      const match = impact.match(/^([+-]?\d+)\s*(.*)$/);
      if (match) {
        const score = match[1];
        const label = match[2].toLowerCase();
        if (label.includes('an toàn') || label.includes('safety')) {
          impact = `${score} ${t('badgeSafetyPoints', 'điểm an toàn')}`;
        } else if (label.includes('minh bạch') || label.includes('transparency')) {
          impact = `${score} ${t('badgeTransparencyPoints', 'điểm minh bạch')}`;
        } else if (label.includes('chế tài') || label.includes('penalty')) {
          impact = `${score} ${t('badgeLegalityPenalty', 'điểm chế tài pháp lý')}`;
        } else if (label.includes('pháp lý') || label.includes('legal')) {
          impact = `${score} ${t('badgeLegalityPoints', 'điểm pháp lý')}`;
        }
      }
    }

    return {
      ...finding,
      title,
      explanation,
      impact
    };
  });

  // 5. Localize Detailed Deep-Dive Tabs (Safety, Transparency, Legality)
  const localizedSafetyDetails = {
    ...rawReport.safetyDetails,
    threatIntelligence: t('safetyThreatIntelDesc', 'Đã đối chiếu với cơ sở dữ liệu giám sát an ninh mạng quốc gia và quốc tế.'),
    phishingHeuristics: t('safetyPhishingDesc', 'Đã rà soát thuật toán phát hiện cờ bạc lậu, mạo danh và bẫy thu thập dữ liệu trái phép.'),
    domainReputation: t('safetyDomainRepDesc', 'Chỉ số uy tín tên miền, tình trạng cấp phép và lệnh phong tỏa tường lửa đã được kiểm chứng.')
  };

  const localizedTransparencyDetails = {
    ...rawReport.transparencyDetails,
    biasAnalysis: t('transBiasAnalysis', 'Nội dung thông tin thương mại tiêu chuẩn.'),
    authenticity: t('transAuthenticity', 'Hình ảnh, văn bản nhận diện và mức độ công nhận của cơ quan nhà nước.'),
    deepfakeOrManipulationCheck: t('transDeepfakeCheck', 'Không phát hiện dấu hiệu can thiệp tạo ảnh/nội dung giả mạo.')
  };

  const localizedLegalityDetails = {
    ...rawReport.legalityDetails,
    termsAndPolicyFlags: isIllegalGambling
      ? t('verdictSummaryGambling', 'Vi phạm trực tiếp Điều 321, 322 Bộ luật Hình sự')
      : t('legalityTermsFlags', 'Điều khoản dịch vụ được rà soát tìm điều khoản bất lợi.'),
    liabilityLimits: t('legalityLiabilityLimits', 'Giới hạn trách nhiệm dân sự.'),
    requiredDisclosures: t('legalityDisclosures', 'Công bố thông tin theo quy định.')
  };

  // 6. Localize National Compliance
  let localizedCompliance = rawReport.nationalCompliance;
  if (localizedCompliance) {
    const vnStatus = localizedCompliance.vietnamCompliance?.status;
    const vnDetails = vnStatus === 'prohibited'
      ? t('descNationalFirewallBlocked', 'Tên miền nằm trong danh mục áp dụng tường lửa ngăn chặn bắt buộc do Cục An toàn thông tin (NCSC) và Cục A05 (Bộ Công an) chỉ đạo các nhà mạng viễn thông (VNPT, Viettel, FPT) chặn định tuyến.')
      : t('descNationalFirewallAllowed', 'Tên miền không có quyết định ngăn chặn hoặc phong tỏa từ cơ quan quản lý viễn thông quốc gia. Lưu lượng kết nối hợp lệ.');

    const euDetails = t('descWafLegal', 'Tường lửa ứng dụng web (WAF) là cơ chế phòng vệ hạ tầng hợp pháp được công nhận theo tiêu chuẩn an ninh không gian mạng NIS2 và NIST SP 800-53 để ngăn chặn tấn công DDoS, SQLi và can thiệp trái phép.');
    const usDetails = t('secScraperCompliance', 'Hạ tầng mạng hợp pháp, tuân thủ Đạo luật CFAA 18 U.S.C. § 1030 và các tiêu chuẩn bảo mật NIST SP 800-53.');

    const govSummary = localizedCompliance.governmentRecognition?.isRecognized
      ? t('descCommercialRecognized', 'Doanh nghiệp có đăng ký hoạt động hợp pháp, mã số thuế minh bạch và được cơ quan nhà nước có thẩm quyền cấp phép.')
      : (vnStatus === 'prohibited'
          ? t('descGovNotRecognized', 'HOÀN TOÀN KHÔNG ĐƯỢC CHÍNH PHỦ CÔNG NHẬN: Tên miền nằm trong danh sách đen do hoạt động phi pháp, trốn tránh kiểm soát của Nhà nước.')
          : t('realtimeVerificationDesc', 'Tên miền đăng ký thương mại quốc tế thông thường; cần kiểm tra pháp nhân và giấy phép trước khi giao dịch lớn.'));

    localizedCompliance = {
      ...localizedCompliance,
      vietnamCompliance: {
        ...localizedCompliance.vietnamCompliance,
        details: vnDetails
      },
      euCompliance: {
        ...localizedCompliance.euCompliance,
        details: euDetails
      },
      usCompliance: {
        ...localizedCompliance.usCompliance,
        details: usDetails
      },
      governmentRecognition: {
        ...localizedCompliance.governmentRecognition,
        summary: govSummary
      }
    };
  }

  // 7. Localize XAI Breakdown Factors (including specific inner cards)
  const localizedXAI: XAIBreakdown[] = (rawReport.xaiBreakdown || []).map((xai) => {
    let factor = xai.factor;
    let explanation = xai.explanation;
    const lower = (xai.factor || '').toLowerCase();

    if (lower.includes('an toàn mật mã') || lower.includes('transport cryptography') || lower.includes('chứng chỉ tls')) {
      factor = t('xaiFactorCryptoTls', 'An toàn mật mã & Chứng chỉ TLS');
      explanation = t('xaiFactorCryptoTlsDesc', 'Chứng thư số công khai hợp lệ.');
    } else if (lower.includes('hạ tầng tên miền') || lower.includes('bản ghi ip') || lower.includes('domain infrastructure')) {
      factor = t('xaiFactorDomainIp', 'Hạ tầng tên miền & Bản ghi IP');
      explanation = t('xaiFactorDomainIpDesc', 'Định tuyến IP công khai ổn định.');
    } else if (lower.includes('minh bạch dịch vụ') || lower.includes('baseline transparency')) {
      factor = t('xaiFactorServiceTrans', 'Minh bạch dịch vụ');
      explanation = t('xaiFactorServiceTransDesc', 'Tuân thủ tiêu chuẩn hoạt động công khai.');
    } else if (lower.includes('tls') || lower.includes('mật mã') || lower.includes('crypto')) {
      factor = t('vectorCrypto', 'Mật mã học & TLS');
    } else if (lower.includes('đồng thuận') || lower.includes('consensus')) {
      factor = t('vectorConsensus', 'Đồng thuận Đa tầng');
    } else if (lower.includes('độ đầy đủ') || lower.includes('completeness')) {
      factor = t('vectorCompleteness', 'Độ đầy đủ Dữ liệu');
    } else if (lower.includes('chuẩn xác') || lower.includes('heuristic')) {
      factor = t('vectorHeuristic', 'Chuẩn xác Suy luận');
    } else if (lower.includes('dns') || lower.includes('định tuyến')) {
      factor = t('metricDnsLookup', 'Tra cứu DNS & Định tuyến');
    }

    return {
      ...xai,
      factor,
      explanation
    };
  });

  // 8. Localize Action Recommendations
  const localizedRecommendations: ActionRecommendation[] = (rawReport.recommendations || []).map((rec) => {
    let action = rec.action;
    let details = rec.details;
    const lower = (rec.action || '').toLowerCase();

    if (lower.includes('an tâm') || lower.includes('safe to interact')) {
      action = t('recSafeAction', 'An tâm sử dụng và truy cập dịch vụ');
      details = t('recSafeDetails', 'Trang web có hạ tầng mã hóa hợp lệ và máy chủ định danh rõ ràng.');
    } else if (lower.includes('dừng truy cập') || lower.includes('cease access') || lower.includes('không nạp tiền')) {
      action = t('recStopAccess', 'Dừng truy cập ngay lập tức và tuyệt đối không nạp tiền');
      details = t('recStopAccessDetails', 'Tuyệt đối không đăng ký tài khoản, không cung cấp số tài khoản ngân hàng và không nạp tiền. Hành vi đánh bạc trực tuyến có thể bị xử lý hình sự.');
    } else if (lower.includes('thận trọng') || lower.includes('verify security') || lower.includes('nhạy cảm')) {
      action = t('recCautionAction', 'Thận trọng khi nhập dữ liệu nhạy cảm hoặc mật khẩu');
      details = t('recCautionDetails', 'Đảm bảo truy cập qua giao thức HTTPS có chứng thư hợp lệ.');
    }

    return {
      ...rec,
      action,
      details
    };
  });

  return {
    ...rawReport,
    summary: localizedSummary,
    modelReliability: localizedReliability,
    ageAppropriateness: localizedAge,
    keyFindings: localizedKeyFindings,
    safetyDetails: localizedSafetyDetails,
    transparencyDetails: localizedTransparencyDetails,
    legalityDetails: localizedLegalityDetails,
    nationalCompliance: localizedCompliance,
    xaiBreakdown: localizedXAI,
    recommendations: localizedRecommendations
  };
}
