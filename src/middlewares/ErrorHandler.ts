import { Request, Response, NextFunction } from "express"
import { EntityNotFoundError } from "typeorm";
import { ResponseUtl } from "../utils/Response";
import { promiseHooks } from "v8";

export class ErrorHandler {
   static catchErrors(fn) {

      return (req: Request, res: Response, next: NextFunction) => {
         Promise.resolve(fn(req, res, next)).catch(next);
      };
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
      if (err.message === "Invalid file type") {
         return ResponseUtl.sendError(res, "Invalid file type", 422, null);
      }

      return res.status(500).send({
         success: false,
         message: "Something went wrong"
      });
   }
   
}
