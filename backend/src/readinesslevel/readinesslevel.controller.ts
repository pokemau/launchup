import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import {
  CalculatorQuestionAnswerDto,
  UratQuestionAnswerDto,
  RateReadinessDto,
} from './dto';
import { ReadinesslevelService } from './readinesslevel.service';
import { JwtGuard } from 'src/auth/guard';

@Controller('readinesslevel')
export class ReadinesslevelController {
  constructor(private readinessLevelService: ReadinesslevelService) {}

  @Get('/urat-questions')
  async getUratQuestions() {
    return await this.readinessLevelService.getUratQuestions();
  }

  @Get('/calculator-questions')
  async getCalculatorQuestions() {
    return await this.readinessLevelService.getCalculatorQuestions();
  }

  @Get('/readiness-levels')
  async getReadinessLevels() {
    return await this.readinessLevelService.getReadinessLevels();
  }

  @Get('/criterion')
  async getReadinessLevelCriterion() {
    return await this.readinessLevelService.getReadinessLevelCriterion();
  }

  @UseGuards(JwtGuard)
  @Post('/urat-question-answers/create')
  async createUratQuestionAnswers(@Body() dto: UratQuestionAnswerDto) {
    return await this.readinessLevelService.createUratQuestionAnswers(dto);
  }

  @UseGuards(JwtGuard)
  @Post('/calculator-question-answers/create')
  async createCalculatorQuestionAnswers(
    @Body() dto: CalculatorQuestionAnswerDto,
  ) {
    return await this.readinessLevelService.createCalculatorQuestionAnswers(
      dto,
    );
  }

  @UseGuards(JwtGuard)
  @Get('urat-question-answers')
  async getUratQuestionAnswers(@Query('startupId') startupId: number) {
    return await this.readinessLevelService.getUratQuestionAnswers(startupId);
  }

  @UseGuards(JwtGuard)
  @Get('readiness-level')
  async getStartupReadinessLevels(
    @Query('startupId', ParseIntPipe) startupId: number,
  ) {
    return await this.readinessLevelService.getStartupReadinessLevel(startupId);
  }

  @UseGuards(JwtGuard)
  @Patch('/urat-question-answers/:id')
  async updateUratQuestionAnswer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { response?: string; score?: number },
  ) {
    return await this.readinessLevelService.updateUratQuestionAnswer(id, dto);
  }

  @UseGuards(JwtGuard)
  @Patch('/calculator-question-answers/:id')
  async updateCalculatorQuestionAnswer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { calculatorQuestionId?: number },
  ) {
    return await this.readinessLevelService.updateCalculatorQuestionAnswer(
      id,
      dto,
    );
  }

  @UseGuards(JwtGuard)
  @Post('startup/:startupId/rate')
  async rateStartupReadinessLevel(
    @Param('startupId', ParseIntPipe) startupId: number,
    @Body() dto: RateReadinessDto,
  ) {
    return await this.readinessLevelService.rateStartupReadinessLevel(
      startupId,
      dto,
    );
  }
}
