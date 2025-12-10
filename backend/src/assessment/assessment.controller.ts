import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  ParseIntPipe,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AssessmentService } from './assessment.service';
import {
  CreateAssessmentDto,
  UpdateAssessmentDto,
  AssignAssessmentsToStartupDto,
} from './dto/assessment.dto';
import { AdminGuard, JwtGuard } from 'src/auth/guard';

@UseGuards(JwtGuard)
@Controller('assessments')
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @UseGuards(AdminGuard)
  @Post()
  async createAssessment(@Body() dto: CreateAssessmentDto) {
    return this.assessmentService.createAssessment(dto);
  }

  @Get()
  async getAllAssessments() {
    return this.assessmentService.getAllAssessments();
  }

  @Get('grouped')
  async getAssessmentsGroupedByType() {
    return this.assessmentService.getAssessmentsGroupedByType();
  }

  @Get('types')
  listTypes() {
    return this.assessmentService.listTypes();
  }

  @Get('startup/:id')
  async getStartupAssessments(@Param('id', ParseIntPipe) startupId: number) {
    return this.assessmentService.getStartupAssessments(startupId);
  }

  @Post('startup-assessment/:id')
  async assignAssessmentsToStartup(@Param('id', ParseIntPipe) id: number) {
    return await this.assessmentService.assignAssessmentsToStartup(id);
  }

  @Patch('startup-assessment/:id/toggle-applicable')
  async toggleAssessmentApplicability(
    @Param('id', ParseIntPipe) startupAssessmentId: number,
    @Body() dto: { isApplicable: boolean },
  ) {
    return this.assessmentService.toggleAssessmentApplicability(
      startupAssessmentId,
      dto.isApplicable,
    );
  }

  @Get(':id')
  async getAssessmentById(@Param('id', ParseIntPipe) id: number) {
    return this.assessmentService.getAssessmentById(id);
  }

  @UseGuards(AdminGuard)
  @Patch(':id')
  async updateAssessment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssessmentDto,
  ) {
    return this.assessmentService.updateAssessment(id, dto);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  async deleteAssessment(@Param('id', ParseIntPipe) id: number) {
    return this.assessmentService.deleteAssessment(id);
  }
}
