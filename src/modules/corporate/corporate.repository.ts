import { db } from '../../db/index.js'
import { corporateAccounts, corporateMembers, corporateWallets, corporateTrips, users, trips } from '../../db/schema/index.js'
import { eq, and, isNull, desc } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'

export const corporateRepository = {
  async createAccount(data: { name: string; email: string; phone?: string }) {
    const id = uuid()
    await db.insert(corporateAccounts).values({ id, ...data })
    return this.findAccountById(id)
  },

  async findAccountById(id: string) {
    return db.query.corporateAccounts.findFirst({ where: eq(corporateAccounts.id, id) })
  },

  async findAccountByEmail(email: string) {
    return db.query.corporateAccounts.findFirst({ where: eq(corporateAccounts.email, email) })
  },

  async updateAccount(id: string, data: Partial<{ name: string; phone: string; isActive: boolean }>) {
    await db.update(corporateAccounts).set({ ...data, updatedAt: new Date() }).where(eq(corporateAccounts.id, id))
    return this.findAccountById(id)
  },

  async listAccounts(limit = 20, offset = 0) {
    return db.query.corporateAccounts.findMany({
      orderBy: [desc(corporateAccounts.createdAt)],
      limit,
      offset,
    })
  },

  // Members
  async addMember(data: { corporateAccountId: string; userId: string; role?: string; monthlyBudgetKobo?: number }) {
    const id = uuid()
    await db.insert(corporateMembers).values({ id, ...data, role: data.role ?? 'employee' })
    return db.query.corporateMembers.findFirst({ where: eq(corporateMembers.id, id) })
  },

  async findMemberById(id: string) {
    return db.query.corporateMembers.findFirst({ where: eq(corporateMembers.id, id) })
  },

  async listMembers(corporateAccountId: string) {
    return db.query.corporateMembers.findMany({
      where: eq(corporateMembers.corporateAccountId, corporateAccountId),
      orderBy: [desc(corporateMembers.createdAt)],
    })
  },

  async updateMember(id: string, data: Partial<{ role: string; monthlyBudgetKobo: number; isActive: boolean }>) {
    await db.update(corporateMembers).set(data as any).where(eq(corporateMembers.id, id))
    return this.findMemberById(id)
  },

  async removeMember(id: string) {
    await db.update(corporateMembers).set({ isActive: false }).where(eq(corporateMembers.id, id))
  },

  // Wallets
  async getOrCreateWallet(corporateAccountId: string) {
    let wallet = await db.query.corporateWallets.findFirst({ where: eq(corporateWallets.corporateAccountId, corporateAccountId) })
    if (!wallet) {
      const id = uuid()
      await db.insert(corporateWallets).values({ id, corporateAccountId })
      wallet = await db.query.corporateWallets.findFirst({ where: eq(corporateWallets.id, id) })
    }
    return wallet
  },

  // Corporate Trips
  async linkTrip(data: { tripId: string; corporateAccountId: string; memberId: string; costCentre?: string; approvedBy?: string }) {
    const id = uuid()
    await db.insert(corporateTrips).values({ id, ...data })
    return db.query.corporateTrips.findFirst({ where: eq(corporateTrips.id, id) })
  },

  async listCorporateTrips(corporateAccountId: string, limit = 20, offset = 0) {
    return db.query.corporateTrips.findMany({
      where: eq(corporateTrips.corporateAccountId, corporateAccountId),
      orderBy: [desc(corporateTrips.createdAt)],
      limit,
      offset,
    })
  },
}