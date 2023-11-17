import { paramDecoratorWrapper } from '../decorators/handler-param.decorator';
import { HandlerArgType, HandlerArgValue } from '../types/handler-args.type';

type CustomParamDecoratorOptions = {
  data?: any;
  value: HandlerArgValue;
};

export function createCustomParamDecorator(options: CustomParamDecoratorOptions): ParameterDecorator {
  return paramDecoratorWrapper(HandlerArgType.Custom, options.data, options.value);
}
