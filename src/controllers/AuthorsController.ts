import { NextFunction, Request, Response } from "express";
import { AppDataSource } from "../database/data-source";
import { Author } from "../entities/Author";
import { ResponseUtl } from "../../utils/Response";
import { Paginator } from "../database/Paginator";
export class AuthorsController {
  async getAuthors(req: Request, res: Response) {
    const builder = await AppDataSource.getRepository(Author).createQueryBuilder().orderBy("id", "DESC");
    const {records: authors, paginationInfo} = await Paginator.paginate(builder, req);
    return ResponseUtl.sendResponse(res, "Fetched Authors successfully", authors, paginationInfo);
  }
  async getAuthor(req: Request, res: Response, next: NextFunction) {
    const { id } = req.params;
    const author = await AppDataSource.getRepository(Author).findOneByOrFail({
      id: Number(id),
    });
    return ResponseUtl.sendResponse<Author> (
      res,
      "Fetch author successful",
      author
    );
    // throw new Error("Something else");
  }
}
