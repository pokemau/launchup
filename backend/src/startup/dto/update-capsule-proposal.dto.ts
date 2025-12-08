import { IsString, IsOptional } from 'class-validator';

export class UpdateCapsuleProposalDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  problemStatement?: string;

  @IsString()
  @IsOptional()
  targetMarket?: string;

  @IsString()
  @IsOptional()
  solution?: string;

  @IsString()
  @IsOptional()
  objectives?: string;

  @IsString()
  @IsOptional()
  scope?: string;

  @IsString()
  @IsOptional()
  methodology?: string;
}
