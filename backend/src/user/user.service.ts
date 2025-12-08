import { EntityManager } from '@mikro-orm/core';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from 'src/entities/enums/role.enum';
import { User } from 'src/entities/user.entity';
import * as argon from 'argon2';
import { UpdateProfileDto, ChangePasswordDto } from './dto';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class UserService {
  constructor(
    private em: EntityManager,
    private authService: AuthService,
  ) {}

  async findAll() {
    return await this.em.find(User, {});
  }

  async findOneById(id: number): Promise<User | null> {
    return await this.em.findOne(User, { id });
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return await this.em.findOne(User, { email });
  }

  async getUserByRole(userRole: Role) {
    return await this.em.find(User, {
      role: userRole,
    });
  }

  async getUserByString(query: string, role?: Role) {
    const whereCondition: any = {
      $or: [
        { email: { $ilike: `%${query}%` } },
        { firstName: { $ilike: `%${query}%` } },
        { lastName: { $ilike: `%${query}%` } },
      ],
    };

    if (role) {
      whereCondition.role = role;
    }

    return await this.em.find(User, whereCondition);
  }

  async update(id: number, data: Partial<User>): Promise<User | null> {
    const user = await this.findOneById(id);
    if (!user) {
      return null;
    }
    this.em.assign(user, data);
    await this.em.flush();
    return user;
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOneById(id);
    if (user) {
      await this.em.removeAndFlush(user);
    }
  }

  async updateProfile(userId: number, dto: UpdateProfileDto): Promise<{ user: User; access_token: string }> {
    const user = await this.findOneById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being changed and if it's already taken
    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.findOneByEmail(dto.email);
      if (existingUser) {
        throw new BadRequestException('Email already in use');
      }
    }

    // Update fields
    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName;
    }
    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName;
    }
    if (dto.email !== undefined) {
      user.email = dto.email;
    }

    await this.em.flush();

    // Generate new JWT token with updated information
    const tokenResponse = await this.authService.signToken(
      user.id,
      user.email,
      user.role,
      user.firstName,
      user.lastName,
    );

    return {
      user,
      access_token: tokenResponse.access_token,
    };
  }

  async changePassword(userId: number, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findOneById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify old password
    const passwordMatches = await argon.verify(user.hash, dto.oldPassword);
    if (!passwordMatches) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash and update new password
    user.hash = await argon.hash(dto.newPassword);
    await this.em.flush();
  }
}
