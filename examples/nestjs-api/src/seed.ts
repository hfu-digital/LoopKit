import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    // Create default note type
    const basicType = await prisma.loopKitNoteType.create({
        data: {
            name: 'Basic',
            fields: JSON.stringify([
                { name: 'Front', ordinal: 0, type: 'text', required: true },
                { name: 'Back', ordinal: 1, type: 'text', required: true },
            ]),
            templates: JSON.stringify([
                {
                    id: 'basic-front-back',
                    name: 'Card 1',
                    front: '{{Front}}',
                    back: '{{FrontSide}}<hr>{{Back}}',
                },
            ]),
        },
    });

    // Create default preset
    const preset = await prisma.loopKitDeckPreset.create({
        data: {
            name: 'Default',
            config: JSON.stringify({
                newCardsPerDay: 20,
                maxReviewsPerDay: 200,
                learningSteps: [1, 10],
                graduatingInterval: 1,
                easyInterval: 4,
                relearningSteps: [10],
                lapseNewInterval: 0.7,
                lapseMinInterval: 1,
                maxInterval: 36500,
                startingEaseFactor: 2.5,
                hardIntervalMultiplier: 1.2,
                easyBonus: 1.3,
                newCardOrder: 'added',
                reviewOrder: 'due',
                nextDayStartsAt: 4,
                enableFuzz: true,
            }),
        },
    });

    // Create sample deck
    const deck = await prisma.loopKitDeck.create({
        data: {
            name: 'Sample Deck',
            description: 'A sample flashcard deck for demo purposes',
            presetId: preset.id,
        },
    });

    // Create sample notes and cards
    const sampleCards = [
        { front: 'What is spaced repetition?', back: 'A learning technique that involves increasing intervals of time between subsequent review of previously learned material.' },
        { front: 'What does SRS stand for?', back: 'Spaced Repetition System' },
        { front: 'What is the Ebbinghaus forgetting curve?', back: 'A curve showing how information is lost over time when there is no attempt to retain it.' },
        { front: 'What is the SM-2 algorithm?', back: 'A spaced repetition algorithm developed by Piotr Wozniak, used in SuperMemo 2 and many modern flashcard apps.' },
        { front: 'What is an ease factor?', back: 'A multiplier that determines how much the interval grows after a successful review. Higher ease = longer intervals.' },
    ];

    for (const { front, back } of sampleCards) {
        const note = await prisma.loopKitNote.create({
            data: {
                noteTypeId: basicType.id,
                fields: JSON.stringify([
                    { name: 'Front', value: front, ordinal: 0 },
                    { name: 'Back', value: back, ordinal: 1 },
                ]),
                tags: JSON.stringify(['sample', 'srs']),
            },
        });

        await prisma.loopKitCard.create({
            data: {
                noteId: note.id,
                templateId: 'basic-front-back',
                deckId: deck.id,
            },
        });
    }

    console.log(`Seeded: 1 note type, 1 preset, 1 deck, ${sampleCards.length} notes/cards`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
