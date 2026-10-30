import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BankDossierController } from './bank-dossier.controller';
import { BankDossierService } from './bank-dossier.service';

@Module({
  imports: [AuthModule],
  controllers: [BankDossierController],
  providers: [BankDossierService],
})
export class ReportsModule {}
