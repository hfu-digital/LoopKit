import type { Grade } from '../types';
import { GRADES } from '../types';

const GRADE_LABELS: Record<Grade, string> = {
    again: 'Again',
    hard: 'Hard',
    good: 'Good',
    easy: 'Easy',
};

export interface GradeButtonsProps {
    onGrade: (grade: Grade) => void;
    nextIntervals: Record<Grade, string>;
    disabled?: boolean;
    className?: string;
}

export function GradeButtons({ onGrade, nextIntervals, disabled = false, className = '' }: GradeButtonsProps) {
    return (
        <div className={`loopkit-grade-buttons ${className}`}>
            {GRADES.map((grade) => (
                <button
                    key={grade}
                    className={`loopkit-grade-btn loopkit-grade-${grade}`}
                    onClick={() => onGrade(grade)}
                    disabled={disabled}
                    type="button"
                >
                    <span className="loopkit-grade-label">{GRADE_LABELS[grade]}</span>
                    <span className="loopkit-grade-interval">{nextIntervals[grade]}</span>
                </button>
            ))}
        </div>
    );
}
