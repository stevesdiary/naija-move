import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { DBtable } from "../../constants/DBTable";

@Entity(DBtable.BOOKS)
export class Author {
   @PrimaryGeneratedColumn()
   id: number

   
}

