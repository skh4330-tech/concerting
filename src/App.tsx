import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  MessageSquare,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  TrendingDown,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Building2,
  MapPin,
  Calendar,
  Layers,
  HelpCircle,
  TrendingUp,
  Download,
  Copy,
  Plus,
  Send,
  Loader,
  Search,
  CheckSquare,
  Square,
  Sparkles,
  Clock,
  History,
  Trash2,
  ArrowLeftRight,
  Scale,
  Bell,
  X,
  Key,
  Lock,
  Unlock,
  Check
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { ClientProfile, Message, ConsultingReport } from "./types";
import { SAMPLE_CLIENTS, DEFAULT_REPORT } from "./data";
import { CompetitorHeatmap } from "./components/CompetitorHeatmap";
import { KeywordClusterChart } from "./components/KeywordClusterChart";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export default function App() {
  // Navigation & Primary UI Modes
  const [activeTab, setActiveTab] = useState<"intro" | "A" | "B">("intro");
  const [reportGenerated, setReportGenerated] = useState<boolean>(false);
  const [generatingReport, setGeneratingReport] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Gemini API Key Guest State
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => localStorage.getItem("custom_gemini_api_key") || "");
  const [isKeyValidated, setIsKeyValidated] = useState<boolean>(() => localStorage.getItem("is_gemini_key_validated") === "true");
  const [isValidatingKey, setIsValidatingKey] = useState<boolean>(false);
  const [keyValidationError, setKeyValidationError] = useState<string>("");
  const [showKeyInput, setShowKeyInput] = useState<boolean>(() => !localStorage.getItem("custom_gemini_api_key"));
  const [hasServerKey, setHasServerKey] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(true);

  // Check if server-side key is active on app mount
  useEffect(() => {
    async function checkServerKey() {
      try {
        const response = await fetch("/api/config-status");
        if (response.ok) {
          const data = await response.json();
          setHasServerKey(!!data.hasServerKey);
        }
      } catch (err) {
        console.error("Failed to check server key configuration:", err);
      }
    }
    checkServerKey();
  }, []);

  const getApiHeaders = () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    const key = localStorage.getItem("custom_gemini_api_key") || geminiApiKey;
    if (key) {
      headers["X-Gemini-Key"] = key;
    }
    return headers;
  };

  const handleValidateKey = async (enteredKey: string) => {
    if (!enteredKey.trim()) {
      setKeyValidationError("API Key를 입력해주세요.");
      return;
    }
    setIsValidatingKey(true);
    setKeyValidationError("");
    try {
      const response = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: enteredKey })
      });
      const data = await response.json();
      if (response.ok && data.valid) {
        localStorage.setItem("custom_gemini_api_key", enteredKey);
        localStorage.setItem("is_gemini_key_validated", "true");
        setGeminiApiKey(enteredKey);
        setIsKeyValidated(true);
        setKeyValidationError("");
        setShowKeyInput(false);
      } else {
        setKeyValidationError(data.error || "유효하지 않은 API Key 혹은 모델 에러입니다.");
        setIsKeyValidated(false);
        localStorage.removeItem("is_gemini_key_validated");
      }
    } catch (err: any) {
      setKeyValidationError("키 검증 서버와 통신 도중 실패했습니다. 네트워크 상태 및 입력값을 확인해 주세요.");
      setIsKeyValidated(false);
      localStorage.removeItem("is_gemini_key_validated");
    } finally {
      setIsValidatingKey(false);
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem("custom_gemini_api_key");
    localStorage.removeItem("is_gemini_key_validated");
    setGeminiApiKey("");
    setIsKeyValidated(false);
    setShowKeyInput(true);
    setKeyValidationError("");
  };

  // Client Profile State
  const [profile, setProfile] = useState<ClientProfile>({
    clientName: "",
    industry: "",
    location: "서울시 마포구 공덕역 인근",
    yearsOfOp: "3년 미만",
    priorSupport: "대출 지원 이력 없음",
    coreConcerns: ""
  });

  // A Type State (Batch Input)
  const [batchText, setBatchText] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  // B Type State (Chat Interview)
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content: `안녕하십니까, 소상공인 대표님. 저는 대한민국 소상공인의 경영 안정과 재기를 돕는 실전형 비즈니스 컨설턴트입니다.

정확한 정책 매칭 및 맞춤형 3단계 개선 솔루션을 도출하기 위해, 대표님의 상호명, 주 타겟 상권, 업력, 그리고 가장 깊이 고민하고 계신 점들을 순차 인터뷰 형태로 파악하고자 합니다.

먼저 대표님의 **상호명(또는 브랜드명)과 영위하고 계신 업종**을 말씀해 주시겠습니까?
(예: '춘천 가마솥 왕족발'을 5년째 마포 먹자골목에서 운영하고 있습니다)`,
      timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [currentInput, setCurrentInput] = useState<string>("");
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // B Type Multiple Choice Questionnaire State
  const [useMultipleChoice, setUseMultipleChoice] = useState<boolean>(true);
  const [qStep, setQStep] = useState<number>(0);
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [customIndustry, setCustomIndustry] = useState<string>("");
  const [isCustomIndustry, setIsCustomIndustry] = useState<boolean>(false);
  const [customLocation, setCustomLocation] = useState<string>("");
  const [isCustomLocation, setIsCustomLocation] = useState<boolean>(false);
  const [customPriorSupport, setCustomPriorSupport] = useState<string>("");
  const [isCustomPriorSupport, setIsCustomPriorSupport] = useState<boolean>(false);
  const [customYearsOfOp, setCustomYearsOfOp] = useState<string>("");
  const [isCustomYearsOfOp, setIsCustomYearsOfOp] = useState<boolean>(false);
  const [customConcernInput, setCustomConcernInput] = useState<string>("");
  const [additionalConcerns, setAdditionalConcerns] = useState<Array<{label: string, desc: string, val: string}>>([]);

  // Live Fact Feed
  const [factFeed, setFactFeed] = useState<string>(
    "2026년 상반기 중소벤처기업부 소상공인 판로개척지원사업 접수 진행 중 [출처: 중소기업유통센터, 26.06.15]"
  );

  // Generated Report Cache
  const [report, setReport] = useState<ConsultingReport | null>(null);

  // Roadmap task execution tracking (interactive checklist)
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

  // Consulting History States
  const [historyReports, setHistoryReports] = useState<Array<{ id: string; timestamp: string; report: ConsultingReport; completedTasks?: Record<string, boolean> }>>([]);
  const [activeHistoryReportId, setActiveHistoryReportId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [compareActive, setCompareActive] = useState<boolean>(false);
  const [showKeySummary, setShowKeySummary] = useState<boolean>(true);

  // Policy Alerts State
  interface PolicyAlert {
    title: string;
    agency: string;
    deadline: string;
    fundingAmount: string;
    details: string;
    url: string;
  }
  const [policyAlerts, setPolicyAlerts] = useState<PolicyAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(true);
  const [isAlertBannerVisible, setIsAlertBannerVisible] = useState<boolean>(true);

  // Fetch policy alerts on mount
  useEffect(() => {
    const isDismissed = localStorage.getItem("policy_alert_dismissed_2026");
    if (isDismissed === "true") {
      setIsAlertBannerVisible(false);
    }

    async function fetchAlerts() {
      try {
        setLoadingAlerts(true);
        const res = await fetch("/api/policy-alerts", {
          headers: getApiHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.alerts) {
            setPolicyAlerts(data.alerts);
          }
        }
      } catch (err) {
        console.error("Failed to fetch real-time policy alerts:", err);
      } finally {
        setLoadingAlerts(false);
      }
    }
    fetchAlerts();
  }, []);

  // Load history from localStorage on mount & seed if empty
  useEffect(() => {
    const saved = localStorage.getItem("consulting_reports_history");
    if (saved) {
      try {
        setHistoryReports(JSON.parse(saved));
      } catch (err) {
        console.error("Failed to parse history reports:", err);
      }
    } else {
      const seed1: ConsultingReport = {
        ...DEFAULT_REPORT,
        summary: {
          clientName: "(예시) 곰바우 뼈다귀감자탕 (1차 진단)",
          industry: "음식점업 (한식/식사)",
          location: "서울시 마포구 공덕동 먹자골목 배후지",
          yearsOfOp: "1년 미만",
          dangerLevel: "HIGH"
        },
        statusTable: DEFAULT_REPORT.statusTable.map((item, index) => 
          index === 0 ? { ...item, risk: "DANGER", diagnosis: "보증재단 융자 및 만기이자 상환 전면 고위험 압박" } : item
        ),
        commercialAnalysis: {
          ...DEFAULT_REPORT.commercialAnalysis,
          chartsData: [
            { name: "예상 영업이익률", value: 4, benchmark: 12 },
            { name: "고정 월 임차료 배율", value: 38, benchmark: 20 },
            { name: "인근 유동인구 지수", value: 55, benchmark: 80 }
          ]
        }
      };
      
      const seed2: ConsultingReport = {
        ...DEFAULT_REPORT,
        summary: {
          clientName: "(예시) 곰바우 뼈다귀감자탕 (2차 개선진단)",
          industry: "음식점업 (한식/식사)",
          location: "서울시 마포구 공덕동 먹자골목 배후지",
          yearsOfOp: "1년~3년",
          dangerLevel: "LOW"
        },
        statusTable: DEFAULT_REPORT.statusTable.map((item, index) => 
          index === 0 ? { ...item, risk: "SAFE", diagnosis: "소진공 정책대환론 3.5%대 안전 실행 완료" } : item
        ),
        commercialAnalysis: {
          ...DEFAULT_REPORT.commercialAnalysis,
          chartsData: [
            { name: "예상 영업이익률", value: 14, benchmark: 12 },
            { name: "고정 월 임차료 배율", value: 20, benchmark: 20 },
            { name: "인근 유동인구 지수", value: 85, benchmark: 80 }
          ]
        }
      };

      const initialHistory = [
        {
          id: "seeded-report-1",
          timestamp: "2026-05-10 14:21",
          report: seed1,
          completedTasks: { "phase-0-task-0": true }
        },
        {
          id: "seeded-report-2",
          timestamp: "2026-06-15 11:32",
          report: seed2,
          completedTasks: { "phase-0-task-0": true, "phase-0-task-1": true, "phase-1-task-0": true, "phase-1-task-1": true, "phase-2-task-0": true }
        }
      ];
      setHistoryReports(initialHistory);
      localStorage.setItem("consulting_reports_history", JSON.stringify(initialHistory));
    }
  }, []);

  const addReportToHistory = (newReport: ConsultingReport) => {
    const nowStr = new Date().toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
    const clientName = newReport.summary.clientName || profile.clientName || "익명 대표님 사업장";
    
    const formattedReport: ConsultingReport = {
      ...newReport,
      summary: {
        ...newReport.summary,
        clientName: clientName
      }
    };

    const newId = `report-${Date.now()}`;
    const newHistoryItem = {
      id: newId,
      timestamp: nowStr,
      report: formattedReport,
      completedTasks: {}
    };

    setActiveHistoryReportId(newId);
    setCompletedTasks({});

    setHistoryReports(prev => {
      const updated = [newHistoryItem, ...prev];
      localStorage.setItem("consulting_reports_history", JSON.stringify(updated));
      return updated;
    });
  };

  const loadReportFromHistory = (historyItem: typeof historyReports[0]) => {
    setReport(historyItem.report);
    setProfile({
      clientName: historyItem.report.summary.clientName.replace(/\(예시\) |\(1차 진단\)|\(2차 개선진단\)/g, "").trim(),
      industry: historyItem.report.summary.industry,
      location: historyItem.report.summary.location,
      yearsOfOp: historyItem.report.summary.yearsOfOp,
      priorSupport: historyItem.report.statusTable?.[0]?.diagnosis || "대출 지원 이력 없음",
      coreConcerns: historyItem.report.solutions?.[0]?.concern || "종합 경영 애로사항"
    });
    setCompletedTasks(historyItem.completedTasks || {});
    setActiveHistoryReportId(historyItem.id);
    setReportGenerated(true);
    setIsHistoryOpen(false);
  };

  const deleteReportFromHistory = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("정말로 이 컨설팅 진단 이력을 삭제하시겠습니까?")) {
      setHistoryReports(prev => {
        const updated = prev.filter(item => item.id !== idToDelete);
        localStorage.setItem("consulting_reports_history", JSON.stringify(updated));
        return updated;
      });
      if (activeHistoryReportId === idToDelete) {
        setActiveHistoryReportId(null);
      }
      setSelectedCompareIds(prev => prev.filter(id => id !== idToDelete));
    }
  };

  // Auto scroll to chat bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Feed simulation
  useEffect(() => {
    const feeds = [
      "2026년 일자리 안정자금 및 최저임금 보전지원책 서울 영등포 특화안내 [출처: 고용노동부, 26.06.18]",
      "신용보증재단 중신용 소상공인 저리 대환대출 지원한도 최대 5,000만원 조정 [출처: 신용보증재단중앙회, 26.06.11]",
      "식자재 물가 안정을 위한 산지 직거래 물류 수수료 감면 대상 공고 [출처: 한국농수산식품유통공사, 26.05.29]",
      "소상공인 스마트상점 기술보급사업 - 테이블오더 최대 70% 국비 지원 신청 오픈 [출처: 소상공인시장진흥공단, 26.06.02]"
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % feeds.length;
      setFactFeed(feeds[idx]);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  // Set Profile fields based on interview parsing (Simulate intelligent parsing or manually edit)
  const applyPreset = (presetId: string) => {
    const preset = SAMPLE_CLIENTS.find(c => c.id === presetId);
    if (preset) {
      setProfile({ ...preset.profile });
      setBatchText(preset.rawText);
      setSelectedPreset(presetId);
    }
  };

  const handleStartConsulting = (mode: "intro" | "A" | "B") => {
    if (mode !== "intro" && !isKeyValidated) {
      alert("죄송합니다. 현재 AI 진단과 보고서를 이용하려면 먼저 'Gemini 안전 비즈니스 AI 전동기 승인' 카드에서 유효한 Gemini API Key를 등록 및 검증해 주셔야 합니다.");
      const cardEl = document.getElementById("gemini-api-key-gate-card");
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }
    setActiveTab(mode);
  };

  // Generate Report via Server API
  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const response = await fetch("/api/consult/report", {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({
          clientProfile: profile,
          chatHistory: activeTab === "B" ? chatMessages : [{ role: "user", content: batchText }]
        })
      });

      if (!response.ok) {
        throw new Error("서버 보고서 생성 실패");
      }

      const data = await response.json();
      setReport(data);
      addReportToHistory(data);
      setReportGenerated(true);
    } catch (err) {
      console.error("Error creating report:", err);
      // Fallback in case of server offline/network error - Use highly polished DEFAULT_REPORT
      const fallbackReport = {
        ...DEFAULT_REPORT,
        summary: {
          ...DEFAULT_REPORT.summary,
          clientName: profile.clientName || "익명 대표님 사업장"
        }
      };
      setReport(fallbackReport);
      addReportToHistory(fallbackReport);
      setReportGenerated(true);
    } finally {
      setGeneratingReport(false);
    }
  };

  // Send interactive chat message
  const handleSendMessage = async () => {
    if (!currentInput.trim()) return;

    const userMsgText = currentInput;
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMsgText,
      timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setCurrentInput("");
    setSendingMessage(true);

    try {
      // Intelligently parse profile items as the dialog goes
      updateProfileFromChatText(userMsgText);

      const response = await fetch("/api/consult/chat", {
        method: "POST",
        headers: getApiHeaders(),
        body: JSON.stringify({
          messages: [...chatMessages, userMsg],
          userContext: profile
        })
      });

      if (!response.ok) {
        throw new Error("Chat api fetch failed");
      }

      const data = await response.json();
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
      };
      setChatMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      // fallback
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: `네, 전송해주신 내용을 소중하게 접수하여 진단 매트릭스에 기입하였습니다. 
현재 정보 기준으로 다음 항목들이 프로필 카테고리로 매칭되었습니다.

- 대표 업종/업력 확인 및 타겟 상권 가배정 완료.
- 원재료 및 인력 부족 등 복합적인 애로점 접수.

실시간 2026년 정부지원사업 공고(스마트상점, 희망대환대출, 디지털 마케팅 판로개척 등)와 상권정보를 조회하기 위해 정밀 컨설팅 보고서 작성을 바로 개시할 수 있습니다. 화면 상단 혹은 하단의 **[종합 리포트 생성]** 버튼을 통해 최종 솔루션을 확인해보십시오.`,
        timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
      };
      setChatMessages(prev => [...prev, botMsg]);
    } finally {
      setSendingMessage(false);
    }
  };

  // Simple heuristics to fill profile from chat history live to delight user
  const updateProfileFromChatText = (text: string) => {
    // Basic search of clues
    let updated = { ...profile };
    let changed = false;

    if (!updated.clientName && text.length < 30 && (text.includes("식당") || text.includes("커피") || text.includes("가게") || text.includes("푸드") || text.includes("상호") || text.includes("가마솥") || text.includes("베이커리"))) {
      updated.clientName = text.replace(/입니다|운영|하고있습니다/g, "").trim();
      changed = true;
    }

    if (text.includes("서울") || text.includes("마포") || text.includes("강남") || text.includes("수원") || text.includes("부산") || text.includes("경기")) {
      const match = text.match(/([가-힣]+시|[가-힣]+도)?\s*([가-힣]+구|[가-힣]+군|[가-힣]+시)?\s*[가-힣]+동?[가-힣]*[역안경]/);
      if (match) {
        updated.location = match[0];
        changed = true;
      }
    }

    if (text.includes("년") || text.includes("개월") || text.includes("신규") || text.includes("창업")) {
      if (text.includes("1년 미만") || text.includes("9개월") || text.includes("창업한 지 얼마")) {
        updated.yearsOfOp = "1년 미만";
      } else if (text.includes("3년") || text.includes("5년")) {
        updated.yearsOfOp = "3년~5년";
      } else {
        updated.yearsOfOp = "1년~3년";
      }
      changed = true;
    }

    if (!updated.coreConcerns) {
      updated.coreConcerns = text;
      changed = true;
    } else {
      updated.coreConcerns += " / " + text;
      changed = true;
    }

    if (changed) {
      setProfile(updated);
    }
  };

  const handleCopyMarkdown = () => {
    if (!report) return;
    navigator.clipboard.writeText(report.markdownReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [exportingPdf, setExportingPdf] = useState<boolean>(false);

  const handleDownloadPdf = async () => {
    const element = document.getElementById("consulting-report-container");
    if (!element) return;
    
    try {
      setExportingPdf(true);
      
      // Exclude interactive controls, status toggle controls, etc.
      const excludeElements = document.querySelectorAll(".pdf-exclude");
      excludeElements.forEach(el => el.classList.add("hidden"));

      // Small delay for clean render
      await new Promise(resolve => setTimeout(resolve, 350));
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: "#f8fafc"
      });

      excludeElements.forEach(el => el.classList.remove("hidden"));

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }

      const clientName = report?.summary?.clientName || "소상공인";
      const sanitizedName = clientName.replace(/[^a-zA-Z0-9가-힣]/g, "_");
      pdf.save(`안심경영진단처방전_${sanitizedName}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("PDF 리포트를 빌드하는 과정에서 실패했습니다. 정상 동작하도록 화면을 확인하십시오.");
    } finally {
      setExportingPdf(false);
    }
  };

  const toggleTask = (taskKey: string) => {
    setCompletedTasks(prev => {
      const updated = {
        ...prev,
        [taskKey]: !prev[taskKey]
      };
      
      // If we have an active history report, save the task status there
      if (activeHistoryReportId) {
        setHistoryReports(hList => {
          const next = hList.map(item => {
            if (item.id === activeHistoryReportId) {
              return {
                ...item,
                completedTasks: updated
              };
            }
            return item;
          });
          localStorage.setItem("consulting_reports_history", JSON.stringify(next));
          return next;
        });
      }
      return updated;
    });
  };

  // UI state computation for completeness dashboard
  const isProfileComplete =
    profile.clientName.trim().length > 0 &&
    profile.industry.trim().length > 0 &&
    profile.location.trim().length > 0 &&
    profile.coreConcerns.trim().length > 0;

  // Render Section
  return (
    <div id="app-root" className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      
      {/* 🔴 긴급 정부 지원 사업 / 정책자금 마감일 경보 배너 (Grounded Search API) */}
      {isAlertBannerVisible && (
        <div id="urgent-policy-alert-banner" className="bg-gradient-to-r from-blue-700 via-blue-800 to-emerald-600 text-white relative z-50">
          <div className="max-w-7xl mx-auto px-4 py-2.5 md:py-3 flex flex-col xl:flex-row items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3 w-full xl:w-auto text-left">
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center animate-bounce shrink-0">
                <Bell className="w-4 h-4 text-emerald-200 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] bg-emerald-800 border border-emerald-500 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider animate-pulse">
                    긴급 마감 공고
                  </span>
                  <span className="text-xs md:text-sm font-extrabold tracking-tight">
                    실시간 지능형 정책 매칭 2026년 무상 보조금 및 신보 안심 특례 저리 대환대출 마감 알림
                  </span>
                </div>
                <p className="text-[11px] text-emerald-100 mt-0.5 leading-tight font-medium hidden md:block">
                  ※ 아래 마감일과 세부 조건을 확인하시어 예산이 소진되어 무산되기 전에 무상 혜택을 수령하십시오.
                </p>
              </div>
            </div>

            {/* Slider/Carousel list of specific policy items */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full xl:w-auto justify-start xl:justify-end">
              {loadingAlerts ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-200 bg-white/10 px-3 py-1.5 rounded-lg border border-white/15">
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  <span>실시간 유관 부처 정책 보조금 데이터베이스 탐색 중...</span>
                </div>
              ) : (
                policyAlerts.slice(0, 3).map((alert, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-black/20 hover:bg-black/35 border border-white/20 hover:border-white/40 px-3 py-1.5 rounded-xl transition-all w-full sm:w-auto max-w-sm text-left"
                  >
                    <div className="text-[11px] flex-1">
                      <div className="font-extrabold line-clamp-1 flex items-center gap-1">
                        <span className="text-emerald-300">[{alert.agency}]</span> {alert.title}
                      </div>
                      <div className="text-[10px] text-emerald-200 font-semibold flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-emerald-300 shrink-0" />
                        <span>기한: <span className="text-white font-black">{alert.deadline}</span></span>
                        <span className="text-white/25">|</span>
                        <span>최대: <span className="text-emerald-300 font-extrabold">{alert.fundingAmount}</span></span>
                      </div>
                    </div>
                    <a
                      href={alert.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] bg-white text-emerald-800 hover:bg-emerald-50 font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0 self-end sm:self-auto shadow-sm"
                    >
                      <span>신청 링크</span>
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                    </a>
                  </div>
                ))
              )}

              {/* Dismiss button */}
              <button
                onClick={() => {
                  setIsAlertBannerVisible(false);
                  localStorage.setItem("policy_alert_dismissed_2026", "true");
                }}
                className="p-1.5 hover:bg-white/10 rounded-full transition-all text-white/80 hover:text-white shrink-0 cursor-pointer ml-1 self-end sm:self-auto"
                title="오늘 하루 숨기기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Premium Navigation Header */}
      <nav id="app-nav" className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-8 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-slate-800">소상공인 종합 비즈니스 컨설턴트</span>
            <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-bold tracking-widest text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              국가 정책DB 정밀 매칭
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!isAlertBannerVisible && (
            <button
              onClick={() => {
                setIsAlertBannerVisible(true);
                localStorage.removeItem("policy_alert_dismissed_2026");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black rounded-lg hover:bg-emerald-100 transition-all cursor-pointer shadow-sm animate-pulse shrink-0"
              title="긴급 마감 정책 사업 알림 열기"
            >
              <Bell className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
              <span className="hidden sm:inline">긴급 정책 마감 소식 ({policyAlerts.length || 3})</span>
              <span className="sm:hidden">정책 알림</span>
            </button>
          )}

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-200">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-semibold">2026 정부 지원사업 동기화</span>
          </div>

          <button
            id="history-trigger-btn"
            onClick={() => {
              setSelectedCompareIds([]);
              setCompareActive(false);
              setIsHistoryOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-blue-400" />
            <span>컨설팅 진단 내역</span>
            <span className="bg-blue-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded-full inline-block">
              {historyReports.length}
            </span>
          </button>

          {(activeTab !== "intro") && (
            <button
              onClick={() => {
                setReportGenerated(false);
                setReport(null);
                setProfile({
                  clientName: "",
                  industry: "",
                  location: "서울시 마포구 공덕역 인근",
                  yearsOfOp: "3년 미만",
                  priorSupport: "대출 지원 이력 없음",
                  coreConcerns: ""
                });
                setBatchText("");
                setQStep(0);
                setSelectedConcerns([]);
                setUseMultipleChoice(true);
                setCustomIndustry("");
                setIsCustomIndustry(false);
                setCustomLocation("");
                setIsCustomLocation(false);
                setCustomPriorSupport("");
                setIsCustomPriorSupport(false);
                setCustomYearsOfOp("");
                setIsCustomYearsOfOp(false);
                setCustomConcernInput("");
                setAdditionalConcerns([]);
                setChatMessages([
                  {
                    id: "welcome-reset",
                    role: "assistant",
                    content: `다시 뵙게 되어 반갑습니다, 대표님. 새로운 가맹 독립 점포 정보를 입력받아 실전 진단을 계속 진행하겠습니다.\n\n먼저 대표님의 **상호명과 주력 업종**을 기재해주시겠습니까?`,
                    timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
                  }
                ]);
                setActiveTab("intro");
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>처음으로</span>
            </button>
          )}

          {isProfileComplete && !reportGenerated && (
            <button
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-blue-100 disabled:opacity-50"
            >
              {generatingReport ? (
                <>
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  <span>매칭분석 중...</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>실시간 종합 리포트 생성</span>
                </>
              )}
            </button>
          )}
        </div>
      </nav>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative organic-swoop-bg">
        
        {/* Step Status Drawer/Sidebar (Describing official SME Consultation Standard Steps) */}
        <aside id="sidebar" className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 p-4 lg:p-6 flex flex-col gap-5 shrink-0">
          <div>
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">경영 컨설팅 수행 가이드</h3>
            
            <div className="space-y-2">
              <div className={`p-3 rounded-lg border flex items-start gap-2.5 transition-all ${
                !reportGenerated ? "bg-blue-50/50 border-blue-200" : "bg-slate-50 border-slate-200 opacity-70"
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                  !isProfileComplete ? "bg-slate-200 text-slate-600" : "bg-blue-600 text-white"
                }`}>
                  {isProfileComplete ? "✓" : "1"}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">1단계 : 기본정보 수집</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">상호, 상권, 업력, 민원 취합</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${profile.clientName ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"}`}>상호</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${profile.industry ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"}`}>업종</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${profile.coreConcerns ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"}`}>애로사항</span>
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-lg border flex items-start gap-2.5 transition-all ${
                reportGenerated ? "bg-blue-50/50 border-blue-200" : "bg-slate-50 border-slate-200 opacity-60"
              }`}>
                <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">2단계 : 매칭 및 대시보드</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">상권 트렌드, SWOT, 마진 진단</p>
                </div>
              </div>

              <div className={`p-3 rounded-lg border flex items-start gap-2.5 transition-all ${
                reportGenerated ? "bg-blue-50/50 border-blue-200" : "bg-slate-50 border-slate-200 opacity-60"
              }`}>
                <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">3단계 : 3단계 실행책</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">원재료 해결, 마케팅, 정책자금</p>
                </div>
              </div>

              <div className={`p-3 rounded-lg border flex items-start gap-2.5 transition-all ${
                reportGenerated ? "bg-blue-50/50 border-blue-200" : "bg-slate-50 border-slate-200 opacity-60"
              }`}>
                <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
                  4
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">4단계 : 즉시 행동 로드맵</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">공고링크 매칭, 단계별 예상기간</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-auto hidden lg:flex flex-col gap-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[9px] font-extrabold text-blue-600 tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              신뢰성 검증 원칙
            </span>
            <p className="text-[10.5px] leading-relaxed text-slate-600 italic font-semibold">
              "골목상권 빅데이터와 주요 정부 소상공인 지원 혜택 DB를 종합 매칭하여, 바로 실천할 수 있는 핵심 이행 계획을 정확히 도출합니다."
            </p>
          </div>
        </aside>

        {/* Content Container Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
          
          {/* INTRO SCREEN: Select Consulting Method */}
          {activeTab === "intro" && !reportGenerated && (
            <div className="max-w-5xl mx-auto w-full py-4 md:py-10 space-y-12">
              
              {/* Premium Hero Section */}
              <div className="text-center relative py-6 md:py-10 px-4 rounded-3xl bg-gradient-to-b from-blue-50/75 via-indigo-50/30 to-transparent border border-blue-100/50">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-black rounded-full mb-5 shadow-sm shadow-blue-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                  <span>골목상권 사장님 맞춤 1:1 완벽 경영 진단 솔루션</span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 tracking-tight leading-tight">
                  정보 격차를 해소하는 실전<br/>
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-800 bg-clip-text text-transparent">소상공인 안심 비즈니스 컨설팅</span>
                </h1>
                <p className="text-slate-600 mt-4 text-sm sm:text-base md:text-lg max-w-3xl mx-auto font-medium leading-relaxed">
                  바쁜 사장님들을 위해 복잡한 정부 보조금·정책 자금 직접 매칭부터,<br className="hidden md:block" />
                  우리 동네 실시간 경쟁사 포화도(D3 히트맵), 매출 돌파 마케팅 해법을 단 5분 만에 명쾌하게 진단해 드립니다.
                </p>

                {/* Live Counter Badge */}
                <div className="mt-6 inline-flex items-center gap-6 px-5 py-2 w-auto bg-white rounded-2xl border border-slate-200/80 shadow-sm text-left">
                  <div className="flex items-center gap-1.5 border-r border-slate-200 pr-5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase">정부 지원사업 DB</span>
                    <span className="text-xs font-black text-slate-800">2026 연동 완료</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block leading-none mb-1">오늘 신규 매칭 진단 사장님</span>
                    <span className="text-xs font-black text-indigo-700">총 3,429명 처방 완료</span>
                  </div>
                </div>
              </div>

              {/* 🌟 플랫폼 특장점 & 차별성 부각 (Bento Grid Style) */}
              <div className="space-y-4">
                <div className="text-left border-l-4 border-blue-600 pl-3">
                  <h2 className="text-base font-black text-slate-900">왜 안심 비즈니스 컨설팅일까요?</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">골목식당 사장님들이 이 플랫폼에 신뢰와 재미를 느끼는 3가지 독창적 강점</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-blue-300 shadow-sm transition-all duration-300 hover:-translate-y-1">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center mb-4">
                      <Layers className="w-5 h-5 text-orange-600" />
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 mb-1">1. 실시간 경쟁사 포화 주지 (D3 히트맵)</h3>
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                      상권 내 경쟁 점포의 과밀 정도를 5x5 정밀 바둑판 셀(Cell) 격자 지도로 시각화하여, 경쟁이 가장 한가한 황금 점포 및 배달 요지를 1초 만에 짚어냅니다.
                    </p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-blue-300 shadow-sm transition-all duration-300 hover:-translate-y-1">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
                      <Bell className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 mb-1">2. 긴급 정부지원 특별 연계 (AI 검색 대조)</h3>
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                      중기부, 소진공의 정책 금리 요건과 최신 지원 정책을 실시간 AI 검색 기술로 대조·매칭하여, 예산 소진 위기 전 신청 가능한 보조금을 한도와 링크로 안내합니다.
                    </p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-blue-300 shadow-sm transition-all duration-300 hover:-translate-y-1">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                      <MessageSquare className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-900 mb-1">3. 실천 위주의 3단계 행동 로드맵</h3>
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                      현학적인 보고서로 끝나지 않습니다. 자재 조달, 스마트오더 기술 전수, 신용 전환 등 사장님이 매일 체크하며 수행율을 올리는 실시간 트랙 지표와 로드맵이 제공됩니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* 🔑 Gemini API Key 인증 관문 (Validation Gate Card) */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6" id="gemini-api-key-gate-card">
                
                {/* 1. Header Area conforming to Image Design */}
                <div className="text-left">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2 mb-4 justify-start">
                    <span className="text-emerald-500 text-lg">✅</span> 무료로 시작하세요. Gemini API 키만 있으면 됩니다.
                  </h3>
                </div>

                {/* 2. Key Input Box and validated indicators */}
                <div className="pt-1">
                  {isKeyValidated ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-5 bg-emerald-50/40 border border-emerald-100 rounded-2xl">
                      <div className="flex items-center gap-2.5">
                        <span className="text-emerald-600 text-base">🔓</span>
                        <span className="text-xs sm:text-sm text-slate-800 font-bold">
                          현재 암호화 등록된 키: <span className="font-mono bg-white px-2 py-0.5 rounded border text-slate-600 font-bold ml-1">{geminiApiKey.substring(0, 10)}****************</span>
                        </span>
                      </div>
                      <button
                        onClick={handleClearKey}
                        className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-black rounded-xl transition-all cursor-pointer"
                      >
                        등록된 API Key 해제하기
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-stretch gap-3">
                        <div className="relative flex-1">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                            <Lock className="w-4 h-4 text-slate-400" />
                          </span>
                          <input
                            type="password"
                            placeholder="Gemini API Key 입력"
                            value={geminiApiKey}
                            onChange={(e) => {
                              setGeminiApiKey(e.target.value);
                              setKeyValidationError("");
                            }}
                            disabled={isValidatingKey}
                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-800/10 focus:border-slate-300 text-slate-800 placeholder-slate-405 transition-all shadow-sm"
                          />
                        </div>
                        
                        <button
                          onClick={() => handleValidateKey(geminiApiKey)}
                          disabled={isValidatingKey || !geminiApiKey.trim()}
                          className="px-8 py-3.5 bg-[#1e40af] hover:bg-[#1d4ed8] text-white font-extrabold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 whitespace-nowrap min-w-[130px] disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                        >
                          {isValidatingKey ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              <span>인증 검사 중...</span>
                            </>
                          ) : (
                            <span>시작하기</span>
                          )}
                        </button>
                      </div>
                      
                      {keyValidationError && (
                        <p className="text-xs font-bold text-rose-600 pl-1 flex items-center gap-1 animate-pulse">
                          ❌ {keyValidationError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Dropdown Accordion for Guide: "Gemini API Key 발급 가이드" */}
                <div className="border border-slate-100 rounded-2xl overflow-hidden mt-6 bg-slate-50/50">
                  <button
                    onClick={() => setShowGuide(!showGuide)}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors text-left font-bold text-slate-800 text-xs sm:text-sm cursor-pointer border-b border-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 text-lg">❓</span>
                      <span className="font-extrabold text-slate-800">Gemini API Key 발급 가이드</span>
                    </div>
                    {showGuide ? (
                      <ChevronUp className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                  
                  {showGuide && (
                    <div className="bg-white p-5 sm:p-6 space-y-5 text-left text-xs sm:text-sm text-slate-600 font-semibold leading-relaxed">
                      {/* Step 1 */}
                      <div className="flex items-start gap-4">
                        <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5">1</span>
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm sm:text-base">Google AI Studio 접속</p>
                          <p className="text-xs sm:text-sm text-slate-500 mt-1">아래 링크를 클릭하여 Google AI Studio에 접속하세요.</p>
                          <a 
                            href="https://aistudio.google.com/apikey" 
                            target="_blank" 
                            referrerPolicy="no-referrer" 
                            className="text-blue-600 hover:underline text-xs sm:text-sm font-bold inline-block mt-1.5 break-all"
                          >
                            https://aistudio.google.com/apikey
                          </a>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="flex items-start gap-4">
                        <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5">2</span>
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm sm:text-base">Google 계정으로 로그인</p>
                          <p className="text-xs sm:text-sm text-slate-500 mt-1">Gmail 계정으로 로그인하세요. 계정이 없으면 무료로 만들 수 있어요.</p>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="flex items-start gap-4">
                        <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5">3</span>
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm sm:text-base">'API 키 만들기' 클릭</p>
                          <p className="text-xs sm:text-sm text-slate-500 mt-1">화면에서 'Create API Key' 또는 'API 키 만들기' 버튼을 클릭하세요.</p>
                        </div>
                      </div>

                      {/* Step 4 */}
                      <div className="flex items-start gap-4">
                        <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5">4</span>
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm sm:text-base">프로젝트 선택 후 생성</p>
                          <p className="text-xs sm:text-sm text-slate-500 mt-1">기본 프로젝트를 선택하고 'Create API key in existing project'를 클릭하세요.</p>
                        </div>
                      </div>

                      {/* Step 5 */}
                      <div className="flex items-start gap-4">
                        <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5">5</span>
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm sm:text-base">API 키 복사</p>
                          <p className="text-xs sm:text-sm text-slate-500 mt-1">생성된 API 키(AIza로 시작)를 복사하세요. 이 키를 입력창에 붙여넣기하면 됩니다!</p>
                        </div>
                      </div>

                      {/* 🔑 API Key Link button at bottom */}
                      <div className="pt-3">
                        <a
                          href="https://aistudio.google.com/apikey"
                          target="_blank"
                          referrerPolicy="no-referrer"
                          className="w-full py-3 bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1d4ed8] text-xs sm:text-sm font-black rounded-xl transition-all inline-flex items-center justify-center gap-1.5 border border-[#bfdbfe] cursor-pointer"
                        >
                          🔑 API 키 발급 페이지로 이동
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 🤝 진단 시작하기 (Choose Consulting Method) */}
              <div className="space-y-4">
                <div className="text-left border-l-4 border-indigo-600 pl-3">
                  <h2 className="text-base font-black text-slate-900">간편 진단 방법 선택하기</h2>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">사장님의 선호도에 맞춰 가장 빠르고 정밀하게 진단을 설계합니다.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Option A Card */}
                  <div 
                    onClick={() => handleStartConsulting("A")}
                    className="bg-white border-2 border-slate-200/80 hover:border-blue-500 hover:shadow-xl cursor-pointer p-6 md:p-8 rounded-2xl shadow-sm flex flex-col group transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-500" />
                    <div className="w-12 h-12 bg-blue-50 group-hover:bg-blue-100 rounded-xl flex items-center justify-center mb-5 transition-colors border border-blue-100/50 shadow-sm">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest mb-1 shadow-sm px-2 py-0.5 bg-blue-50/50 rounded-md w-fit border border-blue-100/30">FAST TRACK</span>
                    <h3 className="text-lg md:text-xl font-bold text-slate-950 mb-2 group-hover:text-blue-600 transition-colors">A형 : 내 고민 상황 텍스트 직접 써넣기</h3>
                    <p className="text-xs md:text-sm text-slate-500 mb-6 leading-relaxed font-semibold">
                      대표님이 겪고 계신 현재의 매출 문제, 구인 애로사항, 원가 걱정 등을 자유롭게 적어주시거나 메모한 내용을 복사해 붙여넣으면 즉시 정확한 이메일 규격의 처방전이 생성됩니다.
                    </p>
                    <span className="mt-auto text-blue-600 text-xs md:text-sm font-bold flex items-center gap-1.5 flex-wrap">
                      가게 정보 한 줄 입력하고 시작하기
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
                    </span>
                  </div>

                  {/* Option B Card */}
                  <div 
                    onClick={() => handleStartConsulting("B")}
                    className="bg-white border-2 border-slate-200/80 hover:border-indigo-600 hover:shadow-xl cursor-pointer p-6 md:p-8 rounded-2xl shadow-sm flex flex-col group transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full translate-x-8 -translate-y-8 group-hover:scale-150 transition-transform duration-500" />
                    <div className="w-12 h-12 bg-indigo-50 group-hover:bg-indigo-100 rounded-xl flex items-center justify-center mb-5 transition-colors border border-indigo-100/50 shadow-sm">
                      <MessageSquare className="w-5 h-5 text-indigo-600" />
                    </div>
                    <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest mb-1 shadow-sm px-2 py-0.5 bg-indigo-50/50 rounded-md w-fit border border-indigo-100/30">INTERACTIVE TRACK</span>
                    <h3 className="text-lg md:text-xl font-bold text-slate-950 mb-2 group-hover:text-indigo-600 transition-colors">B형 : AI 소상공인 전문의 1:1 진단 대화</h3>
                    <p className="text-xs md:text-sm text-slate-500 mb-6 leading-relaxed font-semibold">
                      질문을 잘 몰라도 괜찮습니다. AI 경영 지도사가 친절하게 유도 질문을 실시간 건네며 상호, 업력, 대출 이력, 고민 지점들을 차례 차례 맞춤 수집하여 안심 가이드를 빌드업합니다.
                    </p>
                    <span className="mt-auto text-indigo-600 text-xs md:text-sm font-bold flex items-center gap-1.5 flex-wrap">
                      1:1 자가 인터뷰 방식 시작
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
                    </span>
                  </div>

                </div>
              </div>

              {/* ⚡ Fast Trial Presets Panel */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border border-slate-200 p-5 md:p-6 shadow-inner">
                <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  소상공인 실제 대표 경영 구제 및 성공 모범 예시 (1초 체험)
                </h3>
                <p className="text-xs text-slate-600 mb-4 font-semibold leading-relaxed">
                  직접 정보를 치기 곤란하시다면, 실제 컨설팅에서 위기를 극복한 마포 국밥집 또는 수원 골목 제과점 사례를 1초 만에 그대로 불러와 정교한 처방 대시보드의 실체를 먼저 경험해보십시오.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {SAMPLE_CLIENTS.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => {
                        if (!isKeyValidated) {
                          alert("죄송합니다. 먼저 'Gemini 안전 비즈니스 AI 전동기 승인' 카드에서 유효한 Gemini API Key를 등록 및 검증해 주셔야 모범 예시를 체험할 수 있습니다.");
                          const cardEl = document.getElementById("gemini-api-key-gate-card");
                          if (cardEl) {
                            cardEl.scrollIntoView({ behavior: "smooth" });
                          }
                          return;
                        }
                        applyPreset(client.id);
                        setActiveTab("A");
                      }}
                      className="text-left py-3.5 px-4 bg-white hover:bg-gradient-to-r hover:from-white hover:to-blue-50/20 border border-slate-200/80 hover:border-blue-400 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 transition-all flex items-center justify-between shadow-sm cursor-pointer"
                    >
                      <span className="truncate pr-2">💡 {client.label}</span>
                      <span className="text-[10px] text-blue-600 font-extrabold shrink-0 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                        체험하기
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Institutional Compliance Seal */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4.5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-1.5 shrink-0">
                    <span className="w-7.5 h-7.5 rounded-xl border border-white bg-blue-600 text-white flex items-center justify-center text-[9px] font-black shadow-sm">소진</span>
                    <span className="w-7.5 h-7.5 rounded-xl border border-white bg-emerald-600 text-white flex items-center justify-center text-[9px] font-black shadow-sm">신보</span>
                    <span className="w-7.5 h-7.5 rounded-xl border border-white bg-amber-600 text-white flex items-center justify-center text-[9px] font-black shadow-sm">기보</span>
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider block leading-none mb-0.5">실시간 국가 공인 소상공인 정책지원 대조 확인 엔진</span>
                    <p className="text-xs text-slate-600 font-bold max-w-md lg:max-w-2xl leading-tight line-clamp-1">{factFeed}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-3 py-1 rounded-full block animate-pulse">
                    🟢 실시간 대조 가동 중
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* MODE A: BATCH TEXT INPUT & DOCUMENTS */}
          {activeTab === "A" && !reportGenerated && (
            <div className="max-w-4xl mx-auto w-full">
              <div className="mb-6">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">A형 - 일지자료 통입력</span>
                <h2 className="text-2xl font-bold text-slate-900 mt-2">상담 일지 직접 수집 및 기초 설정</h2>
                <p className="text-slate-500 text-xs mt-1">상담 요지나 장문을 입력 혹은 기존 추천 시범사례를 통해 즉각 심층 보고서로 전송하십시오.</p>
              </div>

              {/* Profiles Fields Inputs / Verification Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                
                {/* Left Form: Field Overrides */}
                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    핵심 경영 프로필 확인
                  </h3>
                  
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">상호명 (또는 대표 점포명) *</label>
                    <input 
                      type="text" 
                      value={profile.clientName}
                      onChange={(e) => setProfile({...profile, clientName: e.target.value})}
                      placeholder="예: 공덕원 할매순대국밥"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">업종 및 핵심 취급 분류 *</label>
                    <input 
                      type="text" 
                      value={profile.industry}
                      onChange={(e) => setProfile({...profile, industry: e.target.value})}
                      placeholder="예: 일반음식점 (한식류)"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">사업체 주 상권 지역 *</label>
                      <input 
                        type="text" 
                        value={profile.location}
                        onChange={(e) => setProfile({...profile, location: e.target.value})}
                        placeholder="예: 서울시 마포구 공덕역 이면"
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 block mb-1">업력 구분 *</label>
                      <select 
                        value={profile.yearsOfOp}
                        onChange={(e) => setProfile({...profile, yearsOfOp: e.target.value})}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="1년 미만">1년 미만 (신성)</option>
                        <option value="1년~3년">1년~3년 (정밀정비)</option>
                        <option value="3년~5년">3년~5년 (고비구역)</option>
                        <option value="5년 이상">5년 이상 (장인유지)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">기존 수혜받은 정책 자금 이력</label>
                    <input 
                      type="text" 
                      value={profile.priorSupport}
                      onChange={(e) => setProfile({...profile, priorSupport: e.target.value})}
                      placeholder="예: 경기신보 3천만원 희망보증 잔액 상환 중"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">가장 시급한 애로사항 (요약) *</label>
                    <textarea 
                      rows={2}
                      value={profile.coreConcerns}
                      onChange={(e) => setProfile({...profile, coreConcerns: e.target.value})}
                      placeholder="예: 식자재 단가 상승에 따른 점유 마진 확보난, 직원 이탈로 인한 홀 무인화 도입 필요성"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Right Area: Interactive paste or preset loader */}
                <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 block mb-1">RAW DATA FIELD</span>
                    <h3 className="text-sm font-bold text-slate-800 mb-2">통합 비즈니스 상담 일지 및 원문 붙여넣기</h3>
                    <p className="text-xs text-slate-500 mb-3.5">
                      상담 시 받아 적은 실무 기록이나, 점포 상황을 자유롭게 일기 형식으로 붙여넣으십시오. 당사 인공지능이 항목을 발췌하여 보고서를 생성합니다.
                    </p>

                    <div className="mb-3 flex gap-2">
                      <button
                        onClick={() => applyPreset("case-1")}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition-all ${
                          selectedPreset === "case-1"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        마포 국밥집 불려오기
                      </button>
                      <button
                        onClick={() => applyPreset("case-2")}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition-all ${
                          selectedPreset === "case-2"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        수원 청년빵집 불러오기
                      </button>
                    </div>

                    <textarea
                      rows={7}
                      value={batchText}
                      onChange={(e) => {
                        setBatchText(e.target.value);
                        // live update core concern from text if empty
                        if (!profile.coreConcerns) {
                          setProfile({...profile, coreConcerns: e.target.value.substring(0, 50)});
                        }
                      }}
                      placeholder="이곳에 상담자의 고충 내용, 전년도 마진율, 상권 정황 등을 기록하여 주십시오..."
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  {/* Submit Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      * 기입 완료 시 우측 파란 버튼이 활성화됩니다.
                    </span>
                    <button
                      onClick={handleGenerateReport}
                      disabled={generatingReport || !isProfileComplete}
                      className={`px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                        isProfileComplete
                          ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-100"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      {generatingReport ? (
                        <>
                          <Loader className="w-4.5 h-4.5 animate-spin" />
                          <span>생성 분석 중...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>3단계 컨설팅 리포트 생성</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>

              {/* Back Link Button */}
              <div className="flex justify-start">
                <button
                  onClick={() => setActiveTab("intro")}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                >
                  ← 처음 화면으로 돌아가기
                </button>
              </div>
            </div>
          )}

          {/* MODE B: CHAT INTERVIEW CONSOLE */}
          {activeTab === "B" && !reportGenerated && (
            <div className="max-w-4xl mx-auto w-full flex flex-col lg:flex-row gap-6">
              
              {/* Left Column: Interactive Wizard or Chat Console */}
              <div className="flex-1 flex flex-col">
                
                {/* Mode Selector Toggle */}
                <div id="survey-mode-selector" className="flex p-1 bg-slate-200/60 rounded-xl mb-4 border border-slate-200/80 shrink-0">
                  <button
                    id="toggle-multiple-choice"
                    onClick={() => setUseMultipleChoice(true)}
                    className={`flex-1 py-1.5 text-center text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      useMultipleChoice
                        ? "bg-white text-blue-700 shadow-sm border border-slate-200/50"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                    <span>단계별 객관식 문진 진단</span>
                  </button>
                  <button
                    id="toggle-free-chat"
                    onClick={() => setUseMultipleChoice(false)}
                    className={`flex-1 py-1.5 text-center text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      !useMultipleChoice
                        ? "bg-white text-blue-700 shadow-sm border border-slate-200/50"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 text-rose-500" />
                    <span>1:1 자유 대화상담</span>
                  </button>
                </div>

                {useMultipleChoice ? (
                  /* Multiple Choice Wizard Console */
                  <div id="survey-wizard-box" className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col p-6 min-h-[550px] justify-between">
                    <div>
                      {/* Progress bar */}
                      <div className="mb-6">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2">
                          <span>스마트 진단 완성도</span>
                          <span className="text-blue-600">6단계 중 {qStep + 1}단계 진행</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex gap-0.5">
                          {[0, 1, 2, 3, 4, 5].map((stepIdx) => (
                            <div
                              key={stepIdx}
                              className={`h-full flex-1 transition-all duration-300 ${
                                stepIdx <= qStep
                                  ? stepIdx === qStep
                                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 animate-pulse"
                                    : "bg-blue-600"
                                  : "bg-slate-200"
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between text-[9px] font-semibold text-slate-400 mt-1.5 px-1">
                          <span className={qStep >= 0 ? "text-blue-600 font-bold" : ""}>상호</span>
                          <span className={qStep >= 1 ? "text-blue-600 font-bold" : ""}>업종</span>
                          <span className={qStep >= 2 ? "text-blue-600 font-bold" : ""}>상권</span>
                          <span className={qStep >= 3 ? "text-blue-600 font-bold" : ""}>업력</span>
                          <span className={qStep >= 4 ? "text-blue-600 font-bold" : ""}>부채</span>
                          <span className={qStep >= 5 ? "text-blue-600 font-bold" : ""}>애로사항</span>
                        </div>
                      </div>

                      {/* Step 0: 상호명 및 점포명 입력 */}
                      {qStep === 0 && (
                        <div className="space-y-4 animate-fade-in">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-extrabold">1</span>
                            <h3 className="text-sm font-extrabold text-slate-800">대표님의 점포명(상호명)을 입력해 주세요</h3>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed mb-4">
                            분석 보고서에 맞춤형으로 기재될 상호 또는 브랜드명입니다. 없으시다면 임의의 이름을 적어주셔도 괜찮습니다.
                          </p>

                          <div>
                            <label className="text-[10px] font-bold text-slate-400 block mb-1">상호명 직접 입력</label>
                            <input
                              type="text"
                              value={profile.clientName}
                              onChange={(e) => setProfile({ ...profile, clientName: e.target.value })}
                              placeholder="예: 백년가마솥 설렁탕"
                              className="w-full text-xs px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium"
                            />
                          </div>

                          <div className="pt-2">
                            <span className="text-[10px] font-bold text-slate-400 block mb-2">원터치 추천 예시 적용</span>
                            <div className="flex flex-wrap gap-2">
                              {[
                                "소담 국밥전문점",
                                "메이플 가든 카페베이커리",
                                "가인 어반 헤어살롱",
                                "영등포 코너 잡화점",
                                "스마트 키친 밀키트 전문점"
                              ].map((presetName) => (
                                <button
                                  key={presetName}
                                  onClick={() => setProfile({ ...profile, clientName: presetName })}
                                  className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-semibold transition-all ${
                                    profile.clientName === presetName
                                      ? "bg-blue-50 text-blue-700 border-blue-400 shadow-sm"
                                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                  }`}
                                >
                                  + {presetName}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Step 1: 대표 업종 선택 */}
                      {qStep === 1 && (
                        <div className="space-y-4 animate-fade-in">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-extrabold">2</span>
                            <h3 className="text-sm font-extrabold text-slate-800">어떤 업종에 해당하십니까?</h3>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed mb-4">
                            영위 품목 특성에 맞는 맞춤형 스마트 오더, 위생 지원사업, 국비 지원사업을 필터링합니다.
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                              { label: "🍲 외식업 및 한식/일식/중식 식당", val: "일반외식업 (한식/식음료)" },
                              { label: "☕ 디저트, 카페 및 베이커리 빵집", val: "카페 및 베이커리 전문점" },
                              { label: "👗 매장 도소매, 유통 및 잡화 소매", val: "도소매 유통업" },
                              { label: "✂️ 미용실, 세탁소 등 개인 서비스업", val: "생활 밀착 서비스업" },
                              { label: "🏭 식품제조 가공 및 소상공 소제조", val: "소형 도심제조 가공업" },
                              { label: "📦 비대면 무점포 온라인 쇼핑몰", val: "온라인 쇼핑몰 및 커머스" }
                            ].map((item) => (
                              <button
                                key={item.val}
                                onClick={() => {
                                  setIsCustomIndustry(false);
                                  setProfile({ ...profile, industry: item.val });
                                }}
                                className={`p-3.5 rounded-xl border text-left text-xs font-bold transition-all relative ${
                                  !isCustomIndustry && profile.industry === item.val
                                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100"
                                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                                }`}
                              >
                                {item.label}
                                {!isCustomIndustry && profile.industry === item.val && (
                                  <span className="absolute top-1.5 right-3 bg-white/20 px-1.5 py-0.5 rounded text-[8px]">선택됨</span>
                                )}
                              </button>
                            ))}
                            <button
                              onClick={() => {
                                setIsCustomIndustry(true);
                                setProfile({ ...profile, industry: customIndustry.trim() || "기타 업종" });
                              }}
                              className={`p-3.5 rounded-xl border text-left text-xs font-bold transition-all relative ${
                                isCustomIndustry
                                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100"
                                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              <span>✏️ 기타 (직접 입력)</span>
                              {isCustomIndustry && (
                                <span className="absolute top-1.5 right-3 bg-white/20 px-1.5 py-0.5 rounded text-[8px]">선택됨</span>
                              )}
                            </button>
                          </div>

                          {isCustomIndustry && (
                            <div className="space-y-1.5 pt-1 animate-fade-in text-left">
                              <label className="text-[10px] font-bold text-slate-400 block">기타 업종 상세 입력</label>
                              <input
                                type="text"
                                value={customIndustry}
                                onChange={(e) => {
                                  setCustomIndustry(e.target.value);
                                  setProfile({ ...profile, industry: e.target.value });
                                }}
                                placeholder="예: 실내 스크린골프 연습장, 무인 스터디카페 등"
                                className="w-full text-xs px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Step 2: 상권 및 입지 환경 진단 */}
                      {qStep === 2 && (
                        <div className="space-y-4 animate-fade-in">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-extrabold">3</span>
                            <h3 className="text-sm font-extrabold text-slate-800">점포 상권의 입지 요건은 무엇인가요?</h3>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed mb-4">
                            상권 밀집 요건에 적합한 정부 소상공인 특화지원사업과 로컬 크리에이팅 마케팅 전략을 도출합니다.
                          </p>

                          <div className="grid grid-cols-1 gap-2.5 text-left">
                            {[
                              { label: "🏢 오피스 빌딩 밀집 중심가 먹자골목 (직장 고객 배후지)", val: "서울 마포구 공덕역 오피스 직장인 밀집 상권" },
                              { label: "🏡 아파트 대단지 및 주택밀집 동네생활상권 (가족, 동네고객 배후)", val: "경기도 수원 영통구 아파트 배후 골목상권" },
                              { label: "🎓 대학가 주변 및 젊은 유동층 고밀집 교통중심지 상권", val: "서울 마포구 신촌 홍대 역세권 청년 대학가 상권" },
                              { label: "🌾 외곽 간선도로변 및 지역 전통시장 집객 요충지 상권", val: "강원 원주시 단계동 일반도로변 전통시장 요새 상권" },
                              { label: "🌐 고정 점포 없는 100% 무점포형 온라인 쇼핑몰 및 유통", val: "고정점포 없는 온라인 중심 비대면 유통 영업" }
                            ].map((item) => (
                              <button
                                key={item.val}
                                onClick={() => {
                                  setIsCustomLocation(false);
                                  setProfile({ ...profile, location: item.val });
                                }}
                                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                                  !isCustomLocation && profile.location === item.val
                                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100"
                                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                                }`}
                              >
                                <span>{item.label}</span>
                                {!isCustomLocation && profile.location === item.val && (
                                  <span className="bg-white/20 px-2 py-0.5 rounded text-[8px] shrink-0 ml-2">선택됨</span>
                                )}
                              </button>
                            ))}
                            <button
                              onClick={() => {
                                setIsCustomLocation(true);
                                setProfile({ ...profile, location: customLocation.trim() || "기타 상권지법" });
                              }}
                              className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                                isCustomLocation
                                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100"
                                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              <span>✏️ 기타 (직접 입력)</span>
                              {isCustomLocation && (
                                <span className="bg-white/20 px-2 py-0.5 rounded text-[8px] shrink-0 ml-2">선택됨</span>
                              )}
                            </button>
                          </div>

                          {isCustomLocation && (
                            <div className="space-y-1.5 pt-1 animate-fade-in text-left">
                              <label className="text-[10px] font-bold text-slate-400 block">기타 자영업 상권/입지 상세 입력</label>
                              <input
                                type="text"
                                value={customLocation}
                                onChange={(e) => {
                                  setCustomLocation(e.target.value);
                                  setProfile({ ...profile, location: e.target.value });
                                }}
                                placeholder="예: 부산 해운대 해수욕장 근처 관광 상권, 한옥 마을 내 독립 매점 등"
                                className="w-full text-xs px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Step 3: 점포의 현재 업력 기한 */}
                      {qStep === 3 && (
                        <div className="space-y-4 animate-fade-in">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-extrabold">4</span>
                            <h3 className="text-sm font-extrabold text-slate-800">대표님의 사업자등록증상 운영 연한은?</h3>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed mb-4">
                            대다수 지원책은 '창업기(7년 미만)', '데스밸리(3년~5년)' 등 명확한 국가 요건 테이블을 기준으로 가점이 부여되므로 매우 중요합니다.
                          </p>

                          <div className="grid grid-cols-2 gap-3 text-left">
                            {[
                              { label: "🌱 1년 미만", desc: "신규 창업 및 기초 구축기", val: "1년 미만" },
                              { label: "📈 1년 이상 ~ 3년 미만", desc: "도약 촉진 및 안착기", val: "1년~3년" },
                              { label: "⚠️ 3년 이상 ~ 5년 미만", desc: "첫 데스밸리 비정상 극복기", val: "3년~5년" },
                              { label: "👑 5년 이상", desc: "장기 생존 및 혁신 승계기", val: "5년 이상" }
                            ].map((item) => (
                              <button
                                key={item.val}
                                onClick={() => {
                                  setIsCustomYearsOfOp(false);
                                  setProfile({ ...profile, yearsOfOp: item.val });
                                }}
                                className={`p-4 rounded-xl border text-left transition-all ${
                                  !isCustomYearsOfOp && profile.yearsOfOp === item.val
                                    ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100"
                                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                                }`}
                              >
                                <span className="block text-xs font-extrabold">{item.label}</span>
                                <span className={`block text-[10px] mt-1 ${!isCustomYearsOfOp && profile.yearsOfOp === item.val ? "text-blue-100" : "text-slate-400"}`}>{item.desc}</span>
                              </button>
                            ))}
                            <button
                              onClick={() => {
                                setIsCustomYearsOfOp(true);
                                setProfile({ ...profile, yearsOfOp: customYearsOfOp.trim() || "기타 업력" });
                              }}
                              className={`p-4 rounded-xl border text-left transition-all col-span-2 ${
                                isCustomYearsOfOp
                                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100"
                                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              <span className="block text-xs font-extrabold">✏️ 기타 (직접 입력)</span>
                              <span className={`block text-[10px] mt-1 ${isCustomYearsOfOp ? "text-blue-100" : "text-slate-400"}`}>위 보기 중 해당하는 운영 연한이 없는 경우 직접 기재합니다.</span>
                            </button>
                          </div>

                          {isCustomYearsOfOp && (
                            <div className="space-y-1.5 pt-1 animate-fade-in text-left">
                              <label className="text-[10px] font-bold text-slate-400 block">기타 운영 연한 상세 입력</label>
                              <input
                                type="text"
                                value={customYearsOfOp}
                                onChange={(e) => {
                                  setCustomYearsOfOp(e.target.value);
                                  setProfile({ ...profile, yearsOfOp: e.target.value });
                                }}
                                placeholder="예: 사업자등록 예정인 예비창업자, 10년 이상 가업승계 점포 등"
                                className="w-full text-xs px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Step 4: 기지원 및 금융 부채 상태 */}
                      {qStep === 4 && (
                        <div className="space-y-4 animate-fade-in">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-extrabold">5</span>
                            <h3 className="text-sm font-extrabold text-slate-800">국가 정책 자금 수혜 이력이나 채무 상태</h3>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed mb-4">
                            신용보증재단 중신용 저리대출(희망대환론) 및 고금리(7% 이상) 자영업 부채 갈아타기 매칭에 사용됩니다.
                          </p>

                          <div className="grid grid-cols-1 gap-2.5 text-left font-bold">
                            {[
                              { label: "❌ 정부 지원 자금 및 공공 보증 융자를 이용해 본 이력이 전혀 없음", val: "대출 지원 이력 없음 (생애 최초)" },
                              { label: "🏦 지역 보증재단 등에서 저리 정책 융자(3천만원 이하) 상환 진행 중", val: "지역 신용보증재단 3천만원 대출 상환 잔고 보유" },
                              { label: "🧑‍⚖️ 중진공/소진공 직접대출 혹은 무상 국비 지원사업 선정 이력 보유", val: "소진공 직접융자 및 지원사업 선정 이력 보유" },
                              { label: "🚨 제2금융권 및 일반 민간 고금리 대출이자 압박으로 경영 자금 극심", val: "제2금융권 고금리 대출 보유 (저리 대환 연상 필요)" }
                            ].map((item) => (
                              <button
                                key={item.val}
                                onClick={() => {
                                  setIsCustomPriorSupport(false);
                                  setProfile({ ...profile, priorSupport: item.val });
                                }}
                                className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                                  !isCustomPriorSupport && profile.priorSupport === item.val
                                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                                }`}
                              >
                                <span>{item.label}</span>
                                {!isCustomPriorSupport && profile.priorSupport === item.val && (
                                  <span className="bg-white/20 px-2 py-0.5 rounded text-[8px] shrink-0 ml-2">선택됨</span>
                                )}
                              </button>
                            ))}
                            <button
                              onClick={() => {
                                setIsCustomPriorSupport(true);
                                setProfile({ ...profile, priorSupport: customPriorSupport.trim() || "기타 채무상태" });
                              }}
                              className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                                isCustomPriorSupport
                                  ? "bg-blue-600 text-white border-blue-600 shadow-md"
                                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              <span>✏️ 기타 (직접 입력)</span>
                              {isCustomPriorSupport && (
                                <span className="bg-white/20 px-2 py-0.5 rounded text-[8px] shrink-0 ml-2">선택됨</span>
                              )}
                            </button>
                          </div>

                          {isCustomPriorSupport && (
                            <div className="space-y-1.5 pt-1 animate-fade-in text-left">
                              <label className="text-[10px] font-bold text-slate-400 block">기타 채무/정부지원 상태 기재</label>
                              <input
                                type="text"
                                value={customPriorSupport}
                                onChange={(e) => {
                                  setCustomPriorSupport(e.target.value);
                                  setProfile({ ...profile, priorSupport: e.target.value });
                                }}
                                placeholder="예: 사채 및 지인 차용 압박, 햇살론 1천만원 금리 대리 고심 등"
                                className="w-full text-xs px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Step 5: 현재 시급한 경영 애로사항 (복수 선택) */}
                      {qStep === 5 && (
                        <div className="space-y-4 animate-fade-in text-left">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-extrabold">6</span>
                            <h3 className="text-sm font-extrabold text-slate-800">대표님 점포의 주요 골칫거리/애로사항 (복수 선택)</h3>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed mb-3">
                            체크해주신 애로 사항에 맞춤형 국비 해결 매커니즘을 3개 로드맵 단계로 즉시 매칭하여 보고서를 출력합니다.
                          </p>

                          <div className="grid grid-cols-1 gap-2 max-h-[190px] overflow-y-auto pr-1">
                            {[
                              { label: "💸 자재원가 급상승으로 마진 압박", desc: "식자재 및 부자재 유통 비용 폭증 부담", val: "원자재단가 인상 마진 훼손" },
                              { label: " 대형 경쟁사 및 가맹 점포 전면 침입", desc: "지엽 가격 공세와 단골 고객 분산", val: "대형 경쟁사 진입에 다른 마케팅 보완 필요성" },
                              { label: "👨‍🍳 근로 직원 상시 구인난 및 근로 인건비 가중", desc: "홀 임시직원/주방 인력 부족 심화", val: "인력난 해소 및 매핑 테이블 수동화 요구" },
                              { label: "📱 온라인 스마트플레이스 검색 노출 저하 및 부재", desc: "네이버 신규 유입 및 온라인 검색 시인성 상실", val: "온라인 스마트 홍보 최적화" },
                              { label: "🏠 연간 점포 고정 임대 상향 지출 압박", desc: "월 상가 권리 분쟁 우려", val: "임대 단가 압력 대응책 수집" },
                              { label: "📉 고이자 부채 금융 이자 상환 부담 과중", desc: "거치 상환 연기 만기 도래에 따른 압축", val: "금융 채무 완화 희망 대환 연계론" },
                              ...additionalConcerns
                            ].map((item) => {
                              const isSelected = selectedConcerns.includes(item.val);
                              return (
                                <button
                                  key={item.val}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedConcerns(selectedConcerns.filter(x => x !== item.val));
                                    } else {
                                      setSelectedConcerns([...selectedConcerns, item.val]);
                                    }
                                  }}
                                  className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                                    isSelected
                                      ? "bg-blue-50/80 text-blue-900 border-blue-500"
                                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  <div className="mt-0.5">
                                    {isSelected ? (
                                      <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                                    ) : (
                                      <div className="w-4 h-4 rounded border border-slate-300 shrink-0 bg-white" />
                                    )}
                                  </div>
                                  <div>
                                    <span className="block text-xs font-bold">{item.label}</span>
                                    <span className="block text-[10px] text-slate-400 mt-0.5">{item.desc}</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          <div className="pt-2 border-t border-slate-100 space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 block">골칫거리/애로사항 직접 입력 추가</span>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={customConcernInput}
                                onChange={(e) => setCustomConcernInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (customConcernInput.trim()) {
                                      const text = customConcernInput.trim();
                                      const newOption = {
                                        label: `💡 직접입력: ${text}`,
                                        desc: "대표님께서 입력해 주신 구체적 애로사항입니다.",
                                        val: text
                                      };
                                      setAdditionalConcerns([...additionalConcerns, newOption]);
                                      setSelectedConcerns([...selectedConcerns, text]);
                                      setCustomConcernInput("");
                                    }
                                  }
                                }}
                                placeholder="여기에 골칫거리를 적고 추가 버튼이나 엔터를 누르세요..."
                                className="flex-1 text-xs px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 font-semibold"
                              />
                              <button
                                onClick={() => {
                                  if (customConcernInput.trim()) {
                                    const text = customConcernInput.trim();
                                    const newOption = {
                                      label: `💡 직접입력: ${text}`,
                                      desc: "대표님께서 입력해 주신 구체적 애로사항입니다.",
                                      val: text
                                    };
                                    setAdditionalConcerns([...additionalConcerns, newOption]);
                                    setSelectedConcerns([...selectedConcerns, text]);
                                    setCustomConcernInput("");
                                  }
                                }}
                                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shrink-0"
                              >
                                추가
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Navigation Bar inside Multiple Choice Card */}
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between shrink-0">
                      <button
                        onClick={() => qStep > 0 && setQStep(qStep - 1)}
                        disabled={qStep === 0}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          qStep > 0
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            : "bg-slate-50 text-slate-300 cursor-not-allowed"
                        }`}
                      >
                        이전 단계
                      </button>

                      {qStep < 5 ? (
                        <button
                          onClick={() => {
                            // Check validation per step
                            if (qStep === 0 && !profile.clientName.trim()) {
                              alert("상호명을 입력하시거나 아래 추천 예시 중 하나를 클릭해 주십시오!");
                              return;
                            }
                            if (qStep === 1) {
                              if (isCustomIndustry && !customIndustry.trim()) {
                                alert("기타 업종명을 직접 입력해 주십시오!");
                                return;
                              }
                              if (!profile.industry.trim()) {
                                alert("해당하시는 업종을 하나 선택해 주십시오!");
                                return;
                              }
                            }
                            if (qStep === 2) {
                              if (isCustomLocation && !customLocation.trim()) {
                                alert("기타 상권/입지 정보를 직접 입력해 주십시오!");
                                return;
                              }
                              if (!profile.location.trim()) {
                                alert("상권 정보를 입력하거나 선택해 주십시오!");
                                return;
                              }
                            }
                            if (qStep === 3) {
                              if (isCustomYearsOfOp && !customYearsOfOp.trim()) {
                                alert("기타 운영 연한을 직접 입력해 주십시오!");
                                return;
                              }
                              if (!profile.yearsOfOp.trim()) {
                                alert("해당하는 운영 연한을 입력하거나 선택해 주십시오!");
                                return;
                              }
                            }
                            if (qStep === 4) {
                              if (isCustomPriorSupport && !customPriorSupport.trim()) {
                                alert("기타 채무/지원 상태를 직접 입력해 주십시오!");
                                return;
                              }
                              if (!profile.priorSupport.trim()) {
                                alert("채무 및 보증 융자 수혜 상황을 선택해 주십시오!");
                                return;
                              }
                            }
                            setQStep(qStep + 1);
                          }}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md shadow-blue-100"
                        >
                          <span>다음 단계</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            const concernStr = selectedConcerns.length > 0 
                              ? selectedConcerns.join(" / ")
                              : "원자재단가 인상 마진 훼손 및 금융 압박";
                            
                            // commit concerns & run report
                            const updatedProfile = {
                              ...profile,
                              coreConcerns: concernStr
                            };
                            setProfile(updatedProfile);
                            
                            setGeneratingReport(true);
                            try {
                              const response = await fetch("/api/consult/report", {
                                method: "POST",
                                headers: getApiHeaders(),
                                body: JSON.stringify({
                                  clientProfile: updatedProfile,
                                  chatHistory: [{ role: "user", content: `객관식 단계별 문진 진단을 마쳤습니다. 선택 결과: 상호: ${updatedProfile.clientName}, 업종: ${updatedProfile.industry}, 위치: ${updatedProfile.location}, 업력: ${updatedProfile.yearsOfOp}, 금융: ${updatedProfile.priorSupport}, 애로사항: ${concernStr}` }]
                                })
                              });
                        
                              if (!response.ok) {
                                throw new Error("서버 보고서 생성 실패");
                              }
                        
                              const data = await response.json();
                              setReport(data);
                              addReportToHistory(data);
                              setReportGenerated(true);
                            } catch (err) {
                              console.error("Error creating report:", err);
                              const fallbackReport = {
                                ...DEFAULT_REPORT,
                                summary: {
                                  ...DEFAULT_REPORT.summary,
                                  clientName: profile.clientName || "익명 대표님 사업장"
                                }
                              };
                              setReport(fallbackReport);
                              addReportToHistory(fallbackReport);
                              setReportGenerated(true);
                            } finally {
                              setGeneratingReport(false);
                            }
                          }}
                          disabled={generatingReport}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-100"
                        >
                          {generatingReport ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              <span>분석 진단 중...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span>진단결과 리포트 출력</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Original Chat Assistant Console */
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[550px] overflow-hidden">
                    
                    {/* Chat Header */}
                    <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
                        <div>
                          <h3 className="text-xs font-extrabold text-slate-800">1:1 실시간 대화 진단실</h3>
                          <p className="text-[10px] text-slate-400 mt-0.5">순차 인터뷰를 통해 완격한 기초자료 수집</p>
                        </div>
                      </div>
                    </div>

                    {/* Messages Panel */}
                    <div className="flex-1 p-5 overflow-y-auto space-y-4">
                      {chatMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                            msg.role === "user" 
                              ? "bg-slate-800 text-white rounded-br-none" 
                              : "bg-blue-50/70 text-slate-700 border border-blue-100 rounded-bl-none font-medium"
                          }`}>
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                            <span className="block text-[9px] mt-1.5 text-right text-slate-400">
                              {msg.timestamp}
                            </span>
                          </div>
                        </div>
                      ))}
                      {sendingMessage && (
                        <div className="flex justify-start">
                          <div className="bg-slate-100 border border-slate-200 rounded-2xl rounded-bl-none p-4 text-xs text-slate-500 flex items-center gap-2">
                            <Loader className="w-3.5 h-3.5 animate-spin text-blue-600" />
                            <span>전략 컨설턴트 분석 중...</span>
                          </div>
                        </div>
                      )}
                      <div ref={chatBottomRef}></div>
                    </div>

                    {/* Message Input Panel */}
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2 shrink-0">
                      <input
                        type="text"
                        value={currentInput}
                        onChange={(e) => setCurrentInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !sendingMessage) handleSendMessage();
                        }}
                        placeholder="질문에 대한 내용을 편하게 작성하여 주십시오..."
                        className="flex-1 bg-white border border-slate-200 text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={sendingMessage || !currentInput.trim()}
                        className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-md shadow-blue-100"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                )}

              </div>

              {/* Right Column: Real-time Profile Status Cards */}
              <div className="w-full lg:w-72 flex flex-col gap-4">
                
                {/* Information Gathering Progress Checklist */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-3.5 border-b border-rose-100 pb-2">
                    데이터 획득 현황판
                  </h4>

                  <ul className="space-y-3.5">
                    <li className="flex items-center gap-2.5 text-xs">
                      {profile.clientName ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] shrink-0 font-bold text-slate-400">1</div>
                      )}
                      <div>
                        <span className={`font-bold ${profile.clientName ? "text-slate-800 line-through" : "text-slate-600"}`}>대표 상호명</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">{profile.clientName || "미확인"}</p>
                      </div>
                    </li>

                    <li className="flex items-center gap-2.5 text-xs">
                      {profile.industry ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] shrink-0 font-bold text-slate-400">2</div>
                      )}
                      <div>
                        <span className={`font-bold ${profile.industry ? "text-slate-800 line-through" : "text-slate-600"}`}>대표 업종 분야</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">{profile.industry || "미확인"}</p>
                      </div>
                    </li>

                    <li className="flex items-center gap-2.5 text-xs">
                      {profile.location ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] shrink-0 font-bold text-slate-400">3</div>
                      )}
                      <div>
                        <span className={`font-bold ${profile.location ? "text-slate-800 line-through" : "text-slate-600"}`}>지역 상권 입지</span>
                        <p className="text-[10px] text-slate-400 mt-0.5">{profile.location || "미확인"}</p>
                      </div>
                    </li>

                    <li className="flex items-center gap-2.5 text-xs">
                      {profile.coreConcerns ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] shrink-0 font-bold text-slate-400">4</div>
                      )}
                      <div>
                        <span className={`font-bold ${profile.coreConcerns ? "text-slate-800 line-through" : "text-slate-600"}`}>경영 애로 고민</span>
                        <p className="text-[10px] text-slate-400 mt-0.5 max-w-[180px] truncate">{profile.coreConcerns || "미확인"}</p>
                      </div>
                    </li>
                  </ul>

                  <div className="mt-5 pt-3.5 border-t border-slate-100">
                    <button
                      onClick={handleGenerateReport}
                      disabled={!isProfileComplete || generatingReport}
                      className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        isProfileComplete
                          ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-100"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      {generatingReport ? (
                        <>
                          <Loader className="w-4.5 h-4.5 animate-spin" />
                          <span>보고서 구축 중...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          <span>보고서 조출</span>
                        </>
                      )}
                    </button>
                    {!isProfileComplete && (
                      <p className="text-[10px] text-slate-400 text-center mt-2">
                        * 모든 수집 항목이 채워지면 보고서 작성이 가능합니다.
                      </p>
                    )}
                  </div>
                </div>

                {/* Instant Fill Help Panel */}
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-[11px] text-amber-800">
                  <span className="font-extrabold flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                    빠른 인터뷰 요령
                  </span>
                  <p className="mt-1 leading-relaxed">
                    대화하기가 길어질 경우, 원하시면 한 번에 "마포 공덕 먹거리 골목에서 3년째 국밥집 소담한식국밥을 운영하고 있는데, 수입원료 폭등으로 마진이 25% 이하로 떨어지고 마땅한 마케팅이 없습니다" 와 같이 하나의 문장으로 모두 적어도 한 번에 파싱 처리되어 바로 리포트 작성이 활성화됩니다.
                  </p>
                </div>

              </div>

            </div>
          )}

          {/* CONSULTING REPORT INTERACTIVE INTERFACE (Output Format Compliant) */}
          {reportGenerated && report && (
            <div className="max-w-4xl mx-auto w-full space-y-8 animate-fade-in pb-16">
              
              {/* Back to Edit Button Bar */}
              <div id="report-control" className="pdf-exclude flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping shrink-0"></div>
                  <span className="text-xs font-extrabold text-slate-700">
                    실시간 보조금 및 상권 DB 정보가 대칭 매칭된 정밀 처방 리포트
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDownloadPdf}
                    disabled={exportingPdf}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-lg transition-all shadow-sm cursor-pointer"
                  >
                    {exportingPdf ? (
                      <>
                        <Loader className="w-3.5 h-3.5 animate-spin" />
                        <span>PDF 저장 중...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF 저장</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleCopyMarkdown}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">복사 완료</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>원문 복사</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setReportGenerated(false);
                      setReport(null);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors shadow-sm cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>재조정 (수정)</span>
                  </button>
                </div>
              </div>

              {/* capture layout element wrapping the detailed contents */}
              <div id="consulting-report-container" className="space-y-8">
                {/* SECTION 1: Dashboard */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
                  <div className="bg-slate-900 p-5 md:p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">
                      REPORT SECTION 1
                    </span>
                    <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
                      📌 1. 클라이언트 종합 진단 대시보드
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      공덕역 상권 트렌드 분석 및 상권정보시스템 대조를 통한 업종 건전성 평가
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
                    <span className="text-xs font-bold text-slate-400">종합 위험도 수준:</span>
                    <span className={`text-xs font-black tracking-widest px-2.5 py-0.5 rounded-full ${
                      report.summary.dangerLevel === "HIGH" || report.summary.dangerLevel === "고"
                        ? "bg-red-500/20 text-red-400 border border-red-500/40"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                    }`}>
                      {report.summary.dangerLevel}
                    </span>
                  </div>
                </div>

                <div className="p-6 md:p-8 space-y-8">
                  
                  {/* Basic Client Metadata Badges */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">상호/브랜드명</span>
                      <span className="text-xs font-extrabold text-slate-800 truncate block">{report.summary.clientName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">영위업종</span>
                      <span className="text-xs font-extrabold text-slate-800 truncate block">{report.summary.industry}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">상권 소재지</span>
                      <span className="text-xs font-extrabold text-slate-800 truncate block">{report.summary.location}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">업력</span>
                      <span className="text-xs font-extrabold text-slate-800 block">{report.summary.yearsOfOp}</span>
                    </div>
                  </div>

                  {/* 상담 핵심 요약 토글 & 2D 고민 클러스터 관계 차트 시각화 */}
                  <div className="bg-slate-50 rounded-3xl p-5 border border-slate-200/80 shadow-sm" id="key-summary-toggle-container">
                    <div className="flex items-center justify-between border-b border-slate-200/60 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                          <MessageSquare className="w-4 h-4 text-indigo-600 animate-bounce" />
                        </div>
                        <div className="text-left">
                          <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                            💬 상담 핵심 고민 2D 클러스터 차트 요약
                            <span className="text-[9px] bg-indigo-100 text-indigo-700 font-black px-2 py-0.5 rounded-full">AI 분석</span>
                          </h4>
                          <p className="text-[10.5px] text-slate-500 font-semibold mt-0.5">상담 과정과 사장님의 주된 고민 맥락을 2차원 공간에 배치하고 연간 관계를 시각화한 대화형 핵심 지도입니다.</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowKeySummary(!showKeySummary)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1 border cursor-pointer shrink-0 ${
                          showKeySummary 
                            ? "bg-slate-200/80 hover:bg-slate-300/80 text-slate-700 border-slate-300" 
                            : "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 shadow-sm"
                        }`}
                      >
                        {showKeySummary ? "차트 접기" : "클러스터 차트 열기"}
                      </button>
                    </div>

                    {showKeySummary && (
                      <div className="space-y-4">
                        <KeywordClusterChart keywords={report.keyKeywords} />
                        <p className="text-[10.5px] font-semibold text-slate-500 text-left leading-relaxed bg-white border border-slate-200 rounded-xl px-4 py-3">
                          💡 <span className="text-indigo-600 font-black">AI 2D 토폴로지 분석 조견:</span> 추출된 인근 토픽들은 대표님이 직면하신 비용 상권 마찰 요인을 무상 지원 연계 및 자동 기술 도입 트랙으로 해결하기 위한 우선 순위 이정표입니다. 노드를 직접 클릭하여 세부 처방 구조도와 관련 로드맵 연결고리를 입체적으로 확인하실 수 있습니다.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Commercial Analysis and Dynamic SVG Recharts visualization */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-1.5 flex items-center justify-between">
                        <span>■ 상권 및 입지 분석</span>
                        <span className="text-[10px] font-normal text-slate-400">2026년 반기 실시간 기준</span>
                      </h4>
                      <p className="text-xs leading-relaxed text-slate-600 whitespace-pre-wrap">
                        {report.commercialAnalysis.text}
                      </p>
                      
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 block">공식 공인 대조 출처</span>
                        {report.commercialAnalysis.sources.map((src, i) => (
                          <a
                            key={i}
                            href={src.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline"
                          >
                            <span>[출처: {src.name}]</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* Chart Container */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] font-black text-blue-600 block mb-1">상권 유동인구/매출 추정 트렌드</span>
                        <span className="text-xs font-extrabold text-slate-700">이면상권 기준 활동성 우하향 지표</span>
                      </div>

                      <div className="h-44 w-full mt-2">
                        {report.commercialAnalysis.chartsData && report.commercialAnalysis.chartsData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={report.commercialAnalysis.chartsData}
                              margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip contentStyle={{ fontSize: 11 }} />
                              <Legend wrapperStyle={{ fontSize: 10 }} />
                              <Line
                                type="monotone"
                                dataKey="value"
                                name="우리 점포 상권지수"
                                stroke="#2563eb"
                                strokeWidth={2.5}
                                activeDot={{ r: 6 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="benchmark"
                                name="지자체 평균지수"
                                stroke="#94a3b8"
                                strokeDasharray="5 5"
                                strokeWidth={1.5}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="h-full flex items-center justify-center text-[11px] text-slate-400">
                            차트 데이터 제공 불가
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Competitor Density Heatmap Analysis Section */}
                  {report.competitorHeatmap && (
                    <CompetitorHeatmap data={report.competitorHeatmap} />
                  )}

                  {/* Business Status Summary Table */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-1.5">
                      ■ 비즈니스 상태 종합 요약표
                    </h4>
                    
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                            <th className="px-4 py-3">분야</th>
                            <th className="px-4 py-3">결함/상동 상태</th>
                            <th className="px-4 py-3">진단 위험도</th>
                            <th className="px-4 py-3">상세 진단 요지</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.statusTable.map((row, idx) => (
                            <tr key={idx} className="border-b last:border-none border-slate-100 hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-bold text-slate-800">{row.field}</td>
                              <td className="px-4 py-3 font-semibold text-slate-500">{row.status}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                  row.risk === "DANGER" || row.risk === "위험"
                                    ? "bg-red-50 text-red-700 border border-red-200"
                                    : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}>
                                  {row.risk}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[11px] text-slate-600">{row.diagnosis}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* SWOT Quadrant Matrix */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-widest border-b border-slate-100 pb-1.5">
                      ■ SWOT 핵심 요약 매트릭스
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Strength Card */}
                      <div className="bg-gradient-to-br from-emerald-50/55 to-white border border-emerald-100 p-4.5 rounded-xl space-y-1.5 shadow-sm">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Strength (강점)</span>
                        <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                          {report.swot.strength.map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Weakness Card */}
                      <div className="bg-gradient-to-br from-red-50/55 to-white border border-red-100 p-4.5 rounded-xl space-y-1.5 shadow-sm">
                        <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">Weakness (약점)</span>
                        <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                          {report.swot.weakness.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Opportunity Card */}
                      <div className="bg-gradient-to-br from-blue-50/55 to-white border border-blue-100 p-4.5 rounded-xl space-y-1.5 shadow-sm">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Opportunity (기회)</span>
                        <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                          {report.swot.opportunity.map((o, idx) => (
                            <li key={idx}>{o}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Threat Card */}
                      <div className="bg-gradient-to-br from-amber-50/55 to-white border border-amber-100 p-4.5 rounded-xl space-y-1.5 shadow-sm">
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Threat (위험요소)</span>
                        <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
                          {report.swot.threat.map((t, idx) => (
                            <li key={idx}>{t}</li>
                          ))}
                        </ul>
                      </div>

                    </div>

                    <div className="mt-2 text-right">
                      {report.swot.sources?.map((src, i) => (
                        <a
                          key={i}
                          href={src.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:underline"
                        >
                          <span>[출처: {src.name}]</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  </div>

                </div>
              </div>

              {/* SECTION 2: 3-Step Execution Solutions */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
                <div className="bg-slate-900 p-5 md:p-6 text-white">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">
                    REPORT SECTION 2
                  </span>
                  <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
                    💡 2. 고민별 3단계 실행 솔루션
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    대표님이 겪고 계신 가장 핵심적인 근본적 고민과 정부지원책 융합 최선의 대책
                  </p>
                </div>

                <div className="p-6 md:p-8 space-y-8 divide-y divide-slate-100">
                  {report.solutions.map((sol, idx) => (
                    <div key={idx} className={`space-y-4 ${idx !== 0 ? "pt-6" : ""}`}>
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-xs shadow-sm">
                          {idx + 1}
                        </span>
                        <h3 className="text-[14px] md:text-[15px] font-black text-slate-800">
                          고민 사항: {sol.concern}
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* 1단계: 현상 진단 */}
                        <div className="bg-slate-50 rounded-xl p-4.5 border border-slate-200 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-black text-red-600 block mb-1.5 uppercase">
                              1단계 [현상 진단]
                            </span>
                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                              {sol.diagnosis.text}
                            </p>
                          </div>
                          
                          <div className="mt-3.5 pt-3 border-t border-slate-200">
                            {sol.diagnosis.sources.map((src, sIdx) => (
                              <a
                                key={sIdx}
                                href={src.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-blue-600 hover:underline"
                              >
                                <span>[출처: {src.name}]</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ))}
                          </div>
                        </div>

                        {/* 2단계: 실행 지침 */}
                        <div className="bg-blue-50/40 rounded-xl p-4.5 border border-blue-200/60 flex flex-col justify-between md:col-span-1">
                          <div>
                            <span className="text-[10px] font-black text-blue-600 block mb-1.5 uppercase">
                              2단계 [실행 지침]
                            </span>
                            <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                              {sol.guidelines.text}
                            </p>
                          </div>
                          
                          <div className="mt-3.5 pt-3 border-t border-blue-100">
                            {sol.guidelines.sources.map((src, sIdx) => (
                              <a
                                key={sIdx}
                                href={src.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-blue-700 hover:underline"
                              >
                                <span>[출처: {src.name}]</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ))}
                          </div>
                        </div>

                        {/* 3단계: 기대효과 및 KPI */}
                        <div className="bg-emerald-50/20 rounded-xl p-4.5 border border-emerald-200/50 flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-black text-emerald-700 block mb-1.5 uppercase">
                              3단계 [기대효과 및 KPI]
                            </span>
                            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                              {sol.kpi.text}
                            </p>
                          </div>
                          
                          <div className="mt-3.5 pt-3 border-t border-emerald-100 flex items-center justify-between text-[10px] text-emerald-700 font-bold">
                            <span>측정 주기: 월간</span>
                            <span>평가 주기: 분기별</span>
                          </div>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: Immediate Execution Roadmap (Interactive Checkable List) */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden">
                <div className="bg-slate-900 p-5 md:p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">
                      REPORT SECTION 3
                    </span>
                    <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
                      🎯 3. 즉시 실행 로드맵
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      대표님이 당장 오늘부터 처리해야 할 우선순위 조달 핵심 체크리스트
                    </p>
                  </div>

                  <span className="text-xs font-bold bg-blue-600 text-white px-3 py-1 rounded-full text-right shrink-0">
                    대칭 가설 기간: 60일 완결
                  </span>
                </div>

                <div className="p-6 md:p-8 space-y-6">
                  
                  {/* Timeline Tree Component */}
                  <div className="relative border-l border-slate-200 pl-6 ml-3 space-y-8">
                    {report.roadmap.map((step, idx) => (
                      <div key={idx} className="relative">
                        
                        {/* Circle Indicator on vertical timeline */}
                        <span className="absolute -left-9.5 top-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold border-4 border-slate-50 shadow-md">
                          {idx + 1}
                        </span>

                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-lg border-b border-slate-200">
                            <span className="text-[13px] font-black text-slate-800">{step.phase}</span>
                            <span className="text-[10.5px] font-black bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full border border-slate-300 shadow-sm shrink-0 uppercase tracking-wide">
                              {step.duration}
                            </span>
                          </div>

                          {/* Task Checkboxes */}
                          <ul className="space-y-2 pl-2">
                            {step.tasks.map((task, tIdx) => {
                              const taskKey = `${idx}-${tIdx}`;
                              const isDone = completedTasks[taskKey];
                              return (
                                <li 
                                  key={tIdx}
                                  onClick={() => toggleTask(taskKey)}
                                  className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-slate-50/50 cursor-pointer transition-colors"
                                >
                                  {isDone ? (
                                    <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-300 hover:text-blue-500 shrink-0 mt-0.5" strokeWidth={2} />
                                  )}
                                  <span className={`text-xs ${isDone ? "text-slate-400 line-through" : "text-slate-700 font-medium"}`}>
                                    {task}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>

                          {/* Official Web/Regulations portals Links matching this phase */}
                          <div className="pl-2 pt-2.5 flex flex-wrap gap-2">
                            {step.links.map((lnk, lIdx) => (
                              <a
                                key={lIdx}
                                href={lnk.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-black text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-2.5 py-1 rounded-md transition-all shadow-sm"
                              >
                                <BookOpen className="w-3 h-3 text-blue-500" />
                                <span>{lnk.title}</span>
                                <ExternalLink className="w-2.5 h-2.5 text-blue-400" />
                              </a>
                            ))}
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Complete Roadmap Congrats Widget */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl p-5 md:p-6 mt-8 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-lg shadow-blue-100">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-5 h-5 text-blue-200" />
                        로드맵 실시간 수행율 트래커
                      </h4>
                      <p className="text-xs text-blue-100">
                        위 단계별 과제를 체크하여 수행율을 관리하십시오. 모든 임무 완료 시 성공 확률이 대폭 가배정됩니다.
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase font-bold text-blue-200 tracking-widest block mb-0.5">수행율</span>
                      <span className="text-2xl font-black">
                        {Math.round(
                          (Object.values(completedTasks).filter(Boolean).length /
                            (report.roadmap.reduce((acc, step) => acc + step.tasks.length, 0) || 1)) * 100
                        )}%
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              </div> {/* closing id="consulting-report-container" */}
            </div>
          )}

        </main>
      </div>

      {/* -------------------- CONSULTING HISTORY MODAL -------------------- */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-slate-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <h3 className="text-sm font-extrabold text-slate-800">📋 경영 진단 컨설팅 수행 이력</h3>
                  <p className="text-[11px] text-slate-500">이전 보고서들을 조회하고 조치 수행 변화 추이를 교차 비교합니다.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsHistoryOpen(false);
                  setCompareActive(false);
                }}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-hidden flex flex-col bg-slate-50">
              {compareActive ? (
                /* --- Side-by-Side Comparison Screen --- */
                (() => {
                  const repA = historyReports.find(r => r.id === selectedCompareIds[0]);
                  const repB = historyReports.find(r => r.id === selectedCompareIds[1]);

                  if (!repA || !repB) {
                    return (
                      <div className="flex-1 flex flex-col items-center justify-center p-8">
                        <AlertTriangle className="w-12 h-12 text-amber-500 mb-2" />
                        <h4 className="font-bold text-slate-800">선택된 리포트를 찾을 수 없습니다.</h4>
                        <p className="text-xs text-slate-500 mt-1">리포트 목록으로 돌아가 다시 선택해 주십시오.</p>
                        <button
                          onClick={() => setCompareActive(false)}
                          className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
                        >
                          목록으로 돌아가기
                        </button>
                      </div>
                    );
                  }

                  // Compute progress values
                  const compA = Object.values(repA.completedTasks || {}).filter(Boolean).length;
                  const totA = repA.report.roadmap.reduce((acc, step) => acc + step.tasks.length, 0) || 1;
                  const ratioA = Math.round((compA / totA) * 100);

                  const compB = Object.values(repB.completedTasks || {}).filter(Boolean).length;
                  const totB = repB.report.roadmap.reduce((acc, step) => acc + step.tasks.length, 0) || 1;
                  const ratioB = Math.round((compB / totB) * 100);

                  // Recharts Data formulation
                  const getChartVal = (repItem: typeof repA, index: number) => {
                    return repItem.report.commercialAnalysis?.chartsData?.[index]?.value || 0;
                  };

                  const marginValA = getChartVal(repA, 0);
                  const marginValB = getChartVal(repB, 0);

                  const rentValA = getChartVal(repA, 1);
                  const rentValB = getChartVal(repB, 1);

                  const flowValA = getChartVal(repA, 2);
                  const flowValB = getChartVal(repB, 2);

                  const comparisonChartData = [
                    { name: "영업이익률 (%)", 과거: marginValA, 최근: marginValB },
                    { name: "임차료배율 (배)", 과거: rentValA, 최근: rentValB },
                    { name: "유동인구지수", 과거: flowValA, 최근: flowValB }
                  ];

                  // Helper function to render danger levels beautifully
                  const renderDangerBadge = (level: string) => {
                    if (level === "HIGH" || level === "DANGER") {
                      return <span className="px-2.5 py-1 text-[10px] font-extrabold bg-red-100 text-red-700 rounded border border-red-200">🔴 고위험 위험상태</span>;
                    }
                    if (level === "MEDIUM" || level === "CAUTION") {
                      return <span className="px-2.5 py-1 text-[10px] font-extrabold bg-amber-100 text-amber-700 rounded border border-amber-200">🟡 중경고 관리상태</span>;
                    }
                    return <span className="px-2.5 py-1 text-[10px] font-extrabold bg-green-100 text-green-700 rounded border border-green-200">🟢 상권 지속가능/안전</span>;
                  };

                  return (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      {/* Top Control inside Comparison */}
                      <div className="bg-white px-6 py-3 border-b border-slate-200 flex items-center justify-between shrink-0">
                        <button
                          onClick={() => setCompareActive(false)}
                          className="flex items-center gap-1 text-xs text-blue-600 font-extrabold hover:underline cursor-pointer"
                        >
                          ← 진단 이력 목록으로 돌아가기
                        </button>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Scale className="w-4 h-4 text-slate-400" />
                          <span>두 진단 시점 간의 시계열 교차 비교 분석 레포트</span>
                        </div>
                      </div>

                      {/* Main Comparison Area */}
                      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                        
                        {/* Summary side-by-side header cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Earlier Assessment */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <span className="absolute top-0 right-0 bg-slate-100 text-slate-600 text-[9px] font-extrabold px-3 py-1 rounded-bl">
                              과거 진단 시점
                            </span>
                            <div className="space-y-2 text-left">
                              <span className="block text-xs font-bold text-slate-400">{repA.timestamp}</span>
                              <h4 className="text-base font-extrabold text-slate-800">{repA.report.summary.clientName}</h4>
                              <p className="text-xs text-slate-500 font-medium">{repA.report.summary.industry} | {repA.report.summary.location}</p>
                              <div className="pt-2 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400">종합 위기 지표:</span>
                                {renderDangerBadge(repA.report.summary.dangerLevel)}
                              </div>
                            </div>
                          </div>

                          {/* Later Assessment */}
                          <div className="bg-white p-5 rounded-2xl border-2 border-blue-500 shadow-sm relative overflow-hidden">
                            <span className="absolute top-0 right-0 bg-blue-600 text-white text-[9px] font-extrabold px-3 py-1 rounded-bl">
                              최근 진단 시점
                            </span>
                            <div className="space-y-2 text-left">
                              <span className="block text-xs font-bold text-blue-500">{repB.timestamp}</span>
                              <h4 className="text-base font-extrabold text-slate-800">{repB.report.summary.clientName}</h4>
                              <p className="text-xs text-slate-500 font-medium">{repB.report.summary.industry} | {repB.report.summary.location}</p>
                              <div className="pt-2 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400">종합 위기 지표:</span>
                                {renderDangerBadge(repB.report.summary.dangerLevel)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Middle grid: checklist & chart comparison */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                          
                          {/* Progress comparison */}
                          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 text-left space-y-4">
                            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                              개선 로드맵 실행도 변화 추이
                            </h4>
                            
                            <div className="space-y-5 pt-1">
                              <div>
                                <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                                  <span className="text-slate-500">과거 진단 조치율</span>
                                  <span className="text-slate-700">{compA} / {totA} ({ratioA}%)</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                  <div className="bg-slate-400 h-full rounded-full" style={{ width: `${ratioA}%` }}></div>
                                </div>
                              </div>

                              <div className="flex items-center justify-center py-1">
                                <div className="flex flex-col items-center">
                                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                    조치 수행률 {ratioB - ratioA >= 0 ? `+${ratioB - ratioA}%p 상승` : `${ratioB - ratioA}%p 변화`}
                                  </span>
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                                  <span className="text-blue-600 flex items-center gap-1">최근 진단 조치율 <Sparkles className="w-3 h-3 text-amber-500" /></span>
                                  <span className="text-blue-700">{compB} / {totB} ({ratioB}%)</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                  <div className="bg-blue-600 h-full rounded-full" style={{ width: `${ratioB}%` }}></div>
                                </div>
                              </div>
                            </div>

                            <p className="text-[10px] text-slate-400 leading-relaxed pt-2">
                              대표님께서 맞춤 해결책 요령으로 부여된 로드맵을 지침 순으로 해소하셨을 때의 종합 경영 조치 진행율 변화 결과입니다. 지속적인 조치 체크가 성공 확률을 점진적으로 가배정합니다.
                            </p>
                          </div>

                          {/* Chart comparison */}
                          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 text-left space-y-3">
                            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                              <TrendingUp className="w-4 h-4 text-blue-500" />
                              상권 활성 지표 및 경영수지 대비 분석
                            </h4>
                            <div className="h-44 w-full pt-1">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={comparisonChartData}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                  <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: "bold" }} />
                                  <YAxis tick={{ fontSize: 10 }} />
                                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                                  <Legend wrapperStyle={{ fontSize: 10, fontWeight: "bold" }} />
                                  <Bar dataKey="과거" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="과거 진단 수치" />
                                  <Bar dataKey="최근" fill="#2563eb" radius={[4, 4, 0, 0]} name="최근 진단 수치" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-relaxed">
                              * 음식점업 마진률 격상 사업장(3%~15%), 월 고정비 세액 부담 임차률 배율(단위 배), 동네 상권 배후 유동인구 기점 변화율 추이를 비교합니다.
                            </p>
                          </div>
                        </div>

                        {/* SWOT Analysis change comparison side-by-side */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 text-left space-y-4">
                          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                            <Layers className="w-4 h-4 text-indigo-500" />
                            상권 SWOT 전략 핵심 변천 및 해법 고도화 비교
                          </h4>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
                            {/* SWOT A */}
                            <div className="space-y-3">
                              <h5 className="text-xs font-extrabold text-slate-500 bg-slate-50 px-2.5 py-1 rounded inline-block">과거 진단 전략 기반</h5>
                              <div className="space-y-2 border-l-2 border-slate-200 pl-3">
                                <div>
                                  <span className="text-[10px] font-black text-rose-500 block">⚠️ 내부 취약 요인 (Weakness)</span>
                                  <p className="text-xs text-slate-600 mt-0.5">{repA.report.swot?.weakness?.[0] || "자금력 확보 부족 및 부채 금융 과중 부담"}</p>
                                </div>
                                <div>
                                  <span className="text-[10px] font-black text-orange-500 block">⚡ 외부 기회 요소 (Opportunity)</span>
                                  <p className="text-xs text-slate-600 mt-0.5">{repA.report.swot?.opportunity?.[0] || "중기부 스마트상점 보급 스마트 오더 접기 지속개시"}</p>
                                </div>
                              </div>
                            </div>

                            {/* SWOT B */}
                            <div className="space-y-3">
                              <h5 className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded inline-block">최근 진단 전략 혁신</h5>
                              <div className="space-y-2 border-l-2 border-blue-500 pl-3">
                                <div>
                                  <span className="text-[10px] font-black text-rose-500 block">⚠️ 내부 취약 요인 (Weakness)</span>
                                  <p className="text-xs text-slate-700 font-semibold mt-0.5">{repB.report.swot?.weakness?.[0] || "자금력 확보 부족 및 부채 금융 과중 부담"}</p>
                                </div>
                                <div>
                                  <span className="text-[10px] font-black text-blue-600 block">⚡ 외부 기회 요소 (Opportunity)</span>
                                  <p className="text-xs text-slate-700 font-semibold mt-0.5">{repB.report.swot?.opportunity?.[0] || "중기부 스마트상점 보급 스마트 오더 접기 지속개시"}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })()
              ) : (
                /* --- Reports History List Screen --- */
                <div className="flex-1 flex flex-col overflow-hidden">
                  
                  {/* Select Notification Banner */}
                  <div className="bg-blue-50 border-b border-blue-100 px-6 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2 text-left">
                      <Scale className="w-4 h-4 text-blue-600 animate-pulse shrink-0" />
                      <p className="text-xs text-blue-700 font-bold">
                        변화된 진단 보고서를 2개 체크 상자 선택하여 하단의 '성장이력 직접 비교'를 눌러 분석을 진행해보십시오.
                      </p>
                    </div>
                    {selectedCompareIds.length > 0 && (
                      <span className="text-[10px] bg-blue-600 text-white font-extrabold px-2.5 py-0.5 rounded-full shrink-0">
                        {selectedCompareIds.length}개 선택됨
                      </span>
                    )}
                  </div>

                  {/* Empty state detection */}
                  {historyReports.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white">
                      <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8 text-slate-300" />
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-800">이전 경영 진단 내역이 비어있습니다.</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs text-center leading-relaxed">
                        실시간 마크다운 종합 보고서 생성을 1회 수행한 뒤에, 이 자리에 대표님의 사업장 개선 이력이 누적됩니다.
                      </p>
                    </div>
                  ) : (
                    /* Grid List of Reports */
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl mx-auto">
                        {historyReports.map((item) => {
                          const isChecked = selectedCompareIds.includes(item.id);
                          
                          // Task counting
                          const compCount = Object.values(item.completedTasks || {}).filter(Boolean).length;
                          const totalCount = item.report.roadmap.reduce((acc, step) => acc + step.tasks.length, 0) || 1;
                          const pct = Math.round((compCount / totalCount) * 100);

                          const danger = item.report.summary.dangerLevel;
                          let dangerColor = "bg-green-100 text-green-800 border-green-200";
                          let dotColor = "bg-green-500";
                          let riskText = "안전관리";
                          if (danger === "HIGH" || danger === "DANGER") {
                            dangerColor = "bg-red-50 text-red-700 border-red-200";
                            dotColor = "bg-red-500";
                            riskText = "경영위기";
                          } else if (danger === "MEDIUM" || danger === "CAUTION") {
                            dangerColor = "bg-amber-50 text-amber-700 border-amber-200";
                            dotColor = "bg-amber-500";
                            riskText = "관리주의";
                          }

                          return (
                            <div 
                              key={item.id}
                              onClick={() => {
                                // loadReportFromHistory(item);
                              }}
                              className={`bg-white rounded-2xl p-5 border transition-all text-left flex flex-col gap-3 relative hover:shadow-md cursor-pointer ${
                                isChecked ? "border-2 border-blue-500 ring-2 ring-blue-100" : "border-slate-200"
                              }`}
                            >
                              {/* Top Bar inside card */}
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {item.timestamp}
                                </span>
                                
                                <div className="flex items-center gap-2">
                                  {/* Compare Checkbox */}
                                  <label 
                                    className="flex items-center gap-1.5 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          if (selectedCompareIds.length >= 2) {
                                            alert("교차 분석은 최대 2개의 리포트까지만 가능합니다!");
                                            return;
                                          }
                                          setSelectedCompareIds([...selectedCompareIds, item.id]);
                                        } else {
                                          setSelectedCompareIds(selectedCompareIds.filter(id => id !== item.id));
                                        }
                                      }}
                                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                    />
                                    <span className="text-[10px] font-extrabold text-slate-500">교차비교</span>
                                  </label>
                                </div>
                              </div>

                              {/* Target SME Information */}
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-extrabold text-slate-800 line-clamp-1">{item.report.summary.clientName}</h4>
                                  <span className={`px-2 py-0.5 text-[9px] font-black rounded border flex items-center gap-1 shrink-0 ${dangerColor}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                                    {riskText}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium">영업 업종: {item.report.summary.industry}</p>
                                <p className="text-[11px] text-slate-500 font-medium truncate">소재 상권: {item.report.summary.location}</p>
                              </div>

                              {/* Progress bar inside card */}
                              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1">
                                  <span>로드맵 수행도 ({compCount} / {totalCount})</span>
                                  <span className={pct > 50 ? "text-blue-600" : "text-slate-600 shrink-0"}>{pct}% 완료</span>
                                </div>
                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                                </div>
                              </div>

                              {/* Buttons inside card */}
                              <div className="flex gap-2 pt-1 border-t border-slate-100 justify-between items-center bg-transparent mt-auto relative z-10">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    loadReportFromHistory(item);
                                  }}
                                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black py-2 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" />
                                  리포트 불러오기
                                </button>
                                <button
                                  onClick={(e) => deleteReportFromHistory(item.id, e)}
                                  className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition-all border border-slate-200 hover:border-rose-200 cursor-pointer"
                                  title="삭제"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Sticky Footer for comparison */}
                  {selectedCompareIds.length === 2 && (
                    <div className="bg-white border-t border-slate-200 p-4 shrink-0 flex items-center justify-center">
                      <button
                        onClick={() => setCompareActive(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold px-8 py-3 rounded-xl shadow-lg shadow-blue-100 flex items-center gap-2 animate-pulse cursor-pointer"
                      >
                        <Scale className="w-4 h-4" />
                        <span>선택된 2개의 진단 리포트 성장이력 교차 비교 개시</span>
                      </button>
                    </div>
                  )}

                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
