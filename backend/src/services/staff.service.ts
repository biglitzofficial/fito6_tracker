import { Role } from '@prisma/client';
import prisma from '../lib/prisma';
import { hashPassword } from '../utils/password';
import { AppError } from '../utils/response';

export const staffService = {
  async list(includeInactive = false) {
    return prisma.user.findMany({
      where: {
        role: Role.STAFF,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: { staff: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getById(id: string) {
    const user = await prisma.user.findFirst({
      where: { id, role: Role.STAFF },
      include: { staff: true },
    });
    if (!user) throw new AppError(404, 'Staff not found');
    return user;
  },

  async create(data: {
    name: string;
    email: string;
    phone?: string;
    salary: number;
    joiningDate: string;
    password?: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) throw new AppError(400, 'Email already exists');

    const password = await hashPassword(data.password || 'Staff@123');

    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password,
        role: Role.STAFF,
        staff: {
          create: {
            phone: data.phone,
            salary: data.salary,
            joiningDate: new Date(data.joiningDate),
          },
        },
      },
      include: { staff: true },
    });
  },

  async update(id: string, data: Partial<{
    name: string;
    email: string;
    phone: string;
    salary: number;
    joiningDate: string;
  }>) {
    await staffService.getById(id);

    const { phone, salary, joiningDate, ...userData } = data;

    return prisma.user.update({
      where: { id },
      data: {
        ...userData,
        email: userData.email?.toLowerCase(),
        staff: {
          update: {
            phone,
            salary,
            joiningDate: joiningDate ? new Date(joiningDate) : undefined,
          },
        },
      },
      include: { staff: true },
    });
  },

  async disable(id: string) {
    await staffService.getById(id);
    return prisma.user.update({
      where: { id },
      data: { isActive: false },
      include: { staff: true },
    });
  },

  async enable(id: string) {
    return prisma.user.update({
      where: { id },
      data: { isActive: true },
      include: { staff: true },
    });
  },
};
