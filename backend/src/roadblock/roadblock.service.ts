import { EntityManager } from '@mikro-orm/core';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Roadblock } from 'src/entities/roadblock.entity';
import {
  CreateRoadblockDto,
  GenerateRoadblocksDto,
  UpdateRoadblockDto,
} from './dto/roadblock.dto';
import { User } from 'src/entities/user.entity';
import { Startup } from 'src/entities/startup.entity';
import { AiService } from 'src/ai/ai.service';
import { RnsStatus } from 'src/entities/enums/rns.enum';
import { Rns } from 'src/entities/rns.entity';
import { Initiative } from 'src/entities/initiative.entity';
import { RoadblockChatHistory } from 'src/entities/roadblock-chat-history.entity';

@Injectable()
export class RoadblockService {
  constructor(
    private readonly em: EntityManager,
    private readonly aiService: AiService,
  ) {}

  async getByStartupId(startupId: number): Promise<Roadblock[]> {
    return this.em.find(
      Roadblock,
      { startup: startupId },
      { orderBy: { id: 'ASC' } },
    );
  }

  async createRoadblock(dto: CreateRoadblockDto): Promise<Roadblock> {
    const roadblock = new Roadblock();
    roadblock.assignee = this.em.getReference(User, dto.assigneeId);
    roadblock.startup = this.em.getReference(Startup, dto.startupId);
    roadblock.isAiGenerated = dto.isAiGenerated;
    roadblock.status = dto.status;
    roadblock.riskNumber = dto.riskNumber;
    roadblock.description = dto.description;
    roadblock.fix = dto.fix;

    await this.em.persistAndFlush(roadblock);
    return roadblock;
  }

  async update(id: number, dto: UpdateRoadblockDto): Promise<Roadblock> {
    const roadblock = await this.em.findOneOrFail(Roadblock, id);

    if (dto.assigneeId !== undefined) {
      roadblock.assignee = this.em.getReference(User, dto.assigneeId);
    }
    if (dto.startupId !== undefined) {
      roadblock.startup = this.em.getReference(Startup, dto.startupId);
    }
    if (dto.isAiGenerated !== undefined) {
      roadblock.isAiGenerated = dto.isAiGenerated;
    }
    if (dto.status !== undefined) {
      roadblock.status = dto.status;
    }

    if (dto.requestedStatus !== undefined) {
      roadblock.requestedStatus = dto.requestedStatus;
    }

    if (dto.approvalStatus !== undefined) {
      roadblock.approvalStatus = dto.approvalStatus;
    }

    if (dto.riskNumber !== undefined) {
      roadblock.riskNumber = dto.riskNumber;
    }
    if (dto.description !== undefined) {
      roadblock.description = dto.description;
    }
    if (dto.fix !== undefined) {
      roadblock.fix = dto.fix;
    }
    if (dto.clickedByMentor !== undefined) {
      roadblock.clickedByMentor = dto.clickedByMentor;
    }
    if (dto.clickedByStartup !== undefined) {
      roadblock.clickedByStartup = dto.clickedByStartup;
    }

    await this.em.flush();
    return roadblock;
  }

  async statusChange(id: number, role: string, dto: UpdateRoadblockDto) {
    const roadblock = await this.em.findOne(Roadblock, { id });
    if (!roadblock) throw new NotFoundException('Roadblock not found');

    if (roadblock.requestedStatus === dto.status) {
      return roadblock;
    }

    if (role === 'Startup') {
      if (roadblock.status === dto.status) {
        roadblock.approvalStatus = 'Unchanged';
      } else {
        roadblock.approvalStatus = 'Pending';
      }
      roadblock.requestedStatus = dto.status;
    } else {
      roadblock.status = dto.status;
      roadblock.approvalStatus = 'Unchanged';
      roadblock.requestedStatus = dto.status;
    }

    await this.em.flush();
    return roadblock;
  }

  async deleteRoadblock(id: number): Promise<{ message: string }> {
    const roadblock = await this.em.findOne(Roadblock, { id });
    if (!roadblock) throw new NotFoundException('Roadblock not found');

    await this.em.removeAndFlush(roadblock);
    return { message: 'Roadblock deleted successfully' };
  }

  async generateRoadblocks(dto: GenerateRoadblocksDto) {
    const startup = await this.em.findOneOrFail(
      Startup,
      { id: dto.startupId },
      {
        populate: ['capsuleProposal', 'user'],
      },
    );

    if (!startup.capsuleProposal) {
      throw new BadRequestException('No capsule proposal found.');
    }

    const basePrompt = await this.aiService.createBasePrompt(startup, this.em); // You'll implement this helper

    const excludeStatuses = [RnsStatus.Discontinued, RnsStatus.Completed];

    const tasks = await this.em.find(
      Rns,
      {
        startup: startup,
        status: { $nin: excludeStatuses },
      },
      {
        populate: ['targetLevel'],
      },
    );

    const taskIds = tasks.map((task) => task.id);

    const initiatives = await this.em.find(Initiative, {
      rns: { $in: taskIds },
      status: { $nin: excludeStatuses },
    });

    const tasksPrompt = tasks
      .map(
        (task) => `
        priorityNumber: ${task.priorityNumber}
        readinessType: ${task.readinessType}
        targetLevel: ${task.targetLevel.level}
        description: ${task.description}
        taskType: ${RnsStatus[task.status]}
        `,
      )
      .join('\n\n');

    const initiativesPrompt = initiatives
      .map(
        (initiative) => `
        initiativeNumber: ${initiative.initiativeNumber}
        description: ${initiative.description}
        measures: ${initiative.measures}
        targets: ${initiative.targets}
        remarks: ${initiative.remarks}
        `,
      )
      .join('\n\n');

    const prompt = `
        ${basePrompt}

        Based on these tasks:
        ${tasksPrompt}

        Based on these initiatives:
        ${initiativesPrompt}

        Task: If roadblock exists for the startup's personalized tasks and initiatives, create me exactly ${dto.no_of_roadblocks_to_create} roadblocks. Approximate a risk number between 1 to 5, where 1 means least risk and 5 means highest risk. Else return an empty list.
        Requirement: The response should be in a JSON format.
        It should consist of description, fix, and riskNumber which should be an integer from 1 to 5.
        JSON format: [{"description": "", "fix": "", "riskNumber": (number)}]
        Requirement note:
        - description and fix have 500 max length
        - return an empty list if no roadblock exists.
        `;

    if (dto.debug) {
      return prompt;
    }

    const resultData =
      await this.aiService.generateRoadblocksFromPrompt(prompt); // your JSON parser helper

    // if(dto.debug){
    //     return resultData;
    // }

    const roadblocks: Roadblock[] = [];
    for (const data of resultData) {
      const roadblock = new Roadblock();
      roadblock.startup = startup;
      roadblock.assignee = startup.user;
      roadblock.isAiGenerated = false;
      roadblock.status = 1;
      roadblock.riskNumber = Number(data.riskNumber);
      roadblock.description = data.description;
      roadblock.fix = data.fix;
      roadblock.requestedStatus = 1;

      await this.em.persistAndFlush(roadblock);
    }

    return roadblocks;
  }

  async refineRoadblock(
    roadblockId: number,
    chatHistory: { role: 'User' | 'Ai'; content: string }[],
    latestPrompt: string,
  ): Promise<{
    refinedDescription?: string;
    refinedFix?: string;
    aiCommentary: string;
  }> {
    const roadblock = await this.em.findOne(
      Roadblock,
      { id: roadblockId },
      {
        populate: ['startup', 'startup.capsuleProposal'],
      },
    );
    if (!roadblock) throw new NotFoundException('Roadblock not found');

    const startup = roadblock.startup;
    const capsuleProposalInfo = startup.capsuleProposal;
    if (!capsuleProposalInfo)
      throw new BadRequestException(
        'No capsule proposal found for this startup.',
      );

    const basePrompt = await this.aiService.createBasePrompt(startup, this.em);

    const prompt = `${basePrompt}

        Current Roadblock Details:
        Description: ${roadblock.description}
        Fix: ${roadblock.fix}
        Risk Level: ${roadblock.riskNumber}

        Chat History:
        ${chatHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n')}

        User: ${latestPrompt}

        Please refine the roadblock details according to the user's instructions.
        After the JSON, write '=========' on a new line, then provide a brief AI commentary (1-2 sentences) explaining your changes.

        IMPORTANT INSTRUCTIONS:
        1. Only refine the specific fields that the user explicitly asks to modify
        2. Do not modify any other fields
        3. Respond with a JSON object containing ONLY the requested refinements
        4. If the user did not specify a field to refine, refine all fields.
        4. Use the exact field names shown in the example

        Example response format:
        If user asks to update description only:
        {
            "refinedDescription": "your refined description here"
        }
        =========
        Your commentary about the changes here.

        If user asks to update description and fix:
        {
            "refinedDescription": "your refined description here",
            "refinedFix": "your refined fix here"
        }
        =========
        Your commentary about the changes here.

        Available fields:
        - refinedDescription (for description updates)
        - refinedFix (for fix updates)

        Remember:
        - If the user specifies, only include fields that the user specifically asks to refine
        - The JSON must be valid and properly formatted
        - Always include the ========= separator followed by your commentary
        `;

    const result = await this.aiService.refineRoadblock(prompt);

    // Save chat history
    const newMessages = [
      new RoadblockChatHistory({
        roadblock,
        role: 'User',
        content: latestPrompt,
      }),
      new RoadblockChatHistory({
        roadblock,
        role: 'Ai',
        content: result.aiCommentary,
        refinedDescription: result.refinedDescription,
        refinedFix: result.refinedFix,
      }),
    ];

    await this.em.persistAndFlush(newMessages);

    return result;
  }

  async getRoadblockChatHistory(roadblockId: number) {
    return this.em.find(
      RoadblockChatHistory,
      { roadblock: { id: roadblockId } },
      { orderBy: { createdAt: 'ASC' } },
    );
  }
}
