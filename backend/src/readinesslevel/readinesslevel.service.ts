import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { CalculatorQuestion } from 'src/entities/calculator-question.entity';
import { UratQuestion } from 'src/entities/urat-question.entity';
import {
  CalculatorQuestionAnswerDto,
  UratQuestionAnswerDto,
  RateReadinessDto,
} from './dto';
import { CalculatorQuestionAnswer } from 'src/entities/calculator-question-answer.entity';
import { Startup } from 'src/entities/startup.entity';
import { UratQuestionAnswer } from 'src/entities/urat-question-answer.entity';
import { ReadinessLevel } from 'src/entities/readiness-level.entity';
import { LevelCriterion } from 'src/entities/level-criterion.entity';
import { StartupCriterionAnswer } from 'src/entities/startup-criterion-answer.entity';
import { StartupReadinessLevel } from 'src/entities/startup-readiness-level.entity';

@Injectable()
export class ReadinesslevelService {
  constructor(private em: EntityManager) {}

  async getUratQuestions() {
    return await this.em.findAll(UratQuestion);
  }

  async getCalculatorQuestions() {
    const calcQuestions = await this.em.findAll(CalculatorQuestion);

    const categoryMap = {};

    calcQuestions.forEach((item) => {
      const { category, id, question, score } = item;
      if (!categoryMap[category]) {
        categoryMap[category] = [];
      }
      categoryMap[category].push({ id, question, score });
    });

    const res = Object.keys(categoryMap).map((category) => ({
      category,
      questions: categoryMap[category],
    }));
    const selectedValues: { [key: string]: string } = {};

    res.forEach((category) => {
      if (!selectedValues[category.category] && category.questions.length > 0) {
        selectedValues[category.category] = `${category.questions[0].id}`;
      }
    });

    return res;
  }

  async getReadinessLevels() {
    return await this.em.findAll(ReadinessLevel);
  }

  async getReadinessLevelCriterion() {
    return await this.em.findAll(LevelCriterion);
  }

  async getReadinessLevelCriterionAnswers(startupId: number) {
    return this.em.find(
      StartupCriterionAnswer,
      {
        startup: startupId,
      },
      {
        populate: ['criterion'],
      },
    );
  }

  async getStartupReadinessLevel(startupId: number) {
    const res = await this.em.find(
      StartupReadinessLevel,
      {
        startup: startupId,
      },
      {
        populate: ['readinessLevel'],
      },
    );
    return res;
  }

  async createUratQuestionAnswers(dto: UratQuestionAnswerDto) {
    const answers = await Promise.all(
      dto.answers.map(async (answer) => {
        const question = await this.em.findOneOrFail(
          UratQuestion,
          { id: answer.uratQuestionId },
          {
            failHandler: () =>
              new Error(
                `CalculatorQuestion with ID ${answer.uratQuestionId} not found`,
              ),
          },
        );

        const startup = await this.em.findOneOrFail(
          Startup,
          { id: answer.startupId },
          {
            failHandler: () =>
              new Error(`Startup with ID ${answer.startupId} not found`),
          },
        );

        const uratQuestionAnswer = new UratQuestionAnswer();
        uratQuestionAnswer.uratQuestion = question;
        uratQuestionAnswer.startup = startup;
        uratQuestionAnswer.response = answer.response;
        return uratQuestionAnswer;
      }),
    );
    await this.em.persistAndFlush(answers);
    return { message: 'URAT Question Answers created successfully!' };
  }

  async createCalculatorQuestionAnswers(dto: CalculatorQuestionAnswerDto) {
    const answers = await Promise.all(
      dto.calculatorAnswers.map(async (answer) => {
        const question = await this.em.findOneOrFail(
          CalculatorQuestion,
          { id: answer.calculatorQuestionId },
          {
            failHandler: () =>
              new Error(
                `CalculatorQuestion with ID ${answer.calculatorQuestionId} not found`,
              ),
          },
        );

        const startup = await this.em.findOneOrFail(
          Startup,
          { id: answer.startupId },
          {
            failHandler: () =>
              new Error(`Startup with ID ${answer.startupId} not found`),
          },
        );

        const calcQuestionAnswer = new CalculatorQuestionAnswer();
        calcQuestionAnswer.question = question;
        calcQuestionAnswer.startup = startup;
        return calcQuestionAnswer;
      }),
    );
    await this.em.persistAndFlush(answers);
    return { message: 'Calculator Question Answers created successfully!' };
  }

  async getUratQuestionAnswers(startupId: number) {
    const answers = await this.em.find(
      UratQuestionAnswer,
      {
        startup: startupId,
      },
      { populate: ['uratQuestion'] },
    );

    return answers.map((answer) => ({
      id: answer.id,
      response: answer.response,
      score: answer.score,
      startupId: answer.startup.id,
      questionId: answer.uratQuestion.id,
      readinessType: answer.uratQuestion.readinessType,
    }));
  }

  async updateUratQuestionAnswer(
    id: number,
    dto: { response?: string; score?: number },
  ) {
    const answer = await this.em.findOneOrFail(UratQuestionAnswer, { id });
    if (dto.response !== undefined) answer.response = dto.response;
    answer.score = 1;
    await this.em.flush();
    return answer;
  }

  async updateCalculatorQuestionAnswer(
    id: number,
    dto: { calculatorQuestionId?: number },
  ) {
    const answer = await this.em.findOneOrFail(CalculatorQuestionAnswer, {
      id,
    });
    if (dto.calculatorQuestionId !== undefined) {
      const newQuestion = await this.em.findOneOrFail(CalculatorQuestion, {
        id: dto.calculatorQuestionId,
      });
      answer.question = newQuestion;
    }
    await this.em.flush();
    return answer;
  }

  async rateStartupReadinessLevel(
    startupId: number,
    dto: RateReadinessDto,
  ): Promise<StartupReadinessLevel> {
    const startup = await this.em.findOneOrFail(
      Startup,
      { id: startupId },
      {
        failHandler: () => new Error(`Startup with ID ${startupId} not found`),
      },
    );

    const readinessLevel = await this.em.findOneOrFail(
      ReadinessLevel,
      {
        readinessType: dto.readinessType,
        level: dto.level,
      },
      {
        failHandler: () =>
          new Error(
            `ReadinessLevel not found for type ${dto.readinessType} and level ${dto.level}`,
          ),
      },
    );

    let startupReadinessLevel = await this.em.findOne(StartupReadinessLevel, {
      startup: startup,
      readinessLevel: { readinessType: dto.readinessType },
    });

    if (!startupReadinessLevel) {
      startupReadinessLevel = new StartupReadinessLevel();
      startupReadinessLevel.startup = startup;
      this.em.persist(startupReadinessLevel);
    }

    startupReadinessLevel.readinessLevel = readinessLevel;

    await this.em.flush();

    return startupReadinessLevel;
  }
}
