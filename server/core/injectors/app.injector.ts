import { Application } from 'express';
import { Service } from 'typedi';
import { AppStore } from '../app-store';
import { META_MIDDLEWARE_SCOPE } from '../constants';
import { MiddlewareScope } from '../types/middleware-scope.type';
import { ControllerInjector } from './controller.injector';
import { middlewareInjector } from './middleware.injector';

@Service()
export class AppInjector {
  constructor(private _appStore: AppStore) {}

  private async injectControllers(app: Application): Promise<void> {
    const controllers = this._appStore.getControllers();

    for (const controller of controllers) {
      const controllerInjector = new ControllerInjector(controller);
      await controllerInjector.inject(app);
    }
  }

  private async injectMiddlewares(app: Application, scope: MiddlewareScope): Promise<void> {
    const middlewares = this._appStore
      .getMiddlewares()
      .filter((type) => Reflect.getOwnMetadata(META_MIDDLEWARE_SCOPE, type) === scope);

    for (const middleware of middlewares) {
      app.use(await middlewareInjector(middleware));
    }
  }

  public async inject(app: Application): Promise<void> {
    await this.injectMiddlewares(app, MiddlewareScope.Before);
    await this.injectControllers(app);
    await this.injectMiddlewares(app, MiddlewareScope.After);
    await this.injectMiddlewares(app, MiddlewareScope.Error);
  }
}
