import express, { Express, NextFunction, Response, Request } from "express";
import bodyParser from "body-parser";
import cors from "cors";
import authorsRoute from "./routes/authors";
import { EntityNotFoundError } from "typeorm";
import { ResponseUtl } from "./utils/Response";
import { ErrorHandler } from "./middlewares/ErrorHandler";

const app: Express = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}))
app.use("/authors", authorsRoute);

app.use("*", (req, res) => {
  return res.status(404).json({
    success: false,
    message: "Invalid route",
    error: String
  });
});

app.use(ErrorHandler.handleErrors);
// Define Middleware functions to handle errors
// app.use((err: any, req: Request, res: Response, next: NextFunction) => {
//   console.error(err);
//   if (err instanceof EntityNotFoundError) {
//     return ResponseUtl.sendError(
//       res,
//       "Item or page you are looking for does not exist",
//       404,
//       null,
//     );
//   }
//   if (err.message === "Invalid file type") {
//     return ResponseUtl.sendError(res, "Invalid file type", 422, null);
//   }

//   return res.status(500).send({
//    success: false,
//    message: "Something went wrong"
//   });
// });

export default app;
