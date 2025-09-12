import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { postgresConfig } from '@app/configuration';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersEntity } from '@app/pg';
import { DiscordStrategy, BattleNetStrategy } from './strategies';

@Module({
  imports: [
    TypeOrmModule.forRoot(postgresConfig),
    TypeOrmModule.forFeature([UsersEntity]),
    HttpModule,
    PassportModule,
  ],
  providers: [
    AuthService,
    DiscordStrategy,
    BattleNetStrategy,
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
