import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProductsModule } from './modules/products/products.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { UsersModule } from './modules/users/users.module';
import { SalesModule } from './modules/sales/sales.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { FinancesModule } from './modules/finances/finances.module';
import { AnomaliesModule } from './modules/anomalies/anomalies.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { RemoteControlModule } from './modules/remote-control/remote-control.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    ProductsModule,
    CustomersModule,
    SuppliersModule,
    UsersModule,
    SalesModule,
    InvoicesModule,
    PaymentsModule,
    FinancesModule,
    AnomaliesModule,
    DashboardModule,
    RemoteControlModule,
    NotificationsModule,
    HealthModule,
    AuditModule,
  ],
})
export class AppModule {}
