import React from 'react';
import { RotateCcw, Home, ShieldCheck, AlertOctagon, Award } from 'lucide-react';
import { ALL_HAZARD_TYPES, SAFETY_LESSONS } from '../game/safetyLessons';
import type { HazardType, RunSummary } from '../game/types';

interface ResultModalProps {
  summary: RunSummary;
  onRetry: () => void;
  onExitToTitle: () => void;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  summary,
  onRetry,
  onExitToTitle,
}) => {
  // Prioritize lessons for hazards that caused a collision, then encountered hazards
  const hitTypes = ALL_HAZARD_TYPES.filter((t) => summary.hitCounts[t] > 0);
  const encounteredTypes = ALL_HAZARD_TYPES.filter(
    (t) => summary.encounterCounts[t] > 0 && summary.hitCounts[t] === 0
  );
  const reportList: { type: HazardType; hitCount: number }[] = [
    ...hitTypes.map((type) => ({ type, hitCount: summary.hitCounts[type] })),
    ...encounteredTypes.slice(0, Math.max(0, 3 - hitTypes.length)).map((type) => ({ type, hitCount: 0 })),
  ];

  const gradeColors: Record<RunSummary['grade'], string> = {
    S: 'text-amber-300 border-amber-400/50 bg-amber-500/15',
    A: 'text-emerald-300 border-emerald-400/50 bg-emerald-500/15',
    B: 'text-sky-300 border-sky-400/50 bg-sky-500/15',
    C: 'text-rose-300 border-rose-400/50 bg-rose-500/15',
  };

  return (
    <div className="fixed inset-0 z-30 bg-slate-950/84 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-white/12 rounded-2xl p-6 md:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header Summary */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-1">
              {summary.cleared ? (
                <span className="text-emerald-400 inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  안전 완주 성공
                </span>
              ) : (
                <span className="text-rose-400 inline-flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4" />
                  사고 발생 · 안전 점검 필요
                </span>
              )}
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">
              {summary.cleared ? '목적지까지 안전하게 도착했습니다!' : '도로 위 위험 상황에 부딪혔습니다'}
            </h2>
          </div>

          <div className={`px-5 py-3 rounded-xl border text-center ${gradeColors[summary.grade]}`}>
            <div className="text-xs font-bold opacity-85">안전 운전 등급</div>
            <div className="font-display text-4xl font-bold leading-none mt-1">
              {summary.grade}
            </div>
          </div>
        </div>

        {/* Quantitative Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
          <div className="bg-slate-950/75 border border-white/8 rounded-xl p-3.5">
            <div className="text-xs text-slate-400">최종 점수</div>
            <div className="font-mono-num text-xl font-bold text-white mt-0.5">
              {summary.score.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 font-mono-num mt-0.5">
              최고 {summary.bestScore.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-950/75 border border-white/8 rounded-xl p-3.5">
            <div className="text-xs text-slate-400">주행 거리</div>
            <div className="font-mono-num text-xl font-bold text-sky-300 mt-0.5">
              {summary.distanceM}m
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              최대 콤보 {summary.maxCombo}
            </div>
          </div>
          <div className="bg-slate-950/75 border border-white/8 rounded-xl p-3.5">
            <div className="text-xs text-slate-400">방어운전 성공</div>
            <div className="font-mono-num text-xl font-bold text-emerald-300 mt-0.5">
              {summary.defensiveCount}회
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              감속·경적·정지선
            </div>
          </div>
          <div className="bg-slate-950/75 border border-white/8 rounded-xl p-3.5">
            <div className="text-xs text-slate-400">아슬아슬 회피</div>
            <div className="font-mono-num text-xl font-bold text-amber-300 mt-0.5">
              {summary.nearMissCount}회
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              충돌 횟수 {summary.totalHits}회
            </div>
          </div>
        </div>

        {/* Educational Real-World Safety Debriefing */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm font-bold text-white mb-3">
            <Award className="w-4 h-4 text-amber-400" />
            <span>이번 주행 실제 사고 예방 리포트</span>
          </div>

          {reportList.length === 0 ? (
            <div className="bg-slate-950/60 border border-white/8 rounded-xl p-4 text-sm text-slate-300">
              주행 중 큰 위험 상황 없이 안전하게 주행했습니다. 항상 전방을 주시하고 헬멧을 착용하세요!
            </div>
          ) : (
            <div className="space-y-3">
              {reportList.map(({ type, hitCount }) => {
                const lesson = SAFETY_LESSONS[type];
                const isHit = hitCount > 0;
                return (
                  <div
                    key={type}
                    className={`rounded-xl p-4 border ${
                      isHit
                        ? 'bg-rose-950/35 border-rose-500/40'
                        : 'bg-slate-950/65 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-bold text-sm text-white">
                        {lesson.title}
                      </span>
                      <span
                        className={`text-xs font-bold ${
                          isHit ? 'text-rose-300' : 'text-emerald-300'
                        }`}
                      >
                        {isHit ? `충돌 ${hitCount}회` : '안전 회피 완료'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-1.5">
                      <strong className="text-slate-100">위험 이유:</strong> {lesson.dangerReason}
                    </p>
                    <p className="text-xs text-amber-200 leading-relaxed">
                      <strong>예방 수칙:</strong> {lesson.preventionTip}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="flex-1 min-w-[160px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>다시 도전하기</span>
          </button>
          <button
            type="button"
            onClick={onExitToTitle}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>코스 선택 화면</span>
          </button>
        </div>
      </div>
    </div>
  );
};
