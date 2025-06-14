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
import { Poll } from '../polls/entities/poll.entity';
import { Question } from '../questions/entities/question.entity';
import { Answer } from '../answers/entities/answer.entity';
import { DashboardAccount } from '../dashboard-accounts/entities/dashboard-account.entity';
import { DiscordUser } from '../discord-users/entities/discord-user.entity';
import { IdentificationRequest } from '../identification-requests/entities/identification-request.entity';
import { Resource } from '../resources/entities/resource.entity';
import { XpTransaction } from '../xp-transactions/entities/xp-transaction.entity';
import { Comment } from '../comments/entities/comment.entity';
import { Vote } from '../votes/entities/vote.entity';
import { Report } from '../reports/entities/report.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
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
          Poll,
          Question,
          Answer,
          DashboardAccount,
          DiscordUser,
          IdentificationRequest,
          Resource,
          XpTransaction,
          Comment,
          Vote,
          Report
        ],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class TestDatabaseModule {} 