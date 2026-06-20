import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { CompetitorHeatmapData, HeatmapCell } from "../types";
import { Compass, Sparkles, Flame, Shield, Info, MapPin } from "lucide-react";
import { motion } from "motion/react";

interface CompetitorHeatmapProps {
  data: CompetitorHeatmapData;
}

export const CompetitorHeatmap: React.FC<CompetitorHeatmapProps> = ({ data }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  // Set up initial selection to center (2,2)
  useEffect(() => {
    if (data && data.gridCells) {
      const center = data.gridCells.find(c => c.x === 2 && c.y === 2);
      if (center) {
        setSelectedCell(center);
      }
    }
  }, [data]);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous drawing

    const width = 450;
    const height = 450;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const gridWidth = width - margin.left - margin.right;
    const gridHeight = height - margin.top - margin.bottom;
    const size = data.gridSize || 5;
    const cellSize = gridWidth / size;

    // Beautiful Color Scale for Competitor Density
    // 0~2: Low (Safe - Warm Cream / Soft sage)
    // 3~5: Medium (Caution - Warm gold)
    // 6~8: High (Warning - Soft Terracotta)
    // 9~10: Extreme (Danger - Deep Roast Sienna)
    const colorScale = d3.scaleLinear<string>()
      .domain([0, 2, 5, 8, 10])
      .range(["#FCFDFB", "#D5CDAF", "#E9C093", "#C58A73", "#8D5139"]);

    const chartg = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Draw the grid cells
    chartg.selectAll(".cell")
      .data(data.gridCells)
      .enter()
      .append("rect")
      .attr("class", "cell")
      .attr("x", (d: any) => d.x * cellSize)
      .attr("y", (d: any) => d.y * cellSize)
      .attr("width", cellSize - 3) // Gap between cells
      .attr("height", cellSize - 3)
      .attr("rx", 6) // Rounded corners for premium feel
      .attr("fill", (d: any) => {
        // Highlight center specially
        if (d.x === 2 && d.y === 2) return "#FAF6F0";
        return colorScale(d.density);
      })
      .attr("stroke", (d: any) => {
        if (d.x === 2 && d.y === 2) return "#8D5139";
        return "#E9DFD3";
      })
      .attr("stroke-width", (d: any) => {
        if (d.x === 2 && d.y === 2) return 3;
        return 1.5;
      })
      .style("cursor", "pointer")
      .style("transition", "all 0.2s ease-in-out")
      .on("mouseover", function (event, d: any) {
        d3.select(this)
          .attr("stroke", "#C58A73")
          .attr("stroke-width", 2.5);
        setHoveredCell(d);
      })
      .on("mouseout", function (event, d: any) {
        d3.select(this)
          .attr("stroke", d.x === 2 && d.y === 2 ? "#8D5139" : "#E9DFD3")
          .attr("stroke-width", d.x === 2 && d.y === 2 ? 3 : 1.5);
        setHoveredCell(null);
      })
      .on("click", function (event, d: any) {
        setSelectedCell(d);
      });

    // Draw central client pin star mark/icon
    const centerOffset = 2 * cellSize + cellSize / 2;
    chartg.append("circle")
      .attr("cx", centerOffset)
      .attr("cy", centerOffset)
      .attr("r", 15)
      .attr("fill", "#8D5139")
      .attr("opacity", 0.15)
      .attr("class", "pulse-ring");

    chartg.append("circle")
      .attr("cx", centerOffset)
      .attr("cy", centerOffset)
      .attr("r", 5)
      .attr("fill", "#8D5139");

    // Compass labels (N, S, E, W) around the heatmap grid
    // North
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("font-weight", "black")
      .attr("fill", "#786253")
      .text("▲ 북 (대표 인접 대로변)");

    // South
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height - 10)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("font-weight", "black")
      .attr("fill", "#786253")
      .text("▼ 남 (배후 생활 주거지)");

    // West
    svg.append("text")
      .attr("x", 20)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("font-weight", "black")
      .attr("fill", "#786253")
      .attr("transform", `rotate(-90, 15, ${height / 2})`)
      .text("▲ 서 (골목길 상가 밀집구획)");

    // East
    svg.append("text")
      .attr("x", width - 15)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("font-weight", "black")
      .attr("fill", "#786253")
      .attr("transform", `rotate(90, ${width - 15}, ${height / 2})`)
      .text("▲ 동 (주요 오피스/아파트지대)");

  }, [data]);

  const activeCell = hoveredCell || selectedCell;

  const getDensityLevel = (density: number) => {
    if (density === 0) return { label: "경쟁 점포가 없음 (매우 유리)", color: "text-green-600 bg-green-50 border-green-200" };
    if (density <= 2) return { label: "경쟁 밀도 희박 (안심 사업)", color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    if (density <= 5) return { label: "경쟁 밀도 적정 (관리/주의)", color: "text-amber-700 bg-amber-50 border-amber-200" };
    if (density <= 8) return { label: "포화 경쟁 지대 (밀도 높음)", color: "text-orange-700 bg-orange-50 border-orange-200" };
    return { label: "경쟁 극도 과밀 (전략 대전환 요망)", color: "text-red-700 bg-red-50 border-red-200" };
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6" id="competitor-density-section">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-3">
        <div className="text-left">
          <span className="text-[10px] bg-indigo-600 text-white font-extrabold px-2.5 py-0.5 rounded-full inline-block mb-1.5 uppercase tracking-wide">
            Geo-Intelligence AI
          </span>
          <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
            <Compass className="w-5 h-5 text-indigo-600 animate-spin" style={{ animationDuration: "12s" }} />
            📍 상권 반경 200m 경쟁사 분포 지질 히트맵
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            전자기적 상권 진동수에 기반한 경쟁 강도 격차 시뮬레이션 격자입니다.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-3 py-1 text-[11px] font-bold rounded-lg text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          <span>중앙 기준: {data.centerLocationName}</span>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Heatmap visualization and Legend */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100 relative">
          
          <div className="w-full max-w-[380px] aspect-square relative flex items-center justify-center">
            {/* D3 Ref */}
            <svg
              ref={svgRef}
              viewBox="0 0 450 450"
              className="w-full h-full drop-shadow-sm"
              id="competitor-heatmap-svg"
            />
          </div>

          {/* Color Scale Legend */}
          <div className="w-full mt-4 max-w-sm px-2">
            <div className="flex justify-between text-[10px] font-extrabold text-slate-400 mb-1.5">
              <span>여유 (0)</span>
              <span>보통 (4)</span>
              <span>포화 (8)</span>
              <span>과밀 (10)</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-gradient-to-r from-slate-100 via-emerald-300 via-yellow-300 via-orange-400 to-red-600 border border-slate-200" />
            <span className="block text-[9px] text-slate-400 text-center mt-2 leading-tight">
              ※ 격자 칸을 클릭하거나 마우스를 올리면 해당 보행 구획의 경쟁 분석 조견을 좌측 혹은 하단에 실시간 동기화합니다.
            </span>
          </div>
        </div>

        {/* Live Detail Pane */}
        <div className="lg:col-span-6 flex flex-col justify-between text-left space-y-4">
          
          {/* Node Inspect HUD */}
          <motion.div
            layout
            className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm text-left relative overflow-hidden flex-1 flex flex-col justify-between"
          >
            {activeCell ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400">구획 탐색 좌표 ({activeCell.x}, {activeCell.y})</span>
                    <h5 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      {activeCell.x === 2 && activeCell.y === 2 ? (
                        <>
                          <Sparkles className="w-4 h-4 text-blue-600 animate-pulse" />
                          <span className="text-blue-600 font-black">{activeCell.label}</span>
                        </>
                      ) : (
                        activeCell.label
                      )}
                    </h5>
                  </div>
                  <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg border ${getDensityLevel(activeCell.density).color}`}>
                    경쟁수지: {activeCell.density} / 10
                  </span>
                </div>

                {/* Sub diagnosis color description */}
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-700 leading-relaxed font-semibold">
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">구획 종합 조견</span>
                  {getDensityLevel(activeCell.density).label}
                </div>

                {/* Local Competitors lists */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 block">이 구역 인근 경쟁 브랜드 / 매장 목록 ({activeCell.competitorNames?.length || 0}개)</span>
                  {activeCell.competitorNames && activeCell.competitorNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {activeCell.competitorNames.map((name, i) => (
                        <span key={i} className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg shadow-sm">
                          🍲 {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">경쟁 위협 점포 대조 내역이 없는 안전 완충 구역입니다.</p>
                  )}
                </div>

                {/* Action Guidelines for specific cell */}
                <div className="pt-2 border-t border-slate-100 flex items-start gap-1.5">
                  <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {activeCell.x === 2 && activeCell.y === 2 ? (
                      "대표님이 계신 본부입니다. 사방의 기전 유입 밀도를 상정하여 점포 경쟁력을 점진적으로 고립해제해 나가야 합니다."
                    ) : activeCell.density >= 6 ? (
                      "경쟁사 노출 볼륨이 크므로 해당 방향으로의 대면 전단지 홍보 등은 효율성이 극감하며, 점포 내부의 스마트 주문 패키지 도입에 주력해야 합니다."
                    ) : (
                      "배후 잠재력이 대단히 우수합니다. 당 방향 이웃 주민들을 집중 타겟팅한 온라인 플레이스 배송 광고나 지역 맞춤 전단 마케팅의 투입 당위성이 매우 큽니다."
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
                <Compass className="w-10 h-10 text-slate-300 animate-spin mb-2" />
                <p className="text-xs">격자 노드를 마우스오버하거나 선택하여 현장 정보를 불러오십시오.</p>
              </div>
            )}
          </motion.div>

          {/* Dynamic AI insights summarizing geography */}
          <div className="p-4.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-left space-y-1.5">
            <span className="text-[10px] font-black text-indigo-600 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              상권 종합 밀도 총론 및 포지셔닝 해법
            </span>
            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              {data.summaryText}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};
