import { postgresConfig } from '@app/configuration';
import { UsersEntity } from '@app/pg';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BattleNetStrategy, DiscordStrategy } from './strategies';

@Module({
  imports: [TypeOrmModule.forRoot(postgresConfig), TypeOrmModule.forFeature([UsersEntity]), HttpModule, PassportModule],
  providers: [AuthService, DiscordStrategy, BattleNetStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
