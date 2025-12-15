import { GoogleGenAI } from '@google/genai';
import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StartupReadinessLevel } from 'src/entities/startup-readiness-level.entity';
import { Startup } from 'src/entities/startup.entity';
import { StartupApplicationDto } from 'src/startup/dto/startup.dto';

@Injectable()
export class AiService {
  private readonly ai: GoogleGenAI;
  private readonly modelName = 'gemini-2.5-flash-lite';

  constructor(private config: ConfigService) {
    this.ai = new GoogleGenAI({
      apiKey: this.config.get<string>('GEMINI_API_KEY'),
    });
  }

  async test() {
    const res = await this.ai.models.generateContent({
      model: this.modelName,
      contents: 'what is the lyrics for bloom necry talkie',
    });
    return res.text;
  }

  async getCapsuleProposalInfo(text: string) {
    const res = await this.ai.models.generateContent({
      model: this.modelName,
      contents: `Based on the text ${text},
        Task: extract the text for:
        -Acceleration Proposal Title ( can be found above the Duration: 3 months, etc.)
        - Startup Description
        - Problem Statement
        - Target Market
        - Solution Description
        - Objectives
        - Scope of The Proposal
        - Methodology and Expected Outputs

        Requirement: The response should be in a JSON format.
        It should consist of title, startup_description, problem_statement, target_market, solution_description, objectives, scope, and methodology
        JSON format: {"title": "", "startup_description": "", "problem_statement": (int), "target_market": "", "solution_description": "", "objectives": "", "scope": "", "methodology": ""}
        `,
    });
    return res.text;
  }

  async generateStartupAnalysisSummary(
    dto: StartupApplicationDto,
  ): Promise<string> {
    const res = await this.ai.models.generateContent({
      model: this.modelName,
      contents: `Please provide a comprehensive analysis of the following startup proposal:
      
      Title: ${dto.title}
      Description: ${dto.description}
      Problem Statement: ${dto.problemStatement}
      Target Market: ${dto.targetMarket}
      Solution Description: ${dto.solutionDescription}
      Objectives: ${dto.objectives.join('\n')}
      Proposal Scope: ${dto.proposalScope}
      Methodology: ${dto.methodology}
      Historical Timeline: ${dto.historicalTimeline?.map((h) => `${h.monthYear}: ${h.description}`).join('\n') || 'Not provided'}
      Competitive Advantage Analysis: ${
        dto.competitiveAdvantageAnalysis
          ?.map(
            (c) =>
              `Competitor: ${c.competitorName}
         Offer: ${c.offer}
         Pricing Strategy: ${c.pricingStrategy}`,
          )
          .join('\n\n') || 'Not provided'
      }
      Intellectual Property Status: ${dto.intellectualPropertyStatus}

      Analyze the startup proposal and provide a concise three-sentence summary that covers:
      1. Overall viability assessment (market potential and solution strength)
      2. Key competitive advantages and growth strategy feasibility
      3. Critical risks and primary recommendations
      
      Important: 
      - Provide exactly three sentences
      - Start directly with the analysis, no introductory phrases
      - Be clear and direct about the startup's potential
      - Focus on the most impactful insights
      - Keep output concise while covering essential points`,
    });

    if (!res.text) {
      throw new Error('AI response did not contain any text');
    }

    return res.text.trim();
  }

  async generateRNAsFromPrompt(
    prompt: string,
  ): Promise<{ readiness_level_type: string; rna: string }[]> {
    const res = await this.ai.models.generateContent({
      model: this.modelName,
      contents: prompt,
    });

    const text = res.text;

    if (!text) {
      throw new Error('AI response did not contain any text');
    }

    try {
      const jsonStart = text.indexOf('[');
      const jsonEnd = text.lastIndexOf(']');
      const jsonString = text.substring(jsonStart, jsonEnd + 1);

      return JSON.parse(jsonString).map((entry: any) => ({
        readiness_level_type: entry.readiness_level_type,
        rna: entry.rna,
      }));
    } catch (err) {
      console.error('Failed to parse AI response:', text);
      throw new Error('AI returned an invalid RNA response');
    }
  }

  async generateTasksFromPrompt(
    prompt: string,
  ): Promise<{ target_level: number; description: string }[]> {
    const res = await this.ai.models.generateContent({
      model: this.modelName,
      contents: prompt,
    });

    const text = res.text;

    if (!text) {
      throw new Error('AI response did not contain any text');
    }

    try {
      const jsonStart = text.indexOf('[');
      const jsonEnd = text.lastIndexOf(']');
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      const parsedData = JSON.parse(jsonString);
      return parsedData.map((task: any) => ({
        target_level: parseInt(task.target_level, 10) || 0,
        description: task.description,
      }));
    } catch (err) {
      console.error('Failed to parse AI response:', text);
      throw new Error('AI returned an invalid response');
    }
  }

  async generateInitiativesFromPrompt(prompt: string): Promise<
    {
      description: string;
      measures: string;
      targets: string;
      remarks: string;
    }[]
  > {
    const res = await this.ai.models.generateContent({
      model: this.modelName,
      contents: prompt,
    });

    const text = res.text;

    if (!text) {
      throw new Error('AI response did not contain any text');
    }

    try {
      const jsonStart = text.indexOf('[');
      const jsonEnd = text.lastIndexOf(']');
      const jsonString = text.substring(jsonStart, jsonEnd + 1);

      return JSON.parse(jsonString).map((entry: any) => ({
        description: entry.description,
        measures: entry.measures,
        targets: entry.targets,
        remarks: entry.remarks,
      }));
    } catch (err) {
      console.error('Failed to parse AI response:', text);
      throw new Error('AI returned an invalid initiative response');
    }
  }

  async refineRnsDescription(
    prompt: string,
  ): Promise<{ refinedDescription: string; aiCommentary: string }> {
    const res = await this.ai.models.generateContent({
      model: this.modelName,
      contents: prompt,
    });

    if (!res.text) {
      throw new Error('AI response did not contain any text');
    }

    const [refinedDescriptionRaw, aiCommentaryRaw] =
      res.text.split(/\n?={5,}\n?/);
    const refinedDescription = refinedDescriptionRaw
      ? refinedDescriptionRaw.trim()
      : '';
    const aiCommentary = aiCommentaryRaw ? aiCommentaryRaw.trim() : '';
    return {
      refinedDescription,
      aiCommentary,
    };
  }

  async generateRoadblocksFromPrompt(
    prompt: string,
  ): Promise<{ description: string; fix: string; riskNumber: number }[]> {
    const res = await this.ai.models.generateContent({
      model: this.modelName,
      contents: prompt,
    });
    const text = res.text;

    if (!text) {
      throw new Error('AI response did not contain any text');
    }

    try {
      const jsonStart = text.indexOf('[');
      const jsonEnd = text.lastIndexOf(']');
      const jsonString = text.substring(jsonStart, jsonEnd + 1);

      return JSON.parse(jsonString).map((entry: any) => ({
        description: entry.description,
        fix: entry.fix,
        riskNumber: entry.riskNumber,
      }));
    } catch (err) {
      console.error('Failed to parse AI response:', text);
      throw new Error('AI returned an invalid roadblock response');
    }
  }

  async createBasePrompt(
    startup: Startup,
    em: EntityManager,
  ): Promise<string | null> {
    const capsuleProposalInfo = startup.capsuleProposal;
    if (!capsuleProposalInfo) return null;

    const startupReadinessLevels = await em.find(
      StartupReadinessLevel,
      {
        startup: startup,
      },
      {
        populate: ['readinessLevel'],
      },
    );

    const trl = startupReadinessLevels[0]?.readinessLevel.level || 0;
    const mrl = startupReadinessLevels[1]?.readinessLevel.level || 0;
    const arl = startupReadinessLevels[2]?.readinessLevel.level || 0;
    const orl = startupReadinessLevels[3]?.readinessLevel.level || 0;
    const rrl = startupReadinessLevels[4]?.readinessLevel.level || 0;
    const irl = startupReadinessLevels[5]?.readinessLevel.level || 0;

    return `
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
  }

  async refineInitiative(prompt: string): Promise<{
    refinedDescription?: string;
    refinedMeasures?: string;
    refinedTargets?: string;
    refinedRemarks?: string;
    aiCommentary: string;
  }> {
    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: prompt,
    });

    const content = response.text;
    if (!content) throw new Error('No content in response');

    const [jsonStr, commentary] = content
      .split('=========')
      .map((str) => str.trim());

    const cleanJsonStr = jsonStr.replace(/```json\n?|\n?```/g, '').trim();

    try {
      const refinements = JSON.parse(cleanJsonStr);

      const hasRefinements =
        refinements.refinedDescription ||
        refinements.refinedMeasures ||
        refinements.refinedTargets ||
        refinements.refinedRemarks;

      if (!hasRefinements) {
        console.warn('AI response contained no refinements');
      }

      return {
        ...refinements,
        aiCommentary: commentary || 'Changes applied successfully.',
      };
    } catch (err) {
      console.error('Failed to parse AI response:', content);
      console.error('Parse error:', err);
      throw new Error('AI returned an invalid JSON response');
    }
  }

  async refineRoadblock(prompt: string): Promise<{
    refinedDescription?: string;
    refinedFix?: string;
    aiCommentary: string;
  }> {
    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: prompt,
    });

    const content = response.text;
    if (!content) throw new Error('No content in response');

    const [jsonStr, commentary] = content
      .split('=========')
      .map((str) => str.trim());
    const cleanJsonStr = jsonStr.replace(/```json\n?|\n?```/g, '').trim();

    try {
      const refinements = JSON.parse(cleanJsonStr);

      const hasRefinements =
        refinements.refinedDescription || refinements.refinedFix;

      if (!hasRefinements) {
        console.warn('AI response contained no refinements');
      }

      return {
        ...refinements,
        aiCommentary: commentary || 'Changes applied successfully.',
      };
    } catch (err) {
      console.error('Failed to parse AI response:', content);
      console.error('Parse error:', err);
      throw new Error('AI returned an invalid JSON response');
    }
  }

  async refineRna(prompt: string): Promise<{
    refinedRna?: string;
    aiCommentary: string;
  }> {
    const response = await this.ai.models.generateContent({
      model: this.modelName,
      contents: prompt,
    });

    const content = response.text;
    if (!content) throw new Error('No content in response');

    const [jsonStr, commentary] = content
      .split('=========')
      .map((str) => str.trim());
    const cleanJsonStr = jsonStr.replace(/```json\n?|\n?```/g, '').trim();

    try {
      const refinements = JSON.parse(cleanJsonStr);

      const hasRefinements = refinements.refinedRna;

      if (!hasRefinements) {
        console.warn('AI response contained no refinements');
      }

      return {
        ...refinements,
        aiCommentary: commentary || 'Changes applied successfully.',
      };
    } catch (err) {
      console.error('Failed to parse AI response:', content);
      console.error('Parse error:', err);
      throw new Error('AI returned an invalid JSON response');
    }
  }
}
