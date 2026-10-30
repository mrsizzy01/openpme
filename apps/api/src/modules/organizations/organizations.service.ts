import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { exchangeRateForStorage, todayUtcDate } from '../../common/money/decimal-money';
import { UpdateOrganizationSettingsDto } from './organization-settings.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async getProfile(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        settings: true,
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            phone: true,
            isActive: true,
            createdAt: true,
          },
        },
        warehouses: true,
        exchangeRates: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!org) throw new NotFoundException('Entreprise non trouvée');
    return org;
  }

  async listExchangeRates(organizationId: string, limit = 100) {
    return this.prisma.exchangeRate.findMany({
      where: { organizationId, fromCurrency: Currency.USD, toCurrency: Currency.CDF },
      orderBy: { effectiveDate: 'desc' },
      take: Math.min(Math.max(limit, 1), 365),
    });
  }

  async updateSettings(organizationId: string, data: UpdateOrganizationSettingsDto) {
    const current = await this.prisma.organizationSettings.findUnique({
      where: { organizationId },
      select: { primaryCurrency: true, secondaryCurrency: true },
    });
    const primaryCurrency = data.primaryCurrency ?? current?.primaryCurrency ?? Currency.CDF;
    const secondaryCurrency = data.secondaryCurrency ?? current?.secondaryCurrency ?? Currency.USD;
    if (primaryCurrency === secondaryCurrency) {
      throw new BadRequestException('Les devises principale et secondaire doivent être différentes.');
    }

    const { exchangeRateUsdToCdf, ...settingsData } = data;
    const rate = exchangeRateUsdToCdf === undefined
      ? undefined
      : exchangeRateForStorage(exchangeRateUsdToCdf);

    return this.prisma.$transaction(async (transaction) => {
      const settings = await transaction.organizationSettings.upsert({
        where: { organizationId },
        update: {
          ...settingsData,
          ...(rate ? { exchangeRateUsdToCdf: rate } : {}),
        },
        create: {
          organization: { connect: { id: organizationId } },
          ...settingsData,
          ...(rate ? { exchangeRateUsdToCdf: rate } : {}),
        },
      });

      if (rate) {
        const effectiveDate = todayUtcDate();
        await transaction.exchangeRate.upsert({
          where: {
            organizationId_fromCurrency_toCurrency_effectiveDate: {
              organizationId,
              fromCurrency: Currency.USD,
              toCurrency: Currency.CDF,
              effectiveDate,
            },
          },
          update: { rate, source: 'Taux configuré par l’entreprise' },
          create: {
            organizationId,
            fromCurrency: Currency.USD,
            toCurrency: Currency.CDF,
            rate,
            source: 'Taux configuré par l’entreprise',
            effectiveDate,
          },
        });
      }

      return settings;
    });
  }

  async updateProfile(organizationId: string, data: any) {
    return this.prisma.organization.update({
      where: { id: organizationId },
      data,
      include: { settings: true },
    });
  }

  async listUsers(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
