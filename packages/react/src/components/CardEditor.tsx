import { useState, useEffect } from 'react';
import { useCardEditor, useNoteTypes } from '../hooks/useCard';
import type { NoteBase, Field } from '../types';

export interface CardEditorProps {
    noteTypeId?: string;
    initialNote?: NoteBase;
    deckId?: string;
    onSave: (note: NoteBase) => void;
    className?: string;
}

export function CardEditor({
    noteTypeId: initialNoteTypeId,
    initialNote,
    deckId,
    onSave,
    className = '',
}: CardEditorProps) {
    const { noteTypes, loading: typesLoading } = useNoteTypes();
    const editor = useCardEditor();

    const [selectedNoteTypeId, setSelectedNoteTypeId] = useState(
        initialNoteTypeId ?? initialNote?.noteTypeId ?? '',
    );
    const [fields, setFields] = useState<Record<string, string>>({});
    const [tags, setTags] = useState(initialNote?.tags.join(', ') ?? '');

    const selectedNoteType = noteTypes.find((t) => t.id === selectedNoteTypeId);

    useEffect(() => {
        if (initialNote) {
            const fieldMap: Record<string, string> = {};
            for (const f of initialNote.fields) {
                fieldMap[f.name] = f.value;
            }
            setFields(fieldMap);
        } else if (selectedNoteType) {
            const fieldMap: Record<string, string> = {};
            for (const f of selectedNoteType.fields) {
                fieldMap[f.name] = fieldMap[f.name] ?? '';
            }
            setFields(fieldMap);
        }
    }, [selectedNoteTypeId, selectedNoteType, initialNote]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedNoteType) return;

        const fieldArray: Field[] = selectedNoteType.fields.map((def, i) => ({
            name: def.name,
            value: fields[def.name] ?? '',
            ordinal: i,
        }));

        const tagArray = tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);

        try {
            let note: NoteBase;
            if (initialNote) {
                note = await editor.update(initialNote.id, fieldArray, tagArray);
            } else {
                note = await editor.create(selectedNoteTypeId, fieldArray, deckId ?? '', tagArray);
            }
            onSave(note);
        } catch {
            // Error handled by editor.error
        }
    };

    if (typesLoading) return <div className={`loopkit-card-editor ${className}`}>Loading...</div>;

    return (
        <form className={`loopkit-card-editor ${className}`} onSubmit={handleSubmit}>
            {!initialNote && (
                <div className="loopkit-editor-field">
                    <label className="loopkit-editor-label">Note Type</label>
                    <select
                        className="loopkit-editor-select"
                        value={selectedNoteTypeId}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedNoteTypeId(e.target.value)}
                    >
                        <option value="">Select a note type...</option>
                        {noteTypes.map((nt) => (
                            <option key={nt.id} value={nt.id}>
                                {nt.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {selectedNoteType?.fields.map((def) => (
                <div key={def.name} className="loopkit-editor-field">
                    <label className="loopkit-editor-label">
                        {def.name}
                        {def.required && <span className="loopkit-required">*</span>}
                    </label>
                    {def.type === 'richtext' ? (
                        <textarea
                            className="loopkit-editor-textarea"
                            value={fields[def.name] ?? ''}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFields({ ...fields, [def.name]: e.target.value })}
                            required={def.required}
                            rows={4}
                        />
                    ) : (
                        <input
                            className="loopkit-editor-input"
                            type="text"
                            value={fields[def.name] ?? ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFields({ ...fields, [def.name]: e.target.value })}
                            required={def.required}
                        />
                    )}
                </div>
            ))}

            <div className="loopkit-editor-field">
                <label className="loopkit-editor-label">Tags</label>
                <input
                    className="loopkit-editor-input"
                    type="text"
                    value={tags}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTags(e.target.value)}
                    placeholder="tag1, tag2, tag3"
                />
            </div>

            {editor.error && <div className="loopkit-editor-error">{editor.error}</div>}

            <button
                className="loopkit-editor-submit"
                type="submit"
                disabled={editor.loading || !selectedNoteTypeId}
            >
                {editor.loading ? 'Saving...' : initialNote ? 'Update' : 'Create'}
            </button>
        </form>
    );
}
