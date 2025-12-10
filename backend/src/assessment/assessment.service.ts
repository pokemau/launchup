import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import {
  CreateAssessmentDto,
  UpdateAssessmentDto,
  AssignAssessmentDto,
  AssignAssessmentsToStartupDto,
  SubmitResponsesDto,
} from './dto/assessment.dto';
import { Assessment } from '../entities/assessment.entity';
import { StartupAssessment } from '../entities/startup-assessment.entity';
import { StartupResponse } from '../entities/startup-response.entity';
import { Startup } from '../entities/startup.entity';
import { AssessmentType } from '../entities/enums/assessment-type.enum';
import { AssessmentAnswerType } from '../entities/enums/assessment-util.enum';

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
  ): Promise<{
    id: number;
    assessmentType: string;
    name: string;
    answerType: string;
  }> {
    const assessment = this.em.create(Assessment, {
      assessmentType: dto.assessmentType,
      name: dto.name,
      answerType: dto.answerType,
    });

    await this.em.persistAndFlush(assessment);

    return {
      id: assessment.id,
      assessmentType: assessment.assessmentType,
      name: assessment.name,
      answerType: AssessmentAnswerType[assessment.answerType],
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
      answerType: string;
    }>
  > {
    const assessments = await this.em.find(Assessment, {});

    return assessments.map((a) => ({
      id: a.id,
      assessmentType: a.assessmentType,
      name: a.name,
      answerType: AssessmentAnswerType[a.answerType],
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
        answerType: string;
      }>
    >
  > {
    const assessments = await this.em.find(Assessment, {});

    const grouped: Record<
      string,
      Array<{ id: number; name: string; answerType: string }>
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
        answerType: AssessmentAnswerType[assessment.answerType],
      });
    });

    return grouped;
  }

  /**
   * Get a single assessment
   * GET /assessments/:id
   */
  async getAssessmentById(id: number): Promise<{
    id: number;
    assessmentType: string;
    name: string;
    answerType: string;
  }> {
    const assessment = await this.em.findOne(Assessment, { id });

    if (!assessment) {
      throw new NotFoundException(`Assessment with ID ${id} not found`);
    }

    return {
      id: assessment.id,
      assessmentType: assessment.assessmentType,
      name: assessment.name,
      answerType: AssessmentAnswerType[assessment.answerType],
    };
  }

  /**
   * Update an assessment
   * PATCH /assessments/:id
   */
  async updateAssessment(
    id: number,
    dto: UpdateAssessmentDto,
  ): Promise<{
    id: number;
    name: string;
    assessmentType?: string;
    answerType?: string;
  }> {
    const assessment = await this.em.findOne(Assessment, { id });

    if (!assessment) {
      throw new NotFoundException(`Assessment with ID ${id} not found`);
    }

    if (dto.name !== undefined) {
      assessment.name = dto.name;
    }

    if (dto.answerType !== undefined) {
      assessment.answerType = dto.answerType;
    }

    if (dto.assessmentType !== undefined) {
      assessment.assessmentType = dto.assessmentType;
    }

    await this.em.persistAndFlush(assessment);

    return {
      id: assessment.id,
      name: assessment.name,
      assessmentType: dto.assessmentType,
      answerType: dto.answerType
        ? AssessmentAnswerType[assessment.answerType]
        : undefined,
    };
  }

  /**
   * Delete an assessment
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
  ): Promise<{ id: number; assessmentId: number }> {
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
    });

    await this.em.persistAndFlush(startupAssessment);

    return {
      id: startupAssessment.id,
      assessmentId: assessment.id,
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

      // Check if there's an existing assignment for the same assessment
      const existing = await this.em.findOne(StartupAssessment, {
        startup: startup,
        assessment: assessment,
      });

      if (existing) {
        // Already assigned, skip
        continue;
      }

      // Create new assignment
      const startupAssessment = this.em.create(StartupAssessment, {
        startup: startup,
        assessment: assessment,
      });

      this.em.persist(startupAssessment);
      assigned++;
      results.push({
        assessmentId: assessmentId,
        status: 'assigned',
      });
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
        answerType: string;
      };
      answer?: {
        answerValue?: string;
        fileUrl?: string;
        fileName?: string;
      };
    }>
  > {
    const startup = await this.em.findOne(Startup, { id: startupId });
    if (!startup) {
      throw new NotFoundException(`Startup with ID ${startupId} not found`);
    }

    const startupAssessments = await this.em.find(
      StartupAssessment,
      { startup: startup },
      { populate: ['assessment'] },
    );

    const result: Array<{
      id: number;
      assessment: {
        id: number;
        assessmentType: string;
        name: string;
        answerType: string;
      };
      answer?: {
        answerValue?: string;
        fileUrl?: string;
        fileName?: string;
      };
    }> = [];

    for (const sa of startupAssessments) {
      // Get response for this assessment
      const response = await this.em.findOne(StartupResponse, {
        startup: startup,
        assessment: sa.assessment,
      });

      result.push({
        id: sa.id,
        assessment: {
          id: sa.assessment.id,
          assessmentType: sa.assessment.assessmentType,
          name: sa.assessment.name,
          answerType: AssessmentAnswerType[sa.assessment.answerType],
        },
        answer: response
          ? {
              answerValue: response.answerValue,
              fileUrl: response.fileUrl,
              fileName: response.fileName,
            }
          : undefined,
      });
    }

    return result;
  }

  // ==================== STARTUP: RESPONSE ENDPOINTS ====================

  /**
   * Submit answer(s) for assessments
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
      const assessment = await this.em.findOne(Assessment, {
        id: responseDto.assessmentId,
      });

      if (!assessment) {
        console.warn(
          `Assessment ${responseDto.assessmentId} not found, skipping`,
        );
        continue;
      }

      // Check if response already exists
      const existingResponse = await this.em.findOne(StartupResponse, {
        startup: startup,
        assessment: assessment,
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
          assessment: assessment,
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
  ): Promise<{
    id: number;
    name: string;
    assessmentType: string;
    answerType: string;
    answerValue?: string;
    fileUrl?: string;
    fileName?: string;
  }> {
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

    const response = await this.em.findOne(StartupResponse, {
      startup: startup,
      assessment: assessment,
    });

    return {
      id: assessment.id,
      name: assessment.name,
      assessmentType: assessment.assessmentType,
      answerType: AssessmentAnswerType[assessment.answerType],
      answerValue: response?.answerValue,
      fileUrl: response?.fileUrl,
      fileName: response?.fileName,
    };
  }
}
