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
  CreateAssessmentFieldDto,
  UpdateAssessmentFieldDto,
  CreateAssessmentFieldsDto,
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
    console.log(dto);
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

  @Get(':id/fields')
  async getAssessmentFields(@Param('id', ParseIntPipe) id: number) {
    return this.assessmentService.getAssessmentFields(id);
  }

  @UseGuards(AdminGuard)
  @Post('fields/:id')
  async addFieldToAssessment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAssessmentFieldDto,
  ) {
    return this.assessmentService.addFieldToAssessment(id, dto);
  }

  @UseGuards(AdminGuard)
  @Post(':id/fields/bulk')
  async addFieldsToAssessment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateAssessmentFieldsDto,
  ) {
    return this.assessmentService.addFieldsToAssessment(id, dto);
  }

  @UseGuards(AdminGuard)
  @Patch('fields/:id')
  async updateField(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAssessmentFieldDto,
  ) {
    console.log(id, dto);
    return this.assessmentService.updateField(id, dto);
  }

  @UseGuards(AdminGuard)
  @Delete('fields/:id')
  async deleteField(@Param('id', ParseIntPipe) id: number) {
    return this.assessmentService.deleteField(id);
  }

  @Post('startup-assessment')
  async assignAssessmentsToStartup(@Body() dto: AssignAssessmentsToStartupDto) {
    return await this.assessmentService.assignAssessmentsToStartup(dto);
  }

  @Get('startup/:id')
  async getStartupAssessments(@Param('id', ParseIntPipe) startupId: number) {
    return this.assessmentService.getStartupAssessments(startupId);
  }

  @Patch('startup/:startupId/assessment/:assessmentId/complete')
  async markAssessmentComplete(
    @Param('startupId', ParseIntPipe) startupId: number,
    @Param('assessmentId', ParseIntPipe) assessmentId: number,
  ) {
    return this.assessmentService.markAssessmentComplete(
      startupId,
      assessmentId,
    );
  }
}
