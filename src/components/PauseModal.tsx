import React from 'react';
import { Play, RotateCcw, Home } from 'lucide-react';
import { ALL_HAZARD_TYPES, SAFETY_LESSONS } from '../game/safetyLessons';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onExitToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onExitToTitle,
}) => {
  return (
    <div className="fixed inset-0 z-30 bg-slate-950/78 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-white/12 rounded-2xl p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-black text-white">주행 일시정지</h2>
            <p className="text-sm text-slate-400 mt-1">
              실제 도로 위험 상황별 방어 운전 요령을 확인하세요.
            </p>
          </div>
        </div>

        {/* Counterplay Quick Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {ALL_HAZARD_TYPES.map((type) => {
            const lesson = SAFETY_LESSONS[type];
            return (
              <div
                key={type}
                className="bg-slate-950/70 border border-white/8 rounded-xl p-3.5"
              >
                <div className="text-xs font-bold text-amber-300 mb-1">
                  {lesson.shortTag}
                </div>
                <div className="text-sm font-bold text-white mb-1">{lesson.title}</div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {lesson.counterplayHint}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onResume}
            className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>계속 달리기</span>
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>다시 시작</span>
          </button>
          <button
            type="button"
            onClick={onExitToTitle}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>메인 화면</span>
          </button>
        </div>
      </div>
    </div>
  );
};
