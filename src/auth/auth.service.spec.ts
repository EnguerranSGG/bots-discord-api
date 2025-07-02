import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { DiscordUser, DiscordGuild, DiscordGuildMember } from './interfaces/discord-user.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

// Données de test
const mockDiscordUser: DiscordUser = {
  id: '123456789',
  username: 'testuser',
  discriminator: '1234',
  avatar: 'test-avatar',
  email: 'test@example.com',
  verified: true,
};

const mockDiscordGuild: DiscordGuild = {
  id: 'guild123',
  name: 'Test Guild',
  icon: 'guild-icon',
  owner: false,
  permissions: 123456,
  features: ['feature1', 'feature2'],
};

const mockDiscordGuildMember: DiscordGuildMember = {
  user: mockDiscordUser,
  nick: 'TestNick',
  roles: ['role1', 'role2', 'role3'],
  joined_at: '2023-01-01T00:00:00.000Z',
  deaf: false,
  mute: false,
};

const mockBotUser: DiscordUser & { bot: boolean } = {
  id: 'bot123456789',
  username: 'TestBot',
  discriminator: '0000',
  avatar: 'bot-avatar',
  bot: true,
};

// Helper pour créer des AxiosResponse mock
const createMockAxiosResponse = <T>(data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as any,
});

describe('AuthService', () => {
  let authService: AuthService;
  let mockJwtService: JwtService;
  let mockHttpService: HttpService;
  let mockConfigService: ConfigService;

  beforeEach(() => {
    // Créer des mocks frais pour chaque test
    mockJwtService = {
      sign: vi.fn(),
    } as any;

    mockHttpService = {
      post: vi.fn(),
      get: vi.fn(),
    } as any;

    mockConfigService = {
      get: vi.fn(),
    } as any;

    // Configuration par défaut des mocks avec des valeurs spécifiques
    vi.mocked(mockConfigService.get).mockImplementation((key: string) => {
      const config = {
        'DISCORD_API_ENDPOINT': 'https://discord.com/api/v10',
        'DISCORD_CLIENT_ID': 'test-client-id',
        'DISCORD_CLIENT_SECRET': 'test-client-secret',
        'DISCORD_REDIRECT_URI': 'http://localhost:3000/auth/callback',
        'ALLOWED_GUILD_ID': 'guild123',
        'DISCORD_BOT_TOKEN': 'bot-token-123',
        'EXPECTED_BOT_ID': 'bot123456789',
      };
      return config[key] || '';
    });

    authService = new AuthService(mockJwtService, mockHttpService, mockConfigService);
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(authService).toBeDefined();
    });

    it('should log configuration on initialization', () => {
      const logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
      
      // Créer une nouvelle instance pour tester le logging
      new AuthService(mockJwtService, mockHttpService, mockConfigService);
      
      expect(logSpy).toHaveBeenCalledWith('Configuration initialisée:');
      expect(logSpy).toHaveBeenCalledWith('Discord API URL: https://discord.com/api/v10');
      expect(logSpy).toHaveBeenCalledWith('Client ID: test-client-id');
      expect(logSpy).toHaveBeenCalledWith('Redirect URI: http://localhost:3000/auth/callback');
      expect(logSpy).toHaveBeenCalledWith('Allowed Guild ID: guild123');
      expect(logSpy).toHaveBeenCalledWith('Bot Token configuré: Oui');
      
      logSpy.mockRestore();
    });
  });

  describe('exchangeCodeForToken', () => {
    it('should exchange code for token successfully', async () => {
      const code = 'test-auth-code';
      const expectedToken = 'access-token-123';
      
      vi.mocked(mockHttpService.post).mockReturnValue(
        of(createMockAxiosResponse({ access_token: expectedToken }))
      );

      const result = await authService.exchangeCodeForToken(code);

      expect(result).toBe(expectedToken);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://discord.com/api/v10/oauth2/token',
        expect.any(URLSearchParams),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
    });

    it('should throw BadRequestException on exchange failure', async () => {
      const code = 'invalid-code';
      const errorMessage = 'Invalid authorization code';
      
      vi.mocked(mockHttpService.post).mockReturnValue(
        throwError(() => new Error(errorMessage))
      );

      await expect(authService.exchangeCodeForToken(code)).rejects.toThrow(BadRequestException);
    });

    it('should include correct parameters in request', async () => {
      const code = 'test-code';
      
      vi.mocked(mockHttpService.post).mockReturnValue(
        of(createMockAxiosResponse({ access_token: 'token' }))
      );

      await authService.exchangeCodeForToken(code);

      const callArgs = vi.mocked(mockHttpService.post).mock.calls[0];
      const params = callArgs[1] as URLSearchParams;
      
      expect(params.get('client_id')).toBe('test-client-id');
      expect(params.get('client_secret')).toBe('test-client-secret');
      expect(params.get('grant_type')).toBe('authorization_code');
      expect(params.get('code')).toBe(code);
      expect(params.get('redirect_uri')).toBe('http://localhost:3000/auth/callback');
    });
  });

  describe('getUserInfo', () => {
    it('should get user info successfully', async () => {
      const accessToken = 'access-token-123';
      
      vi.mocked(mockHttpService.get).mockReturnValue(
        of(createMockAxiosResponse(mockDiscordUser))
      );

      const result = await authService.getUserInfo(accessToken);

      expect(result).toEqual(mockDiscordUser);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://discord.com/api/v10/users/@me',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    });

    it('should throw UnauthorizedException on failure', async () => {
      const accessToken = 'invalid-token';
      
      vi.mocked(mockHttpService.get).mockReturnValue(
        throwError(() => new Error('Invalid token'))
      );

      await expect(authService.getUserInfo(accessToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getUserGuilds', () => {
    it('should get user guilds successfully', async () => {
      const accessToken = 'access-token-123';
      const mockGuilds = [mockDiscordGuild];
      
      vi.mocked(mockHttpService.get).mockReturnValue(
        of(createMockAxiosResponse(mockGuilds))
      );

      const result = await authService.getUserGuilds(accessToken);

      expect(result).toEqual(mockGuilds);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://discord.com/api/v10/users/@me/guilds',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    });

    it('should throw UnauthorizedException on failure', async () => {
      const accessToken = 'invalid-token';
      
      vi.mocked(mockHttpService.get).mockReturnValue(
        throwError(() => new Error('Invalid token'))
      );

      await expect(authService.getUserGuilds(accessToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getGuildMember', () => {
    it('should get guild member with OAuth2 token successfully', async () => {
      const userId = '123456789';
      const accessToken = 'access-token-123';
      const guildId = 'guild123';
      
      vi.mocked(mockHttpService.get).mockReturnValue(
        of(createMockAxiosResponse(mockDiscordGuildMember))
      );

      const result = await authService.getGuildMember(userId, accessToken, guildId);

      expect(result).toEqual(mockDiscordGuildMember);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://discord.com/api/v10/users/@me/guilds/guild123/member',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    });

    it('should fallback to bot token when OAuth2 fails', async () => {
      const userId = '123456789';
      const accessToken = 'invalid-oauth-token';
      const guildId = 'guild123';
      
      // Premier appel échoue (OAuth2)
      vi.mocked(mockHttpService.get)
        .mockReturnValueOnce(throwError(() => new Error('OAuth2 failed')))
        // Deuxième appel réussit (bot token)
        .mockReturnValueOnce(of(createMockAxiosResponse(mockDiscordGuildMember)));

      const result = await authService.getGuildMember(userId, accessToken, guildId);

      expect(result).toEqual(mockDiscordGuildMember);
      expect(mockHttpService.get).toHaveBeenCalledTimes(2);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://discord.com/api/v10/guilds/guild123/members/123456789',
        {
          headers: {
            Authorization: 'Bot bot-token-123',
          },
        }
      );
    });

    it('should use bot token when no access token provided', async () => {
      const userId = '123456789';
      const guildId = 'guild123';
      
      vi.mocked(mockHttpService.get).mockReturnValue(
        of(createMockAxiosResponse(mockDiscordGuildMember))
      );

      const result = await authService.getGuildMember(userId, undefined, guildId);

      expect(result).toEqual(mockDiscordGuildMember);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://discord.com/api/v10/guilds/guild123/members/123456789',
        {
          headers: {
            Authorization: 'Bot bot-token-123',
          },
        }
      );
    });

    it('should throw error when bot token is not configured', async () => {
      // Reconfigurer le service sans bot token
      vi.mocked(mockConfigService.get).mockImplementation((key: string) => {
        const config = {
          'DISCORD_API_ENDPOINT': 'https://discord.com/api/v10',
          'DISCORD_CLIENT_ID': 'test-client-id',
          'DISCORD_CLIENT_SECRET': 'test-client-secret',
          'DISCORD_REDIRECT_URI': 'http://localhost:3000/auth/callback',
          'ALLOWED_GUILD_ID': 'guild123',
          'DISCORD_BOT_TOKEN': '', // Token vide
          'EXPECTED_BOT_ID': 'bot123456789',
        };
        return config[key] || '';
      });

      const authServiceWithoutBot = new AuthService(mockJwtService, mockHttpService, mockConfigService);
      
      // Mock une erreur pour forcer l'utilisation du bot token
      vi.mocked(mockHttpService.get).mockReturnValue(
        throwError(() => new Error('OAuth2 failed'))
      );
      
      await expect(authServiceWithoutBot.getGuildMember('123456789')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is not found (404)', async () => {
      const userId = '123456789';
      const accessToken = 'access-token-123';
      
      vi.mocked(mockHttpService.get).mockReturnValue(
        throwError(() => ({ response: { status: 404 } }))
      );

      await expect(authService.getGuildMember(userId, accessToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on other errors', async () => {
      const userId = '123456789';
      const accessToken = 'access-token-123';
      
      vi.mocked(mockHttpService.get).mockReturnValue(
        throwError(() => new Error('Network error'))
      );

      await expect(authService.getGuildMember(userId, accessToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUserGuild', () => {
    it('should validate user guild successfully', async () => {
      const accessToken = 'access-token-123';
      const userId = '123456789';
      const mockGuilds = [mockDiscordGuild];
      
      vi.mocked(mockHttpService.get)
        .mockReturnValueOnce(of(createMockAxiosResponse(mockGuilds))) // getUserGuilds
        .mockReturnValueOnce(of(createMockAxiosResponse(mockDiscordGuildMember))); // getGuildMember

      const result = await authService.validateUserGuild(accessToken, userId);

      expect(result).toEqual({
        isValid: true,
        roles: mockDiscordGuildMember.roles,
        guildMember: mockDiscordGuildMember,
      });
    });

    it('should return invalid when user is not in allowed guild', async () => {
      const accessToken = 'access-token-123';
      const userId = '123456789';
      const mockGuilds = [{ ...mockDiscordGuild, id: 'different-guild' }];
      
      vi.mocked(mockHttpService.get).mockReturnValue(
        of(createMockAxiosResponse(mockGuilds))
      );

      const result = await authService.validateUserGuild(accessToken, userId);

      expect(result).toEqual({
        isValid: false,
        roles: [],
        guildMember: null,
      });
    });

    it('should handle getGuildMember error gracefully', async () => {
      const accessToken = 'access-token-123';
      const userId = '123456789';
      const mockGuilds = [mockDiscordGuild];
      
      // Reset les mocks pour ce test spécifique
      vi.clearAllMocks();
      
      // Reconfigurer les mocks
      vi.mocked(mockConfigService.get).mockImplementation((key: string) => {
        const config = {
          'DISCORD_API_ENDPOINT': 'https://discord.com/api/v10',
          'DISCORD_CLIENT_ID': 'test-client-id',
          'DISCORD_CLIENT_SECRET': 'test-client-secret',
          'DISCORD_REDIRECT_URI': 'http://localhost:3000/auth/callback',
          'ALLOWED_GUILD_ID': 'guild123',
          'DISCORD_BOT_TOKEN': 'bot-token-123',
          'EXPECTED_BOT_ID': 'bot123456789',
        };
        return config[key] || '';
      });
      
      // Configurer les mocks dans l'ordre correct
      vi.mocked(mockHttpService.get)
        .mockReturnValueOnce(of(createMockAxiosResponse(mockGuilds))) // getUserGuilds
        .mockReturnValueOnce(throwError(() => new Error('Member not found'))); // getGuildMember

      const authServiceForTest = new AuthService(mockJwtService, mockHttpService, mockConfigService);
      const result = await authServiceForTest.validateUserGuild(accessToken, userId);

      expect(result).toEqual({
        isValid: true,
        roles: [],
        guildMember: null,
      });
    });
  });

  describe('generateJwtToken', () => {
    it('should generate JWT token with correct payload', () => {
      const roles = ['role1', 'role2'];
      const expectedToken = 'jwt-token-123';
      
      vi.mocked(mockJwtService.sign).mockReturnValue(expectedToken);

      const result = authService.generateJwtToken(mockDiscordUser, roles);

      expect(result).toBe(expectedToken);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: mockDiscordUser.id,
        username: mockDiscordUser.username,
        roles,
        guildId: 'guild123',
      });
    });
  });

  describe('hasRole', () => {
    it('should return true when user has required role', () => {
      const userRoles = ['role1', 'role2', 'role3'];
      const requiredRole = 'role2';

      const result = authService.hasRole(userRoles, requiredRole);

      expect(result).toBe(true);
    });

    it('should return false when user does not have required role', () => {
      const userRoles = ['role1', 'role2'];
      const requiredRole = 'role3';

      const result = authService.hasRole(userRoles, requiredRole);

      expect(result).toBe(false);
    });

    it('should return false when user has no roles', () => {
      const userRoles: string[] = [];
      const requiredRole = 'role1';

      const result = authService.hasRole(userRoles, requiredRole);

      expect(result).toBe(false);
    });
  });

  describe('validateBotToken', () => {
    it('should validate bot token successfully', async () => {
      const botToken = 'bot-token-123';
      
      vi.mocked(mockHttpService.get)
        .mockReturnValueOnce(of(createMockAxiosResponse(mockBotUser))) // Bot info
        .mockReturnValueOnce(of(createMockAxiosResponse(mockDiscordGuildMember))); // Guild member check

      const result = await authService.validateBotToken(botToken);

      expect(result).toEqual(mockBotUser);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://discord.com/api/v10/users/@me',
        {
          headers: {
            Authorization: 'Bot bot-token-123',
          },
        }
      );
    });

    it('should clean token with "Bot " prefix', async () => {
      const botToken = 'Bot bot-token-123';
      
      vi.mocked(mockHttpService.get)
        .mockReturnValueOnce(of(createMockAxiosResponse(mockBotUser)))
        .mockReturnValueOnce(of(createMockAxiosResponse(mockDiscordGuildMember)));

      await authService.validateBotToken(botToken);

      expect(mockHttpService.get).toHaveBeenCalledWith(
        'https://discord.com/api/v10/users/@me',
        {
          headers: {
            Authorization: 'Bot bot-token-123',
          },
        }
      );
    });

    it('should throw UnauthorizedException when token is not for a bot', async () => {
      const botToken = 'user-token-123';
      const userData = { ...mockDiscordUser, bot: false };
      
      vi.mocked(mockHttpService.get).mockReturnValue(
        of(createMockAxiosResponse(userData))
      );

      await expect(authService.validateBotToken(botToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when bot ID does not match expected', async () => {
      const botToken = 'bot-token-123';
      const wrongBotUser = { ...mockBotUser, id: 'wrong-bot-id' };
      
      vi.mocked(mockHttpService.get).mockReturnValue(
        of(createMockAxiosResponse(wrongBotUser))
      );

      await expect(authService.validateBotToken(botToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when bot is not in allowed guild', async () => {
      const botToken = 'bot-token-123';
      
      vi.mocked(mockHttpService.get)
        .mockReturnValueOnce(of(createMockAxiosResponse(mockBotUser))) // Bot info
        .mockReturnValueOnce(throwError(() => ({ response: { status: 404 } }))); // Guild member check fails

      await expect(authService.validateBotToken(botToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on invalid token', async () => {
      const botToken = 'invalid-token';
      
      vi.mocked(mockHttpService.get).mockReturnValue(
        throwError(() => ({ response: { status: 401 } }))
      );

      await expect(authService.validateBotToken(botToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on other errors', async () => {
      const botToken = 'bot-token-123';
      
      vi.mocked(mockHttpService.get).mockReturnValue(
        throwError(() => new Error('Network error'))
      );

      await expect(authService.validateBotToken(botToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('generateBotJwtToken', () => {
    it('should generate bot JWT token with correct payload', () => {
      const expectedToken = 'bot-jwt-token-123';
      
      vi.mocked(mockJwtService.sign).mockReturnValue(expectedToken);

      const result = authService.generateBotJwtToken(mockBotUser);

      expect(result).toBe(expectedToken);
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        {
          sub: mockBotUser.id,
          username: mockBotUser.username,
          roles: ['bot', 'api_access'],
          guildId: 'guild123',
          type: 'bot',
        },
        { expiresIn: '24h' }
      );
    });
  });

  describe('error handling and logging', () => {
    it('should log errors appropriately', async () => {
      const logSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      const code = 'invalid-code';
      
      vi.mocked(mockHttpService.post).mockReturnValue(
        throwError(() => new Error('Test error'))
      );

      try {
        await authService.exchangeCodeForToken(code);
      } catch (error) {
        // Expected to throw
      }

      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should handle HTTP error responses', async () => {
      const code = 'invalid-code';
      const httpError = {
        message: 'HTTP Error',
        response: {
          data: { error: 'invalid_grant' },
          status: 400,
        },
      };
      
      vi.mocked(mockHttpService.post).mockReturnValue(
        throwError(() => httpError)
      );

      await expect(authService.exchangeCodeForToken(code)).rejects.toThrow(BadRequestException);
    });
  });
}); 