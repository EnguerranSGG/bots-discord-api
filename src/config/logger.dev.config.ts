import { Params } from 'nestjs-pino';

export const loggerConfig: Params = {
  pinoHttp: {
    transport: {
      target: 'pino-pretty',
      options: {
        singleLine: true,
      },
    },
    level: process.env.NODE_ENV === 'test' ? 'silent' : 'debug',
  },
}; 