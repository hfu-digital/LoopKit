/**
 * Structural types for Prisma delegates.
 * No import from @prisma/client — works with any Prisma-generated client.
 */

export type PrismaDelegate<T = any> = {
    create: (args: { data: any; include?: any }) => Promise<T>;
    createMany: (args: { data: any[] }) => Promise<{ count: number }>;
    findUnique: (args: { where: any; include?: any }) => Promise<T | null>;
    findFirst: (args: { where?: any; orderBy?: any; include?: any }) => Promise<T | null>;
    findMany: (args: {
        where?: any;
        orderBy?: any;
        take?: number;
        skip?: number;
        include?: any;
    }) => Promise<T[]>;
    update: (args: { where: any; data: any; include?: any }) => Promise<T>;
    updateMany: (args: { where: any; data: any }) => Promise<{ count: number }>;
    delete: (args: { where: any }) => Promise<T>;
    deleteMany: (args: { where: any }) => Promise<{ count: number }>;
    count: (args?: { where?: any }) => Promise<number>;
};

export type LoopKitPrismaClient = {
    loopKitCard: PrismaDelegate;
    loopKitNote: PrismaDelegate;
    loopKitNoteType: PrismaDelegate;
    loopKitDeck: PrismaDelegate;
    loopKitDeckPreset: PrismaDelegate;
    loopKitReviewLog: PrismaDelegate;
    $transaction: <T>(fn: (tx: any) => Promise<T>) => Promise<T>;
};
