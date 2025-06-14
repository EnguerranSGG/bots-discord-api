import { Test, TestingModule } from '@nestjs/testing';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ChannelsController', () => {
  let controller: ChannelsController;
  let service: ChannelsService;

  const mockChannel = {
    uuid: '123',
    name: 'test channel',
    channelPosition: 1,
    type: 'text',
    uuidGuild: 'guild-uuid',
    uuidCategory: 'cat-uuid',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChannelsController],
      providers: [
        {
          provide: ChannelsService,
          useValue: {
            create: vi.fn().mockResolvedValue(mockChannel),
            findAll: vi.fn().mockResolvedValue([mockChannel]),
            findOne: vi.fn().mockResolvedValue(mockChannel),
            update: vi.fn().mockResolvedValue({ ...mockChannel, name: 'updated channel' }),
            remove: vi.fn().mockResolvedValue({ deleted: true }),
          },
        },
      ],
    }).compile();

    controller = module.get<ChannelsController>(ChannelsController);
    service = module.get<ChannelsService>(ChannelsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a channel', async () => {
    const dto = { name: 'test channel', channelPosition: 1, type: 'text', uuidGuild: 'guild-uuid', uuidCategory: 'cat-uuid', uuid: '123' };
    const result = await controller.create(dto as any);
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockChannel);
  });

  it('should return all channels', async () => {
    const result = await controller.findAll();
    expect(service.findAll).toHaveBeenCalled();
    expect(result).toEqual([mockChannel]);
  });

  it('should return a channel by uuid', async () => {
    const result = await controller.findOne('123');
    expect(service.findOne).toHaveBeenCalledWith('123');
    expect(result).toEqual(mockChannel);
  });

  it('should update a channel', async () => {
    const updateDto = { name: 'updated channel' };
    const result = await controller.update('123', updateDto as any);
    expect(service.update).toHaveBeenCalledWith('123', updateDto);
    expect(result.name).toBe('updated channel');
  });

  it('should remove a channel', async () => {
    const result = await controller.remove('123');
    expect(service.remove).toHaveBeenCalledWith('123');
    expect(result).toEqual({ deleted: true });
  });
});