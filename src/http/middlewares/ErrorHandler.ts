import { Request, Response, NextFunction } from "express"
import { EntityNotFoundError } from "typeorm";
import { ResponseUtl } from "../../utils/Response";
import { promiseHooks } from "v8";
import { ValidationError } from "class-validator";

export class ErrorHandler {
   static catchErrors(fn) {

      return (req: Request, res: Response, next: NextFunction) => {
         Promise.resolve(fn(req, res, next)).catch(next);
      };
   }
   static formatErrors(err:any) {
      const errors = {};
      err.forEach((e) => {
         if (!errors[e.prroperty]) {
            errors[e.prroperty] = [];
         }
         errors[e.property].push(e.constraints[Object.keys(e.constraints)[0]]);
      })
      return errors;
   }
   static handleErrors(err: any, req: Request, res: Response, next: NextFunction) {
      console.error(err);
      if (err instanceof EntityNotFoundError) {
         return ResponseUtl.sendError(
            res,
            "Item or page you are looking for does not exist",
            404,
            null, 
         );
      }
      if (err.length > 0 && err[0] instanceof ValidationError) {
         const errors = ErrorHandler.formatErrors(err);
         return ResponseUtl.sendError(res, "Invalid input", 422, errors)
      } 
      if (err.message === "Invalid file type") {
         return ResponseUtl.sendError(res, "Invalid file type", 422, null);
      }

      return res.status(500).send({
         success: false,
         message: "Something went wrong"
      });
   }
   
}
