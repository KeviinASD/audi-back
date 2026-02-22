// software/dto/create-authorized-software.dto.ts

export class CreateAuthorizedSoftwareDto {
  name: string;
  publisher?: string;
  description?: string;
  laboratoryId?: string;              // null = aplica a todos los laboratorios
}