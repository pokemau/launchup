import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  ParseEnumPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from 'src/auth/guard';
import { UserService } from './user.service';
import { Role } from 'src/entities/enums/role.enum';
import { GetUser } from 'src/auth/decorator';
import { UpdateProfileDto, ChangePasswordDto } from './dto';

@UseGuards(JwtGuard)
@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  async getUsers(@Query('userRole', new ParseEnumPipe(Role)) userRole: Role) {
    return await this.userService.getUserByRole(userRole);
  }

  @Get('search')
  async getUserByString(
    @Query('search') query: string,
    @Query('role') role?: Role,
  ) {
    return await this.userService.getUserByString(query, role);
  }

  @Patch('profile')
  async updateProfile(
    @GetUser('sub') userId: number,
    @Body() dto: UpdateProfileDto,
  ) {
    return await this.userService.updateProfile(userId, dto);
  }

  @Patch('password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @GetUser('sub') userId: number,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.userService.changePassword(userId, dto);
  }
}
