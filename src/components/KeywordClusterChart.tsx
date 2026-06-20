import React, { useState, useMemo } from "react";
import { MessageSquare, Target, TrendingUp, Search, RefreshCw, ChevronRight, Sparkles, Activity, ShieldAlert, Zap, Globe, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Definitions of Cluster categories according to standard small business concerns
type ClusterKey = "FINANCE" | "HR" | "MARKET" | "MARKETING" | "GOV" | "TECH" | "OPERATION";

interface ClusterInfo {
  key: ClusterKey;
  name: string;
  color: string;      // Tailwind fill color
  stroke: string;     // Tailwind border stroke
  lightBg: string;    // Tailwind background
  text: string;       // Tailwind text
  cx: number;         // Centroid X (0 - 100)
  cy: number;         // Centroid Y (0 - 100)
  description: string;
}

const CLUSTERS: Record<ClusterKey, ClusterInfo> = {
  FINANCE: {
    key: "FINANCE",
    name: "비용 부담 & 고정비 리스크",
    color: "fill-rose-500 bg-rose-500",
    stroke: "stroke-rose-500 border-rose-200",
    lightBg: "bg-rose-50",
    text: "text-rose-700",
    cx: 28,
    cy: 78,
    description: "원자재 폭등, 임대료, 가맹 수수료 및 가계 대출 부담 등 직접 지출 압박을 유발하는 고민군입니다."
  },
  HR: {
    key: "HR",
    name: "인력 관리 & 인건비 부담",
    color: "fill-amber-500 bg-amber-500",
    stroke: "stroke-amber-500 border-amber-200",
    lightBg: "bg-amber-50",
    text: "text-amber-700",
    cx: 78,
    cy: 74,
    description: "인력 구인난, 잦은 이선 이탈, 교육 지체, 고율 주휴수당 등 인력 운영 상의 리더십 고민군입니다."
  },
  MARKET: {
    key: "MARKET",
    name: "경쟁 심화 & 골목 상권 위축",
    color: "fill-purple-500 bg-purple-500",
    stroke: "stroke-purple-500 border-purple-200",
    lightBg: "bg-purple-50",
    text: "text-purple-700",
    cx: 26,
    cy: 28,
    description: "동종 업종 포화, 초대형 프랜차이즈 직영 침공, 주변 배후인구 축소 등 외부 시장 위기 요인입니다."
  },
  MARKETING: {
    key: "MARKETING",
    name: "마케팅 부재 & 판로 디지털화",
    color: "fill-indigo-500 bg-indigo-500",
    stroke: "stroke-indigo-500 border-indigo-200",
    lightBg: "bg-indigo-50",
    text: "text-indigo-700",
    cx: 76,
    cy: 32,
    description: "네이버 스마트플레이스 SEO, 비타겟 홍보, 소셜 매체 채널 관리 등 고객 확보 채널의 공백 요인입니다."
  },
  GOV: {
    key: "GOV",
    name: "국가 지원금 & 정책 리스크",
    color: "fill-emerald-500 bg-emerald-500",
    stroke: "stroke-emerald-500 border-emerald-200",
    lightBg: "bg-emerald-50",
    text: "text-emerald-700",
    cx: 48,
    cy: 54,
    description: "소상공인 지원 정책자금 신청 배정, 이자보전 상환유예, 저금리 대수환 등 제도적 탈출 구호군입니다."
  },
  TECH: {
    key: "TECH",
    name: "스마트 자동화 기술 전환",
    color: "fill-cyan-500 bg-cyan-500",
    stroke: "stroke-cyan-500 border-cyan-200",
    lightBg: "bg-cyan-50",
    text: "text-cyan-700",
    cx: 52,
    cy: 18,
    description: "테이블오더, 셀프 키오스크, 디지털 주방 기기 및 포스 통합 데이터 분석 등 기술 활용 기회군입니다."
  },
  OPERATION: {
    key: "OPERATION",
    name: "매장 내실 운영 & 기본 체질 리스크",
    color: "fill-slate-500 bg-slate-500",
    stroke: "stroke-slate-500 border-slate-200",
    lightBg: "bg-slate-50",
    text: "text-slate-700",
    cx: 16,
    cy: 52,
    description: "비효율적인 업무 정밀도, 매장 노화, 메뉴 가짓수 혼선 등 내부 관리상의 만성 비효율 고민군입니다."
  }
};

// Relation Links definition rules to showcase interdependencies
interface KeywordLink {
  fromIndex: number;
  toIndex: number;
  relationType: "synergy" | "conflict" | "remedy";
  description: string;
}

interface KeywordClusterChartProps {
  keywords?: string[];
}

export const KeywordClusterChart: React.FC<KeywordClusterChartProps> = ({ keywords = [] }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeClusterFilter, setActiveClusterFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [jitterSeed, setJitterSeed] = useState<number>(0);
  const [showDirectRelations, setShowDirectRelations] = useState<boolean>(true);
  const [showCentroidGrid, setShowCentroidGrid] = useState<boolean>(true);

  // Safety fallback keywords if nothing is provided
  const targetKeywords = useMemo(() => {
    if (keywords && keywords.length > 0) {
      return keywords;
    }
    return [
      "원단가 폭등", 
      "구인난 해소", 
      "프랜차이즈 공세", 
      "온라인 마케팅 부재", 
      "네이버 스마트플레이스", 
      "정부 정책자금", 
      "스마트 테이블오더"
    ];
  }, [keywords]);

  // Map Keyword content to a specific Cluster
  const getClusterForKeyword = (keyword: string): ClusterInfo => {
    const kw = keyword.toLowerCase().trim();
    if (kw.includes("원단가") || kw.includes("비용") || kw.includes("상승") || kw.includes("임대") || kw.includes("고정비") || kw.includes("단가") || kw.includes("폭등") || kw.includes("임대료") || kw.includes("수수료")) {
      if (kw.includes("정부") || kw.includes("정책") || kw.includes("자금")) {
        return CLUSTERS.GOV;
      }
      return CLUSTERS.FINANCE;
    }
    if (kw.includes("구인") || kw.includes("인력") || kw.includes("직원") || kw.includes("알바") || kw.includes("인건비") || kw.includes("구인난") || kw.includes("고용")) {
      return CLUSTERS.HR;
    }
    if (kw.includes("마케팅") || kw.includes("홍보") || kw.includes("광고") || kw.includes("인스타") || kw.includes("플레이스") || kw.includes("네이버") || kw.includes("온라인")) {
      return CLUSTERS.MARKETING;
    }
    if (kw.includes("정책") || kw.includes("자금") || kw.includes("지원") || kw.includes("정부") || kw.includes("대출") || kw.includes("융자")) {
      return CLUSTERS.GOV;
    }
    if (kw.includes("스마트") || kw.includes("오더") || kw.includes("포스") || kw.includes("디지털") || kw.includes("키오스크") || kw.includes("무인")) {
      return CLUSTERS.TECH;
    }
    if (kw.includes("프랜") || kw.includes("경쟁") || kw.includes("대형") || kw.includes("점포") || kw.includes("이탈")) {
      return CLUSTERS.MARKET;
    }
    return CLUSTERS.OPERATION;
  };

  // Generate customized, deep AI advice/insight descriptions for keywords
  const getInsightForKeyword = (keyword: string, clusterKey: ClusterKey): string => {
    const kw = keyword.trim();
    if (kw.includes("원단가")) {
      return "지정학적 리스크 및 수입 원자재 공급 불안정으로 재료비율이 임계점(35%선)을 상회하고 있습니다. 일시적 수혈보다 부자재 재고 선확보와 원가 연계형 이자보전 상환 정책 가입 트랙이 직결 처방책입니다.";
    }
    if (kw.includes("구인난")) {
      return "인근 소형 점포들의 난립과 구직 활동 위축으로 구인 매칭 비용이 계속 늘어납니다. 매칭 중심의 단기 고용보다는 하드웨어 테이블오더 기기를 사용해 요구 아르바이트 공수를 40% 이상 하방 조치해야 합니다.";
    }
    if (kw.includes("프랜차이즈")) {
      return "거대 자본의 균일한 공세에 직격탄을 입고 있습니다. 획일화된 구성을 탈피하고 단골 사장님 서비스 및 특화 앵커 메뉴를 구축하는 한편 지역 제휴 스마트플레이스 알림을 도입해 1:1 방벽망을 쳐야 합니다.";
    }
    if (kw.includes("마케팅")) {
      return "현재 온라인 상 점포의 간판조차 세우지 않은 조용한 상태입니다. 오프라인 단골 유입은 고령화로 둔화되므로 네이버 스마트플레이스 최적화와 지역 모바일 리뷰 순환 시스템 정비를 서둘러 개시해야 합니다.";
    }
    if (kw.includes("스마트플레이스")) {
      return "네이버 검색 최적화(SEO) 및 대표 메뉴 사진 재촬영이 미비해 월 1,000건 이상의 잠재 로컬 검색 트래픽을 경쟁사에 빼앗기는 원인입니다. QR 리뷰 할인 도입을 연쇄 적용해 실고객 클릭률을 배가하십시오.";
    }
    if (kw.includes("정책자금")) {
      return "정부의 대표 소상공인시장진흥공단 직접 대출 및 3%대 지역 신용보증 특례 융자가 활성화 가능군에 안착해 있습니다. 단기 높은 원자비용을 완화하기 위한 정책 극복 최우선 구조선입니다.";
    }
    if (kw.includes("테이블오더")) {
      return "홀 직원 동선을 0으로 압축하여 피크타임 소통 혼선을 원천 방지하는 2026 핵심 디지털 무기입니다. 국가 소상공인 지능 기기 렌탈 무상 연계 지원을 활용하면 비용 발생 없이 개통할 수 있습니다.";
    }

    // Generic fallbacks mapped to cluster categories to maintain maximum utility for unexpected dynamic keywords
    switch(clusterKey) {
      case "FINANCE": 
        return `'${kw}' 항목은 점포의 영업순마진율(Net Margin) 하락을 이끄는 지출 암초입니다. 원가 변동 모니터링 체계를 확립하고, 하반기 불필요한 장기 리스 및 구독 비용을 일시 유예하는 방안이 추천됩니다.`;
      case "HR": 
        return `'${kw}' 갈등은 사장님의 개인 수동 노동 시간을 증가시켜 경영 번아웃을 부르는 방아쇠입니다. 운영 편의 기술 기기를 전방 배치하고 주요 직무 동선을 단순화하는 표준 매뉴얼을 수립해야 합니다.`;
      case "MARKET": 
        return `'${kw}' 현상은 매장이 직면한 주변 업종 쏠림 영향입니다. 가성비 출혈 경쟁보다는 '대체 불가능한 시그니처 경험(USP)'을 특수 개발하여 단골들의 지속적인 방문 관성을 회복해야 합니다.`;
      case "MARKETING": 
        return `'${kw}' 과제는 타깃 고객 침투 지수를 개선해 단기 매출 수직 기동을 가능케 할 치트키입니다. 상권 중심 반경 3km 내 유관 타겟을 집중 타격하는 신진 SNS 마케팅 기법을 정식 건의합시다.`;
      case "GOV": 
        return `'${kw}' 제도는 금리 압박이 가중되는 시즌에 반드시 집행해야 하는 안심 가두리 채널입니다. 지자체 상생 기획 및 공단 마감 시한을 달력에 실시간 기재하여 신청 서류 작업을 예비해 두는 것이 이롭습니다.`;
      case "TECH": 
        return `'${kw}' 전환은 노동력 가치를 업그레이드하고 주문 실수를 소수점 이하로 축소시킬 대안 테크놀로지입니다. 기기 대수가 늘더라도 정부 지원 인프라를 연결하면 실투자 비용을 70% 가량 상계 가능합니다.`;
      default: 
        return `'${kw}'은 소상공인의 생존 연속성을 고도화하고 경영 구조적 병목 현상을 타개해야 할 핵심 극복 화두입니다. SWOT 매트릭스와 전력 로드맵을 참고하여 단계별 액션을 실행하십시오.`;
    }
  };

  // Convert array of string keywords into 2D node map with cluster positioning and specific coordinates
  const nodes = useMemo(() => {
    const nodesInClusterCount: Record<string, number> = {};

    return targetKeywords.map((kw, i) => {
      const cluster = getClusterForKeyword(kw);
      const count = nodesInClusterCount[cluster.key] || 0;
      nodesInClusterCount[cluster.key] = count + 1;

      // Deterministic angle & distance coordinates with subtle jitter offset option
      const angle = (count * Math.PI * 1.6) + (i * 0.15) + (jitterSeed * 0.08);
      const distance = count === 0 ? 0 : 8 + (count * 3); // Radial spread from centroid in percentages

      // Calculate coordinates with robust bounds checking (10 - 90 to prevent drawing overflow)
      let x = cluster.cx + Math.cos(angle) * distance;
      let y = cluster.cy + Math.sin(angle) * distance;

      x = Math.min(90, Math.max(10, x));
      y = Math.min(90, Math.max(10, y));

      const size = 12 + (kw.length * 1) + (count * 1.5);
      const insight = getInsightForKeyword(kw, cluster.key);

      return {
        id: `node-${i}`,
        originalIndex: i,
        label: kw,
        cluster: cluster.key,
        clusterInfo: cluster,
        x,
        y,
        size,
        insight,
        dangerScale: kw.includes("폭등") || kw.includes("부재") || kw.includes("공세") || kw.includes("난") ? "HIGH" : "MEDIUM"
      };
    });
  }, [targetKeywords, jitterSeed]);

  // Generate dynamic relations / connection lines based on keyword mapping rules
  const links = useMemo((): KeywordLink[] => {
    const validLinks: KeywordLink[] = [];

    // Find indices for common keywords to suggest strategic paths in Korean economy:
    // 1. Finance Spike (like 원단가 폭등) is remedied by Gov Support (정부 정책자금)
    const financeIdx = nodes.findIndex(n => n.label.includes("원단가") || n.cluster === "FINANCE");
    const govIdx = nodes.findIndex(n => n.label.includes("정책자금") || n.cluster === "GOV");
    if (financeIdx !== -1 && govIdx !== -1 && financeIdx !== govIdx) {
      validLinks.push({
        fromIndex: financeIdx,
        toIndex: govIdx,
        relationType: "remedy",
        description: "재무 비용 폭등은 정부 긴급 전용 저리 융자 및 금융 보전을 통해 리스크 완수 지원"
      });
    }

    // 2. HR Crisis (구인난 해소) is solved by Digital Automation (스마트 테이블오더)
    const hrIdx = nodes.findIndex(n => n.label.includes("구인난") || n.cluster === "HR");
    const techIdx = nodes.findIndex(n => n.label.includes("테이블오더") || n.cluster === "TECH");
    if (hrIdx !== -1 && techIdx !== -1 && hrIdx !== techIdx) {
      validLinks.push({
        fromIndex: hrIdx,
        toIndex: techIdx,
        relationType: "remedy",
        description: "만성 구인 고정 수고는 테이블 자립식 스마트 오더 디바이스 도입으로 완강한 노동대체 실현"
      });
    }

    // 3. Marketing lack (온라인 마케팅 부재) is solved by Naver Smart Place (네이버 스마트플레이스)
    const marketingIdx = nodes.findIndex(n => n.label.includes("마케팅") || n.label.includes("홍보") || (n.cluster === "MARKETING" && !n.label.includes("플레이스")));
    const placeIdx = nodes.findIndex(n => n.label.includes("플레이스") || n.label.includes("네이버"));
    if (marketingIdx !== -1 && placeIdx !== -1 && marketingIdx !== placeIdx) {
      validLinks.push({
        fromIndex: marketingIdx,
        toIndex: placeIdx,
        relationType: "synergy",
        description: "온라인 판로 부재 장벽은 스마트 플레이스 등록과 최적화 배치 선행으로 다각 시너지 격상"
      });
    }

    // 4. Franchise Invasion (프랜차이즈 공세) is mitigated by Place Marketing
    const marketInvasionIdx = nodes.findIndex(n => n.cluster === "MARKET" || n.label.includes("프랜차이즈"));
    if (marketInvasionIdx !== -1 && placeIdx !== -1 && marketInvasionIdx !== placeIdx) {
      validLinks.push({
        fromIndex: marketInvasionIdx,
        toIndex: placeIdx,
        relationType: "conflict",
        description: "대기업 침투 전략은 동네 스마트 지도 거점 브랜딩을 강화하여 영리한 우회 단골 수성"
      });
    }

    // If too few links generated, add a sequential tie just to show relationship matrix
    if (validLinks.length === 0 && nodes.length > 1) {
      validLinks.push({
        fromIndex: 0,
        toIndex: 1,
        relationType: "synergy",
        description: "고유 고민 요소간의 상호 긴급 유기성 연쇄 작용"
      });
    }

    return validLinks;
  }, [nodes]);

  // Handle setting a default node on mount if none is selected
  React.useEffect(() => {
    if (nodes.length > 0 && !selectedNodeId) {
      // Find highest urgency node or default to the first one
      const targetNode = nodes.find(n => n.label.includes("원단가") || n.label.includes("구인난")) || nodes[0];
      if (targetNode) {
        setSelectedNodeId(targetNode.id);
      }
    }
  }, [nodes, selectedNodeId]);

  // Filter nodes based on active cluster tab and search box queries
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      const matchCluster = activeClusterFilter === "ALL" || node.cluster === activeClusterFilter;
      const matchSearch = node.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          node.clusterInfo.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCluster && matchSearch;
    });
  }, [nodes, activeClusterFilter, searchQuery]);

  const selectedNode = useMemo(() => {
    return nodes.find(node => node.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  // Multiplier shake coordinates for cool micro interactive animations
  const handleJitter = () => {
    setJitterSeed(prev => prev + 1);
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-850 shadow-2xl overflow-hidden p-4 sm:p-6 space-y-6" id="keyword-cluster-chart-card">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="text-left">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                고민 토픽 관계망 2D 클러스터 분석 맵
                <span className="text-[10px] bg-gradient-to-r from-cyan-400 to-indigo-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Interactive 2D Cluster Map
                </span>
              </h3>
              <p className="text-[11.5px] text-slate-400 mt-0.5 font-medium">
                사장님의 상담 텍스트 맥락을 고해상도 다차원 분석하여 유사 고민군을 클러스터화하고, 각 과제간의 상호 작용과 상생 처방 연쇄 관계를 시각화한 2D 좌표지도입니다.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <button
            onClick={handleJitter}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border border-slate-700 shadow-sm cursor-pointer"
            title="고민 분포 좌표 소폭 변화 테스트"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>위치 다이นามิก 재배치</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch justify-between bg-slate-950/40 p-3 rounded-2xl border border-slate-800/40">
        
        {/* Cluster Tabs Group */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 lg:pb-0 scrollbar-none shrink-0" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setActiveClusterFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer border ${
              activeClusterFilter === "ALL"
                ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-950/50"
                : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
            }`}
          >
            전체 고민 ({nodes.length})
          </button>
          
          {(Object.values(CLUSTERS)).map((cls) => {
            const hasNodes = nodes.some(n => n.cluster === cls.key);
            if (!hasNodes) return null; // Only show active cluster categories present in standard data

            const countInCls = nodes.filter(n => n.cluster === cls.key).length;
            const isActive = activeClusterFilter === cls.key;

            return (
              <button
                key={cls.key}
                onClick={() => setActiveClusterFilter(cls.key)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all shrink-0 cursor-pointer border flex items-center gap-1.5 ${
                  isActive
                    ? `${cls.lightBg} ${cls.text} ${cls.stroke} shadow-sm shadow-black/30`
                    : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${cls.color}`} />
                <span>{cls.name.split(" ")[0]} ({countInCls})</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Interactive Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="고민 키워드 혹은 클러명 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-300 placeholder-slate-500 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Graph Canvas and Side Prescription Grid Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-[460px]">
        
        {/* Left Side: Dynamic Canvas Plot Stage */}
        <div className="xl:col-span-8 bg-slate-950 rounded-3xl border border-slate-850 p-3 relative flex flex-col justify-between overflow-hidden">
          
          {/* Axis Labels (Coordinate Meta Descriptions) */}
          <div className="absolute top-4 left-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none bg-slate-950/80 px-2 py-1 rounded border border-slate-900">
            ▲ 해결 시 비즈니스 마진·파급력 (HIGH IMPACT)
          </div>
          <div className="absolute top-4 right-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none bg-slate-950/80 px-2 py-1 rounded border border-slate-900">
            실행 복잡도 높음 / 장기적 조절 (HIGH EFFORT) ▶
          </div>
          <div className="absolute bottom-4 left-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none bg-slate-950/80 px-2 py-1 rounded border border-slate-900">
            ▼ 상황 연성 완화 (TACTICAL / LOW IMPACT)
          </div>
          <div className="absolute bottom-4 right-4 text-[10px] text-neutral-500 font-bold uppercase tracking-wider select-none bg-slate-950/80 px-2 py-1 rounded border border-slate-900">
            ◀ 즉각 단기 대응 가능 (LOW EFFORT)
          </div>

          {/* Toggle Layers Legend */}
          <div className="absolute bottom-16 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl shadow-lg z-10 text-[9.5px] font-black tracking-wider uppercase select-none">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
              <input 
                type="checkbox" 
                checked={showDirectRelations} 
                onChange={(e) => setShowDirectRelations(e.target.checked)}
                className="rounded text-indigo-500 bg-slate-900 border-slate-800 focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
              />
              <span>상호 관계망선 표시</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white transition-colors">
              <input 
                type="checkbox" 
                checked={showCentroidGrid} 
                onChange={(e) => setShowCentroidGrid(e.target.checked)}
                className="rounded text-indigo-500 bg-slate-900 border-slate-800 focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
              />
              <span>클러스터 하향 가이드</span>
            </label>
          </div>

          {/* Graph Sandbox Container */}
          <div className="w-full h-[360px] sm:h-[400px] relative">
            
            {/* Grid Coordinates Lines SVG Overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              
              {/* Central Grid Crosshair Axes */}
              <line x1="50" y1="0" x2="50" y2="100" stroke="#101b35" strokeWidth="0.4" strokeDasharray="3 3" />
              <line x1="0" y1="50" x2="100" y2="50" stroke="#101b35" strokeWidth="0.4" strokeDasharray="3 3" />

              {/* Cluster Centroid Hub Rings */}
              {showCentroidGrid && Object.values(CLUSTERS).map((cluster) => {
                const isActivated = nodes.some(n => n.cluster === cluster.key);
                if (!isActivated) return null;
                const isFilterMatched = activeClusterFilter === "ALL" || activeClusterFilter === cluster.key;

                return (
                  <g key={cluster.key}>
                    {/* Centroid hub core circle */}
                    <circle
                      cx={cluster.cx}
                      cy={100 - cluster.cy} // Invert Y coordinate for SVG standard top-left projection
                      r="1.8"
                      className={`${cluster.color} opacity-40`}
                    />
                    <circle
                      cx={cluster.cx}
                      cy={100 - cluster.cy}
                      r="6"
                      className={`fill-none stroke-slate-800`}
                      strokeWidth="0.1"
                      strokeDasharray="2 2"
                      opacity={isFilterMatched ? 0.7 : 0.15}
                    />
                    {/* Centroid Group Name Floating Label */}
                    <text
                      x={cluster.cx}
                      y={100 - cluster.cy - 3}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="2.1"
                      fontWeight="bold"
                      opacity={isFilterMatched ? 0.8 : 0.15}
                    >
                      {cluster.name.split(" ")[0]} Hub
                    </text>
                  </g>
                );
              })}

              {/* Dotted centroid alignment guides for filtered nodes */}
              {showCentroidGrid && filteredNodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const strokeColor = isSelected ? "#6366f1" : "#1e293b";
                const strokeOpacity = isSelected ? 0.8 : 0.25;

                return (
                  <g key={`guide-${node.id}`}>
                    <line 
                      x1={node.x} 
                      y1={100 - node.y} 
                      x2={node.clusterInfo.cx} 
                      y2={100 - node.clusterInfo.cy} 
                      stroke={strokeColor} 
                      strokeWidth={isSelected ? 0.25 : 0.1} 
                      strokeDasharray="2 2"
                      opacity={strokeOpacity}
                    />
                  </g>
                );
              })}

              {/* Relation Link Matrix connectors */}
              {showDirectRelations && links.map((link, lidx) => {
                const fromNode = nodes[link.fromIndex];
                const toNode = nodes[link.toIndex];
                
                if (!fromNode || !toNode) return null;

                const isFromFiltered = filteredNodes.some(n => n.id === fromNode.id);
                const isToFiltered = filteredNodes.some(n => n.id === toNode.id);
                
                // Dim down links if not in the active filtered set
                const isLinkActive = isFromFiltered && isToFiltered;
                const isSelectedFocus = selectedNodeId === fromNode.id || selectedNodeId === toNode.id;

                let strokeColor = "#334155"; // Gray generic synergy link
                let strokeWidth = 0.35;
                let dashArray = "none";

                if (link.relationType === "remedy") {
                  strokeColor = "#10b981"; // Emerald green for resolving remedy path
                  strokeWidth = isSelectedFocus ? 0.75 : 0.45;
                } else if (link.relationType === "conflict") {
                  strokeColor = "#f43f5e"; // Rose red for warning/clashing points
                  strokeWidth = isSelectedFocus ? 0.75 : 0.45;
                  dashArray = "1 1.5";
                } else if (link.relationType === "synergy") {
                  strokeColor = "#6366f1"; // Indigo/Purple for positive correlation
                  strokeWidth = isSelectedFocus ? 0.75 : 0.45;
                }

                return (
                  <g key={`link-${lidx}`} opacity={isLinkActive ? (isSelectedFocus ? 1.0 : 0.5) : 0.08}>
                    {/* Glow backdrop line for focus */}
                    {isSelectedFocus && (
                      <line
                        x1={fromNode.x}
                        y1={100 - fromNode.y}
                        x2={toNode.x}
                        y2={100 - toNode.y}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth * 3.5}
                        opacity="0.15"
                        strokeLinecap="round"
                      />
                    )}
                    {/* Primary link line */}
                    <line
                      x1={fromNode.x}
                      y1={100 - fromNode.y}
                      x2={toNode.x}
                      y2={100 - toNode.y}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={dashArray}
                      strokeLinecap="round"
                    />
                    
                    {/* Animated transfer energy pulse dot along remedy or synergy connector paths */}
                    {isLinkActive && (
                      <circle r="0.75" fill={strokeColor} className="animate-ping">
                        <animateMotion 
                          path={`M ${fromNode.x} ${100 - fromNode.y} L ${toNode.x} ${100 - toNode.y}`} 
                          dur="3.8s" 
                          repeatCount="indefinite" 
                        />
                      </circle>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Render Nodes as beautifully responsive absolutely-positioned HTML items */}
            {filteredNodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isSearchMatch = searchQuery && node.label.toLowerCase().includes(searchQuery.toLowerCase());
              
              return (
                <div
                  key={node.id}
                  className="absolute"
                  style={{
                    left: `${node.x}%`,
                    top: `${100 - node.y}%`,
                    transform: "translate(-50%, -50%)",
                    zIndex: isSelected ? 30 : 20,
                  }}
                  id={`node-element-${node.id}`}
                >
                  <button
                    onClick={() => setSelectedNodeId(node.id)}
                    className="group relative focus:outline-none cursor-pointer"
                  >
                    {/* Ring Outer Ripple Backdrop */}
                    <div 
                      className={`absolute inset-full rounded-full -translate-x-1/2 -translate-y-1/2 transition-all duration-550 ${
                        isSelected 
                          ? "ring-10 ring-indigo-500/15 scale-130 opacity-100" 
                          : isSearchMatch
                          ? "ring-6 ring-amber-400/20 scale-110 opacity-100"
                          : "ring-0 ring-transparent scale-0 opacity-0"
                      }`}
                      style={{
                        width: `${node.size * 2.8}px`,
                        height: `${node.size * 2.8}px`,
                      }}
                    />

                    {/* Outer Glowing Element Circle */}
                    <div
                      className={`rounded-full transition-all duration-300 flex items-center justify-center border shadow-xl ${
                        isSelected
                          ? `text-white scale-110 ${node.clusterInfo.color} ring-4 ring-offset-2 ring-offset-slate-950 ring-indigo-500`
                          : isSearchMatch
                          ? `text-slate-950 bg-amber-400 scale-105 border-amber-300 ring-4 ring-amber-500/40`
                          : `${node.clusterInfo.lightBg} ${node.clusterInfo.text} ${node.clusterInfo.stroke} hover:scale-105 hover:bg-white hover:shadow-black/60`
                      }`}
                      style={{
                        width: `${node.size * 2.3}px`,
                        height: `${node.size * 2.3}px`,
                      }}
                    >
                      <div className="flex flex-col items-center justify-center p-1.5 text-center">
                        {/* Short Hashtag label inside node */}
                        <span className={`font-black tracking-tighter leading-none select-none text-[9.5px]`}>
                          #{node.label.replace(/\s+/g, "")}
                        </span>
                      </div>

                      {/* Small badge representing urgency danger scale */}
                      {node.dangerScale === "HIGH" && !isSelected && (
                        <span className="absolute -top-1.5 -right-1 w-3.5 h-3.5 bg-rose-600 rounded-full flex items-center justify-center text-[8px] font-black text-white hover:scale-110 shadow-md">
                          !
                        </span>
                      )}
                    </div>

                    {/* Small Mini Tooltip bubble on Hover */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 bg-slate-900 border border-slate-700 text-white text-[9.5px] font-bold px-2 py-1 rounded shadow-xl whitespace-nowrap pointer-events-none transition-opacity z-50">
                      {node.clusterInfo.name.split(" ")[0]} | 좌표: ({Math.round(node.x)}, {Math.round(node.y)})
                    </div>
                  </button>
                </div>
              );
            })}

            {/* Empty view search filter backup notifications */}
            {filteredNodes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-500 space-y-2">
                <ShieldAlert className="w-12 h-12 text-slate-600 animate-bounce" />
                <p className="text-xs font-black">선택한 필터 조건 및 검색어를 만족하는 고민 노드가 존재하지 않습니다.</p>
                <button
                  onClick={() => { setActiveClusterFilter("ALL"); setSearchQuery(""); }}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-bold transition-all border border-slate-700 mt-2"
                >
                  필터 초기화
                </button>
              </div>
            )}
          </div>

          {/* Bottom Sub-Legend Indicator */}
          <div className="border-t border-slate-900/60 pt-3 flex flex-wrap items-center justify-between gap-4 text-[10.5px] text-slate-400 font-semibold px-2">
            <span className="flex items-center gap-1">
              💡 <span className="text-white font-extrabold">조견 팁:</span> 점포 고민들 중 <b className="text-indigo-400">상위(Y축 높음)</b>에 있을수록 해결 시 매출 향상 및 안정이 즉각 입증될 특효 고민군입니다.
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> 시너지(연계성)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 처방(해결경로)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> 환경위기(대응요함)
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Active Selection deep prescription detailed report panel */}
        <div className="xl:col-span-4 flex flex-col justify-between space-y-4">
          
          <AnimatePresence mode="wait">
            {selectedNode ? (
              <motion.div
                key={selectedNode.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="bg-slate-950 rounded-3xl border border-slate-850 p-5 flex-1 flex flex-col justify-between text-left space-y-5"
              >
                {/* Specific Cluster Box Header */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 ${selectedNode.clusterInfo.lightBg} ${selectedNode.clusterInfo.text} ${selectedNode.clusterInfo.stroke} border rounded-full text-[10.5px] font-black`}>
                      {selectedNode.clusterInfo.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">
                      좌표: X={Math.round(selectedNode.x)}, Y={Math.round(selectedNode.y)}
                    </span>
                  </div>

                  {/* Node Title Header */}
                  <div>
                    <h4 className="text-lg font-black text-white flex items-center gap-2">
                      <span className="text-indigo-400">#</span>
                      {selectedNode.label}
                    </h4>
                    <p className="text-[11.5px] text-slate-400 mt-2 font-medium leading-relaxed">
                      {selectedNode.clusterInfo.description}
                    </p>
                  </div>

                  {/* AI Diagnosis Insights block */}
                  <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl relative overflow-hidden space-y-2">
                    <div className="absolute top-0 right-0 p-2 bg-indigo-500/5 text-indigo-400 rounded-bl-xl border-l border-b border-indigo-500/10">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "12s" }} />
                    </div>
                    
                    <span className="text-[10px] text-cyan-400 font-black tracking-wider uppercase block">
                      ■ AI 맞춤 솔루션 긴급 처방전
                    </span>
                    
                    <p className="text-xs text-slate-200 leading-relaxed font-medium">
                      {selectedNode.insight}
                    </p>
                  </div>

                  {/* Interdependency list mappings */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                      ■ 연관 토픽 상호관계 연결 구조 ({links.filter(l => l.fromIndex === selectedNode.originalIndex || l.toIndex === selectedNode.originalIndex).length || 0})
                    </span>
                    
                    <div className="space-y-2 max-h-[140px] overflow-y-auto scrollbar-thin pr-1">
                      {links
                        .filter(l => l.fromIndex === selectedNode.originalIndex || l.toIndex === selectedNode.originalIndex)
                        .map((link, lidx) => {
                          const otherNode = nodes[lidx === 0 || link.fromIndex === selectedNode.originalIndex ? link.toIndex : link.fromIndex];
                          if (!otherNode) return null;
                          
                          let badgeBg = "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
                          let label = "연계";
                          if (link.relationType === "remedy") {
                            badgeBg = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                            label = "처방";
                          } else if (link.relationType === "conflict") {
                            badgeBg = "bg-rose-500/10 text-rose-400 border-rose-500/20";
                            label = "위험";
                          }

                          return (
                            <div key={`side-link-${lidx}`} className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-850 hover:bg-slate-900 transition-colors flex items-start gap-2.5 text-xs">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-black border uppercase shrink-0 ${badgeBg}`}>
                                {label}
                              </span>
                              <div className="text-left">
                                <p className="font-extrabold text-white text-[11.5px]">#{otherNode.label.replace(/\s+/g, "")}</p>
                                <p className="text-[10.5px] text-slate-400 mt-1 font-medium leading-relaxed leading-snug">{link.description}</p>
                              </div>
                            </div>
                          );
                        })}

                      {links.filter(l => l.fromIndex === selectedNode.originalIndex || l.toIndex === selectedNode.originalIndex).length === 0 && (
                        <p className="text-[11px] text-slate-500 italic font-semibold">이 고민은 독립 항목으로 하단 종합 맞춤형 컨설팅 로드맵의 기초 고정 수고 지표로 전면 해결 처리됩니다.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Trigger Scroll action */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      // Automatically search for relevant section and scroll to it smoothly
                      let sectionId = "consultation-diagnosis-solutions-container";
                      if (selectedNode.cluster === "FINANCE" || selectedNode.cluster === "GOV") {
                        sectionId = "financial-support-roadmap-banner-container"; // search scroll to financial cards
                      } else if (selectedNode.cluster === "MARKETING") {
                        sectionId = "marketing-roadmap-solutions-container";
                      }
                      
                      const targetEl = document.getElementById(sectionId) || document.getElementById("complete-consulting-report-wrapper");
                      if (targetEl) {
                        targetEl.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-[11px] font-extrabold transition-all border border-slate-800 flex items-center justify-center gap-1 group shadow-lg cursor-pointer"
                  >
                    <span>이 고민에 대한 종합 AI 처방/로드맵 상세 보기</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="bg-slate-950 rounded-3xl border border-slate-850 p-6 flex-1 flex flex-col items-center justify-center text-center text-slate-500 space-y-2">
                <Cpu className="w-10 h-10 text-slate-700 animate-spin" style={{ animationDuration: "15s" }} />
                <p className="text-xs font-black">2D 좌표상의 특정 고민 노드를 탭하시면 맞춤 처방 분석 결과와 상호 작용 구조도가 이곳에 즉시 로드됩니다.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
