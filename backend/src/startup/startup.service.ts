import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { Startup } from 'src/entities/startup.entity';
import { User } from 'src/entities/user.entity';
import { Role } from 'src/entities/enums/role.enum';
import { StartupCriterionAnswer } from 'src/entities/startup-criterion-answer.entity';
import { ReadinessType } from 'src/entities/enums/readiness-type.enum';
import { ReadinessLevel } from 'src/entities/readiness-level.entity';
import { UratQuestionAnswer } from 'src/entities/urat-question-answer.entity';
import { QualificationStatus } from 'src/entities/enums/qualification-status.enum';
import { CalculatorQuestionAnswer } from 'src/entities/calculator-question-answer.entity';
import { StartupReadinessLevel } from 'src/entities/startup-readiness-level.entity';
import { StartupRNA } from 'src/entities/rna.entity';
import { CapsuleProposal } from 'src/entities/capsule-proposal.entity';
import { StartupWaitlistMessage } from 'src/entities/startup-waitlist-message.entity';
import { CreateCapsuleProposalDto } from './dto/create-capsule-proposal.dto';
import { UpdateStartupDto } from '../admin/dto/update-startup.dto';
import {
  StartupApplicationDto,
  StartupApplicationDtoOld,
  WaitlistStartupDto,
  AppointMentorsDto,
  ChangeMentorDto,
  UpdateCapsuleProposalDto,
} from './dto';
import { AiService } from '../ai/ai.service';
import { CreateStartupDto } from '../admin/dto/create-startup.dto';

@Injectable()
export class StartupService {
  constructor(
    private em: EntityManager,
    private readonly aiService: AiService,
  ) {}

  async getStartups(userId: number) {
    const user = await this.em.findOne(User, { id: userId });

    if (!user)
      throw new NotFoundException(`User with ID ${userId} does not exist`);

    switch (user.role) {
      case Role.Startup:
        return await this.em.find(
          Startup,
          { user: userId },
          {
            populate: [
              'user',
              'members',
              'capsuleProposal',
              'mentors',
              'readinessLevels.readinessLevel',
              'uratQuestionAnswers.uratQuestion',
              'calculatorQuestionAnswers.question',
              'waitlistMessages',
            ],
          },
        );
      case Role.Mentor:
        return await this.em.find(
          Startup,
          { mentors: { id: userId } },
          { populate: ['mentors', 'capsuleProposal'] },
        );
      case Role.Manager:
        return await this.em.findAll(Startup, {
          populate: ['user', 'mentors', 'members', 'capsuleProposal'],
        });
    }
  }

  async findAll(): Promise<Startup[]> {
    return this.em.findAll(Startup, {
      populate: ['user', 'mentors', 'members', 'capsuleProposal'],
    });
  }

  async getAllStartups(): Promise<Startup[]> {
    const t = await this.em.find(
      Startup,
      {},
      {
        populate: [
          'user',
          'members',
          'capsuleProposal',
          'waitlistMessages',
          'waitlistMessages.manager',
          'mentors',
        ],
      },
    );

    return t;
  }

  async getStartupById(startupId: number): Promise<Startup | null> {
    const startup = await this.em.findOne(
      Startup,
      { id: startupId },
      { populate: ['user', 'members', 'capsuleProposal', 'waitlistMessages'] },
    );
    if (!startup) {
      throw new NotFoundException(
        `Startup with ID ${startupId} does not exist!`,
      );
    }
    return startup;
  }

  async create(dto: StartupApplicationDto, userId: number) {
    return this.em.transactional(async () => {
      const user = await this.em.findOne(User, { id: userId });
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} does not exist.`);
      }

      const startup = this.em.create(Startup, {
        name: dto.title,
        user: user,
        qualificationStatus: QualificationStatus.PENDING,
        dataPrivacy: true,
        eligibility: true,
        // qualificationStatus: dto.qualificationStatus,
        // dataPrivacy: dto.dataPrivacy ?? false,
        // links: dto.links,
        // groupName: dto.groupName,
        // universityName: dto.universityName,
        // eligibility: dto.eligibility ?? false,
      });

      await this.em.persistAndFlush(startup);

      // Add the startup leader/owner to the members collection
      startup.members.add(user);
      await this.em.flush();

      await this.createStartupProposal(startup, dto);

      return startup;
    });
  }
  private async createStartupProposal(
    startup: Startup,
    dto: StartupApplicationDto,
  ) {
    try {
      const aiAnalysisSummary =
        await this.aiService.generateStartupAnalysisSummary(dto);

      if (startup.capsuleProposal) {
        const proposal = startup.capsuleProposal;
        proposal.title = dto.title;
        proposal.description = dto.description;
        proposal.problemStatement = dto.problemStatement;
        proposal.targetMarket = dto.targetMarket;
        proposal.solutionDescription = dto.solutionDescription;

        proposal.objectives = Array.isArray(dto.objectives)
          ? dto.objectives
          : [];

        proposal.historicalTimeline = Array.isArray(dto.historicalTimeline)
          ? dto.historicalTimeline
          : [];

        proposal.competitiveAdvantageAnalysis = Array.isArray(
          dto.competitiveAdvantageAnalysis,
        )
          ? dto.competitiveAdvantageAnalysis
          : [];

        proposal.members = Array.isArray(dto.members) ? dto.members : [];

        proposal.intellectualPropertyStatus = dto.intellectualPropertyStatus;
        proposal.scope = dto.proposalScope;
        proposal.methodology = dto.methodology;
        proposal.curriculumVitae = dto.curriculumVitae ?? null;
        proposal.aiAnalysisSummary = aiAnalysisSummary;

        await this.em.flush();
        return proposal;
      }

      const proposal = this.em.create(CapsuleProposal, {
        title: dto.title,
        description: dto.description,
        problemStatement: dto.problemStatement,
        targetMarket: dto.targetMarket,
        solutionDescription: dto.solutionDescription,

        // Ensure objectives is always an array
        objectives: Array.isArray(dto.objectives) ? dto.objectives : [],

        // Ensure historicalTimeline is always an array
        historicalTimeline: Array.isArray(dto.historicalTimeline)
          ? dto.historicalTimeline
          : [],

        // Ensure competitiveAdvantageAnalysis is always an array of objects
        competitiveAdvantageAnalysis: Array.isArray(
          dto.competitiveAdvantageAnalysis,
        )
          ? dto.competitiveAdvantageAnalysis
          : [],

        // Ensure members is always an array of objects
        members: Array.isArray(dto.members) ? dto.members : [],

        intellectualPropertyStatus: dto.intellectualPropertyStatus,
        scope: dto.proposalScope,
        methodology: dto.methodology,
        curriculumVitae: dto.curriculumVitae ?? null,
        aiAnalysisSummary,
        startup,
      });

      await this.em.persistAndFlush(proposal);
      return proposal;
    } catch (err) {
      console.error(`Error creating capsule proposal`, err);
      throw err;
    }
  }

  async update(id: number, dto: UpdateStartupDto): Promise<Startup> {
    const startup = await this.getStartupById(id);
    if (!startup) {
      throw new NotFoundException(`Startup with ID ${id} not found`);
    }

    if (dto.userId !== undefined) {
      const user = await this.em.findOne(User, { id: dto.userId });
      if (!user) {
        throw new NotFoundException(`User with ID ${dto.userId} not found`);
      }
      startup.user = user;
    }

    if (dto.name !== undefined) startup.name = dto.name;
    if (dto.qualificationStatus !== undefined)
      startup.qualificationStatus = dto.qualificationStatus;
    if (dto.dataPrivacy !== undefined) startup.dataPrivacy = dto.dataPrivacy;
    if (dto.links !== undefined) startup.links = dto.links;
    if (dto.groupName !== undefined) startup.groupName = dto.groupName;
    if (dto.universityName !== undefined)
      startup.universityName = dto.universityName;
    if (dto.eligibility !== undefined) startup.eligibility = dto.eligibility;

    await this.em.flush();
    return startup;
  }

  async updateWithCapsuleProposal(
    id: number,
    dto: UpdateStartupDto,
    capsuleProposalDto?: CreateCapsuleProposalDto,
  ) {
    // const startup = await this.getStartupById(id);
    // if (!startup) {
    //   throw new NotFoundException(`Startup with ID ${id} not found`);
    // }
    //
    // // Update basic startup fields
    // if (dto.userId) {
    //   const user = await this.em.findOne(User, { id: dto.userId });
    //   if (!user) {
    //     throw new NotFoundException(`User with ID ${dto.userId} not found`);
    //   }
    //   startup.user = user;
    // }
    //
    // // Apply all other fields from the DTO
    // if (dto.name) startup.name = dto.name;
    // if (dto.qualificationStatus !== undefined) {
    //   startup.qualificationStatus = dto.qualificationStatus;
    // }
    // if (dto.dataPrivacy !== undefined) startup.dataPrivacy = dto.dataPrivacy;
    // if (dto.links) startup.links = dto.links;
    // if (dto.groupName) startup.groupName = dto.groupName;
    // if (dto.universityName) startup.universityName = dto.universityName;
    // if (dto.eligibility !== undefined) startup.eligibility = dto.eligibility;
    //
    // // Handle capsule proposal update if provided
    // if (capsuleProposalDto) {
    //   // Update existing capsule proposal or create new one
    //   if (startup.capsuleProposal) {
    //     // Update existing capsule proposal
    //     startup.capsuleProposal.title = capsuleProposalDto.title;
    //     startup.capsuleProposal.description = capsuleProposalDto.description;
    //     startup.capsuleProposal.problemStatement =
    //       capsuleProposalDto.problemStatement;
    //     startup.capsuleProposal.targetMarket = capsuleProposalDto.targetMarket;
    //     startup.capsuleProposal.solutionDescription =
    //       capsuleProposalDto.solutionDescription;
    //     startup.capsuleProposal.objectives = capsuleProposalDto.objectives;
    //     startup.capsuleProposal.scope = capsuleProposalDto.scope;
    //     startup.capsuleProposal.methodology = capsuleProposalDto.methodology;
    //     startup.capsuleProposal.fileName = capsuleProposalDto.fileName;
    //   } else {
    //     // Create new capsule proposal
    //     await this.createCapsuleProposal(capsuleProposalDto);
    //   }
    //   console.log('CapsuleProposal updated successfully');
    // }
    //
    // await this.em.flush();
    // return startup;
  }

  async remove(id: number): Promise<void> {
    const startup = await this.getStartupById(id);
    if (!startup) {
      throw new NotFoundException(`Startup with ID ${id} not found`);
    }
    await this.em.removeAndFlush(startup);
  }

  async createStartup(dto: StartupApplicationDtoOld) {
    //   const startup = new Startup();
    //
    //   const user = await this.em.findOne(User, { id: dto.userId });
    //   if (!user) {
    //     throw new NotFoundException(`User with ID ${dto.userId} does not exist.`);
    //   }
    //
    //   startup.name = dto.name;
    //
    //   startup.user = user;
    //   startup.dataPrivacy = dto.dataPrivacy;
    //   startup.eligibility = dto.eligibility;
    //   if (dto.links) startup.links = dto.links;
    //   if (dto.groupName) startup.groupName = dto.groupName;
    //   if (dto.universityName) startup.universityName = dto.universityName;
    //
    //   await this.em.persistAndFlush(startup);
    //   return startup;
    // }
    //
  }

  async removeMemberFromStartup(userId: number, startupId: number) {
    const startup = await this.em.findOne(
      Startup,
      { id: startupId },
      { populate: ['members'] },
    );
    if (!startup) {
      throw new NotFoundException(`Startup with ID ${startupId} not found.`);
    }

    const user = await this.em.findOne(User, { id: userId });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    startup.members.remove(user);
    await this.em.flush();
  }

  async addMemberToStartup(dto: any) {
    const startup = await this.em.findOne(
      Startup,
      { id: dto.startupId },
      { populate: ['members'] },
    );

    if (!startup) {
      throw new NotFoundException(
        `Startup with ID ${dto.startupId} does not exist.`,
      );
    }
    const user = await this.em.findOne(User, { id: dto.userId });

    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} does not exist.`);
    }

    if (startup.members.contains(user)) {
      throw new BadRequestException(
        `User is already a member of this startup.`,
      );
    }
    startup.members.add(user);
    await this.em.flush();

    return {
      message: `User with ID ${dto.userId} has been added to Startup ID ${dto.startupId}.`,
    };
  }

  async getPendingStartupsRankingByUrat() {
    // Fetch all UratQuestionAnswers with their startup relation
    const allAnswers = await this.em.find(
      UratQuestionAnswer,
      {},
      {
        populate: ['startup'],
      },
    );

    if (!allAnswers || allAnswers.length === 0) {
      console.warn('No UratQuestionAnswers found.');
      return [];
    }

    // Group by startup and sum scores
    const startupScoreMap = new Map<number, number>();
    for (const answer of allAnswers) {
      const startupId = answer.startup.id;
      const currentScore = startupScoreMap.get(startupId) || 0;
      startupScoreMap.set(startupId, currentScore + answer.score);
    }
    if (startupScoreMap.size === 0) {
      console.warn('No scores were calculated for startups.');
      return [];
    }

    // Add technology level to each startup's score
    const finalScores: { startup_id: number; score: number }[] = [];
    for (const [startupId, uratScore] of startupScoreMap.entries()) {
      const technologyLevel = await this.calculateTechnologyLevel(startupId);
      finalScores.push({
        startup_id: startupId,
        score: uratScore + technologyLevel,
      });
    }
    if (finalScores.length === 0) {
      console.warn('No final scores were calculated.');
      return [];
    }

    // Sort by total score descending order
    finalScores.sort((a, b) => b.score - a.score);

    // Fetch the startups
    const startupIds = finalScores.map((ranking) => ranking.startup_id);
    const startups = await this.em.find(
      Startup,
      { id: { $in: startupIds } },
      { populate: ['user'] },
    );
    if (!startups || startups.length === 0) {
      console.warn('No startups found for the calculated IDs.');
      return [];
    }

    // Map by ID for ordered results
    const startupsMap = new Map<number, Startup>();
    for (const startup of startups) {
      startupsMap.set(startup.id, startup);
    }
    const orderedStartups = finalScores
      .map((ranking) => {
        const startup = startupsMap.get(ranking.startup_id);
        if (startup) {
          return {
            ...startup,
            ranking_score: ranking.score,
          };
        }
        return null;
      })
      .filter((startup): startup is Startup & { ranking_score: number } =>
        Boolean(startup),
      ); // Remove nulls

    if (orderedStartups.length === 0) {
      console.warn('No startups matched the final scores.');
      return [];
    }

    return orderedStartups;
  }

  async getQualifiedStartupsRankingByRubrics() {
    // // Define readiness type weights
    // const readinessTypeWeights: Record<string, number> = {
    //   Technology: 4,
    //   Market: 3,
    //   Regulatory: 2,
    //   Acceptance: 2,
    //   Organizational: 2,
    //   Investment: 2,
    // };
    //
    // // Fetch the latest readiness levels for each startup and readiness type
    // const uratQuestionAnswers = await this.em.find(
    //   UratQuestionAnswer,
    //   {},
    //   {
    //     populate: ['uratQuestion', 'startup'],
    //   },
    // );
    //
    // // Calculate weighted scores for each startup
    // const startupScores: { startup_id: number; weighted_score: number }[] = [];
    //
    // for (const uratQuestionAnswer of uratQuestionAnswers) {
    //   const readinessType = uratQuestionAnswer.uratQuestion.readinessType;
    //   const weight = readinessTypeWeights[readinessType] || 0;
    //
    //   const weightedScore = uratQuestionAnswer.score * weight;
    //
    //   startupScores.push({
    //     startup_id: uratQuestionAnswer.startup.id,
    //     weighted_score: weightedScore,
    //   });
    // }
    //
    // // Aggregate total weighted scores for each startup
    // const totalWeightedScores: Record<number, number> = {};
    //
    // for (const score of startupScores) {
    //   const startupId = score.startup_id;
    //   if (!totalWeightedScores[startupId]) {
    //     totalWeightedScores[startupId] = 0;
    //   }
    //   totalWeightedScores[startupId] += score.weighted_score;
    // }
    //
    // // Rank startups by their total weighted scores
    // const rankedStartups = Object.entries(totalWeightedScores)
    //   .map(([startupId, totalWeightedScore]) => ({
    //     startup_id: Number(startupId),
    //     total_weighted_score: totalWeightedScore,
    //   }))
    //   .sort((a, b) => b.total_weighted_score - a.total_weighted_score);
    //
    // // Fetch the startups in the ranked order
    // const startupIds = rankedStartups.map((ranking) => ranking.startup_id);
    // const startups = await this.em.find(
    //   Startup,
    //   {
    //     id: { $in: startupIds },
    //     qualificationStatus: QualificationStatus.QUALIFIED,
    //   },
    //   { populate: ['mentors', 'user'] },
    // );
    //
    // if (!startups || startups.length === 0) {
    //   console.warn('No startups found for the calculated IDs.');
    //   return [];
    // }
    //
    // // Map startups by ID for ordered retrieval
    // const startupsMap = startups.reduce((map, startup) => {
    //   map[startup.id] = startup;
    //   return map;
    // }, {});
    //
    // const orderedStartups = rankedStartups
    //   .map((ranking) => {
    //     const startup = startupsMap[ranking.startup_id];
    //     if (startup) {
    //       return {
    //         ...startup, // Include all fields of the Startup entity
    //         mentors: startup.mentors.getItems().map((mentor: User) => ({
    //           id: mentor.id,
    //           firstName: mentor.firstName,
    //           lastName: mentor.lastName,
    //         })),
    //         ranking_score: ranking.total_weighted_score, // Add the ranking score
    //       };
    //     }
    //     return null;
    //   })
    //   .filter((startup): startup is Startup & { ranking_score: number } =>
    //     Boolean(startup),
    //   ); // Remove nulls
    // if (orderedStartups.length === 0) {
    //   console.warn('No startups matched the final scores.');
    //   return [];
    // }
    //
    // return orderedStartups;
  }

  async getStartupsByQualificationStatus(
    qualificationStatus: QualificationStatus,
  ): Promise<any[]> {
    const startups = await this.em.find(
      Startup,
      { qualificationStatus },
      {
        populate: ['user', 'mentors', 'capsuleProposal'],
      },
    );

    return startups.map((startup) => ({
      ...startup,
      mentors: startup.mentors.getItems().map((mentor: User) => mentor),
      capsuleProposal: startup.capsuleProposal ? startup.capsuleProposal : null,
    }));
  }

  async getCalculatorFinalScores(startupId: number) {
    // // Initialize an object to store scores grouped by category
    // let calculatorAnswers = await this.calculateLevels(startupId);
    //
    // const scoresByCategory: Record<string, number> = {
    //   [CalculatorCategory.Technology]: calculatorAnswers.technologyScore,
    //   [CalculatorCategory.Product_Development]:
    //     calculatorAnswers.productDevelopment,
    //   [CalculatorCategory.Product_Definition_Design]:
    //     calculatorAnswers.productDefinition,
    //   [CalculatorCategory.Competitive_Landscape]:
    //     calculatorAnswers.competitiveLandscape,
    //   [CalculatorCategory.Team]: calculatorAnswers.team,
    //   [CalculatorCategory.Go_To_Market]: calculatorAnswers.goToMarket,
    //   [CalculatorCategory.Manufacturing_Supply_Chain]:
    //     calculatorAnswers.supplyChain,
    //   'Technology Level': calculatorAnswers.technologyLevel,
    //   'Commercialization Level': calculatorAnswers.commercializationLevel,
    // };
    //
    // return scoresByCategory;
  }

  async approveApplicant(startupId: number) {
    const startup = await this.em.findOne(Startup, { id: startupId });
    if (!startup) {
      throw new NotFoundException(
        `Startup with ID ${startupId} does not exist.`,
      );
    }

    // Maybe (if have time) add logic for sending the startup an email that they got approved

    startup.qualificationStatus = QualificationStatus.QUALIFIED;

    await this.em.flush();
    return { message: `Startup with ID ${startupId} has been approved.` };
  }

  async waitlistApplicant(startupId: number, dto: WaitlistStartupDto) {
    const startup = await this.em.findOne(Startup, { id: startupId });
    if (!startup) {
      throw new NotFoundException(
        `Startup with ID ${startupId} does not exist.`,
      );
    }

    startup.qualificationStatus = QualificationStatus.WAITLISTED;

    // Find the manager who is waitlisting the startup
    const manager = await this.em.findOne(User, { id: dto.managerId });
    if (!manager) {
      throw new NotFoundException(
        `Manager with ID ${dto.managerId} does not exist.`,
      );
    }

    // Create waitlist message
    const waitlistMessage = new StartupWaitlistMessage();
    waitlistMessage.startup = startup;
    waitlistMessage.message = dto.message;
    waitlistMessage.manager = manager;

    this.em.persist(waitlistMessage);
    await this.em.flush();

    return {
      message: `Startup with ID ${startupId} has been waitlisted.`,
      waitlistMessage,
    };
  }

  async appointMentors(startupId: number, dto: AppointMentorsDto) {
    const startup = await this.em.findOne(Startup, { id: startupId });
    if (!startup) {
      throw new NotFoundException(
        `Startup with ID ${startupId} does not exist.`,
      );
    }

    const mentors = await this.em.find(User, {
      id: { $in: dto.mentorIds },
      role: Role.Mentor,
    });
    if (mentors.length !== dto.mentorIds.length) {
      throw new BadRequestException('One or more mentor IDs are invalid.');
    }
    startup.mentors.set(mentors);

    await this.em.flush();
    return {
      message: `Mentors have been successfully assigned to Startup ID ${startupId}.`,
    };
  }

  async allowRNAs(startupId: number): Promise<boolean> {
    return (
      (await this.em.count(StartupReadinessLevel, { startup: startupId })) > 0
    );
  }

  async allowTasks(startupId: number): Promise<boolean> {
    const count = await this.em.count(StartupRNA, {
      startup: startupId,
    });
    return count > 0;
  }

  async allowInitiatives(startupId: number): Promise<boolean> {
    const count = await this.em.count(StartupRNA, {
      startup: startupId,
    });
    return count > 0;
  }

  async allowRoadblocks(startupId: number): Promise<boolean> {
    const count = await this.em.count(StartupRNA, {
      startup: startupId,
    });
    return count > 0;
  }

  async markComplete(startupId: number) {
    const startup = await this.em.findOne(Startup, { id: startupId });
    if (!startup) {
      throw new NotFoundException(`Startup with ID ${startupId} not found`);
    }

    startup.qualificationStatus = QualificationStatus.COMPLETED;
    await this.em.flush();
    return {
      message: `Startup with ID ${startupId} has been marked as completed.`,
    };
  }

  async changeMentor(startupId: number, dto: ChangeMentorDto) {
    const startup = await this.em.findOne(
      Startup,
      { id: startupId },
      { populate: ['mentors'] },
    );
    if (!startup) {
      throw new NotFoundException(`Startup with ID ${startupId} not found`);
    }

    const newMentor = await this.em.findOne(User, {
      id: dto.mentorId,
      role: Role.Mentor,
    });
    if (!newMentor) {
      throw new NotFoundException(`Mentor with ID ${dto.mentorId} not found`);
    }

    // Replace existing mentors with the new mentor
    startup.mentors.set([newMentor]);

    await this.em.flush();
    return {
      message: `Mentor has been successfully changed for Startup ID ${startupId}.`,
      startup,
    };
  }

  private async calculateTechnologyLevel(startupId: number): Promise<number> {
    const { technologyLevel } = await this.calculateLevels(startupId);
    return technologyLevel;
  }

  private async calculateLevels(startupId: number): Promise<{
    technologyLevel: number;
    commercializationLevel: number;
    technologyScore: number;
    productDevelopment: number;
    productDefinition: number;
    competitiveLandscape: number;
    team: number;
    goToMarket: number;
    supplyChain: number;
  }> {
    const calculatorAnswers = await this.em.find(
      CalculatorQuestionAnswer,
      {
        startup: startupId,
      },
      {
        populate: ['question'], // Ensure the question relationship is populated
      },
    );

    let technologyLevel = 1;
    let commercializationLevel = 1;
    let technologyScore = 0;
    let productDevelopment = 0;
    let productDefinition = 0;
    let competitiveLandscape = 0;
    let team = 0;
    let goToMarket = 0;
    let supplyChain = 0;

    for (const answer of calculatorAnswers) {
      const question = answer.question;
      const category = question.category.toLowerCase();

      if (category === 'technology') {
        technologyScore += question.score;
      } else if (category === 'product development') {
        productDevelopment += question.score;
      } else if (category === 'product definition/design') {
        productDefinition += question.score;
      } else if (category === 'competitive landscape') {
        competitiveLandscape += question.score;
      } else if (category === 'team') {
        team += question.score;
      } else if (category === 'go-to-market') {
        goToMarket += question.score;
      } else if (category === 'manufacturing/supply chain') {
        supplyChain += question.score;
      }
    }

    if (technologyScore >= 4) technologyLevel = 4;
    if (technologyScore >= 5) technologyLevel = 5;
    if (productDevelopment >= 2 && productDefinition >= 3) technologyLevel = 6;
    if (productDevelopment >= 3) technologyLevel = 7;
    if (productDevelopment >= 4) technologyLevel = 8;
    if (productDevelopment >= 5) technologyLevel = 9;

    if (competitiveLandscape >= 1 && team >= 1) commercializationLevel = 1;
    if (competitiveLandscape >= 2 && team === 2) commercializationLevel = 2;
    if (
      productDevelopment >= 1 &&
      productDefinition >= 1 &&
      competitiveLandscape >= 3 &&
      team >= 2 &&
      goToMarket >= 1
    ) {
      commercializationLevel = 3;
    }
    if (
      productDefinition >= 2 &&
      competitiveLandscape >= 4 &&
      team >= 2 &&
      goToMarket >= 2 &&
      supplyChain >= 1
    ) {
      commercializationLevel = 4;
    }
    if (
      productDefinition >= 4 &&
      competitiveLandscape >= 5 &&
      team >= 3 &&
      goToMarket >= 3 &&
      supplyChain >= 2
    ) {
      commercializationLevel = 5;
    }
    if (productDefinition >= 5 && team >= 4 && goToMarket >= 4) {
      commercializationLevel = 6;
    }
    if (team >= 4 && supplyChain >= 3) commercializationLevel = 7;
    if (team >= 5 && supplyChain >= 4) commercializationLevel = 8;
    if (team >= 5 && supplyChain >= 5) commercializationLevel = 9;

    return {
      technologyLevel,
      commercializationLevel,
      technologyScore,
      productDevelopment,
      productDefinition,
      competitiveLandscape,
      team,
      goToMarket,
      supplyChain,
    };
  }

  async getReadinessLevelCriterionAnswers(startupId: number) {
    return this.em.find(
      StartupCriterionAnswer,
      {
        startup: startupId,
      },
      {
        populate: ['criterion'],
        orderBy: {
          id: 'ASC',
        },
      },
    );
  }

  async getStartupReadinessLevel(startupId: number) {
    return this.em.find(
      StartupReadinessLevel,
      {
        startup: startupId,
      },
      {
        populate: ['readinessLevel'],
        orderBy: {
          id: 'ASC',
        },
      },
    );
  }

  private async createStartupReadinessLevels(
    startupId: number,
  ): Promise<StartupReadinessLevel[]> {
    // Fetch the startup
    const startup = await this.em.findOne(Startup, { id: startupId });
    if (!startup) {
      throw new NotFoundException(
        `Startup with ID ${startupId} does not exist`,
      );
    }

    const uratQuestionAnswers = await this.em.find(
      UratQuestionAnswer,
      {
        startup: startupId,
      },
      {
        populate: ['uratQuestion'],
      },
    );

    // Calculate total scores for each ReadinessType
    const scoresByReadinessType: Record<ReadinessType, number> = {
      [ReadinessType.T]: 0,
      [ReadinessType.M]: 0,
      [ReadinessType.R]: 0,
      [ReadinessType.A]: 0,
      [ReadinessType.O]: 0,
      [ReadinessType.I]: 0,
    };
    for (const answer of uratQuestionAnswers) {
      const readinessType = answer.uratQuestion.readinessType;
      scoresByReadinessType[readinessType] += answer.score;
    }

    for (const readinessType in scoresByReadinessType) {
      // scoresByReadinessType[readinessType] = Math.ceil(
      //   scoresByReadinessType[readinessType] / 3,
      // );

      // Average to range of 1-5
      const normalizedScore = Math.ceil(
        scoresByReadinessType[readinessType] / 3,
      );
      // Scale from 1-5 range to 1-9 range using the formula:
      // newScore = (((oldScore - oldMin) * (newMax - newMin)) / (oldMax - oldMin)) + newMin
      const scaledScore = Math.ceil(
        ((normalizedScore - 1) * (9 - 1)) / (5 - 1) + 1,
      );
      scoresByReadinessType[readinessType] = scaledScore;
    }

    // Fetch all readiness levels
    const readinessLevels = await this.em.find(ReadinessLevel, {});
    const readinessLevelsByType = readinessLevels.reduce(
      (map, level) => {
        if (!map[level.readinessType]) {
          map[level.readinessType] = [];
        }
        map[level.readinessType].push(level);
        return map;
      },
      {} as Record<ReadinessType, ReadinessLevel[]>,
    );

    // Create a StartupReadinessLevel for each ReadinessType
    const startupReadinessLevels: StartupReadinessLevel[] = [];
    for (const readinessType of Object.values(ReadinessType)) {
      const score = scoresByReadinessType[readinessType] || 1; // Default to 1 if no score
      const levels = readinessLevelsByType[readinessType];

      if (!levels || levels.length === 0) {
        throw new BadRequestException(
          `No readiness levels found for type: ${readinessType}`,
        );
      }

      // Map the normalized score directly to the corresponding level
      const selectedLevel =
        levels.find((level) => level.level === score) || levels[5]; // Default to the first level if no match

      const startupReadinessLevel = new StartupReadinessLevel();
      startupReadinessLevel.startup = startup;
      startupReadinessLevel.readinessLevel = selectedLevel;

      this.em.persist(startupReadinessLevel);
      startupReadinessLevels.push(startupReadinessLevel);
    }

    // Save all the new StartupReadinessLevel entities
    await this.em.flush();

    return startupReadinessLevels;
  }

  async adminCreate(dto: CreateStartupDto): Promise<Startup> {
    const user = await this.em.findOne(User, { id: dto.userId });
    if (!user) {
      throw new NotFoundException(`User with ID ${dto.userId} not found`);
    }

    const startup = this.em.create(Startup, {
      name: dto.name,
      user,
      qualificationStatus: dto.qualificationStatus,
      dataPrivacy: dto.dataPrivacy ?? false,
      links: dto.links,
      groupName: dto.groupName,
      universityName: dto.universityName,
      eligibility: dto.eligibility ?? false,
    });

    try {
      await this.em.persistAndFlush(startup);

      // Add the startup leader/owner to the members collection
      startup.members.add(user);
      await this.em.flush();
    } catch (e: any) {
      // Handle out-of-sync sequence: duplicate key on startups_pkey
      const msg = String(e?.message ?? '');
      if (e?.code === '23505' && msg.includes('startups_pkey')) {
        // Reset sequence to max(id)
        await this.em
          .getConnection()
          .execute(
            "select setval(pg_get_serial_sequence('startups','id'), coalesce((select max(id) from startups), 0), true)",
          );
        // Retry once
        await this.em.persistAndFlush(startup);

        // Add the startup leader/owner to the members collection
        startup.members.add(user);
        await this.em.flush();
      } else {
        throw e;
      }
    }
    return startup;
  }

  async updateCapsuleProposal(
    startupId: number,
    dto: StartupApplicationDto,
  ): Promise<Startup> {
    const startup = await this.em.findOne(
      Startup,
      { id: startupId },
      { populate: ['capsuleProposal'] },
    );

    if (!startup) {
      throw new NotFoundException(`Startup with ID ${startupId} not found`);
    }

    if (!startup.capsuleProposal) {
      throw new BadRequestException(
        `Startup with ID ${startupId} has no capsule proposal to update`,
      );
    }

    const proposal = startup.capsuleProposal;
    proposal.title = dto.title;
    proposal.description = dto.description;
    proposal.problemStatement = dto.problemStatement;
    proposal.targetMarket = dto.targetMarket;
    proposal.solutionDescription = dto.solutionDescription;
    proposal.objectives = dto.objectives ?? [];
    proposal.historicalTimeline = dto.historicalTimeline ?? [];
    proposal.competitiveAdvantageAnalysis =
      dto.competitiveAdvantageAnalysis ?? [];
    proposal.intellectualPropertyStatus = dto.intellectualPropertyStatus;
    proposal.scope = dto.proposalScope;
    proposal.methodology = dto.methodology;
    proposal.curriculumVitae = dto.curriculumVitae ?? proposal.curriculumVitae;
    proposal.members = dto.members ?? [];

    startup.name = dto.title;

    // Change status to PENDING when reapplying
    startup.qualificationStatus = QualificationStatus.PENDING;

    await this.em.flush();

    return startup;
  }

  async updateCapsuleProposalFields(
    startupId: number,
    dto: UpdateCapsuleProposalDto,
  ): Promise<CapsuleProposal> {
    const startup = await this.em.findOne(
      Startup,
      { id: startupId },
      { populate: ['capsuleProposal'] },
    );

    if (!startup) {
      console.error(`Startup with ID ${startupId} not found`);
      throw new NotFoundException(`Startup with ID ${startupId} not found`);
    }

    if (!startup.capsuleProposal) {
      console.error(`Startup with ID ${startupId} has no capsule proposal`);
      throw new BadRequestException(
        `Startup with ID ${startupId} has no capsule proposal to update`,
      );
    }

    const proposal = startup.capsuleProposal;

    // Update only the fields that are provided
    if (dto.title !== undefined) proposal.title = dto.title;
    if (dto.description !== undefined) proposal.description = dto.description;
    if (dto.problemStatement !== undefined)
      proposal.problemStatement = dto.problemStatement;
    if (dto.targetMarket !== undefined)
      proposal.targetMarket = dto.targetMarket;
    if (dto.solution !== undefined) proposal.solutionDescription = dto.solution;
    if (dto.objectives !== undefined) {
      // Split objectives by newlines and filter out empty lines
      proposal.objectives = dto.objectives
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    }
    if (dto.scope !== undefined) proposal.scope = dto.scope;
    if (dto.methodology !== undefined) proposal.methodology = dto.methodology;

    await this.em.flush();
    return proposal;
  }
}
