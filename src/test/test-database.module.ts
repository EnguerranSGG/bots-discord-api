import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Channel } from '../channels/entities/channel.entity';
import { Category } from '../categories/entities/category.entity';
import { Guild } from '../guilds/entities/guild.entity';
import { Course } from '../courses/entities/course.entity';
import { Role } from '../roles/entities/role.entity';
import { Member } from '../members/entities/member.entity';
import { MemberInformation } from '../members-informations/entities/member-information.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { Campus } from '../campuses/entities/campus.entity';
import { GuildTemplate } from '../guilds-templates/entities/guild-template.entity';
import { DiscordUser } from '../discord-users/entities/discord-user.entity';
import { IdentificationRequest } from '../identification-requests/entities/identification-request.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env.test',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [
          Channel,
          Category,
          Guild,
          Course,
          Role,
          Member,
          MemberInformation,
          Promotion,
          Campus,
          GuildTemplate,
          DiscordUser,
          IdentificationRequest,
        ],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class TestDatabaseModule {} 