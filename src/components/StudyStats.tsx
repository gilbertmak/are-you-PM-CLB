interface StudyStatsProps {
  masteredCount: number;
  nextReviewLabel: string;
  reviewedCount: number;
  sessionLabel: string;
}

export function StudyStats({ masteredCount, nextReviewLabel, reviewedCount, sessionLabel }: StudyStatsProps) {
  return (
    <div className="study-stats">
      <div className="stat-chip"><span className="label">Session</span><span className="value">{sessionLabel}</span></div>
      <div className="stat-chip"><span className="label">Reviewed</span><span className="value">{reviewedCount}</span></div>
      <div className="stat-chip"><span className="label">Mastered</span><span className="value">{masteredCount}</span></div>
      <div className="stat-chip"><span className="label">Next review</span><span className="value">{nextReviewLabel}</span></div>
    </div>
  );
}
