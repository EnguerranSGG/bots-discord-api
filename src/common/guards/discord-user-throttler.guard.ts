import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class DiscordUserThrottlerGuard extends ThrottlerGuard {

  protected generateKey(context: ExecutionContext, suffix: string, name: string): string {
    const request = context.switchToHttp().getRequest();
    
    // Transmis par le bot Discord avec l'ID de l'utilisateur final
    const discordUserId = request.headers['x-discord-user-id'];
    
    if (discordUserId) {
      // Rate limiting par utilisateur Discord
      return `discord-user:${discordUserId}:${suffix}:${name}`;
    }
    
    // Fallback : Rate limiting par IP
    // Utilisé si aucun ID Discord n'est fourni
    const ip = this.getTracker(request);
    return `fallback-ip:${ip}:${suffix}:${name}`;
  }
} 