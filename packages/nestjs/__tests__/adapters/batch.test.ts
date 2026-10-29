import {describe, it, expect, vi} from 'vitest';
import {PrismaLoopKitAdapter} from '../../src/adapters/prisma/prisma-loopkit-adapter';
import type {LoopKitPrismaClient} from '../../src/adapters/prisma/prisma-types';
describe('Prisma batch capabilities', () => {
    it('groups counts with one query and skips unknown states consistently', async () => {
        const groupBy = vi.fn(async () => [{deckId:'a',state:'review',_count:{_all:3}}, {deckId:'a',state:'suspended',_count:{_all:4}}]);
        const adapter = new PrismaLoopKitAdapter({loopKitCard:{groupBy}} as unknown as LoopKitPrismaClient);
        expect((await adapter.countByDeck(['a'])).get('a')).toEqual({new:0,learning:0,review:3,relearning:0,total:3});
        expect(groupBy).toHaveBeenCalledTimes(1);
        await adapter.countByDeck([]);
        expect(groupBy).toHaveBeenCalledTimes(1);
    });
    it('supports structural delegates without groupBy', async () => {
        const count = vi.fn(async () => 1);
        const adapter = new PrismaLoopKitAdapter({loopKitCard:{count}} as unknown as LoopKitPrismaClient);
        expect((await adapter.countByDeck(['a'])).get('a')?.total).toBe(4);
        expect(count).toHaveBeenCalledTimes(4);
    });
    it('traverses a hierarchy in original depth-first order using one read and tolerates cycles', async () => {
        const findMany = vi.fn(async () => [{id:'a',parentDeckId:'root'}, {id:'b',parentDeckId:'root'}, {id:'child',parentDeckId:'a'}, {id:'root',parentDeckId:'child'}]);
        const adapter = new PrismaLoopKitAdapter({loopKitDeck:{findMany}} as unknown as LoopKitPrismaClient);
        expect(await adapter.getDescendantDeckIds('root')).toEqual(['a','child','b']);
        expect(findMany).toHaveBeenCalledTimes(1);
    });
});
