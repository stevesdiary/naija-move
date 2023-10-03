import { IsEmail, IsNotEmpty, MaxLength, MinLength, isNotEmpty } from "class-validator";
import { IsUnique } from "../validators/IsUniqueValidator";
// import {User} from "../../database/entities/User"
export class RegisterDTO {
   @IsNotEmpty()
   @MinLength(3)
   @MaxLength(20)
   name: string

   @IsEmail()
   @IsNotEmpty()
   // @IsUnique(User, "email")
   @MaxLength(30)
   email: string

   @IsNotEmpty()
   @MinLength(5)
   @MaxLength(20)
   password: string
}
export class LoginDTO {
   @IsNotEmpty()
   @IsEmail()
   email: string;

   @IsNotEmpty()
   @MinLength(5)
   @MaxLength(20)
   password: string;
}