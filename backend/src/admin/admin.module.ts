import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserModule } from '../user/user.module'; // We'll need access to UserService and UserRepository
import { AuthModule } from '../auth/auth.module'; // Import AuthModule
import { StartupModule } from '../startup/startup.module'; // Import StartupModule
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ActivityLog } from '../entities/activity-log.entity';
import { AdminGuard } from '../auth/guard';

@Module({
  imports: [
    UserModule, // Import UserModule to use UserService
    AuthModule, // Add AuthModule to imports
    StartupModule, // Add StartupModule to imports
    MikroOrmModule.forFeature([ActivityLog]),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
