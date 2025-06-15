import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ChannelsModule } from './channels.module';
import { GuildsModule } from '../guilds/guilds.module';
import { CategoriesModule } from '../categories/categories.module';
import { TestDatabaseModule } from '../test/test-database.module';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('ChannelsController (integration)', () => {

  let app: INestApplication;

  let createdChannelUuid: string;

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          TestDatabaseModule,
          ChannelsModule,
          GuildsModule,
          CategoriesModule,
        ],
      }).compile();

      app = moduleFixture.createNestApplication();
      await app.init();

      // Créer un guild et une catégorie pour les tests
      const guildData = {
        uuid: '9876543210987654321',
        name: 'Test Guild',
        ownerId: '1234567890123456789',
        memberCount: '100'
      };

      const categoryData = {
        uuid: '5678901234567890123',
        name: 'Test Category',
        position: 1,
        uuidGuild: guildData.uuid
      };

      // Créer la guild
      await request(app.getHttpServer())
        .post('/guilds')
        .send(guildData)
        .expect(201);

      // Créer la catégorie
      await request(app.getHttpServer())
        .post('/categories')
        .send(categoryData)
        .expect(201);
    } catch (error) {
      console.error('Error in beforeAll:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      if (app) {
        await app.close();
      }
    } catch (error) {
      console.error('Error in afterAll:', error);
    }
  });

  it('POST /channels -> should create a channel', async () => {
    const channelData = {
      uuid: '1234567890123456789', 
      name: 'test channel',
      type: 'text',
      channelPosition: 1,
      uuidGuild: '9876543210987654321', 
      uuidCategory: '5678901234567890123' 
    };

    const res = await request(app.getHttpServer())
      .post('/channels')
      .send(channelData)
      .expect(201);

    expect(res.body).toHaveProperty('uuid', channelData.uuid);
    expect(res.body.name).toBe(channelData.name);
    expect(res.body.type).toBe(channelData.type);
    expect(res.body.channelPosition).toBe(channelData.channelPosition);
    expect(res.body.uuidGuild).toBe(channelData.uuidGuild);
    expect(res.body.uuidCategory).toBe(channelData.uuidCategory);
    createdChannelUuid = res.body.uuid;
  });

  it('GET /channels -> should return all channels', async () => {
    const res = await request(app.getHttpServer())
      .get('/channels')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('GET /channels/:uuid -> should return the created channel', async () => {
    const res = await request(app.getHttpServer())
      .get(`/channels/${createdChannelUuid}`)
      .expect(200);

    expect(res.body).toHaveProperty('uuid', createdChannelUuid);
    expect(res.body.name).toBe('test channel');
    expect(res.body.type).toBe('text');
    expect(res.body.channelPosition).toBe(1);
    expect(res.body.uuidGuild).toBe('9876543210987654321');
    expect(res.body.uuidCategory).toBe('5678901234567890123');
  });

  it('PUT /channels/:uuid -> should update the channel', async () => {
    const updateData = {
      name: 'updated channel',
      type: 'voice',
      channelPosition: 2,
      uuidCategory: '5678901234567890123'
    };

    const res = await request(app.getHttpServer())
      .put(`/channels/${createdChannelUuid}`)
      .send(updateData)
      .expect(200);

    expect(res.body).toHaveProperty('uuid', createdChannelUuid);
    expect(res.body.name).toBe(updateData.name);
    expect(res.body.type).toBe(updateData.type);
    expect(res.body.channelPosition).toBe(updateData.channelPosition);
    expect(res.body.uuidCategory).toBe(updateData.uuidCategory);
  });

  it('DELETE /channels/:uuid -> should delete the channel', async () => {
    await request(app.getHttpServer())
      .delete(`/channels/${createdChannelUuid}`)
      .expect(200);

    // Vérifie que le channel n'existe plus
    await request(app.getHttpServer())
      .get(`/channels/${createdChannelUuid}`)
      .expect(404);
  });
});