import { Test, TestingModule } from '@nestjs/testing';
import { ChannelsService } from './channels.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Exemple d'entité Channel (à adapter selon ta vraie entité)
const mockChannel = {
  uuid: '123',
  name: 'test channel',
  channelPosition: 1,
  type: 'text',
  uuidGuild: 'guild-uuid',
  uuidCategory: 'cat-uuid',
};

describe('ChannelsService', () => {
  let service: ChannelsService;

  // Mock d'un repository ou d'une dépendance éventuelle
  const mockRepository = {
    create: vi.fn().mockImplementation((dto) => ({ ...dto, uuid: '123' })),
    save: vi.fn().mockImplementation((channel) => Promise.resolve(channel)),
    find: vi.fn().mockResolvedValue([mockChannel]),
    findOne: vi.fn().mockImplementation(({ where: { uuid } }) =>
      uuid === mockChannel.uuid ? Promise.resolve(mockChannel) : Promise.resolve(null)
    ),
    findOneBy: vi.fn().mockImplementation(({ uuid }) =>
      uuid === mockChannel.uuid ? Promise.resolve(mockChannel) : Promise.resolve(null)
    ),
    update: vi.fn().mockImplementation((uuid, dto) =>
      uuid === mockChannel.uuid ? Promise.resolve({ ...mockChannel, ...dto }) : Promise.resolve(null)
    ),
    delete: vi.fn().mockImplementation(({ uuid }) =>
      uuid === mockChannel.uuid ? Promise.resolve({ affected: 1 }) : Promise.resolve({ affected: 0 })
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelsService,
        { provide: 'ChannelRepository', useValue: mockRepository }, // Adapter selon l'injection réelle
      ],
    })
      .useMocker((token) => {
        if (token === 'ChannelRepository') return mockRepository;
      })
      .compile();

    service = module.get<ChannelsService>(ChannelsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a channel', async () => {
    const dto = { name: 'test channel', channelPosition: 1, type: 'text', uuidGuild: 'guild-uuid', uuidCategory: 'cat-uuid' };
    // Adapter selon la logique réelle de create
    const result = await service.create(dto as any);
    expect(result).toHaveProperty('uuid');
    expect(result.name).toBe('test channel');
    expect(mockRepository.create).toHaveBeenCalledWith(dto);
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should return all channels', async () => {
    const result = await service.findAll();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].name).toBe('test channel');
    expect(mockRepository.find).toHaveBeenCalled();
  });

  it('should return a channel by uuid', async () => {
    const result = await service.findOne('123');
    expect(result).toEqual(mockChannel);
    expect(mockRepository.findOne).toHaveBeenCalled();
  });

  it('should update a channel', async () => {
    const updateDto = { name: 'updated channel' };
    // On s'assure que findOneBy retourne bien le channel existant
    mockRepository.findOneBy.mockResolvedValueOnce({ ...mockChannel });
    // On s'assure que save retourne le channel mis à jour
    mockRepository.save.mockResolvedValueOnce({ ...mockChannel, ...updateDto });
  
    const result = await service.update('123', updateDto as any);
  
    expect(result!.name).toBe('updated channel');
    expect(mockRepository.findOneBy).toHaveBeenCalledWith({ uuid: '123' });
    expect(mockRepository.save).toHaveBeenCalledWith({ ...mockChannel, ...updateDto, updatedAt: expect.any(Date) });
  });

  it('should remove a channel', async () => {
    const result = await service.remove('123');
    expect(result).toEqual({ affected: 1 });
    expect(mockRepository.delete).toHaveBeenCalledWith({ uuid: '123' });
  });
});