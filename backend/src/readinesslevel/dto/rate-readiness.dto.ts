import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';
import { ReadinessType } from 'src/entities/enums/readiness-type.enum';

export class RateReadinessDto {
  @IsEnum(ReadinessType)
  @IsNotEmpty()
  readinessType: ReadinessType;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  @Min(1)
  @Max(9)
  level: number;
}
