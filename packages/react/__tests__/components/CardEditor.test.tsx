import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { LoopKitProvider } from '../../src/context/LoopKitProvider';
import { CardEditor } from '../../src/components/CardEditor';
import { mockFetch, mockFetchResponse, clearFetchMocks } from '../setup';

function wrapper({ children }: { children: ReactNode }) {
    return (
        <LoopKitProvider apiUrl="http://test.local/api" fetcher={mockFetch}>
            {children}
        </LoopKitProvider>
    );
}

const mockNoteTypes = [
    {
        id: 'nt-1',
        name: 'Basic',
        fields: [
            { name: 'Front', ordinal: 0, type: 'text', required: true },
            { name: 'Back', ordinal: 1, type: 'text', required: true },
        ],
        templates: [{ id: 'tpl-1', name: 'Card 1', front: '{{Front}}', back: '{{Back}}' }],
        createdAt: '2026-01-15',
        updatedAt: '2026-01-15',
    },
];

describe('CardEditor', () => {
    beforeEach(() => clearFetchMocks());

    it('renders note type selector and fields', async () => {
        mockFetchResponse(mockNoteTypes);

        render(<CardEditor onSave={() => {}} />, { wrapper });

        // Wait for note types to load
        expect(await screen.findByText('Note Type')).toBeInTheDocument();
        expect(screen.getByText('Select a note type...')).toBeInTheDocument();
    });

    it('shows fields when note type is selected', async () => {
        mockFetchResponse(mockNoteTypes);

        render(<CardEditor noteTypeId="nt-1" onSave={() => {}} />, { wrapper });

        // With noteTypeId pre-set, fields should appear after note types load
        expect(await screen.findByText('Front')).toBeInTheDocument();
        expect(screen.getByText('Back')).toBeInTheDocument();
    });

    it('shows loading state while note types load', () => {
        mockFetchResponse(mockNoteTypes);

        render(<CardEditor onSave={() => {}} />, { wrapper });

        // Initially shows loading
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders create button', async () => {
        mockFetchResponse(mockNoteTypes);

        render(<CardEditor noteTypeId="nt-1" onSave={() => {}} />, { wrapper });

        expect(await screen.findByText('Create')).toBeInTheDocument();
    });

    it('renders update button for existing note', async () => {
        mockFetchResponse(mockNoteTypes);

        const initialNote = {
            id: 'note-1',
            noteTypeId: 'nt-1',
            fields: [
                { name: 'Front', value: 'Hello', ordinal: 0 },
                { name: 'Back', value: 'World', ordinal: 1 },
            ],
            tags: ['test'],
            createdAt: '2026-01-15',
            updatedAt: '2026-01-15',
        };

        render(<CardEditor initialNote={initialNote} onSave={() => {}} />, { wrapper });

        expect(await screen.findByText('Update')).toBeInTheDocument();
    });

    it('renders tags input', async () => {
        mockFetchResponse(mockNoteTypes);

        render(<CardEditor noteTypeId="nt-1" onSave={() => {}} />, { wrapper });

        expect(await screen.findByText('Tags')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('tag1, tag2, tag3')).toBeInTheDocument();
    });
});
