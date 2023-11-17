import express, { Application, json, urlencoded } from 'express';
import helmet from 'helmet';
import nocache from 'nocache';
import path from 'path';
import { Constructable, Service } from 'typedi';
import { AppStore } from './app-store';
import { Logger } from './classes/logger.class';
import { AppInjector } from './injectors/app.injector';
import { ContextMiddleware } from './middlewares/context.middleware';
import { DefaultErrorMiddleware } from './middlewares/default-error.middleware';
import { NotFoundMiddleware } from './middlewares/not-found.middleware';
import { ResponseMiddleware } from './middlewares/response.middleware';

const logger = new Logger('server');

@Service()
export class Server {
  private readonly _app: Application = express();

  constructor(private _appStore: AppStore, private _appInjector: AppInjector) {
    this._app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            'script-src': ["'self'", "'unsafe-inline'", 'example.com'],
          },
        },
      })
    );
    this._app.use(nocache());
    this._app.use(
      json({
        limit: '7mb',
      })
    );
    this._app.use(
      urlencoded({
        extended: true,
      })
    );

    this._app.use(express.static(path.join(process.cwd(), 'public')));

    this.useMiddlewares(ContextMiddleware);
    this.useMiddlewares(DefaultErrorMiddleware);
    this.useMiddlewares(NotFoundMiddleware, ResponseMiddleware);
  }

  public get app(): Application {
    return this._app;
  }

  public useControllers(...controllers: Constructable<any>[]): void {
    for (const controller of controllers) {
      this._appStore.addType(controller);
    }
  }

  public useMiddlewares(...middlewares: Constructable<any>[]): void {
    for (const middleware of middlewares) {
      this._appStore.addType(middleware);
    }
  }

  public async run(port: number): Promise<void> {
    logger.log('Starting up the Express server...');
    await this._appInjector.inject(this._app);

    this._app.listen(port, () => {
      logger.log(`Express server started at http://localhost:${port}`);
    });
  }
}
