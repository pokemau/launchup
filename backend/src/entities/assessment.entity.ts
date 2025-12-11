import {
  Entity,
  PrimaryKey,
  Property,
  OneToMany,
  Collection,
  Enum,
} from '@mikro-orm/core';
import { AssessmentType } from './enums/assessment-type.enum';
import { AssessmentAnswerType } from './enums/assessment-util.enum';
import { StartupAssessment } from './startup-assessment.entity';
import { StartupResponse } from './startup-response.entity';

@Entity({ tableName: 'assessments' })
export class Assessment {
  @PrimaryKey({ autoincrement: true })
  id!: number;

  @Enum(() => AssessmentType)
  assessmentType!: AssessmentType;

  @Property()
  name!: string;

  @Property({ nullable: true })
  description?: string;

  @Enum(() => AssessmentAnswerType)
  answerType!: AssessmentAnswerType;

  @OneToMany(() => StartupAssessment, (sa) => sa.assessment)
  startupAssessments = new Collection<StartupAssessment>(this);

  @OneToMany(() => StartupResponse, (r) => r.assessment)
  responses = new Collection<StartupResponse>(this);
}
