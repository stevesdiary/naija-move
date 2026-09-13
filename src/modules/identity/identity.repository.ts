import { db } from '../../db/index.js'
import { users } from '../../db/schema/index.js'
import { eq, and, isNull } from 'drizzle-orm'
import { v4 as uuid } from 'uuid'
import type { UserRole } from '../../lib/jwt.js'

export const identityRepository = {
  async findUserByPhone(phone: string) {
    return db.query.users.findFirst({ where: and(eq(users.phone, phone), isNull(users.deletedAt)) })
  },

  async findUserById(id: string) {
    return db.query.users.findFirst({ where: and(eq(users.id, id), isNull(users.deletedAt)) })
  },

  async findUserByEmail(email: string) {
    return db.query.users.findFirst({ where: and(eq(users.email, email), isNull(users.deletedAt)) })
  },

  /** Returns the user for this phone, creating a rider account on first login. */
  async upsertRiderByPhone(phone: string): Promise<{ id: string; name: string | null; role: UserRole; isNew: boolean; isActive: boolean }> {
    const existing = await this.findUserByPhone(phone)
    if (existing) return { id: existing.id, name: existing.name, role: existing.role, isNew: false, isActive: existing.isActive }
    const id = uuid()
    await db.insert(users).values({ id, phone, role: 'rider' })
    return { id, name: null, role: 'rider', isNew: true, isActive: true }
  },

  /** Promote a rider to driver. The caller must re-issue tokens so the new role takes effect. */
  async setRole(userId: string, role: UserRole) {
    await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId))
  },
}
