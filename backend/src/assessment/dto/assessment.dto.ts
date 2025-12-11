import {
  IsString,
  IsNumber,
  ValidateNested,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AssessmentType } from '../../entities/enums/assessment-type.enum';
import { AssessmentAnswerType } from '../../entities/enums/assessment-util.enum';

export class SubmitAnswerDto {
  @IsString()
  assessmentId: string;

  @IsString()
  answerValue: string; // Changed from 'answer' to match frontend payload
}

export class ToggleApplicabilityDto {
  @IsBoolean()
  isApplicable!: boolean;
}

export class SubmitAssessmentDto {
  @IsNumber()
  startupId: number;

  @IsString()
  assessmentName: string;

  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerDto)
  responses: SubmitAnswerDto[];
}

export interface AssessmentDto {
  id: number;
  name: string;
  assessmentType: string;
  answerType: string;
  answer?: string;
  fileUrl?: string;
}

// Admin DTOs
export class CreateAssessmentDto {
  @IsEnum(AssessmentType)
  assessmentType: AssessmentType;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(AssessmentAnswerType)
  answerType: AssessmentAnswerType;
}

export class UpdateAssessmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(AssessmentAnswerType)
  answerType?: AssessmentAnswerType;

  @IsOptional()
  @IsEnum(AssessmentType)
  assessmentType?: AssessmentType;
}

// Startup DTOs
export class AssignAssessmentDto {
  @IsNumber()
  assessmentId: number;
}

export class AssignAssessmentsToStartupDto {
  @IsNumber()
  startupId: number;

  @IsArray()
  @IsNumber({}, { each: true })
  assessmentTypeIds: number[];
}

export class SubmitResponseDto {
  @IsNumber()
  assessmentId: number;

  @IsOptional()
  @IsString()
  answerValue?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  fileName?: string;
}

export class SubmitResponsesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitResponseDto)
  responses: SubmitResponseDto[];
}
