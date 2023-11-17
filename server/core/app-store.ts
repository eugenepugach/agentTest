import { Constructable, Service } from 'typedi';
import { META_CONTROLLER, META_MIDDLEWARE } from './constants';

@Service()
export class AppStore {
  private _types: Constructable<any>[] = [];

  public addType(type: Constructable<any>): void {
    this._types.push(type);
  }

  public getControllers(): Constructable<any>[] {
    return this._types.filter((type) => !!Reflect.getOwnMetadata(META_CONTROLLER, type));
  }

  public getMiddlewares(): Constructable<any>[] {
    return this._types.filter((type) => !!Reflect.getOwnMetadata(META_MIDDLEWARE, type));
  }
}
