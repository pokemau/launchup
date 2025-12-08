import { EntityManager } from '@mikro-orm/core';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StartupRNA } from 'src/entities/rna.entity';
import { Startup } from 'src/entities/startup.entity';
import { CreateStartupRnaDto, UpdateStartupRnaDto } from './dto/rna.dto';
import { ReadinessLevel } from 'src/entities/readiness-level.entity';
import { StartupReadinessLevel } from 'src/entities/startup-readiness-level.entity';
import { AiService } from 'src/ai/ai.service';
import { RnaChatHistory } from 'src/entities/rna-chat-history.entity';

@Injectable()
export class RnaService {
  constructor(
    private em: EntityManager,
    private readonly aiService: AiService,
  ) {}

  async getRNAbyId(startupId: number) {
    return await this.em.find(
      StartupRNA,
      { startup: startupId },
      {
        populate: ['readinessLevel'],
      },
    );
  }

  async create(dto: CreateStartupRnaDto) {
    if (!dto.readiness_level_id) {
      throw new BadRequestException('readiness_level_id is required');
    }

    const readinessRef = this.em.getReference(
      ReadinessLevel,
      dto.readiness_level_id,
    );
    const startupRef = this.em.getReference(Startup, dto.startup_id);

    const rna = this.em.create(StartupRNA, {
      rna: dto.rna,
      isAiGenerated: dto.isAiGenerated ?? false,
      startup: startupRef,
      readinessLevel: readinessRef,
    });

    await this.em.persistAndFlush(rna);
    return rna;
  }

  async update(id: number, dto: UpdateStartupRnaDto) {
    const rna = await this.em.findOneOrFail(StartupRNA, { id });

    if (dto.rna !== undefined) {
      rna.rna = dto.rna;
    }

    if (dto.isAiGenerated !== undefined) {
      rna.isAiGenerated = dto.isAiGenerated;
    }

    await this.em.flush();
    return rna;
  }

  async delete(id: number) {
    const rna = await this.em.findOne(StartupRNA, { id });
    if (!rna) throw new NotFoundException(`RNA with ID ${id} not found`);

    await this.em.removeAndFlush(rna);
    return rna;
  }

  async generateRNA(id: number) {
    // 1. Validate startup exists
    const startup = await this.em.findOne(
      Startup,
      { id: id },
      {
        populate: ['capsuleProposal'],
      },
    );
    if (!startup) throw new NotFoundException('Startup not found');

    // 2. Get capsule proposal info
    const capsuleProposalInfo = startup.capsuleProposal;
    if (!capsuleProposalInfo)
      throw new BadRequestException('No capsule proposal found.');

    // 3. Get existing RNA entries for this startup
    const existingRNAs = await this.em.find(
      StartupRNA,
      { startup: startup },
      {
        populate: ['readinessLevel'],
      },
    );

    // 4. Get all readiness levels for this startup
    const startupReadinessLevels = await this.em.find(
      StartupReadinessLevel,
      { startup: startup },
      { populate: ['readinessLevel'] },
    );

    // 5. Find readiness levels that don't have RNA yet
    const readinessLevelsWithoutRNA = startupReadinessLevels.filter(
      (startupReadinessLevel) =>
        !existingRNAs.some(
          (existingRNA) =>
            existingRNA.readinessLevel.id ===
            startupReadinessLevel.readinessLevel.id,
        ),
    );

    // 6. If all readiness levels already have RNA, return empty array
    if (readinessLevelsWithoutRNA.length === 0) {
      return [];
    }

    // 7. Build readiness level data for prompt
    const readinessLevelData = startupReadinessLevels.map((srl, index) => ({
      type: srl.readinessLevel.readinessType,
      level: srl.readinessLevel.level,
      hasRNA: existingRNAs.some(
        (rna) => rna.readinessLevel.id === srl.readinessLevel.id,
      ),
    }));

    const trl = startupReadinessLevels[0]?.readinessLevel.level || 0;
    const mrl = startupReadinessLevels[1]?.readinessLevel.level || 0;
    const arl = startupReadinessLevels[2]?.readinessLevel.level || 0;
    const orl = startupReadinessLevels[3]?.readinessLevel.level || 0;
    const rrl = startupReadinessLevels[4]?.readinessLevel.level || 0;
    const irl = startupReadinessLevels[5]?.readinessLevel.level || 0;

    const basePrompt = `
      Given these data:
      Acceleration Proposal Title: ${capsuleProposalInfo.title}
      Duration: 3 months
      I. About the startup
      A. Startup Description
      ${capsuleProposalInfo.description}
      B. Problem Statement
      ${capsuleProposalInfo.problemStatement}
      C. Target Market
      ${capsuleProposalInfo.targetMarket}
      D. Solution Description
      ${capsuleProposalInfo.solutionDescription}
      II. About the Proposed Acceleration
      A. Objectives
      ${capsuleProposalInfo.objectives}
      B. Scope of The Proposal
      ${capsuleProposalInfo.scope}
      C. Methodology and Expected Outputs
      ${capsuleProposalInfo.methodology}
      Initial Readiness Level:
      TRL ${trl}
      MRL ${mrl}
      ARL ${arl}
      ORL ${orl}
      RRL ${rrl}
      IRL ${irl}
      `;

    // 8. Create prompt for only missing readiness types
    const missingReadinessTypes = readinessLevelsWithoutRNA.map(
      (rl) => rl.readinessLevel.readinessType,
    );
    const prompt = `
      ${basePrompt}
      
      TASK: Generate a RNA(Readiness and Needs Assessment) for the following readiness levels that are missing: ${missingReadinessTypes.join(', ')}.
      Requirement: The response should be in a JSON format.
      JSON format: [{"readiness_level_type": (string), "rna": ""(string)}]
      Requirement:
      - readiness_level_type should only be one of: ${missingReadinessTypes.join(', ')}
      - rna has a max length of 500
      - rna should be specific to that readiness type only.
      `;

    const generatedRNAs = await this.aiService.generateRNAsFromPrompt(prompt);

    // 9. Create RNA entries only for missing readiness types
    const createdRNAs: StartupRNA[] = [];
    for (const generatedRNA of generatedRNAs) {
      const matchingReadinessLevel = readinessLevelsWithoutRNA.find(
        (rl) =>
          rl.readinessLevel.readinessType === generatedRNA.readiness_level_type,
      );

      if (matchingReadinessLevel) {
        const newRNA = new StartupRNA();
        newRNA.rna = generatedRNA.rna;
        newRNA.isAiGenerated = true; // Mark as AI generated
        newRNA.startup = startup;
        newRNA.readinessLevel = matchingReadinessLevel.readinessLevel;

        await this.em.persist(newRNA);
        createdRNAs.push(newRNA);
      }
    }
    await this.em.flush();

    return createdRNAs.map((r: StartupRNA) => ({
      id: r.id,
      rna: r.rna,
      isAiGenerated: r.isAiGenerated,
      startup: r.startup,
      readinessLevel: r.readinessLevel,
    }));
  }

  async checkIfAllReadinessTypesHaveRNA(startupId: number): Promise<boolean> {
    const startup = await this.em.findOne(Startup, { id: startupId });
    if (!startup) throw new NotFoundException('Startup not found');

    // Get all readiness levels for this startup
    const startupReadinessLevels = await this.em.find(
      StartupReadinessLevel,
      { startup: startup },
      { populate: ['readinessLevel'] },
    );

    // Get existing RNA entries for this startup
    const existingRNAs = await this.em.find(
      StartupRNA,
      { startup: startup },
      {
        populate: ['readinessLevel'],
      },
    );

    // Check if all readiness levels have RNA
    return startupReadinessLevels.every((startupReadinessLevel) =>
      existingRNAs.some(
        (existingRNA) =>
          existingRNA.readinessLevel.id ===
          startupReadinessLevel.readinessLevel.id,
      ),
    );
  }

  async refineRna(
    rnaId: number,
    chatHistory: { role: 'User' | 'Ai'; content: string }[],
    latestPrompt: string,
  ): Promise<{
    refinedRna?: string;
    aiCommentary: string;
  }> {
    const rna = await this.em.findOne(
      StartupRNA,
      { id: rnaId },
      {
        populate: ['startup', 'startup.capsuleProposal', 'readinessLevel'],
      },
    );
    if (!rna) throw new NotFoundException('RNA not found');

    const startup = rna.startup;
    const capsuleProposalInfo = startup.capsuleProposal;
    if (!capsuleProposalInfo)
      throw new BadRequestException(
        'No capsule proposal found for this startup.',
      );

    const basePrompt = await this.aiService.createBasePrompt(startup, this.em);

    const prompt = `${basePrompt}

      Current RNA Details:
      Readiness Type: ${rna.readinessLevel.readinessType}
      Current Level: ${rna.readinessLevel.level}
      RNA Description: ${rna.rna}
      
      Chat History:
      ${chatHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n')}

      User: ${latestPrompt}

      IMPORTANT INSTRUCTIONS:
      1. Only refine the RNA description that the user explicitly asks to modify
      2. Do not modify any other fields
      3. Respond with a JSON object containing ONLY the requested refinements
      4. If the user did not specify what to refine, refine the RNA description
      5. Use the exact field name shown in the example
      6. You can use HTML formatting in your refined text:
         - <p> for paragraphs
         - <strong> for bold text
         - <em> for italic text
         - <u> for underline
         - <br> for line breaks
         - Use • (bullet character) for bullet points
         Example: <p><strong>Key Point</strong>: This is <em>important</em> information.</p>
         Example with bullets: <p>• First point<br>• Second point<br>• Third point</p>

      Example response format:
      {
          "refinedRna": "your refined RNA description here"
      }
      =========
      Your commentary about the changes here.

      Available fields:
      - refinedRna (for RNA description updates)

      Remember:
      - Only include the refinedRna field if the user specifically asks to refine the RNA description
      - The JSON must be valid and properly formatted
      - Always include the ========= separator followed by your commentary
      - DO NOT MENTION THE FORMATTING INSTRUCTIONS OR HOW YOU FORMATTED THE RESPONSE IN THE COMMENTARY.`;

    const result = await this.aiService.refineRna(prompt);

    // Save chat history
    const newMessages = [
      new RnaChatHistory({
        rna,
        role: 'User',
        content: latestPrompt,
      }),
      new RnaChatHistory({
        rna,
        role: 'Ai',
        content: result.aiCommentary,
        refinedRna: result.refinedRna,
      }),
    ];

    await this.em.persistAndFlush(newMessages);

    return result;
  }
}
