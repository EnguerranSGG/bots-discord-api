import { validate } from 'class-validator';
import { CreateChannelDto } from './create-channel.dto';
import { describe, it, expect } from 'vitest';

describe('CreateChannelDto', () => {
  it('should validate a correct DTO', async () => {
    const dto = new CreateChannelDto();
    dto.uuid = '123456789012345678';
    dto.name = 'général';
    dto.type = 'text';
    dto.channelPosition = 1;
    dto.uuidGuild = '987654321098765432';
    dto.uuidCategory = '112233445566778899';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail if uuid is too short', async () => {
    const dto = new CreateChannelDto();
    dto.uuid = '123';
    dto.name = 'général';
    dto.type = 'text';
    dto.channelPosition = 1;
    dto.uuidGuild = '987654321098765432';
    dto.uuidCategory = '112233445566778899';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('uuid');
  });

  it('should fail if type is not valid', async () => {
    const dto = new CreateChannelDto();
    dto.uuid = '123456789012345678';
    dto.name = 'général';
    dto.type = 'invalid-type';
    dto.channelPosition = 1;
    dto.uuidGuild = '987654321098765432';
    dto.uuidCategory = '112233445566778899';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('type');
  });

  it('should fail if channelPosition is negative', async () => {
    const dto = new CreateChannelDto();
    dto.uuid = '123456789012345678';
    dto.name = 'général';
    dto.type = 'text';
    dto.channelPosition = -1;
    dto.uuidGuild = '987654321098765432';
    dto.uuidCategory = '112233445566778899';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('channelPosition');
  });

  it('should fail if name is too long', async () => {
    const dto = new CreateChannelDto();
    dto.uuid = '123456789012345678';
    dto.name = 'a'.repeat(101);
    dto.type = 'text';
    dto.channelPosition = 1;
    dto.uuidGuild = '987654321098765432';
    dto.uuidCategory = '112233445566778899';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });
});