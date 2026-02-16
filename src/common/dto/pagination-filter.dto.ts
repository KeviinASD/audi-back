import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, Min } from "class-validator";

export class PaginationFilterDto {
    @ApiProperty({ example: 1, required: false })
    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @ApiProperty({ example: 10, required: false, name: 'pageSize' })
    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    @Min(1)
    pageSize?: number = 10;

    @ApiProperty({ example: false, required: false })
    @Type(() => Boolean)
    @IsOptional()
    @IsBoolean()
    isPagination?: boolean = false;
}