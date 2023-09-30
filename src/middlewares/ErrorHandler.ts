import { Request, Response, NextFunction } from "express"
import { EntityNotFoundError } from "typeorm";
import { ResponseUtl } from "../utils/Response";

export class ErrorHandler {
   static handleErrors(fn) {
      return (req: Request, res: Response, next: NextFunction) => {
         Promise.resolve(fn(req, res, next)).catch(next);
      };
   }
}
