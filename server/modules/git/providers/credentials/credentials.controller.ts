import { Context, Controller, param, Post, Version } from '@/core';
import { ValidationPipe } from '@/core/pipes/validation.pipe';
import { ConnectionDto } from '@/modules/git/salesforce/dto/connection.dto';
import { ConnectionValidator } from '@/modules/git/providers/credentials/credentials.connection.validator';

@Controller('credentials')
@Version('v1')
export class CredentialsController {
  @Post('/validation')
  async testConnection(
    @param.body(new ValidationPipe({ transform: true })) body: ConnectionDto,
    @param.context() ctx: Context
  ) {
    const isLoggedIn = await ConnectionValidator.validate(body, ctx);
    ctx.statusCode = 200;
    return { isLoggedIn };
  }
}
