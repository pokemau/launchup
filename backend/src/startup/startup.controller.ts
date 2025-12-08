import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  Patch,
} from '@nestjs/common';

import { AiService } from 'src/ai/ai.service';
import { StartupService } from './startup.service';
import { JwtGuard } from 'src/auth/guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile } from '@nestjs/common';
import { UpdateStartupDto } from '../admin/dto/update-startup.dto';
import {
  StartupApplicationDto,
  WaitlistStartupDto,
  AppointMentorsDto,
  ChangeMentorDto,
  UpdateCapsuleProposalDto,
} from './dto';

@UseGuards(JwtGuard)
@Controller('startups')
export class StartupController {
  constructor(
    private startupService: StartupService,
    private aiService: AiService,
  ) {}

  @Get('/startups')
  getStartups(@Req() req: any) {
    return this.startupService.getStartups(req.user.id);
  }

  @Get('/criterion-answers')
  async getReadinessLevelCriterionAnswers(
    @Query('startupId', ParseIntPipe) startupId: number,
  ) {
    return this.startupService.getReadinessLevelCriterionAnswers(startupId);
  }

  @Get('/startup-readiness-level')
  async getStartupReadinessLevel(
    @Query('startupId', ParseIntPipe) startupId: number,
  ) {
    return this.startupService.getStartupReadinessLevel(startupId);
  }

  @Get('/all')
  async getAllStartups(): Promise<any[]> {
    return await this.startupService.getAllStartups();
  }

  // ==================================================
  // Deprecated endpoints - keeping for backward compatibility
  @Get('/ranking-by-urat')
  async getStartupsByUrat() {
    return await this.startupService.getPendingStartupsRankingByUrat();
  }

  @Get('/ranking-by-rubrics')
  async getStartupsByRubrics() {
    return await this.startupService.getQualifiedStartupsRankingByRubrics();
  }
  // ==================================================

  @Post('/apply')
  async applyStartup(@Body() dto: StartupApplicationDto, @Req() req: any) {
    const userId = req.user.id;
    const data = await this.startupService.create(dto, userId);
    return {
      message: 'yeahhhhhhhhhhhhh created startup',
    };
  }

  @Post('add-member')
  async addMemberToStartup(@Body() dto: any) {
    return await this.startupService.addMemberToStartup(dto);
  }

  @Delete('remove-member/:userId')
  async removeMemberFromStartup(
    @Param('userId') userId: number,
    @Body('startupId', ParseIntPipe) startupId: number,
  ) {
    return await this.startupService.removeMemberFromStartup(userId, startupId);
  }

  @Get(':startupId')
  async getStartupById(@Param('startupId', ParseIntPipe) startupId: number) {
    return await this.startupService.getStartupById(startupId);
  }

  @Get(':startupId/calculator-final-scores')
  async getCalculatorFinalScores(@Param('startupId') startupId: number) {
    return await this.startupService.getCalculatorFinalScores(startupId);
  }

  @Post(':startupId/approve-applicant')
  async approveApplicant(@Param('startupId') startupId: number) {
    return await this.startupService.approveApplicant(startupId);
  }

  @Patch(':startupId/waitlist-applicant')
  async waitlistApplicant(
    @Param('startupId', ParseIntPipe) startupId: number,
    @Body() dto: WaitlistStartupDto,
  ) {
    return await this.startupService.waitlistApplicant(startupId, dto);
  }

  @Post(':startupId/appoint-mentors')
  async appointMentors(
    @Param('startupId') startupId: number,
    @Body() dto: AppointMentorsDto,
  ) {
    return await this.startupService.appointMentors(startupId, dto);
  }

  @Patch(':startupId/mark-complete')
  async markStartupComplete(
    @Param('startupId', ParseIntPipe) startupId: number,
  ) {
    return await this.startupService.markComplete(startupId);
  }

  @Patch(':startupId/change-mentor')
  async changeMentor(
    @Param('startupId', ParseIntPipe) startupId: number,
    @Body() dto: ChangeMentorDto,
  ) {
    return await this.startupService.changeMentor(startupId, dto);
  }

  @Get(':startupId/allow-rnas')
  async allowRNAs(@Param('startupId') startupId: number): Promise<boolean> {
    return this.startupService.allowRNAs(startupId);
  }

  @Get(':startupId/allow-tasks')
  async allowTasks(
    @Param('startupId', ParseIntPipe) startupId: number,
  ): Promise<boolean> {
    return this.startupService.allowTasks(startupId);
  }

  @Get(':startupId/allow-initiatives')
  async allowInitiatives(
    @Param('startupId', ParseIntPipe) startupId: number,
  ): Promise<boolean> {
    return this.startupService.allowInitiatives(startupId);
  }

  @Get(':startupId/allow-roadblocks')
  async allowRoadblocks(
    @Param('startupId', ParseIntPipe) startupId: number,
  ): Promise<boolean> {
    return this.startupService.allowRoadblocks(startupId);
  }

  @Patch(':startupId/capsule-proposal')
  async updateCapsuleProposalFields(
    @Param('startupId', ParseIntPipe) startupId: number,
    @Body() dto: UpdateCapsuleProposalDto,
  ) {
    console.log('=== PATCH /startups/:startupId/capsule-proposal ===');
    console.log('Startup ID:', startupId);
    console.log('Request Body:', JSON.stringify(dto, null, 2));

    const result = await this.startupService.updateCapsuleProposalFields(
      startupId,
      dto,
    );

    console.log('Response:', JSON.stringify(result, null, 2));
    console.log('=== End PATCH /startups/:startupId/capsule-proposal ===');

    return result;
  }

  @Patch(':id')
  async updateStartup(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStartupDto,
  ) {
    return await this.startupService.update(id, dto);
  }

  @Patch(':id/reapply')
  async reapplyStartup(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: StartupApplicationDto,
    @Req() req: any,
  ) {
    return await this.startupService.updateCapsuleProposal(id, dto);
  }

  // @Patch(':id/with-capsule-proposal')
  // @UseInterceptors(FileInterceptor('capsuleProposal'))
  // async updateStartupWithCapsuleProposal(
  //   @Param('id', ParseIntPipe) id: number,
  //   @Body() rawDto: any,
  //   @UploadedFile() file: Express.Multer.File,
  // ) {
  //   console.log('Controller - received raw DTO:', rawDto);
  //
  //   // Manually transform FormData values to proper types
  //   const dto: UpdateStartupDto = {
  //     name: rawDto.name,
  //     userId: rawDto.userId ? parseInt(rawDto.userId) : undefined,
  //     qualificationStatus: rawDto.qualificationStatus
  //       ? parseInt(rawDto.qualificationStatus)
  //       : undefined,
  //     dataPrivacy: rawDto.dataPrivacy
  //       ? rawDto.dataPrivacy === 'true'
  //       : undefined,
  //     links: rawDto.links,
  //     groupName: rawDto.groupName,
  //     universityName: rawDto.universityName,
  //     eligibility: rawDto.eligibility
  //       ? rawDto.eligibility === 'true'
  //       : undefined,
  //   };
  //
  //   console.log('Controller - transformed DTO:', dto);
  //   console.log(
  //     'Controller - qualificationStatus after transformation:',
  //     typeof dto.qualificationStatus,
  //     'value:',
  //     dto.qualificationStatus,
  //   );
  //
  //   // If a capsule proposal file is uploaded, parse and update CapsuleProposal
  //   if (file) {
  //     try {
  //       console.log(
  //         'Capsule proposal file received for update:',
  //         file.originalname,
  //       );
  //       const data = await PdfParse(file.buffer);
  //       let res = await this.aiService.getCapsuleProposalInfo(data.text);
  //       console.log('AI service result for update:', res);
  //
  //       if (res) {
  //         res = res.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  //         const parsed = JSON.parse(res);
  //         console.log('Parsed capsule proposal for update:', parsed);
  //
  //         const capsuleProposalDto: CreateCapsuleProposalDto = {
  //           title: dto.name || 'Updated Startup',
  //           description: parsed.startup_description,
  //           problemStatement: parsed.problem_statement,
  //           targetMarket: parsed.target_market,
  //           solutionDescription: parsed.solution_description,
  //           objectives: parsed.objectives,
  //           scope: parsed.scope,
  //           methodology: parsed.methodology,
  //           startupId: id,
  //           fileName: file.originalname,
  //         };
  //
  //         return await this.startupService.updateWithCapsuleProposal(
  //           id,
  //           dto,
  //           capsuleProposalDto,
  //         );
  //       } else {
  //         console.log('AI service did not return a result for update');
  //         throw new BadRequestException(
  //           'AI service did not return a result for update',
  //         );
  //       }
  //     } catch (error) {
  //       console.error('Failed to parse and update capsule proposal:', error);
  //       throw new BadRequestException(
  //         'Failed to parse and update capsule proposal: ' + error.message,
  //       );
  //     }
  //   } else {
  //     // No file uploaded, just update the startup without capsule proposal changes
  //     return await this.startupService.update(id, dto);
  //   }
  // }
}
