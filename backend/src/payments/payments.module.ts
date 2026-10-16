import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module.js';
import { JwtStrategy } from '../auth/jwt.strategy.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import { MockPaymentService } from './mock-payment.service.js';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'brewlite_secret_key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, MockPaymentService, JwtStrategy],
  exports: [PaymentsService],
})
export class PaymentsModule {}
