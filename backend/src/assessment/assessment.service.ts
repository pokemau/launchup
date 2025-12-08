import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import {
  CreateAssessmentDto,
  UpdateAssessmentDto,
  CreateAssessmentFieldDto,
  UpdateAssessmentFieldDto,
  CreateAssessmentFieldsDto,
  AssignAssessmentDto,
  AssignAssessmentsToStartupDto,
  SubmitResponsesDto,
} from './dto/assessment.dto';
import { Assessment } from '../entities/assessment.entity';
import { AssessmentField } from '../entities/assessment-field.entity';
import { StartupAssessment } from '../entities/startup-assessment.entity';
import { StartupResponse } from '../entities/startup-response.entity';
import { Startup } from '../entities/startup.entity';
import { AssessmentType } from '../entities/enums/assessment-type.enum';
import {
  AssessmentAnswerType,
  AssessmentStatus,
} from '../entities/enums/assessment-util.enum';

@Injectable()
export class AssessmentService {
  constructor(private readonly em: EntityManager) {}

  // ==================== ADMIN: ASSESSMENT ENDPOINTS ====================

  /**
   * Create a new assessment
   * POST /assessments
   */
  async createAssessment(
    dto: CreateAssessmentDto,
  ): Promise<{ id: number; assessmentType: string; name: string }> {
    const assessment = this.em.create(Assessment, {
      assessmentType: dto.assessmentType,
      name: dto.name,
    });

    await this.em.persistAndFlush(assessment);

    return {
      id: assessment.id,
      assessmentType: assessment.assessmentType,
      name: assessment.name,
    };
  }

  /**
   * Get all assessments
   * GET /assessments
   */
  async getAllAssessments(): Promise<
    Array<{
      id: number;
      assessmentType: string;
      name: string;
      fieldsCount: number;
    }>
  > {
    const assessments = await this.em.find(
      Assessment,
      {},
      { populate: ['fields'] },
    );

    return assessments.map((a) => ({
      id: a.id,
      assessmentType: a.assessmentType,
      name: a.name,
      fieldsCount: a.fields.length,
    }));
  }

  /**
   * Get assessments grouped by type
   * GET /assessments/grouped
   */
  async getAssessmentsGroupedByType(): Promise<
    Record<
      string,
      Array<{
        id: number;
        name: string;
        fieldsCount: number;
      }>
    >
  > {
    const assessments = await this.em.find(
      Assessment,
      {},
      { populate: ['fields'] },
    );

    const grouped: Record<
      string,
      Array<{ id: number; name: string; fieldsCount: number }>
    > = {};

    // Initialize all types with empty arrays
    Object.values(AssessmentType).forEach((type) => {
      grouped[type] = [];
    });

    // Group assessments by type
    assessments.forEach((assessment) => {
      grouped[assessment.assessmentType].push({
        id: assessment.id,
        name: assessment.name,
        fieldsCount: assessment.fields.length,
      });
    });

    return grouped;
  }

  /**
   * Get a single assessment with its fields
   * GET /assessments/:id
   */
  async getAssessmentById(id: number): Promise<{
    id: number;
    assessmentType: string;
    name: string;
    fields: Array<{
      id: number;
      description: string;
      answerType: string;
    }>;
  }> {
    const assessment = await this.em.findOne(
      Assessment,
      { id },
      { populate: ['fields'] },
    );

    if (!assessment) {
      throw new NotFoundException(`Assessment with ID ${id} not found`);
    }

    return {
      id: assessment.id,
      assessmentType: assessment.assessmentType,
      name: assessment.name,
      fields: assessment.fields.map((f) => ({
        id: f.id,
        description: f.description,
        answerType: AssessmentAnswerType[f.answerType],
      })),
    };
  }

  /**
   * Update an assessment
   * PATCH /assessments/:id
   */
  async updateAssessment(
    id: number,
    dto: UpdateAssessmentDto,
  ): Promise<{ id: number; name: string }> {
    const assessment = await this.em.findOne(Assessment, { id });

    if (!assessment) {
      throw new NotFoundException(`Assessment with ID ${id} not found`);
    }

    if (dto.name !== undefined) {
      assessment.name = dto.name;
    }

    await this.em.persistAndFlush(assessment);

    return {
      id: assessment.id,
      name: assessment.name,
    };
  }

  /**
   * Delete an assessment (and all its fields)
   * DELETE /assessments/:id
   */
  async deleteAssessment(id: number): Promise<{ message: string }> {
    const assessment = await this.em.findOne(Assessment, { id });

    if (!assessment) {
      throw new NotFoundException(`Assessment with ID ${id} not found`);
    }

    await this.em.removeAndFlush(assessment);

    return { message: `Assessment ${id} deleted successfully` };
  }

  // ==================== ADMIN: ASSESSMENT FIELD ENDPOINTS ====================

  /**
   * Add a single field to an assessment
   * POST /assessments/:id/fields
   */
  async addFieldToAssessment(
    assessmentId: number,
    dto: CreateAssessmentFieldDto,
  ): Promise<{ id: number; description: string; answerType: string }> {
    const assessment = await this.em.findOne(Assessment, { id: assessmentId });

    if (!assessment) {
      throw new NotFoundException(
        `Assessment with ID ${assessmentId} not found`,
      );
    }

    const field = this.em.create(AssessmentField, {
      assessment: assessment,
      description: dto.description,
      answerType: dto.answerType,
    });

    await this.em.persistAndFlush(field);

    return {
      id: field.id,
      description: field.description,
      answerType: AssessmentAnswerType[field.answerType],
    };
  }

  /**
   * Add multiple fields to an assessment at once
   * POST /assessments/:id/fields/bulk
   */
  async addFieldsToAssessment(
    assessmentId: number,
    dto: CreateAssessmentFieldsDto,
  ): Promise<{ ids: number[]; count: number }> {
    const assessment = await this.em.findOne(Assessment, { id: assessmentId });

    if (!assessment) {
      throw new NotFoundException(
        `Assessment with ID ${assessmentId} not found`,
      );
    }

    const fields = dto.fields.map((fieldDto) =>
      this.em.create(AssessmentField, {
        assessment: assessment,
        description: fieldDto.description,
        answerType: fieldDto.answerType,
      }),
    );

    await this.em.persistAndFlush(fields);

    return {
      ids: fields.map((f) => f.id),
      count: fields.length,
    };
  }

  /**
   * Get all fields for an assessment
   * GET /assessments/:id/fields
   */
  async getAssessmentFields(assessmentId: number): Promise<
    Array<{
      id: number;
      description: string;
      answerType: string;
    }>
  > {
    const assessment = await this.em.findOne(
      Assessment,
      { id: assessmentId },
      { populate: ['fields'] },
    );

    if (!assessment) {
      throw new NotFoundException(
        `Assessment with ID ${assessmentId} not found`,
      );
    }

    return assessment.fields.map((f) => ({
      id: f.id,
      description: f.description,
      answerType: AssessmentAnswerType[f.answerType],
    }));
  }

  /**
   * Update a field
   * PATCH /assessments/fields/:id
   */
  async updateField(
    fieldId: number,
    dto: UpdateAssessmentFieldDto,
  ): Promise<{ id: number; description: string }> {
    const field = await this.em.findOne(AssessmentField, { id: fieldId });

    if (!field) {
      throw new NotFoundException(`Field with ID ${fieldId} not found`);
    }

    if (dto.description !== undefined) {
      field.description = dto.description;
    }

    if (dto.answerType !== undefined) {
      field.answerType = dto.answerType;
    }

    await this.em.persistAndFlush(field);

    return {
      id: field.id,
      description: field.description,
    };
  }

  /**
   * Delete a field
   * DELETE /assessments/fields/:id
   */
  async deleteField(fieldId: number): Promise<{ message: string }> {
    const field = await this.em.findOne(AssessmentField, { id: fieldId });

    if (!field) {
      throw new NotFoundException(`Field with ID ${fieldId} not found`);
    }

    await this.em.removeAndFlush(field);

    return { message: `Field ${fieldId} deleted successfully` };
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get all assessment types
   * GET /assessments/types
   */
  listTypes(): Array<{ name: string }> {
    return Object.values(AssessmentType).map((type) => ({ name: type }));
  }

  // ==================== STARTUP: ASSIGNMENT ENDPOINTS ====================

  /**
   * Assign an assessment to a startup
   * POST /startups/:id/assessments
   */
  async assignAssessmentToStartup(
    startupId: number,
    dto: AssignAssessmentDto,
  ): Promise<{ id: number; assessmentId: number; status: string }> {
    const startup = await this.em.findOne(Startup, { id: startupId });
    if (!startup) {
      throw new NotFoundException(`Startup with ID ${startupId} not found`);
    }

    const assessment = await this.em.findOne(Assessment, {
      id: dto.assessmentId,
    });
    if (!assessment) {
      throw new NotFoundException(
        `Assessment with ID ${dto.assessmentId} not found`,
      );
    }

    // Check if already assigned
    const existing = await this.em.findOne(StartupAssessment, {
      startup: startup,
      assessment: assessment,
    });

    if (existing) {
      throw new BadRequestException(
        'Assessment already assigned to this startup',
      );
    }

    const startupAssessment = this.em.create(StartupAssessment, {
      startup: startup,
      assessment: assessment,
      status: AssessmentStatus.Pending,
    });

    await this.em.persistAndFlush(startupAssessment);

    return {
      id: startupAssessment.id,
      assessmentId: assessment.id,
      status: AssessmentStatus[startupAssessment.status],
    };
  }

  /**
   * Assign multiple assessments to a startup
   * POST /assessments/startup-assessment
   */
  async assignAssessmentsToStartup(
    dto: AssignAssessmentsToStartupDto,
  ): Promise<{
    assigned: number;
    replaced: number;
    results: Array<{
      assessmentId: number;
      status: 'assigned' | 'replaced';
    }>;
  }> {
    const startup = await this.em.findOne(Startup, { id: dto.startupId });
    if (!startup) {
      throw new NotFoundException(`Startup with ID ${dto.startupId} not found`);
    }

    let assigned = 0;
    let replaced = 0;
    const results: Array<{
      assessmentId: number;
      status: 'assigned' | 'replaced';
    }> = [];

    for (const assessmentId of dto.assessmentTypeIds) {
      const assessment = await this.em.findOne(Assessment, {
        id: assessmentId,
      });

      if (!assessment) {
        console.warn(`Assessment with ID ${assessmentId} not found, skipping`);
        continue;
      }

      // Check if there's an existing assignment for the same assessment type
      const existingWithSameType = await this.em.findOne(
        StartupAssessment,
        {
          startup: startup,
          assessment: {
            assessmentType: assessment.assessmentType,
          },
        },
        { populate: ['assessment'] },
      );

      if (existingWithSameType) {
        // If it's the exact same assessment, skip it
        if (existingWithSameType.assessment.id === assessmentId) {
          continue;
        }

        // Replace: remove old assignment and create new one
        await this.em.removeAndFlush(existingWithSameType);

        const startupAssessment = this.em.create(StartupAssessment, {
          startup: startup,
          assessment: assessment,
          status: AssessmentStatus.Pending,
        });

        this.em.persist(startupAssessment);
        replaced++;
        results.push({
          assessmentId: assessmentId,
          status: 'replaced',
        });
      } else {
        // Create new assignment
        const startupAssessment = this.em.create(StartupAssessment, {
          startup: startup,
          assessment: assessment,
          status: AssessmentStatus.Pending,
        });

        this.em.persist(startupAssessment);
        assigned++;
        results.push({
          assessmentId: assessmentId,
          status: 'assigned',
        });
      }
    }

    await this.em.flush();

    return {
      assigned,
      replaced,
      results,
    };
  }

  /**
   * Get all assessments assigned to a startup
   * GET /startups/:id/assessments
   */
  async getStartupAssessments(startupId: number): Promise<
    Array<{
      id: number;
      assessment: {
        id: number;
        assessmentType: string;
        name: string;
      };
      status: string;
      fields: Array<{
        id: number;
        description: string;
        answerType: string;
        answer?: {
          answerValue?: string;
          fileUrl?: string;
          fileName?: string;
        };
      }>;
    }>
  > {
    const startup = await this.em.findOne(Startup, { id: startupId });
    if (!startup) {
      throw new NotFoundException(`Startup with ID ${startupId} not found`);
    }

    const startupAssessments = await this.em.find(
      StartupAssessment,
      { startup: startup },
      { populate: ['assessment', 'assessment.fields'] },
    );

    const result: Array<{
      id: number;
      assessment: {
        id: number;
        assessmentType: string;
        name: string;
      };
      status: string;
      fields: Array<{
        id: number;
        description: string;
        answerType: string;
        answer?: {
          answerValue?: string;
          fileUrl?: string;
          fileName?: string;
        };
      }>;
    }> = [];

    for (const sa of startupAssessments) {
      // Get all responses for this startup and assessment
      const responses = await this.em.find(StartupResponse, {
        startup: startup,
        assessmentField: {
          assessment: sa.assessment,
        },
      });

      const fields = sa.assessment.fields.map((field) => {
        const response = responses.find(
          (r) => r.assessmentField.id === field.id,
        );

        return {
          id: field.id,
          description: field.description,
          answerType: AssessmentAnswerType[field.answerType],
          answer: response
            ? {
                answerValue: response.answerValue,
                fileUrl: response.fileUrl,
                fileName: response.fileName,
              }
            : undefined,
        };
      });

      result.push({
        id: sa.id,
        assessment: {
          id: sa.assessment.id,
          assessmentType: sa.assessment.assessmentType,
          name: sa.assessment.name,
        },
        status: AssessmentStatus[sa.status],
        fields: fields,
      });
    }

    return result;
  }

  // ==================== STARTUP: RESPONSE ENDPOINTS ====================

  /**
   * Submit answer(s) for assessment fields
   * POST /startups/:id/responses
   */
  async submitResponses(
    startupId: number,
    dto: SubmitResponsesDto,
  ): Promise<{ submitted: number; updated: number }> {
    const startup = await this.em.findOne(Startup, { id: startupId });
    if (!startup) {
      throw new NotFoundException(`Startup with ID ${startupId} not found`);
    }

    let submitted = 0;
    let updated = 0;

    for (const responseDto of dto.responses) {
      const field = await this.em.findOne(AssessmentField, {
        id: responseDto.assessmentFieldId,
      });

      if (!field) {
        console.warn(
          `Assessment field ${responseDto.assessmentFieldId} not found, skipping`,
        );
        continue;
      }

      // Check if response already exists
      const existingResponse = await this.em.findOne(StartupResponse, {
        startup: startup,
        assessmentField: field,
      });

      if (existingResponse) {
        // Update existing response
        existingResponse.answerValue = responseDto.answerValue;
        existingResponse.fileUrl = responseDto.fileUrl;
        existingResponse.fileName = responseDto.fileName;
        this.em.persist(existingResponse);
        updated++;
      } else {
        // Create new response
        const newResponse = this.em.create(StartupResponse, {
          startup: startup,
          assessmentField: field,
          answerValue: responseDto.answerValue,
          fileUrl: responseDto.fileUrl,
          fileName: responseDto.fileName,
        });
        this.em.persist(newResponse);
        submitted++;
      }
    }

    await this.em.flush();

    return { submitted, updated };
  }

  /**
   * Get responses for a specific assessment
   * GET /startups/:id/responses/:assessmentId
   */
  async getAssessmentResponses(
    startupId: number,
    assessmentId: number,
  ): Promise<
    Array<{
      fieldId: number;
      description: string;
      answerType: string;
      answerValue?: string;
      fileUrl?: string;
      fileName?: string;
      submittedAt?: Date;
    }>
  > {
    const startup = await this.em.findOne(Startup, { id: startupId });
    if (!startup) {
      throw new NotFoundException(`Startup with ID ${startupId} not found`);
    }

    const assessment = await this.em.findOne(
      Assessment,
      { id: assessmentId },
      { populate: ['fields'] },
    );

    if (!assessment) {
      throw new NotFoundException(
        `Assessment with ID ${assessmentId} not found`,
      );
    }

    const responses = await this.em.find(StartupResponse, {
      startup: startup,
      assessmentField: {
        assessment: assessment,
      },
    });

    return assessment.fields.map((field) => {
      const response = responses.find((r) => r.assessmentField.id === field.id);

      return {
        fieldId: field.id,
        description: field.description,
        answerType: AssessmentAnswerType[field.answerType],
        answerValue: response?.answerValue,
        fileUrl: response?.fileUrl,
        fileName: response?.fileName,
      };
    });
  }

  /**
   * Mark assessment as complete
   * PATCH /startups/:id/assessments/:assessmentId/complete
   */
  async markAssessmentComplete(
    startupId: number,
    assessmentId: number,
  ): Promise<{ message: string }> {
    const startup = await this.em.findOne(Startup, { id: startupId });
    if (!startup) {
      throw new NotFoundException(`Startup with ID ${startupId} not found`);
    }

    const assessment = await this.em.findOne(Assessment, { id: assessmentId });
    if (!assessment) {
      throw new NotFoundException(
        `Assessment with ID ${assessmentId} not found`,
      );
    }

    const startupAssessment = await this.em.findOne(StartupAssessment, {
      startup: startup,
      assessment: assessment,
    });

    if (!startupAssessment) {
      throw new NotFoundException('Assessment not assigned to this startup');
    }

    startupAssessment.status = AssessmentStatus.Completed;

    await this.em.persistAndFlush(startupAssessment);

    return {
      message: 'Assessment marked as complete',
    };
  }
}
