import { IsString, MaxLength, IsInt, Min, Matches, IsIn } from 'class-validator';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { PickableDiscordUUIDFields } from 'src/utils/pickable-discord-uuid-fields';

export class CreateMemberDto extends PickType(PickableDiscordUUIDFields, [
  'uuidDiscord',
  'uuidGuild'
]) {
  @ApiProperty({
    description: 'Nom d\'utilisateur du membre dans la guilde',
    example: 'JohnDoe',
    maxLength: 50
  })
  @IsString()
  @MaxLength(50)
  guildUsername: string;

}
