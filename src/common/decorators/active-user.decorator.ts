import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { RequestWithUser } from "src/auth/auth.controller";


export const ActiveUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request: RequestWithUser  = ctx.switchToHttp().getRequest();
    return request.user;
  }
);