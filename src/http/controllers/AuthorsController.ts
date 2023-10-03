import { NextFunction, Request, Response } from "express";
import { AppDataSource } from "../../database/data-source";
import { Author } from "../../database/entities/Author";
import { ResponseUtl } from "../../utils/Response";
import { Paginator } from "../../database/Paginator";
import { CreateAuthorDTO, UpdateAuthorDTO } from "../dtos/CreateAuthorDTO";
import { validate } from "class-validator";

export class AuthorsController {
  async getAuthors(req: Request, res: Response) {
    const builder = await AppDataSource.getRepository(Author).createQueryBuilder().orderBy("id", "DESC");
    const {records: authors, paginationInfo} = await Paginator.paginate(builder, req);
    return ResponseUtl.sendResponse(res, "Fetched Authors successfully", authors, paginationInfo);
  }
  async getAuthor(req: Request, res: Response): Promise<Response> {
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

  async create(req: Request, res: Response): Promise<Response> {
    // Include class validator for the inputs
    const authorData = req.body;
    authorData.image = req.file?.filename;
    console.log("BODY", req.body);

    const dto = new CreateAuthorDTO();
    Object.assign(dto, authorData);

    const errors = await validate(dto)
    if (errors.length > 0 ) {
      return ResponseUtl.sendError(res, "Invalid data", 422, errors)
    }
    const repo = AppDataSource.getRepository(Author);
    const author = repo.create(authorData);

    await repo.save(author)

    return ResponseUtl.sendResponse(res,"Successfully ccreated author record", author, 200);
  }
  async update(req: Request, res: Response): Promise<Response> {
    const {id} = req.params;
    const authorData = req.body;

    const dto = new UpdateAuthorDTO();

    Object.assign(dto, authorData);
    dto.id = parseInt(id)

    const errors = await validate(dto)
    if (errors.length > 0 ) {
      return ResponseUtl.sendError(res, "Invalid data", 422, errors)
    }
    const repo = AppDataSource.getRepository(Author);

    const author = await repo.findOneByOrFail({
      id: Number(id),
    });
    repo.merge(author, authorData);
    await repo.save(author);
    return ResponseUtl.sendResponse(res, "Successfully updated author's record", author);
  }
  async delete(req:Request, res: Response): Promise<Response> {
    const {id} = req.params;
    const repo = AppDataSource.getRepository(Author);
    const author = await repo.findOneByOrFail({
      id: Number(id),
    });
    await repo.remove(author);
    return ResponseUtl.sendResponse(res, "Author record deleted successfully!", null)
  }
}
