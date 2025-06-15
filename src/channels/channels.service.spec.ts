import { Test, TestingModule } from '@nestjs/testing';
import { ChannelsService } from './channels.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Channel } from './entities/channel.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

// Création d'un mock de channel
const mockChannel = {
  uuid: '1234567890123456789', 
  name: 'test channel',
  channelPosition: 1,
  type: 'text',
  uuidGuild: '9876543210987654321', 
  uuidCategory: '5678901234567890123', 
  createdAt: new Date(),
  updatedAt: new Date(),
  guild: {
    uuid: '9876543210987654321',
    name: 'Test Guild'
  },
  category: {
    uuid: '5678901234567890123',
    name: 'Test Category'
  }
};

// Établissement de la suite de tests
describe('ChannelsService', () => {
  let service: ChannelsService;

  // Mock d'un repository TypeORM
  const mockRepository = {
    create: vi.fn().mockImplementation((dto) => ({ ...dto, uuid: '1234567890123456789' })),
    save: vi.fn().mockImplementation((channel) => Promise.resolve(channel)),
    find: vi.fn().mockResolvedValue([mockChannel]),
    findOne: vi.fn().mockImplementation(({ where: { uuid }, relations }) =>
      uuid === mockChannel.uuid ? Promise.resolve(mockChannel) : Promise.resolve(null)
    ),
    findOneBy: vi.fn().mockImplementation(({ uuid }) =>
      uuid === mockChannel.uuid ? Promise.resolve(mockChannel) : Promise.resolve(null)
    ),
    delete: vi.fn().mockImplementation(({ uuid }) =>
      uuid === mockChannel.uuid ? Promise.resolve({ affected: 1 }) : Promise.resolve({ affected: 0 })
    ),
    remove: vi.fn().mockImplementation((channel) =>
      channel && channel.uuid === mockChannel.uuid ? Promise.resolve(channel) : Promise.resolve(null)
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChannelsService,
        {
          provide: getRepositoryToken(Channel),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ChannelsService>(ChannelsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a channel', async () => {
    const dto: CreateChannelDto = {
      uuid: '1234567890123456789',
      name: 'test channel',
      channelPosition: 1,
      type: 'text',
      uuidGuild: '9876543210987654321',
      uuidCategory: '5678901234567890123'
    };
    const result = await service.create(dto);
    expect(result).toHaveProperty('uuid');
    expect(result.name).toBe('test channel');
    expect(mockRepository.create).toHaveBeenCalledWith(dto);
    expect(mockRepository.save).toHaveBeenCalled();
  });

  it('should return all channels with relations', async () => {
    const result = await service.findAll();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].name).toBe('test channel');
    expect(result[0].guild).toBeDefined();
    expect(result[0].category).toBeDefined();
    expect(mockRepository.find).toHaveBeenCalledWith({
      relations: ['guild', 'category']
    });
  });

  it('should return a channel by uuid with relations', async () => {
    const result = await service.findOne('1234567890123456789');
    expect(result).toEqual(mockChannel);
    expect(result?.guild).toBeDefined();
    expect(result?.category).toBeDefined();
    expect(mockRepository.findOne).toHaveBeenCalledWith({
      where: { uuid: '1234567890123456789' },
      relations: ['guild', 'category']
    });
  });

  it('should update a channel', async () => {
    const updateDto: UpdateChannelDto = {
      name: 'updated channel',
      type: 'voice',
      channelPosition: 2,
      uuidCategory: '5678901234567890123'
    };
    
    mockRepository.findOneBy.mockResolvedValueOnce({ ...mockChannel });
    mockRepository.save.mockResolvedValueOnce({ ...mockChannel, ...updateDto, updatedAt: new Date() });
  
    const result = await service.update('1234567890123456789', updateDto);
  
    expect(result!.name).toBe('updated channel');
    expect(result!.type).toBe('voice');
    expect(result!.channelPosition).toBe(2);
    expect(result!.uuidCategory).toBe('5678901234567890123');
    expect(result!.updatedAt).toBeInstanceOf(Date);
    expect(mockRepository.findOneBy).toHaveBeenCalledWith({ uuid: '1234567890123456789' });
  });

  it('should return null when updating non-existent channel', async () => {
    // Réinitialiser les mocks avant le test
    mockRepository.findOneBy.mockReset();
    mockRepository.save.mockReset();
    
    // Configurer le mock pour retourner null
    mockRepository.findOneBy.mockResolvedValueOnce(null);
    
    const result = await service.update('non-existent', { name: 'updated' });
    
    expect(result).toBeNull();
    expect(mockRepository.findOneBy).toHaveBeenCalledWith({ uuid: 'non-existent' });
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should remove a channel', async () => {
    mockRepository.findOneBy.mockResolvedValueOnce(mockChannel);
    const result = await service.remove('1234567890123456789');
    expect(result).toEqual(mockChannel);
    expect(mockRepository.findOneBy).toHaveBeenCalledWith({ uuid: '1234567890123456789' });
    expect(mockRepository.remove).toHaveBeenCalledWith(mockChannel);
  });
});