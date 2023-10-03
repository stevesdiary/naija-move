import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { IsUnique } from "../validators/IsUniqueValidator";
import { AuthorsController } from "../controllers/AuthorsController";
import { Author } from "../../database/entities/Author";

export class CreateAuthorDTO {
   id? : number;

   @IsNotEmpty()
   @IsString()
   @MinLength(3)
   @MaxLength(20)
   name: string;

   @IsNotEmpty()
   @IsString()
   @IsUnique(Author, "email")
   email: string;

   @IsString()
   @IsOptional()
   @MaxLength(200)
   bio: string;

}

export class UpdateAuthorDTO {
   id? : number

   @IsNotEmpty()
   @IsString()
   @MinLength(3)
   @MaxLength(20)
   name: string;

   @IsNotEmpty()
   @IsString()
   @IsUnique(Author, "email")
   email: string;

   @IsString()
   @IsOptional()
   @MaxLength(200)
   bio: string;
}