// Auto-split from messages.ts during Phase 6e; edit translations here per feature.
export const dashboard = {
  en: {
    title: 'Dashboard',
    heroEyebrow: 'Trackvest',
    heroTitle: 'Portfolio overview',
    heroDescription:
      'This first version turns the homepage into an investment cockpit: see total return fast, spot concentration, and decide which asset deserves a deeper look next.',
    snapshotLabel: 'Current snapshot',
    snapshotAsOf: 'Updated {{date}}',
    snapshotLiveNotice:
      'Using the latest portfolio snapshot available to your current accounts.',
    mockDataNotice:
      'This screen is using a mocked portfolio snapshot first so the UI and chart structure can settle before the overview APIs land.',
    scopeEyebrow: 'Planning note',
    scopeTitle: 'Asset-level first, transaction detail later',
    scopeDescription:
      'The homepage is now designed around asset-level portfolio state instead of raw transaction rows. Once the backend overview APIs are ready, these cards and charts can switch from mock data to real snapshots.',
    displayPreferencesTitle: 'Display preferences foundation',
    displayPreferencesDescription:
      'These preferences are now wired to the portfolio API contract so the homepage can request a preferred display currency when needed.',
    displayCurrencyModeLabel: 'Currency mode',
    displayCurrencyModeOriginal: 'Portfolio default',
    displayCurrencyModeBase: 'Preferred base',
    preferredBaseCurrencyLabel: 'Preferred base currency',
    displayModeStatusLabel: 'Current display status',
    displayModeStatusOriginal:
      'Numbers are currently shown in the portfolio default display currency: {{currency}}.',
    displayModeStatusBaseAligned:
      'Preferred base currency is set to {{currency}}, and the current portfolio snapshot is already normalized to it.',
    displayModeStatusBasePending:
      'Preferred base currency is set to {{currency}}, but the current response is still normalized to {{currentCurrency}}.',
    fxRateTitle: 'Today’s FX reference',
    fxRateLoading: 'Loading today’s USD/TWD reference...',
    fxRateUnavailable: 'FX reference is unavailable right now.',
    fxRatePair: '{{base}} / {{quote}}',
    fxRateMeta: 'Reference date {{date}} · Source {{provider}}',
    assetCount: 'Tracked assets',
    investedCapital: 'Invested capital',
    investedCapitalHint: 'Snapshot of the current portfolio cost basis.',
    marketValue: 'Market value',
    marketValueHint: 'Marked using the latest price snapshot available to the portfolio view.',
    totalPnl: 'Total P&L',
    totalReturn: 'Total return',
    pnlDescription: 'Market value minus cost basis across the full portfolio.',
    returnDescription: 'Portfolio-wide return rate from the same snapshot.',
    allocationTitle: 'Allocation mix',
    allocationDescription:
      'See how concentrated the portfolio is before drilling into any single asset.',
    allocationDescriptionAssetClass:
      'Default to the underlying asset class view so the portfolio mix stays useful for allocation and rebalancing.',
    allocationDescriptionType:
      'Switch to product type when you want to inspect how the portfolio is packaged and traded.',
    allocationViewLabel: 'Allocation view',
    allocationViewAssetClass: 'Asset Class',
    allocationViewType: 'Type',
    assetClassLabel: 'Asset class',
    assetClassEquity: 'Equity',
    assetClassBond: 'Bond',
    assetClassCash: 'Cash',
    assetClassCrypto: 'Crypto',
    assetClassPreciousMetal: 'Precious metal',
    rebalanceEyebrow: 'Rebalance',
    rebalanceTitle: 'Bring the portfolio back toward target',
    rebalanceDescription:
      'Compare the current stock-bond mix with the target, then decide how much to top up.',
    rebalanceTargetLabel: 'Target mix',
    rebalanceTargetValue: '80% Equity / 20% Bond',
    rebalanceTargetAdjustLabel: 'Adjust target',
    rebalanceTargetAdjustHint:
      'Use a simple equity slider first. Bond stays as the remainder so we can validate the rebalance workflow without overcomplicating the card.',
    rebalanceTargetLiveLabel: 'Current input',
    rebalanceTargetEquityLabel: 'Equity target',
    rebalanceLockEditLabel: 'Unlock target adjustment',
    rebalanceLockApplyLabel: 'Lock target and apply changes',
    rebalanceTargetTowardBond: 'More bond',
    rebalanceTargetTowardEquity: 'More equity',
    rebalanceCurrentLabel: 'Current:',
    rebalanceGapLabel: 'Gap:',
    rebalanceBuyMoreLabel: 'Buy more:',
    rebalanceAtOrAboveTarget: 'At or above target',
    rebalanceActionTitle: 'Estimated top-up',
    rebalanceActionDescription:
      'Buying about {{amount}} should move the portfolio back toward the current target mix.',
    rebalanceNoActionNeeded:
      'Current equity and bond weights are already close to the target mix.',
    rebalanceSuggestionQuantity: 'Buy about {{quantity}} shares',
    rebalanceSuggestionQuantityInputLabel: 'Suggested quantity for {{symbol}}',
    rebalanceSuggestionPrice: 'Latest price {{price}}',
    rebalanceSuggestionAsset: 'Asset',
    rebalanceSuggestionPriceLabel: 'Price',
    rebalanceSuggestionQuantityLabel: 'Qty',
    rebalanceSuggestionAmountLabel: 'Amount',
    rebalanceFootnoteLabel: 'Calculation notes',
    rebalanceDraftSummaryLabel: 'Your adjustment',
    rebalanceDraftSummaryTotal: 'Subtotal {{amount}}',
    rebalanceDraftSummaryMix: 'Projected mix {{equity}} Equity / {{bond}} Bond',
    rebalanceDraftSummaryShift: 'Equity shift {{shift}}',
    rebalanceFootnote:
      'This first version only looks at equity and bond asset classes. Specific asset suggestions can come later once the rebalance flow grows beyond asset-class guidance.',
    rebalanceEmptyState:
      'Rebalance guidance will appear once the portfolio has enough asset-class data to compare equity and bond exposure.',
    performanceTitle: 'P&L by asset',
    performanceDescription:
      'Quickly spot which holdings are doing the heavy lifting and which ones are dragging performance.',
    trendTitle: 'Portfolio trend',
    trendDescription:
      'A first-pass trend view comparing invested capital and current portfolio value over time.',
    assetCountBadge_one: '{{count}} asset tracked',
    assetCountBadge_other: '{{count}} assets tracked',
    holdingsTitle: 'Holdings overview',
    holdingsDescription:
      'Each row is one asset, not one transaction. Click a row to inspect its current state.',
    emptyTitle: 'No active holdings yet',
    emptyDescription:
      'Record a buy transaction first, then this overview can start summarizing your portfolio.',
    asset: 'Asset',
    weight: 'Weight',
    quantity: 'Quantity',
    avgCost: 'Avg cost',
    costBasis: 'Cost basis',
    latestPrice: 'Latest price',
    latestPriceHint:
      'Shown in the asset quote currency returned by backend price snapshots.',
    investedAmount: 'Invested amount',
    lastActivity: 'Latest activity',
    noRecentActivity: 'No recent activity yet',
    selectedTrendTitle: 'Selected asset trend',
    selectedTrendDescription:
      'A compact trend view for the selected asset. Later this can be replaced with a backend-driven holdings trend endpoint.',
    asset2330Note:
      'Core Taiwan equity position with the largest portfolio weight.',
    asset2330Activity: 'Sold 10 shares to trim concentration',
    asset0050Note:
      'Broad-market Taiwan ETF used as the more stable accumulation sleeve.',
    asset0050Activity: 'Monthly DCA continues',
    assetAaplNote:
      'USD growth position kept small while the overview API is still shaping up.',
    assetAaplActivity: 'No trade this month',
    assetBtcNote:
      'Highest-volatility holding. Strong contributor to total return, but concentration risk is obvious.',
    assetBtcActivity: 'Last buy 3 weeks ago',
    assetQqqNote:
      'US growth ETF sleeve kept intentionally small during portfolio restructuring.',
    assetQqqActivity: 'Holding steady',
    apiPlanningTitle: 'Backend API planning',
    apiPlanningSummary:
      'Top summary cards should read from one snapshot endpoint with invested capital, market value, total P&L, and total return.',
    apiPlanningHoldings:
      'The asset list needs a holdings endpoint returning one aggregated row per asset, with current quantity, cost basis, market value, and return.',
    apiPlanningTrend:
      'Charts will need either a portfolio trend endpoint or per-asset trend data once we stop using mocked snapshots.',
    failedToLoad: 'Failed to load portfolio overview.',
  },
  'zh-TW': {
    title: '總覽',
    heroEyebrow: 'Trackvest',
    heroTitle: '投資首頁',
    heroDescription:
      '首頁第一版先變成投資整理後的駕駛艙：快速看到總報酬、辨認部位集中度，並決定下一個值得深入看的資產。',
    snapshotLabel: '目前快照',
    snapshotAsOf: '更新時間 {{date}}',
    snapshotLiveNotice: '目前顯示的是你現有帳戶可取得的最新投資快照。',
    mockDataNotice:
      '目前先用 mock portfolio snapshot 切版，等首頁 overview API 定案後，再把這些卡片與圖表接成真資料。',
    scopeEyebrow: '規劃方向',
    scopeTitle: '先做資產層級，再往下鑽交易細節',
    scopeDescription:
      '首頁目前以資產整理後的狀態為主，而不是直接攤開交易流水。等後端 overview API 補齊後，這些 cards 與 charts 就能從 mock data 換成真實快照。',
    displayPreferencesTitle: '顯示偏好基礎',
    displayPreferencesDescription:
      '這些偏好現在已經接到 portfolio API contract，首頁可以依需求請求偏好的顯示幣別。',
    displayCurrencyModeLabel: '顯示模式',
    displayCurrencyModeOriginal: '投組預設',
    displayCurrencyModeBase: '偏好基準',
    preferredBaseCurrencyLabel: '偏好基準幣別',
    displayModeStatusLabel: '目前顯示狀態',
    displayModeStatusOriginal:
      '目前數字是依照投組預設顯示幣別 {{currency}} 呈現。',
    displayModeStatusBaseAligned:
      '偏好基準幣別目前設為 {{currency}}，而目前回傳的 portfolio snapshot 也已經正規化到這個幣別。',
    displayModeStatusBasePending:
      '偏好基準幣別目前設為 {{currency}}，但目前回傳的資料仍正規化到 {{currentCurrency}}。',
    fxRateTitle: '今日匯率參考',
    fxRateLoading: '正在載入今日 USD/TWD 匯率...',
    fxRateUnavailable: '目前無法取得匯率資訊。',
    fxRatePair: '{{base}} / {{quote}}',
    fxRateMeta: '參考日期 {{date}} · 來源 {{provider}}',
    assetCount: '追蹤資產數',
    investedCapital: '總投入成本',
    investedCapitalHint: '目前 portfolio snapshot 對應的總成本基礎。',
    marketValue: '目前總市值',
    marketValueHint: '依目前首頁可見的最新價格快照估算出的總市值。',
    totalPnl: '總損益',
    totalReturn: '總報酬率',
    pnlDescription: '以目前整體市值減去總投入成本得到的損益。',
    returnDescription: '根據同一份 portfolio snapshot 算出的整體報酬率。',
    allocationTitle: '資產配置',
    allocationDescription:
      '先看整體部位集中在哪裡，再決定要往哪個資產鑽查。',
    allocationDescriptionAssetClass:
      '預設先看底層資產類別，這樣配置分析和之後的再平衡判斷會比較準。',
    allocationDescriptionType:
      '如果想看產品包裝形式，再切到 Type 視角查看股票、ETF、現金等分布。',
    allocationViewLabel: '配置視角',
    allocationViewAssetClass: 'Asset Class',
    allocationViewType: 'Type',
    assetClassLabel: '資產類別',
    assetClassEquity: '股票',
    assetClassBond: '債券',
    assetClassCash: '現金',
    assetClassCrypto: '加密資產',
    assetClassPreciousMetal: '貴金屬',
    rebalanceEyebrow: '再平衡',
    rebalanceTitle: '把投組慢慢拉回目標配置',
    rebalanceDescription:
      '直接看目前股債比和目標差多少，再決定這一輪要補多少。',
    rebalanceTargetLabel: '目標配置',
    rebalanceTargetValue: '80% 股票 / 20% 債券',
    rebalanceTargetAdjustLabel: '調整目標',
    rebalanceTargetAdjustHint:
      '第一版先用單一股票比例滑桿，債券比例自動補足剩餘，先把再平衡流程驗證順再說。',
    rebalanceTargetLiveLabel: '目前輸入',
    rebalanceTargetEquityLabel: '股票目標比例',
    rebalanceLockEditLabel: '解鎖目標調整',
    rebalanceLockApplyLabel: '鎖定目標並套用變更',
    rebalanceTargetTowardBond: '更多債券',
    rebalanceTargetTowardEquity: '更多股票',
    rebalanceCurrentLabel: '目前：',
    rebalanceGapLabel: '差距：',
    rebalanceBuyMoreLabel: '建議再買：',
    rebalanceAtOrAboveTarget: '已達或高於目標',
    rebalanceActionTitle: '預估還需補多少',
    rebalanceActionDescription:
      '大約再買 {{amount}}，就能把投組往目前的目標配置拉回去。',
    rebalanceNoActionNeeded:
      '目前股票與債券的配置已經很接近目標比例。',
    rebalanceSuggestionQuantity: '大約再買 {{quantity}} 股',
    rebalanceSuggestionQuantityInputLabel: '{{symbol}} 建議購買數量',
    rebalanceSuggestionPrice: '最新價格 {{price}}',
    rebalanceSuggestionAsset: '資產',
    rebalanceSuggestionPriceLabel: '價格',
    rebalanceSuggestionQuantityLabel: '數量',
    rebalanceSuggestionAmountLabel: '總額',
    rebalanceFootnoteLabel: '計算前提',
    rebalanceDraftSummaryLabel: '你的調整草稿',
    rebalanceDraftSummaryTotal: '小計 {{amount}}',
    rebalanceDraftSummaryMix: '預估配置 {{equity}} 股票 / {{bond}} 債券',
    rebalanceDraftSummaryShift: '股票比重變化 {{shift}}',
    rebalanceFootnote:
      '第一版只先看股票與債券這兩個 asset class。更細的具體資產建議，之後再把再平衡流程往下擴充。',
    rebalanceEmptyState:
      '等投組累積足夠的 asset class 資料後，這裡就會顯示再平衡建議。',
    performanceTitle: '各資產損益',
    performanceDescription:
      '快速辨認誰在貢獻績效、誰正在拖累整體表現。',
    trendTitle: '投資組合趨勢',
    trendDescription:
      '先用一張趨勢圖比較總投入成本與目前總市值的變化，幫助首頁建立整體節奏。',
    assetCountBadge_one: '已整理 {{count}} 個資產',
    assetCountBadge_other: '已整理 {{count}} 個資產',
    holdingsTitle: '持倉總覽',
    holdingsDescription:
      '每一列代表一個資產，不是一筆交易。點擊列後可查看該資產目前的整理狀態。',
    emptyTitle: '目前還沒有持倉',
    emptyDescription:
      '先新增一筆買入交易，首頁才會開始整理你的投資持倉與報酬表現。',
    asset: '資產',
    weight: '占比',
    quantity: '持有數量',
    avgCost: '平均成本',
    costBasis: '成本基礎',
    latestPrice: '最新價格',
    latestPriceHint: '目前顯示的是後端 price snapshot 回傳的資產報價幣別。',
    investedAmount: '投入金額',
    lastActivity: '最近動作',
    noRecentActivity: '目前還沒有最近動作',
    selectedTrendTitle: '選取資產趨勢',
    selectedTrendDescription:
      '目前先用簡化趨勢圖展示選取資產的狀態，之後可以替換成後端提供的 holdings trend 資料。',
    asset2330Note:
      '台股核心部位，也是目前整體投資組合中占比最高的一檔資產。',
    asset2330Activity: '最近賣出 10 股，稍微降低集中度',
    asset0050Note:
      '作為較穩定的台股 ETF 累積部位，用來平衡單一股票集中風險。',
    asset0050Activity: '持續每月定期投入',
    assetAaplNote:
      '目前占比較小的美股成長部位，主要先保留在首頁整理版型中的多市場情境。',
    assetAaplActivity: '這個月沒有新增交易',
    assetBtcNote:
      '波動最高，但目前也是整體報酬的重要貢獻來源，同時帶來較高集中風險。',
    assetBtcActivity: '最近一次買進約在三週前',
    assetQqqNote:
      '美股成長 ETF 部位目前刻意維持較小，先保留彈性等首頁與 API 結構穩定。',
    assetQqqActivity: '近期以持有為主',
    apiPlanningTitle: '後端 API 規劃',
    apiPlanningSummary:
      '上方摘要卡片需要一個 snapshot endpoint，回傳總投入、總市值、總損益與總報酬率。',
    apiPlanningHoldings:
      '資產列表需要一個 holdings endpoint，以資產為單位回傳目前數量、成本、市值與報酬。',
    apiPlanningTrend:
      '圖表之後會需要 portfolio trend 或 per-asset trend endpoint，才能把 mock snapshot 換成真資料。',
    failedToLoad: '投資首頁載入失敗。',
  },
} as const
