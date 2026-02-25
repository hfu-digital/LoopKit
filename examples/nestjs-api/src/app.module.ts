import { Module } from '@nestjs/common';
import {
    LoopKitModule,
    PrismaLoopKitAdapter,
} from '@hfu.digital/loopkit-nestjs';
import { PrismaService } from './prisma.service';
import { FlashcardController } from './flashcard.controller';

@Module({
    imports: [
        LoopKitModule.register({
            storage: (() => {
                const prisma = new PrismaService();
                return new PrismaLoopKitAdapter(prisma as any);
            })(),
        }),
    ],
    controllers: [FlashcardController],
    providers: [PrismaService],
})
export class AppModule {}
