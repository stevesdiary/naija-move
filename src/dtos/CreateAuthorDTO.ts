import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateAuthorDTO {
   @IsNotEmpty()
   @IsString()
   @MinLength(3)
   @MaxLength(20)
   name: string;

   @IsNotEmpty()
   @IsString()
   email: string;

   @IsString()
   @IsOptional()
   @MaxLength(200)
   bio: string;

}

export class UpdateAuthorDTO {
   @IsNotEmpty()
   @IsString()
   @MinLength(3)
   @MaxLength(20)
   name: string;

   @IsNotEmpty()
   @IsString()
   email: string;

   @IsString()
   @IsOptional()
   @MaxLength(200)
   bio: string;
}