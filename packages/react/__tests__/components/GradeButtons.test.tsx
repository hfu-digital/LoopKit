import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GradeButtons } from '../../src/components/GradeButtons';

const intervals = { again: '1m', hard: '6m', good: '10m', easy: '4d' };

describe('GradeButtons', () => {
    it('renders all four grade buttons', () => {
        render(<GradeButtons onGrade={() => {}} nextIntervals={intervals} />);

        expect(screen.getByText('Again')).toBeInTheDocument();
        expect(screen.getByText('Hard')).toBeInTheDocument();
        expect(screen.getByText('Good')).toBeInTheDocument();
        expect(screen.getByText('Easy')).toBeInTheDocument();
    });

    it('shows next intervals', () => {
        render(<GradeButtons onGrade={() => {}} nextIntervals={intervals} />);

        expect(screen.getByText('1m')).toBeInTheDocument();
        expect(screen.getByText('6m')).toBeInTheDocument();
        expect(screen.getByText('10m')).toBeInTheDocument();
        expect(screen.getByText('4d')).toBeInTheDocument();
    });

    it('calls onGrade with correct grade', () => {
        const onGrade = vi.fn();
        render(<GradeButtons onGrade={onGrade} nextIntervals={intervals} />);

        fireEvent.click(screen.getByText('Good'));
        expect(onGrade).toHaveBeenCalledWith('good');

        fireEvent.click(screen.getByText('Again'));
        expect(onGrade).toHaveBeenCalledWith('again');
    });

    it('respects disabled state', () => {
        render(<GradeButtons onGrade={() => {}} nextIntervals={intervals} disabled />);

        const buttons = screen.getAllByRole('button');
        expect(buttons).toHaveLength(4);
        for (const btn of buttons) {
            expect(btn).toBeDisabled();
        }
    });
});
