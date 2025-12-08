import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import { AssignAssessmentDto, SubmitResponsesDto } from './dto/assessment.dto';
import { JwtGuard } from '../auth/guard';

@UseGuards(JwtGuard)
@Controller('startups')
export class StartupAssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  // ==================== STARTUP ASSIGNMENT ENDPOINTS ====================

  /**
   * Assign an assessment to a startup
   * POST /startups/:id/assessments
   */
  @Post(':id/assessments')
  async assignAssessment(
    @Param('id', ParseIntPipe) startupId: number,
    @Body() dto: AssignAssessmentDto,
  ) {
    return this.assessmentService.assignAssessmentToStartup(startupId, dto);
  }

  /**
   * Get all assessments assigned to a startup
   * GET /startups/:id/assessments
   */
  @Get(':id/assessments')
  async getStartupAssessments(@Param('id', ParseIntPipe) startupId: number) {
    return this.assessmentService.getStartupAssessments(startupId);
  }

  // ==================== STARTUP RESPONSE ENDPOINTS ====================

  /**
   * Submit answer(s) for assessment fields
   * POST /startups/:id/responses
   */
  @Post(':id/responses')
  async submitResponses(
    @Param('id', ParseIntPipe) startupId: number,
    @Body() dto: SubmitResponsesDto,
  ) {
    return this.assessmentService.submitResponses(startupId, dto);
  }

  /**
   * Get responses for a specific assessment
   * GET /startups/:id/responses/:assessmentId
   */
  @Get(':id/responses/:assessmentId')
  async getAssessmentResponses(
    @Param('id', ParseIntPipe) startupId: number,
    @Param('assessmentId', ParseIntPipe) assessmentId: number,
  ) {
    return this.assessmentService.getAssessmentResponses(
      startupId,
      assessmentId,
    );
  }

  /**
   * Mark assessment as complete
   * PATCH /startups/:id/assessments/:assessmentId/complete
   */
  @Patch(':id/assessments/:assessmentId/complete')
  async markAssessmentComplete(
    @Param('id', ParseIntPipe) startupId: number,
    @Param('assessmentId', ParseIntPipe) assessmentId: number,
  ) {
    return this.assessmentService.markAssessmentComplete(
      startupId,
      assessmentId,
    );
  }
}
