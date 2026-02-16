import { ApiProperty } from "@nestjs/swagger";

export class BaseResponseDto {
    @ApiProperty({ example: 'Operation exitosa' })
    message: string;

    @ApiProperty({ example: 300 })
    status: number = 200;

    @ApiProperty({ example: 1 })
    currentPage: number = 1;

    @ApiProperty({ example: 10 })
    pageSize: number = 10;

    @ApiProperty({ example: 100 })
    totalItems: number;

    @ApiProperty({ example: true })
    isPagination: boolean = false;
}