import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";

export class SignInDto {
    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: 'prueba@gmail.com', })
    email: string;

    @Transform(({ value }) => value.trim())
    @IsString()
    @IsNotEmpty()
    @ApiProperty({ example: 'prueba123', })
    password: string;
}