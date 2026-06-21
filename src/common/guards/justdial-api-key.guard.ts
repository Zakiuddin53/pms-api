import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JustdialApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(JustdialApiKeyGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey || typeof apiKey !== 'string') {
      this.logger.warn(
        `Rejected Justdial webhook — missing x-api-key from ${request.ip}`,
      );
      throw new UnauthorizedException();
    }

    return true;
  }
}
