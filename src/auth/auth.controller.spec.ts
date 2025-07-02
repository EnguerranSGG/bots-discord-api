import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { FastifyReply } from 'fastify';
import { UnauthorizedException } from '@nestjs/common';
import { DiscordUser, DiscordGuild, DiscordGuildMember } from './interfaces/discord-user.interface';

// Mock de FastifyReply
const mockFastifyReply = {
  status: vi.fn().mockReturnThis(),
  header: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
} as unknown as FastifyReply;

// Mock du service d'authentification
const mockAuthService = {
  exchangeCodeForToken: vi.fn(),
  getUserInfo: vi.fn(),
  getUserGuilds: vi.fn(),
  getGuildMember: vi.fn(),
  validateUserGuild: vi.fn(),
  generateJwtToken: vi.fn(),
  validateBotToken: vi.fn(),
  generateBotJwtToken: vi.fn(),
} as unknown as AuthService;

// Mock du service de configuration
const mockConfigService = {
  get: vi.fn(),
} as unknown as ConfigService;

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AuthController(mockAuthService, mockConfigService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should redirect to Discord OAuth2 URL', () => {
      const clientId = 'test-client-id';
      const redirectUri = 'http://localhost:3000/auth/callback';
      
      vi.mocked(mockConfigService.get)
        .mockReturnValueOnce(clientId)
        .mockReturnValueOnce(redirectUri);

      controller.login(mockFastifyReply);

      expect(mockFastifyReply.status).toHaveBeenCalledWith(302);
      expect(mockFastifyReply.header).toHaveBeenCalledWith('Location', expect.stringContaining('discord.com/api/oauth2/authorize'));
      expect(mockFastifyReply.send).toHaveBeenCalled();
    });
  });

  describe('callback', () => {
    const mockUser: DiscordUser = {
      id: '123456789',
      username: 'testuser',
      discriminator: '1234',
      avatar: 'test-avatar',
      email: 'test@example.com',
    };

    it('should process callback successfully', async () => {
      const code = 'test-auth-code';
      const accessToken = 'test-access-token';
      const jwt = 'test-jwt-token';

      vi.mocked(mockAuthService.exchangeCodeForToken).mockResolvedValue(accessToken);
      vi.mocked(mockAuthService.getUserInfo).mockResolvedValue(mockUser);
      vi.mocked(mockAuthService.validateUserGuild).mockResolvedValue({
        isValid: true,
        roles: ['role1', 'role2'],
        guildMember: null,
      });
      vi.mocked(mockAuthService.generateJwtToken).mockReturnValue(jwt);

      await controller.callback(code, mockFastifyReply);

      expect(mockAuthService.exchangeCodeForToken).toHaveBeenCalledWith(code);
      expect(mockAuthService.getUserInfo).toHaveBeenCalledWith(accessToken);
      expect(mockAuthService.validateUserGuild).toHaveBeenCalledWith(accessToken, mockUser.id);
      expect(mockAuthService.generateJwtToken).toHaveBeenCalledWith(mockUser, ['role1', 'role2']);
    });

    it('should throw UnauthorizedException when code is missing', async () => {
      await expect(controller.callback('', mockFastifyReply)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle user not in allowed guild', async () => {
      const code = 'test-auth-code';
      const accessToken = 'test-access-token';

      vi.mocked(mockAuthService.exchangeCodeForToken).mockResolvedValue(accessToken);
      vi.mocked(mockAuthService.getUserInfo).mockResolvedValue(mockUser);
      vi.mocked(mockAuthService.validateUserGuild).mockResolvedValue({
        isValid: false,
        roles: [],
        guildMember: null,
      });

      // Le contrôleur gère cette erreur en redirigeant vers une page d'erreur
      await controller.callback(code, mockFastifyReply);
      
      expect(mockFastifyReply.status).toHaveBeenCalledWith(302);
      expect(mockFastifyReply.header).toHaveBeenCalledWith('Location', expect.stringContaining('auth-callback-page'));
    });
  });

  describe('getUserInfo', () => {
    const mockUser: DiscordUser = {
      id: '123456789',
      username: 'testuser',
      discriminator: '1234',
      avatar: 'test-avatar',
      email: 'test@example.com',
    };

    it('should return user info successfully when user is in allowed guild', async () => {
      const code = 'test-auth-code';
      const accessToken = 'test-access-token';
      const jwt = 'test-jwt-token';
      const allowedGuildId = 'guild1';

      vi.mocked(mockConfigService.get).mockReturnValue(allowedGuildId);
      vi.mocked(mockAuthService.exchangeCodeForToken).mockResolvedValue(accessToken);
      vi.mocked(mockAuthService.getUserInfo).mockResolvedValue(mockUser);
      vi.mocked(mockAuthService.getUserGuilds).mockResolvedValue([
        { id: allowedGuildId, name: 'Test Guild', icon: 'icon', owner: true, permissions: 123, features: [] }
      ]);
      vi.mocked(mockAuthService.getGuildMember).mockResolvedValue({
        user: mockUser,
        nick: 'TestNick',
        roles: ['role1', 'role2'],
        joined_at: '2023-01-01T00:00:00.000Z',
        deaf: false,
        mute: false,
      });
      vi.mocked(mockAuthService.generateJwtToken).mockReturnValue(jwt);

      await controller.getUserInfo(code, mockFastifyReply);

      expect(mockFastifyReply.status).toHaveBeenCalledWith(200);
      expect(mockFastifyReply.send).toHaveBeenCalledWith(expect.objectContaining({
        user: expect.any(Object),
        token: jwt,
        status: 200,
      }));
    });

    it('should return user info without JWT when user is not in allowed guild', async () => {
      const code = 'test-auth-code';
      const accessToken = 'test-access-token';
      const allowedGuildId = 'guild1';

      vi.mocked(mockConfigService.get).mockReturnValue(allowedGuildId);
      vi.mocked(mockAuthService.exchangeCodeForToken).mockResolvedValue(accessToken);
      vi.mocked(mockAuthService.getUserInfo).mockResolvedValue(mockUser);
      vi.mocked(mockAuthService.getUserGuilds).mockResolvedValue([
        { id: 'different-guild', name: 'Different Guild', icon: 'icon', owner: true, permissions: 123, features: [] }
      ]);

      await controller.getUserInfo(code, mockFastifyReply);

      expect(mockFastifyReply.status).toHaveBeenCalledWith(200);
      expect(mockFastifyReply.send).toHaveBeenCalledWith(expect.objectContaining({
        user: expect.any(Object),
        token: null,
        allowedGuild: expect.objectContaining({
          isMember: false,
        }),
        status: 200,
      }));
    });

    it('should handle missing code', async () => {
      await controller.getUserInfo('', mockFastifyReply);

      expect(mockFastifyReply.status).toHaveBeenCalledWith(400);
      expect(mockFastifyReply.send).toHaveBeenCalledWith({
        message: 'Code d\'autorisation non fourni',
        status: 400,
      });
    });
  });

  describe('botLogin', () => {
    const mockBotUser: DiscordUser = {
      id: 'bot123456789',
      username: 'TestBot',
      discriminator: '0000',
      avatar: 'bot-avatar',
      email: undefined,
    };

    it('should authenticate bot successfully', async () => {
      const authData = {
        botToken: 'Bot test-bot-token',
        botId: 'bot123456789',
      };
      const jwt = 'test-bot-jwt';

      vi.mocked(mockAuthService.validateBotToken).mockResolvedValue(mockBotUser);
      vi.mocked(mockAuthService.generateBotJwtToken).mockReturnValue(jwt);

      const result = await controller.botLogin(authData);

      expect(mockAuthService.validateBotToken).toHaveBeenCalledWith(authData.botToken);
      expect(mockAuthService.generateBotJwtToken).toHaveBeenCalledWith(mockBotUser);
      expect(result).toEqual(expect.objectContaining({
        message: 'Bot authentifié avec succès',
        data: expect.objectContaining({
          token: jwt,
          botInfo: expect.any(Object),
        }),
        statusCode: 200,
      }));
    });

    it('should throw UnauthorizedException when bot token is missing', async () => {
      const authData = {
        botToken: '',
        botId: 'bot123456789',
      };

      await expect(controller.botLogin(authData)).rejects.toThrow(UnauthorizedException);
    });
  });
}); 