import { Params } from 'nestjs-pino';

export const loggerConfig: Params = {
  pinoHttp: {
    customProps: () => ({
      context: 'HTTP',
    }),
    transport: {
      target: 'pino-pretty',
      options: {
        destination: '/app/logs/app.log',
        mkdir: true,
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        messageFormat: '{msg}',
        levelFirst: true,
        customPrettifiers: {
          time: (timestamp: string) => `🕰️  ${timestamp}`,
        }
      }
    },
    level: 'warn',
    autoLogging: true,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie'],
      remove: true
    }
  }
}; 