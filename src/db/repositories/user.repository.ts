import { Prisma, type User, UserState } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../client.js";

export class UserRepository {
  async ensure(maxUserId: string, username?: string): Promise<User> {
    const trialUntil = new Date(Date.now() + env.TRIAL_DAYS * 24 * 60 * 60 * 1000);
    return prisma.user.upsert({
      where: { maxUserId: BigInt(maxUserId) },
      create: {
        maxUserId: BigInt(maxUserId),
        username: username || null,
        trialUntil,
      },
      update: username ? { username } : {},
    });
  }

  async byMaxUserId(maxUserId: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { maxUserId: BigInt(maxUserId) } });
  }

  async byId(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async setState(userId: string, state: UserState, stateData?: Prisma.InputJsonValue): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { state, stateData: stateData ?? Prisma.JsonNull },
    });
  }

  async setCity(userId: string, city: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { city, state: UserState.IDLE, stateData: Prisma.JsonNull },
    });
  }
}
