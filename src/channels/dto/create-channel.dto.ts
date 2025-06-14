import { IsString, IsInt, IsEnum, MaxLength, Min, Length } from 'class-validator';
import { ApiProperty, PickType } from '@nestjs/swagger';
import { Transform, Type, Expose } from 'class-transformer';
import { PickableDiscordUUIDFields } from 'src/utils/pickable-discord-uuid-fields';

enum ChannelType {
  TEXT = 'text',
  VOICE = 'voice',
  ANNOUNCEMENT = 'announcement'
}

export class CreateChannelDto extends PickType(PickableDiscordUUIDFields, [
  'uuidGuild',
  'uuidCategory'
]) {
  @ApiProperty({
    description: 'ID Discord du channel',
    example: '123456789012345678'
  })
  @IsString()
  @Length(17, 19)
  @Expose()
  @Transform(({ value }) => value?.toString().trim())
  uuid: string;

  @ApiProperty({
    description: 'Le nom du channel',
    example: 'général',
    maxLength: 100
  })
  @IsString()
  @MaxLength(100)
  @Expose()
  @Transform(({ value }) => value?.toString().trim().toLowerCase())
  name: string;

  @ApiProperty({
    description: 'Le type de channel',
    example: 'text',
    enum: ChannelType
  })
  @IsString()
  @IsEnum(ChannelType)
  @Expose()
  @Transform(({ value }) => value?.toString().toLowerCase())
  type: string;

  @ApiProperty({
    description: 'La position du channel',
    example: 1,
    minimum: 0
  })
  @IsInt()
  @Min(0)
  @Expose()
  @Type(() => Number)
  @Transform(({ value }) => {
    const num = parseInt(value);
    return isNaN(num) ? 0 : Math.max(0, num);
  })
  channelPosition: number;

  @Expose()
  uuidGuild: string;
  
  @Expose()
  uuidCategory: string;
} 