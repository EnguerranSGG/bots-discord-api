import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ChannelsModule } from './channels.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Channel } from './entities/channel.entity';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('ChannelsController (integration)', () => {
  let app: INestApplication;
  let createdChannelUuid: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Channel],
          synchronize: true,
        }),
        ChannelsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /channels -> should create a channel', async () => {
    const res = await request(app.getHttpServer())
      .post('/channels')
      .send({ name: 'test channel', channelPosition: 1 })
      .expect(201);

    expect(res.body).toHaveProperty('uuid');
    expect(res.body.name).toBe('test channel');
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
  });

  it('PUT /channels/:uuid -> should update the channel', async () => {
    const res = await request(app.getHttpServer())
      .put(`/channels/${createdChannelUuid}`)
      .send({ name: 'updated channel', channelPosition: 2 })
      .expect(200);

    expect(res.body).toHaveProperty('uuid', createdChannelUuid);
    expect(res.body.name).toBe('updated channel');
    expect(res.body.channelPosition).toBe(2);
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