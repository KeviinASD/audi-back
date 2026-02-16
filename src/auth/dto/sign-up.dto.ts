import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, IsString, Min, MinLength } from "class-validator";

export class SignUpDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @ApiProperty({ example: 'prueba', })
  username: string;

  @IsEmail()
  @IsNotEmpty()
  @ApiProperty({ example: 'prueba@gmail.com', })
  email: string;

  @Transform(({ value }) => value.trim())
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @ApiProperty({ example: 'prueba123', })
  password: string;
}